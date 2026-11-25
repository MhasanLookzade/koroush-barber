import Module from "module"
import path from "path"

const origResolve = (Module as unknown as { _resolveFilename: (...args: unknown[]) => string })._resolveFilename
;(Module as unknown as { _resolveFilename: (req: string, ...rest: unknown[]) => string })._resolveFilename = function (
  request: string,
  ...rest: unknown[]
) {
  if (request.startsWith("@/")) {
    return origResolve.call(this, path.join(process.cwd(), request.slice(2)), ...rest)
  }
  return origResolve.call(this, request, ...rest)
}

import { NextRequest } from "next/server"
import { prisma } from "../lib/db"
import { sanitizeTelemetryText } from "../lib/http"
import { MockSmsProvider, type SmsProvider } from "../lib/providers/sms"
import {
  DEFAULT_LEASE_DURATION_MS,
  enqueueNotificationJob,
  processNotificationJob,
  recoverStuckSendingJobs,
  runScheduledNotificationCycle,
} from "../lib/notifications"
import { signAdminToken } from "../lib/auth"
import { GET as adminSmsGet, PATCH as adminSmsPatch } from "../app/api/admin/sms/route"

let passed = 0
let failed = 0

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`)
    passed++
  } else {
    console.error(`  ❌ [FAIL] ${name}${detail ? ` -> ${detail}` : ""}`)
    failed++
  }
}

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

async function cleanupFixtures() {
  MockSmsProvider.clearAll()
  await prisma.notificationJob.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.slotHold.deleteMany()
  await prisma.siteSetting.deleteMany({
    where: { key: { in: ["sms_reminder_rules", "sms_reminder_hours"] } },
  })
  await prisma.customer.deleteMany()
}

async function runPhase42Tests() {
  const isPostgres = Boolean(process.env.DATABASE_URL?.startsWith("postgres"))
  console.log("==================================================================")
  console.log(`  PHASE 4.2 — NOTIFICATION HARDENING SUITE (${isPostgres ? "PostgreSQL" : "SQLite"})`)
  console.log("==================================================================\n")

  await cleanupFixtures()

  const barber = await prisma.barber.findFirstOrThrow({ where: { isActive: true } })
  const service = await prisma.service.findFirstOrThrow({ where: { isActive: true } })
  const ownerToken = signAdminToken({ userId: "admin-p42", username: "admin", role: "OWNER", name: "Owner" })

  // =========================================================================
  // SECTION A — WORKER LEASE & CRASH RECOVERY (OUT-41-01)
  // =========================================================================
  console.log("📌 Section A: Worker Lease Lifecycle & Recovery (OUT-41-01)")

  // A1: Old QUEUED job (> 60s scheduledAt) claimed into SENDING gets fresh leaseExpiresAt
  //     and is NOT prematurely reclaimed by recoverStuckSendingJobs()
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
  const oldQueued = await prisma.notificationJob.create({
    data: {
      phone: "09121112233",
      recipientName: "کاربر لیز",
      type: "CUSTOM",
      message: "تست لیز ایمن",
      status: "QUEUED",
      provider: "MOCK",
      scheduledAt: twoHoursAgo,
    },
  })

  let observedDuringSend: {
    status?: string
    lockedAt?: Date | null
    leaseExpiresAt?: Date | null
    scheduledAt?: Date
    recoveredDuringActiveSend?: number
  } = {}

  const makeTestProvider = (customSend: () => Promise<{ success: boolean; messageId: string }>): SmsProvider => {
    const base = new MockSmsProvider()
    return {
      name: "MOCK",
      isConfigured: () => true,
      sendOtp: base.sendOtp.bind(base),
      sendBookingConfirmation: base.sendBookingConfirmation.bind(base),
      sendReminder: base.sendReminder.bind(base),
      sendBirthdayGreeting: base.sendBirthdayGreeting.bind(base),
      sendCustomSms: async () => customSend(),
    }
  }

  const leaseAwareProvider = makeTestProvider(async () => {
    const row = await prisma.notificationJob.findUniqueOrThrow({ where: { id: oldQueued.id } })
    const recoveredCount = await recoverStuckSendingJobs(DEFAULT_LEASE_DURATION_MS)
    observedDuringSend = {
      status: row.status,
      lockedAt: row.lockedAt,
      leaseExpiresAt: row.leaseExpiresAt,
      scheduledAt: row.scheduledAt,
      recoveredDuringActiveSend: recoveredCount,
    }
    return { success: true, messageId: "p42-lease-ok" }
  })

  const leaseOutcome = await processNotificationJob(oldQueued.id, {
    leaseDurationMs: 60_000,
    providerOverride: leaseAwareProvider,
  })
  const postLeaseRow = await prisma.notificationJob.findUniqueOrThrow({ where: { id: oldQueued.id } })

  assert(
    leaseOutcome.claimed &&
      leaseOutcome.finalStatus === "SENT" &&
      observedDuringSend.status === "SENDING" &&
      observedDuringSend.lockedAt !== null &&
      observedDuringSend.leaseExpiresAt !== null &&
      observedDuringSend.leaseExpiresAt!.getTime() > Date.now() - 5000 &&
      observedDuringSend.scheduledAt!.getTime() === twoHoursAgo.getTime(),
    "Claiming an old QUEUED job sets lockedAt/leaseExpiresAt atomically without overwriting scheduledAt"
  )
  assert(
    observedDuringSend.recoveredDuringActiveSend === 0,
    "recoverStuckSendingJobs() does NOT reclaim an active SENDING job with valid lease"
  )
  assert(
    postLeaseRow.status === "SENT" && postLeaseRow.lockedAt === null && postLeaseRow.leaseExpiresAt === null,
    "Transition out of SENDING clears lockedAt and leaseExpiresAt"
  )

  // A2: Active SENDING job cannot be claimed by another worker
  const activeSending = await prisma.notificationJob.create({
    data: {
      phone: "09121112234",
      type: "CUSTOM",
      message: "در حال ارسال با لیز معتبر",
      status: "SENDING",
      provider: "MOCK",
      lockedAt: new Date(),
      leaseExpiresAt: new Date(Date.now() + 60_000),
      scheduledAt: twoHoursAgo,
    },
  })
  const activeClaimAttempt = await processNotificationJob(activeSending.id)
  assert(
    !activeClaimAttempt.claimed && activeClaimAttempt.reason === "ACTIVE_LEASE",
    "Worker refuses to claim SENDING job while another worker's lease is valid",
    `got ${JSON.stringify(activeClaimAttempt)}`
  )
  await prisma.notificationJob.delete({ where: { id: activeSending.id } })

  // A3: Concurrent processNotificationJob calls on same QUEUED job claim strictly once
  const raceJob = await prisma.notificationJob.create({
    data: {
      phone: "09121112235",
      type: "CUSTOM",
      message: "تست رقابت ورکر",
      status: "QUEUED",
      provider: "MOCK",
      scheduledAt: new Date(Date.now() - 10_000),
    },
  })
  let raceSendCalls = 0
  const slowProvider = makeTestProvider(async () => {
    raceSendCalls++
    await new Promise((r) => setTimeout(r, 80))
    return { success: true, messageId: "p42-race-1" }
  })
  const raceOutcomes = await Promise.all([
    processNotificationJob(raceJob.id, { providerOverride: slowProvider }),
    processNotificationJob(raceJob.id, { providerOverride: slowProvider }),
    processNotificationJob(raceJob.id, { providerOverride: slowProvider }),
  ])
  const raceClaimedCount = raceOutcomes.filter((o) => o.claimed).length
  assert(
    raceClaimedCount === 1 && raceSendCalls === 1,
    "Concurrent processNotificationJob invocations claim & send strictly once",
    `claimed=${raceClaimedCount}, sends=${raceSendCalls}`
  )

  // A4: Expired lease recovery preserves cumulative attempts + failure history + clears lease
  const expiredSending = await prisma.notificationJob.create({
    data: {
      phone: "09121112236",
      type: "CONFIRMATION",
      message: "لیز منقضی شده",
      status: "SENDING",
      provider: "MOCK",
      lockedAt: new Date(Date.now() - 180_000),
      leaseExpiresAt: new Date(Date.now() - 30_000),
      scheduledAt: new Date(Date.now() - 180_000),
      error: "[att:1/3|corr:c1|cat:TIMEOUT|dur:500ms] Previous provider timeout",
    },
  })
  const recoveredNow = await recoverStuckSendingJobs(DEFAULT_LEASE_DURATION_MS)
  const afterRecovery = await prisma.notificationJob.findUniqueOrThrow({ where: { id: expiredSending.id } })
  const recoveryAudit = await prisma.auditLog.findFirst({
    where: { entity: "NotificationJob", entityId: expiredSending.id, action: "NOTIFICATION_RECOVERED" },
  })
  assert(
    recoveredNow === 1 &&
      afterRecovery.status === "RETRY_PENDING" &&
      afterRecovery.lockedAt === null &&
      afterRecovery.leaseExpiresAt === null &&
      Boolean(afterRecovery.error?.includes("[att:2/3")) &&
      Boolean(afterRecovery.error?.includes("Previous provider timeout")) &&
      Boolean(recoveryAudit),
    "Expired SENDING lease recovers to RETRY_PENDING with cleared lease, preserved history, and AuditLog entry",
    `err=${afterRecovery.error}`
  )

  // A5: Exhausted expired lease transitions cleanly to UNKNOWN (uncertain crash mid-dispatch)
  const exhaustedSending = await prisma.notificationJob.create({
    data: {
      phone: "09121112237",
      type: "CONFIRMATION",
      message: "لیز منقضی شده نهایی",
      status: "SENDING",
      provider: "MOCK",
      lockedAt: new Date(Date.now() - 180_000),
      leaseExpiresAt: new Date(Date.now() - 5_000),
      scheduledAt: new Date(Date.now() - 180_000),
      error: "[att:2/3|corr:c2|cat:SERVER_ERROR|dur:300ms] Previous 500",
    },
  })
  const recoveredExhausted = await recoverStuckSendingJobs(DEFAULT_LEASE_DURATION_MS)
  const afterExhausted = await prisma.notificationJob.findUniqueOrThrow({ where: { id: exhaustedSending.id } })
  assert(
    recoveredExhausted === 1 && afterExhausted.status === "UNKNOWN" && afterExhausted.leaseExpiresAt === null,
    "Expired SENDING lease that reaches maxAttempts transitions safely to UNKNOWN (preventing blind duplicate SMS)"
  )

  // =========================================================================
  // SECTION B — CRON CONCURRENCY & DB DEDUPLICATION (CRN-41-01)
  // =========================================================================
  console.log("\n📌 Section B: Concurrent Cron & DB Deduplication (CRN-41-01)")
  await cleanupFixtures()

  const now = new Date()
  const dueAppointment = await prisma.appointment.create({
    data: {
      barberId: barber.id,
      serviceId: service.id,
      customerName: "مشتری نوبت یادآوری",
      customerPhone: "09125551101",
      date: new Date(now.getTime() + 45 * 60 * 1000),
      endDate: new Date(now.getTime() + 75 * 60 * 1000),
      status: "CONFIRMED",
      trackingCode: "P42REM01",
      totalPrice: service.price,
    },
  })

  await prisma.siteSetting.upsert({
    where: { key: "sms_reminder_rules" },
    update: { value: JSON.stringify({ appointmentReminder: { enabled: true, hoursBefore: 2 }, birthdayGreeting: { enabled: true } }) },
    create: {
      key: "sms_reminder_rules",
      value: JSON.stringify({ appointmentReminder: { enabled: true, hoursBefore: 2 }, birthdayGreeting: { enabled: true } }),
    },
  })

  // B1: 2 concurrent cron cycles on due appointment -> 1 job, 1 SMS
  MockSmsProvider.clearAll()
  const twoCycles = await Promise.all([
    runScheduledNotificationCycle({ now }),
    runScheduledNotificationCycle({ now }),
  ])
  const jobsAfterTwo = await prisma.notificationJob.findMany({ where: { type: "REMINDER" } })
  const twoEnqueuedSum = twoCycles.reduce((acc, c) => acc + c.remindersEnqueued, 0)
  const twoSentSum = twoCycles.reduce((acc, c) => acc + c.outbox.sent, 0)
  assert(
    jobsAfterTwo.length === 1 &&
      jobsAfterTwo[0].dedupKey === `REMINDER:${dueAppointment.trackingCode}` &&
      jobsAfterTwo[0].status === "SENT" &&
      twoEnqueuedSum === 1 &&
      twoSentSum === 1 &&
      MockSmsProvider.sentMessages.filter((m) => m.phone === "09125551101").length === 1,
    "2 concurrent cron runs create strictly 1 REMINDER job and send strictly 1 SMS"
  )

  // B2: 10-way concurrent cron stress test (on PostgreSQL 16; SQLite uses sequential/pool contention guard)
  await prisma.notificationJob.deleteMany({ where: { type: "REMINDER" } })
  MockSmsProvider.clearAll()
  const concurrencyCount = isPostgres ? 10 : 5
  const tenCycles = await Promise.all(
    Array.from({ length: concurrencyCount }, () => runScheduledNotificationCycle({ now }))
  )
  const jobsAfterStress = await prisma.notificationJob.findMany({ where: { type: "REMINDER" } })
  const stressEnqueuedSum = tenCycles.reduce((acc, c) => acc + c.remindersEnqueued, 0)
  const stressSmsCount = MockSmsProvider.sentMessages.filter((m) => m.phone === "09125551101").length
  assert(
    jobsAfterStress.length === 1 && stressEnqueuedSum === 1 && stressSmsCount === 1,
    `${concurrencyCount}-way concurrent cron cycles create strictly 1 REMINDER job & 1 SMS via DB dedupKey`,
    `jobs=${jobsAfterStress.length}, enqueued=${stressEnqueuedSum}, sms=${stressSmsCount}`
  )

  // B3: Repeat cron execution creates zero duplicates, while a second distinct appointment still enqueues cleanly
  const repeatCycle = await runScheduledNotificationCycle({ now })
  assert(repeatCycle.remindersEnqueued === 0, "Repeat cron execution creates zero duplicate reminder jobs")

  await prisma.appointment.create({
    data: {
      barberId: barber.id,
      serviceId: service.id,
      customerName: "مشتری دوم یادآوری",
      customerPhone: "09125551102",
      date: new Date(now.getTime() + 50 * 60 * 1000),
      endDate: new Date(now.getTime() + 80 * 60 * 1000),
      status: "CONFIRMED",
      trackingCode: "P42REM02",
      totalPrice: service.price,
    },
  })
  const secondAppCycle = await runScheduledNotificationCycle({ now })
  const totalReminderJobs = await prisma.notificationJob.count({ where: { type: "REMINDER" } })
  assert(
    secondAppCycle.remindersEnqueued === 1 && secondAppCycle.outbox.sent === 1 && totalReminderJobs === 2,
    "Second distinct appointment reminder still enqueues and delivers without false deduplication"
  )

  // B4: Birthday SMS deduplication across concurrent cycles in the same Jalali year
  const todayMd = getTodayTehranJalaliMonthDay(now)
  const bdayCust = await prisma.customer.create({
    data: {
      phone: "09125551199",
      name: "مشتری تولد",
      smsConsent: true,
      birthDate: `1375/${todayMd}`,
    },
  })
  MockSmsProvider.clearAll()
  await Promise.all(Array.from({ length: isPostgres ? 6 : 3 }, () => runScheduledNotificationCycle({ now })))
  const birthdayJobs = await prisma.notificationJob.findMany({
    where: { type: "BIRTHDAY", phone: bdayCust.phone },
  })
  const birthdaySmsCount = MockSmsProvider.sentMessages.filter((m) => m.phone === bdayCust.phone).length
  assert(
    birthdayJobs.length === 1 && birthdaySmsCount === 1,
    "Concurrent birthday cron cycles deduplicate strictly to 1 job & 1 SMS per customer/year"
  )

  // =========================================================================
  // SECTION C — UNKNOWN STATE RECOVERY & OPERATOR SAFETY (UI-41-01)
  // =========================================================================
  console.log("\n📌 Section C: UNKNOWN Notification Operator Workflow & API Safety (UI-41-01)")

  const unknownJobResend = await prisma.notificationJob.create({
    data: {
      phone: "09126660001",
      recipientName: "مشتری نامشخص یک",
      type: "CUSTOM",
      message: "پیام وضعیت نامشخص برای ارسال مجدد",
      status: "UNKNOWN",
      provider: "MOCK",
      error: "[att:1/3|corr:u1|cat:TIMEOUT|dur:8000ms] Provider timeout after HTTP connect (delivery state unknown)",
    },
  })

  const unknownJobReconcile = await prisma.notificationJob.create({
    data: {
      phone: "09126660002",
      recipientName: "مشتری نامشخص دو",
      type: "CONFIRMATION",
      message: "پیام وضعیت نامشخص برای تایید دستی",
      status: "UNKNOWN",
      provider: "MOCK",
      error: "[att:1/3|corr:u2|cat:BAD_RESPONSE|dur:400ms] 502 malformed body",
    },
  })

  const sendingLockedJob = await prisma.notificationJob.create({
    data: {
      phone: "09126660003",
      type: "CUSTOM",
      message: "در حال ارسال فعال",
      status: "SENDING",
      provider: "MOCK",
      lockedAt: new Date(),
      leaseExpiresAt: new Date(Date.now() + 60_000),
    },
  })

  const makeAdminPatch = (body: Record<string, unknown>, authenticated = true) =>
    new NextRequest("http://localhost:3000/api/admin/sms", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(authenticated ? { Cookie: `admin_token=${ownerToken}` } : {}),
      },
      body: JSON.stringify(body),
    })

  // C1: Unauthenticated PATCH fails closed
  const unauthPatch = await adminSmsPatch(
    makeAdminPatch({ action: "reconcile_unknown", jobId: unknownJobReconcile.id, resolution: "MARK_SENT" }, false)
  )
  assert(unauthPatch.status === 401, "Unauthenticated PATCH /api/admin/sms fails closed (401)")

  // C2: Blind retry on UNKNOWN without confirmUnknownResend=true returns 409 and sends NO SMS
  MockSmsProvider.clearAll()
  const blindUnknownRes = await adminSmsPatch(makeAdminPatch({ action: "retry", jobId: unknownJobResend.id }))
  const blindUnknownBody = (await blindUnknownRes.json()) as { requiresConfirmation?: boolean }
  assert(
    blindUnknownRes.status === 409 &&
      blindUnknownBody.requiresConfirmation === true &&
      MockSmsProvider.sentMessages.length === 0,
    "Blind retry on UNKNOWN job without confirmation returns 409 and sends 0 SMS"
  )

  // C3: Retry on active SENDING job returns 409
  const activeRetryRes = await adminSmsPatch(makeAdminPatch({ action: "retry", jobId: sendingLockedJob.id }))
  assert(activeRetryRes.status === 409, "Retry on active SENDING job returns 409 conflict")

  // C4: Explicit confirmed resend on UNKNOWN succeeds and logs ADMIN_CONFIRMED_RESEND_UNKNOWN_SMS
  const confirmedResendRes = await adminSmsPatch(
    makeAdminPatch({ action: "retry", jobId: unknownJobResend.id, confirmUnknownResend: true })
  )
  const afterConfirmedResend = await prisma.notificationJob.findUniqueOrThrow({ where: { id: unknownJobResend.id } })
  const resendAudit = await prisma.auditLog.findFirst({
    where: { entity: "NotificationJob", entityId: unknownJobResend.id, action: "ADMIN_CONFIRMED_RESEND_UNKNOWN_SMS" },
  })
  assert(
    confirmedResendRes.status === 200 &&
      afterConfirmedResend.status === "SENT" &&
      MockSmsProvider.sentMessages.some((m) => m.phone === "09126660001") &&
      Boolean(resendAudit),
    "Confirmed resend of UNKNOWN job delivers SMS, transitions to SENT, and records AuditLog"
  )

  // C5: Manual reconcile_unknown MARK_SENT marks SENT without sending duplicate SMS and preserves diagnostic history
  MockSmsProvider.clearAll()
  const reconcileSentRes = await adminSmsPatch(
    makeAdminPatch({
      action: "reconcile_unknown",
      jobId: unknownJobReconcile.id,
      resolution: "MARK_SENT",
      note: "Verified sent in Kavenegar panel",
    })
  )
  const afterReconcile = await prisma.notificationJob.findUniqueOrThrow({ where: { id: unknownJobReconcile.id } })
  const reconcileAudit = await prisma.auditLog.findFirst({
    where: { entity: "NotificationJob", entityId: unknownJobReconcile.id, action: "ADMIN_RECONCILED_UNKNOWN_SMS" },
  })
  assert(
    reconcileSentRes.status === 200 &&
      afterReconcile.status === "SENT" &&
      afterReconcile.sentAt !== null &&
      MockSmsProvider.sentMessages.length === 0 &&
      Boolean(reconcileAudit?.oldData?.includes("502 malformed body")),
    "reconcile_unknown MARK_SENT marks job SENT without duplicate SMS, preserves history in AuditLog, and logs resolution"
  )

  // C6: GET /api/admin/sms?status=UNKNOWN filters accurately and exposes stats
  await prisma.notificationJob.create({
    data: {
      phone: "09126660004",
      type: "OTP",
      message: "تست فیلتر نامشخص",
      status: "UNKNOWN",
      provider: "MOCK",
    },
  })
  const filterReq = new NextRequest("http://localhost:3000/api/admin/sms?status=UNKNOWN", {
    headers: { Cookie: `admin_token=${ownerToken}` },
  })
  const filterRes = await adminSmsGet(filterReq)
  const filterJson = (await filterRes.json()) as {
    jobs: Array<{ status: string }>
    stats: { unknown: number }
  }
  assert(
    filterRes.status === 200 &&
      filterJson.jobs.length === 1 &&
      filterJson.jobs[0].status === "UNKNOWN" &&
      filterJson.stats.unknown >= 1,
    "GET /api/admin/sms?status=UNKNOWN returns UNKNOWN jobs and stats.unknown count"
  )

  // =========================================================================
  // SECTION D — TELEMETRY REDACTION (OBS-41-01)
  // =========================================================================
  console.log("\n📌 Section D: Comprehensive Telemetry Redaction (OBS-41-01)")

  const rawTelemetrySamples = [
    "https://api.kavenegar.com/v1/MY-SUPER-SECRET-KAVE-KEY/verify/lookup.json?receptor=09129876543&token=482910&token2=foo",
    "URL encoded failure: https%3A%2F%2Fapi.kavenegar.com%2Fv1%2FENCODED-API-SECRET-777%2Fsms%2Fsend.json%3FRECEPTOR%3D%2B989129876543%26Token%3D778899%26api_key%3DmyApiSecret99",
    'Headers: Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.secretPayload | x-api-key: TOPSECRET_XAPI | JSON {"merchant_id":"11112222-3333-4444-5555-666677778888","code":"918273","password":"pass!"}',
    "Raw mobile variations: +989121112233 and 00989123334455 and 09351234567 and mobile=09120001122",
  ]

  const sanitizedOutputs = rawTelemetrySamples.map((s) => sanitizeTelemetryText(s))
  const combined = sanitizedOutputs.join("\n")

  const forbiddenLeaks = [
    "MY-SUPER-SECRET-KAVE-KEY",
    "ENCODED-API-SECRET-777",
    "09129876543",
    "9129876543",
    "482910",
    "778899",
    "myApiSecret99",
    "eyJhbGciOiJIUzI1NiJ9",
    "secretPayload",
    "TOPSECRET_XAPI",
    "11112222-3333-4444-5555-666677778888",
    "918273",
    "pass!",
    "09121112233",
    "09123334455",
    "09351234567",
    "09120001122",
  ]

  const leaked = forbiddenLeaks.filter((secret) => combined.includes(secret))
  assert(
    leaked.length === 0,
    "sanitizeTelemetryText() redacts Kavenegar API keys, OTP tokens, mixed-case/URL-encoded params, Bearer tokens, merchant_id, and Iranian phone numbers",
    leaked.length > 0 ? `Leaked secrets: ${leaked.join(", ")}\nOutput:\n${combined}` : undefined
  )
  assert(
    combined.includes("[REDACTED]") && combined.includes("[PHONE_REDACTED]"),
    "Sanitized output contains explicit redaction markers ([REDACTED] / [PHONE_REDACTED])"
  )

  await cleanupFixtures()

  console.log("\n==================================================================")
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log("==================================================================")
  await prisma.$disconnect()
  if (failed > 0) process.exit(1)
}

runPhase42Tests().catch(async (err) => {
  console.error("Unhandled Phase 4.2 suite error:", err)
  await prisma.$disconnect()
  process.exit(1)
})
