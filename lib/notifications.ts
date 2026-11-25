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
export const DEFAULT_LEASE_DURATION_MS = 60_000

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
  previousError?: string | null
}): string {
  const cleanErr = sanitizeTelemetryText(params.error || "Delivery error")
  const head = `[att:${params.attempt}/${params.maxAttempts}|corr:${params.correlationId}|cat:${params.category}|dur:${params.durationMs}ms] ${cleanErr}`
  if (params.previousError && !params.previousError.includes(cleanErr)) {
    const prevSummary = sanitizeTelemetryText(params.previousError).slice(0, 140)
    return `${head} || prev: ${prevSummary}`.slice(0, 500)
  }
  return head.slice(0, 500)
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
      lockedAt: null,
      leaseExpiresAt: null,
      scheduledAt: params.scheduledAt ?? new Date(),
      sentAt: null,
      error: null,
    },
  })

  return { enqueued: true, job }
}

/**
 * Atomically acquire a time-bounded worker lease and deliver a single NotificationJob outside any DB transaction.
 * Clears lease columns on every terminal or retry transition.
 */
export async function processNotificationJob(
  jobId: string,
  options: {
    maxAttempts?: number
    baseBackoffMs?: number
    leaseDurationMs?: number
    skipScheduleGuard?: boolean
    allowManualRetry?: boolean
    allowUnknownRetry?: boolean
    providerOverride?: SmsProvider
    dispatcher?: (sms: SmsProvider, job: NotificationJob) => Promise<SmsSendResult>
  } = {}
): Promise<{
  claimed: boolean
  reason?: "ACTIVE_LEASE" | "NOT_FOUND" | "NOT_ELIGIBLE"
  finalStatus: NotificationStatus | "SKIPPED"
  job?: NotificationJob
  result?: SmsSendResult
}> {
  const work = (async () => {
    const baseMaxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
    const baseBackoffMs = options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS
    const leaseDurationMs = Math.max(500, options.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS)
    const now = new Date()
    const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs)

    const allowedStatuses = options.allowUnknownRetry
      ? ["QUEUED", "PENDING", "RETRY_PENDING", "FAILED", "UNKNOWN"]
      : options.allowManualRetry
        ? ["QUEUED", "PENDING", "RETRY_PENDING", "FAILED"]
        : ["QUEUED", "PENDING", "RETRY_PENDING"]

    // Atomic lease acquisition: never overloads scheduledAt
    const claim = await prisma.notificationJob.updateMany({
      where: {
        id: jobId,
        status: { in: allowedStatuses },
        ...(options.skipScheduleGuard ? {} : { scheduledAt: { lte: now } }),
      },
      data: {
        status: "SENDING",
        lockedAt: now,
        leaseExpiresAt,
      },
    })

    if (claim.count === 0) {
      const existing = await prisma.notificationJob.findUnique({ where: { id: jobId } })
      if (!existing) {
        return { claimed: false, reason: "NOT_FOUND" as const, finalStatus: "SKIPPED" as const }
      }
      return {
        claimed: false,
        reason: existing.status === "SENDING" ? ("ACTIVE_LEASE" as const) : ("NOT_ELIGIBLE" as const),
        finalStatus: (existing.status as NotificationStatus) || "SKIPPED",
        job: existing,
      }
    }

    const job = await prisma.notificationJob.findUnique({ where: { id: jobId } })
    if (!job) {
      return { claimed: false, reason: "NOT_FOUND" as const, finalStatus: "SKIPPED" as const }
    }

    const sms = options.providerOverride ?? getSmsProvider()
    const previousError = job.error
    const attempt = extractAttemptCount(previousError) + 1
    const effectiveMaxAttempts = options.allowManualRetry
      ? Math.max(baseMaxAttempts, attempt + (baseMaxAttempts - 1))
      : baseMaxAttempts
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
      const fencedSuccess = await prisma.notificationJob.updateMany({
        where: { id: job.id, status: "SENDING", lockedAt: now },
        data: {
          status: "SENT",
          provider: sms.name,
          sentAt: new Date(),
          lockedAt: null,
          leaseExpiresAt: null,
          error: null,
        },
      })
      if (fencedSuccess.count === 0) {
        return {
          claimed: false,
          reason: "ACTIVE_LEASE" as const,
          finalStatus: "SKIPPED" as const,
          result: sendRes,
        }
      }
      const updated = (await prisma.notificationJob.findUnique({ where: { id: job.id } })) ?? job

      // Preserve prior failure/attempt trail in AuditLog when recovering from prior failure
      if (previousError) {
        await prisma.auditLog.create({
          data: {
            action: "NOTIFICATION_RECOVERED",
            entity: "NotificationJob",
            entityId: job.id,
            oldData: JSON.stringify({ error: sanitizeTelemetryText(previousError), attempt: attempt - 1 }),
            newData: JSON.stringify({ status: "SENT", attempt, correlationId: corr }),
          },
        }).catch(() => {})
      }

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

    const canRetry = Boolean(sendRes.isRetryable) && attempt < effectiveMaxAttempts
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
      maxAttempts: effectiveMaxAttempts,
      correlationId: corr,
      category,
      durationMs,
      error: sendRes.error || "خطا در ارسال پیامک",
      previousError,
    })

    const fencedFail = await prisma.notificationJob.updateMany({
      where: { id: job.id, status: "SENDING", lockedAt: now },
      data: {
        status: finalStatus,
        provider: sms.name,
        scheduledAt: nextScheduledAt,
        sentAt: null,
        lockedAt: null,
        leaseExpiresAt: null,
        error: diagnostic,
      },
    })
    if (fencedFail.count === 0) {
      return {
        claimed: false,
        reason: "ACTIVE_LEASE" as const,
        finalStatus: "SKIPPED" as const,
        result: sendRes,
      }
    }
    const updated = (await prisma.notificationJob.findUnique({ where: { id: job.id } })) ?? job

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
 * Recover ONLY SENDING jobs whose active worker lease has actually expired.
 * Concurrent workers holding a valid lease (leaseExpiresAt > now) are never interrupted.
 */
