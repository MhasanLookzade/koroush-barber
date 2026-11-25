import { Prisma, NotificationJob } from "@prisma/client"
import { prisma } from "./db"
import {
  getSmsProvider,
  normalizeIranianPhone,
  isValidIranianPhone,
  MockSmsProvider,
  type SmsProvider,
  type SmsSendResult,
} from "./providers/sms"
import {
  generateCorrelationId,
  logProviderTelemetry,
  sanitizeTelemetryText,
  type FailureCategory,
} from "./http"
import { getTehranTimeString } from "./jalali"

export type NotificationStatus =
  | "QUEUED"
  | "PENDING"
  | "SENDING"
  | "SENT"
  | "RETRY_PENDING"
  | "FAILED"
  | "UNKNOWN"

export const DEFAULT_MAX_ATTEMPTS = 3
export const DEFAULT_BASE_BACKOFF_MS = 30_000

const activeDeliveries = new Set<Promise<unknown>>()

type PrismaLike = Prisma.TransactionClient | typeof prisma

export function computeExponentialBackoffMs(
  attempt: number,
  baseBackoffMs = DEFAULT_BASE_BACKOFF_MS
): number {
  const safeAttempt = Math.max(1, attempt)
  return Math.min(baseBackoffMs * Math.pow(2, safeAttempt - 1), 15 * 60_000)
}