export async function recoverStuckSendingJobs(
  fallbackStaleAfterMs = DEFAULT_LEASE_DURATION_MS
): Promise<number> {
  const now = new Date()
  const fallbackCutoff = new Date(now.getTime() - fallbackStaleAfterMs)

  const expiredLeases = await prisma.notificationJob.findMany({
    where: {
      status: "SENDING",
      OR: [
        { leaseExpiresAt: { lte: now } },
        { leaseExpiresAt: null, lockedAt: { lte: fallbackCutoff } },
        { leaseExpiresAt: null, lockedAt: null, scheduledAt: { lte: fallbackCutoff } },
      ],
    },
  })

  let recoveredCount = 0
  for (const job of expiredLeases) {
    const attempt = extractAttemptCount(job.error) + 1
    const nextState: NotificationStatus = attempt >= DEFAULT_MAX_ATTEMPTS ? "UNKNOWN" : "RETRY_PENDING"
    const res = await prisma.notificationJob.updateMany({
      where: {
        id: job.id,
        status: "SENDING",
        OR: [
          { leaseExpiresAt: { lte: now } },
          { leaseExpiresAt: null, lockedAt: { lte: fallbackCutoff } },
          { leaseExpiresAt: null, lockedAt: null, scheduledAt: { lte: fallbackCutoff } },
        ],
      },
      data: {
        status: nextState,
        lockedAt: null,
        leaseExpiresAt: null,
        scheduledAt: now,
        error: formatJobDiagnostic({
          attempt,
          maxAttempts: DEFAULT_MAX_ATTEMPTS,
          correlationId: generateCorrelationId("rec"),
          category: "NETWORK_ERROR",
          durationMs: 0,
          error: "Recovered expired worker SENDING lease after crash/timeout",
          previousError: job.error,
        }),
      },
    })
    if (res.count > 0) {
      recoveredCount++
      try {
        await prisma.auditLog.create({
          data: {
            action: "NOTIFICATION_RECOVERED",
            entity: "NotificationJob",
            entityId: job.id,
            oldData: JSON.stringify({
              status: job.status,
              lockedAt: job.lockedAt,
              leaseExpiresAt: job.leaseExpiresAt,
            }),
            newData: JSON.stringify({
              status: nextState,
              attempt,
            }),
          },
        })
      } catch {
        // Non-fatal if audit log write fails during recovery
      }
    }
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
  leaseDurationMs?: number
  providerOverride?: SmsProvider
} = {}): Promise<{
  recovered: number
  processed: number
  sent: number
  retryPending: number
  failed: number
  unknown: number
}> {
  const recovered = await recoverStuckSendingJobs(options.leaseDurationMs)
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
      leaseDurationMs: options.leaseDurationMs,
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
  leaseDurationMs?: number
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

  const outbox = await processDueNotificationJobs({
    leaseDurationMs: options.leaseDurationMs,
    providerOverride: options.providerOverride,
  })
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