export function extractAttemptCount(errorField: string | null | undefined): number {
  if (!errorField) return 0
  const m = errorField.match(/\[att:(\d+)\/\d+/)
  return m ? Math.max(0, parseInt(m[1], 10)) : 0
}

export function formatJobDiagnostic(params: {
  attempt: number
  maxAttempts: number
  correlationId: string
  category: FailureCategory
  durationMs: number
  error?: string
}): string {
  const cleanErr = sanitizeTelemetryText(params.error || "Delivery error")
  return `[att:${params.attempt}/${params.maxAttempts}|corr:${params.correlationId}|cat:${params.category}|dur:${params.durationMs}ms] ${cleanErr}`
}

/**
 * Enqueue a NotificationJob inside or outside a Prisma transaction (Transactional Outbox).
 * Never sets SENT optimistically; starts as QUEUED with sentAt=null.
 */
export async function enqueueNotificationJob(
  db: PrismaLike,
  params: {
    phone: string
    recipientName?: string | null
    type: string
    message: string
    scheduledAt?: Date
    dedupContains?: string
  }
): Promise<{ enqueued: boolean; job: NotificationJob }> {
  const normalizedPhone = normalizeIranianPhone(params.phone)
  const provider = getSmsProvider()

  if (params.dedupContains) {
    const existing = await db.notificationJob.findFirst({
      where: {
        phone: normalizedPhone,
        type: params.type,
        status: { in: ["QUEUED", "PENDING", "SENDING", "RETRY_PENDING", "SENT"] },
        message: { contains: params.dedupContains },
      },
      orderBy: { createdAt: "desc" },
    })
    if (existing) {
      return { enqueued: false, job: existing }
    }
  }

  const job = await db.notificationJob.create({
    data: {
      phone: normalizedPhone,
      recipientName: params.recipientName || null,
      type: params.type,
      message: params.message,
      status: "QUEUED",
      provider: provider.name,
      scheduledAt: params.scheduledAt ?? new Date(),
      sentAt: null,
      error: null,
    },
  })

  return { enqueued: true, job }
}

/**
 * Atomically claim and deliver a single NotificationJob strictly outside any DB transaction.
 * Enforces duplicate prevention via optimistic status transition (QUEUED/RETRY_PENDING -> SENDING).
 */
export async function processNotificationJob(
  jobId: string,
  options: {
    maxAttempts?: number
    baseBackoffMs?: number
    skipScheduleGuard?: boolean
    allowManualRetry?: boolean
    providerOverride?: SmsProvider
    dispatcher?: (sms: SmsProvider, job: NotificationJob) => Promise<SmsSendResult>
  } = {}
): Promise<{
  claimed: boolean
  finalStatus: NotificationStatus | "SKIPPED"
  job?: NotificationJob
  result?: SmsSendResult
}> {
  const work = (async () => {
    const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
    const baseBackoffMs = options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS
    const now = new Date()

    const allowedStatuses = options.allowManualRetry
      ? ["QUEUED", "PENDING", "RETRY_PENDING", "FAILED", "UNKNOWN"]
      : ["QUEUED", "PENDING", "RETRY_PENDING"]

    const claim = await prisma.notificationJob.updateMany({
      where: {
        id: jobId,
        status: { in: allowedStatuses },
        ...(options.skipScheduleGuard ? {} : { scheduledAt: { lte: now } }),
      },
      data: { status: "SENDING" },
    })

    if (claim.count === 0) {
      const existing = await prisma.notificationJob.findUnique({ where: { id: jobId } })
      return {
        claimed: false,
        finalStatus: (existing?.status as NotificationStatus) || "SKIPPED",
        job: existing ?? undefined,
      }
    }

    const job = await prisma.notificationJob.findUnique({ where: { id: jobId } })
    if (!job) {
      return { claimed: false, finalStatus: "SKIPPED" as const }
    }

    const sms = options.providerOverride ?? getSmsProvider()
    const attempt = (options.allowManualRetry ? 0 : extractAttemptCount(job.error)) + 1
    const correlationId = generateCorrelationId("notif")

    let sendRes: SmsSendResult
    try {
      if (options.dispatcher) {
        sendRes = await options.dispatcher(sms, job)
      } else if (sms instanceof MockSmsProvider) {
        sendRes = await sms.sendCustomSms(job.phone, job.message, job.type)
      } else {
        sendRes = await sms.sendCustomSms(job.phone, job.message)
      }
    } catch (unexpectedErr: unknown) {
      const errMsg = unexpectedErr instanceof Error ? unexpectedErr.message : "Unexpected provider error"
      sendRes = {
        success: false,
        error: sanitizeTelemetryText(errMsg),
        failureCategory: "NETWORK_ERROR",
        isRetryable: true,
        isUncertain: true,
        correlationId,
        durationMs: 0,
        deliveryNote: "UNCERTAIN",
      }
    }

    const category: FailureCategory = sendRes.failureCategory ?? (sendRes.success ? "OK" : "PROVIDER_ERROR")
    const durationMs = sendRes.durationMs ?? 0
    const corr = sendRes.correlationId ?? correlationId

    if (sendRes.success) {
      const updated = await prisma.notificationJob.update({
        where: { id: job.id },
        data: {
          status: "SENT",
          provider: sms.name,
          sentAt: new Date(),
          error: null,
        },
      })

      logProviderTelemetry({
        provider: sms.name,
        operation: `notification:${job.type}`,
        correlationId: corr,
        durationMs,
        attempt,
        responseStatus: sendRes.providerStatus ?? 200,
        failureCategory: "OK",
        finalState: "SENT",
      })

      return {
        claimed: true,
        finalStatus: "SENT" as const,
        job: updated,
        result: sendRes,
      }
    }

    const canRetry = Boolean(sendRes.isRetryable) && attempt < maxAttempts
    const isUncertainTerminal =
      !canRetry && (Boolean(sendRes.isUncertain) || category === "TIMEOUT" || category === "INVALID_JSON")

    const finalStatus: NotificationStatus = canRetry
      ? "RETRY_PENDING"
      : isUncertainTerminal
        ? "UNKNOWN"
        : "FAILED"

    const nextScheduledAt = canRetry
      ? new Date(Date.now() + computeExponentialBackoffMs(attempt, baseBackoffMs))
      : job.scheduledAt

    const diagnostic = formatJobDiagnostic({
      attempt,
      maxAttempts,
      correlationId: corr,
      category,
      durationMs,
      error: sendRes.error || "خطا در ارسال پیامک",
    })

    const updated = await prisma.notificationJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        provider: sms.name,
        scheduledAt: nextScheduledAt,
        sentAt: null,
        error: diagnostic,
      },
    })

    logProviderTelemetry({
      provider: sms.name,
      operation: `notification:${job.type}`,
      correlationId: corr,
      durationMs,
      attempt,
      responseStatus: sendRes.providerStatus ?? category,
      failureCategory: category,
      finalState: finalStatus,
      errorSummary: sendRes.error,
    })

    return {
      claimed: true,
      finalStatus,
      job: updated,
      result: sendRes,
    }
  })()

  activeDeliveries.add(work)
  try {
    return await work
  } finally {
    activeDeliveries.delete(work)
  }
}

/**
 * Recover SENDING jobs stranded by a worker crash or forced shutdown.
 */
export async function recoverStuckSendingJobs(staleAfterMs = 60_000): Promise<number> {
  const cutoff = new Date(Date.now() - staleAfterMs)
  const stuck = await prisma.notificationJob.findMany({
    where: {
      status: "SENDING",
      scheduledAt: { lte: cutoff },
    },
  })

  let recoveredCount = 0
  for (const job of stuck) {
    const attempt = extractAttemptCount(job.error) + 1
    const nextState: NotificationStatus = attempt >= DEFAULT_MAX_ATTEMPTS ? "UNKNOWN" : "RETRY_PENDING"
    const res = await prisma.notificationJob.updateMany({
      where: { id: job.id, status: "SENDING" },
      data: {
        status: nextState,
        scheduledAt: new Date(),
        error: formatJobDiagnostic({
          attempt,
          maxAttempts: DEFAULT_MAX_ATTEMPTS,
          correlationId: generateCorrelationId("rec"),
          category: "NETWORK_ERROR",
          durationMs: 0,
          error: "Recovered interrupted SENDING job after restart",
        }),
      },
    })
    if (res.count > 0) recoveredCount++
  }

  return recoveredCount
}

/**
 * Process all due notification jobs in the outbox (QUEUED, PENDING, RETRY_PENDING with scheduledAt <= now).
 */
export async function processDueNotificationJobs(options: {
  limit?: number
  maxAttempts?: number
  baseBackoffMs?: number
  providerOverride?: SmsProvider
} = {}): Promise<{
  recovered: number
  processed: number
  sent: number
  retryPending: number
  failed: number
  unknown: number
}> {
  const recovered = await recoverStuckSendingJobs()
  const dueJobs = await prisma.notificationJob.findMany({
    where: {
      status: { in: ["QUEUED", "PENDING", "RETRY_PENDING"] },
      scheduledAt: { lte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
    take: options.limit ?? 50,
  })

  let sent = 0
  let retryPending = 0
  let failed = 0
  let unknown = 0
  let processed = 0

  for (const job of dueJobs) {
    const outcome = await processNotificationJob(job.id, {
      maxAttempts: options.maxAttempts,
      baseBackoffMs: options.baseBackoffMs,
      skipScheduleGuard: true,
      providerOverride: options.providerOverride,
    })
    if (!outcome.claimed) continue
    processed++
    if (outcome.finalStatus === "SENT") sent++
    else if (outcome.finalStatus === "RETRY_PENDING") retryPending++
    else if (outcome.finalStatus === "UNKNOWN") unknown++
    else if (outcome.finalStatus === "FAILED") failed++
  }

  return { recovered, processed, sent, retryPending, failed, unknown }
}

/**
 * Helper to obtain today's Jalali month/day ("MM/DD") in Asia/Tehran Latin digits.
 */
function getTodayTehranJalaliMonthDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    timeZone: "Asia/Tehran",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)
  const month = parts.find((p) => p.type === "month")?.value || "01"
  const day = parts.find((p) => p.type === "day")?.value || "01"
  return `${month}/${day}`
}

/**
 * Scheduled automation runner (addresses BUG-008):
 * Enqueues due appointment reminders & birthday greetings idempotently and drains due outbox jobs.
 */
export async function runScheduledNotificationCycle(options: {
  now?: Date
  providerOverride?: SmsProvider
} = {}): Promise<{
  remindersEnqueued: number
  birthdaysEnqueued: number
  outbox: Awaited<ReturnType<typeof processDueNotificationJobs>>
}> {
  const now = options.now ?? new Date()
  let remindersEnqueued = 0
  let birthdaysEnqueued = 0

  const [rulesSetting, hoursSetting] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: "sms_reminder_rules" } }),
    prisma.siteSetting.findUnique({ where: { key: "sms_reminder_hours" } }),
  ])

  let reminderEnabled = true
  let birthdayEnabled = true
  let hoursBefore = hoursSetting ? Math.max(1, Math.min(48, parseInt(hoursSetting.value, 10) || 2)) : 2

  if (rulesSetting?.value) {
    try {
      const parsed = JSON.parse(rulesSetting.value) as {
        appointmentReminder?: { enabled?: boolean; hoursBefore?: number }
        birthdayGreeting?: { enabled?: boolean }
      }
      if (parsed.appointmentReminder?.enabled !== undefined) {
        reminderEnabled = Boolean(parsed.appointmentReminder.enabled)
      }
      if (parsed.appointmentReminder?.hoursBefore) {
        hoursBefore = Math.max(1, Math.min(48, parsed.appointmentReminder.hoursBefore))
      }
      if (parsed.birthdayGreeting?.enabled !== undefined) {
        birthdayEnabled = Boolean(parsed.birthdayGreeting.enabled)
      }
    } catch {
      // Fall back to defaults cleanly
    }
  }

  // 1. Enqueue upcoming appointment reminders idempotently
  if (reminderEnabled) {
    const windowEnd = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000)
    const upcoming = await prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        date: { gt: now, lte: windowEnd },
      },
      include: { service: true, customer: true },
    })

    for (const app of upcoming) {
      if (!isValidIranianPhone(app.customerPhone)) continue
      const jalaliDate = new Intl.DateTimeFormat("fa-IR", {
        timeZone: "Asia/Tehran",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(app.date)
      const timeStr = getTehranTimeString(app.date)
      const text = `یادآوری نوبت کوروش باربر\nساعت ${timeStr} در تاریخ ${jalaliDate} منتظر دیدار شما هستیم.\nکد پیگیری: ${app.trackingCode}`

      const res = await enqueueNotificationJob(prisma, {
        phone: app.customerPhone,
        recipientName: app.customerName,
        type: "REMINDER",
        message: text,
        dedupContains: app.trackingCode,
      })
      if (res.enqueued) remindersEnqueued++
    }
  }

  // 2. Enqueue daily birthday greetings idempotently
  if (birthdayEnabled) {
    const todayMd = getTodayTehranJalaliMonthDay(now)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const candidates = await prisma.customer.findMany({
      where: {
        smsConsent: true,
        birthDate: { endsWith: `/${todayMd}` },
      },
    })

    for (const cust of candidates) {
      if (!isValidIranianPhone(cust.phone)) continue
      const recent = await prisma.notificationJob.findFirst({
        where: {
          phone: normalizeIranianPhone(cust.phone),
          type: "BIRTHDAY",
          status: { in: ["QUEUED", "PENDING", "SENDING", "RETRY_PENDING", "SENT"] },
          createdAt: { gte: thirtyDaysAgo },
        },
      })
      if (recent) continue

      const greetingText = `کوروش باربر\n${cust.name ? `${cust.name} عزیز، ` : ""}تولدت مبارک! 🎉\nامیدواریم سال جدید زندگیت پر از اتفاق‌های خوب، سلامتی و موفقیت باشه.\nخوشحالیم که همراه کوروش باربر هستی.`
      const res = await enqueueNotificationJob(prisma, {
        phone: cust.phone,
        recipientName: cust.name,
        type: "BIRTHDAY",
        message: greetingText,
      })
      if (res.enqueued) birthdaysEnqueued++
    }
  }

  const outbox = await processDueNotificationJobs({ providerOverride: options.providerOverride })
  return { remindersEnqueued, birthdaysEnqueued, outbox }
}

/**
 * Drain in-flight notification promises before graceful process exit.
 */
export async function drainInFlightNotifications(timeoutMs = 5000): Promise<void> {
  if (activeDeliveries.size === 0) return
  await Promise.race([
    Promise.allSettled(Array.from(activeDeliveries)),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ])
}
