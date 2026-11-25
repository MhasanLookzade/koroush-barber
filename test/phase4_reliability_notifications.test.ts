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
import { ZarinPalPaymentGateway, type PaymentGatewayProvider } from "../lib/providers/payment"
import { KavenegarSmsProvider, MockSmsProvider } from "../lib/providers/sms"
import {
  enqueueNotificationJob,
  processNotificationJob,
  processDueNotificationJobs,
  recoverStuckSendingJobs,
  runScheduledNotificationCycle,
} from "../lib/notifications"
import { reserveSlotHold, handlePaymentCallback } from "../lib/booking-engine"
import { POST as reschedulePost } from "../app/api/admin/appointments/reschedule/route"
import { POST as cronPost } from "../app/api/cron/notifications/route"
import { signAdminToken } from "../lib/auth"

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

async function runPhase4Tests() {
  console.log("==================================================================")
  console.log("  PHASE 4 — EXTERNAL RELIABILITY & TRANSACTIONAL OUTBOX SUITE")
  console.log("==================================================================\n")

  await cleanupFixtures()

  const barber = await prisma.barber.findFirstOrThrow({ where: { isActive: true } })
  const service = await prisma.service.findFirstOrThrow({ where: { isActive: true } })
  const ownerToken = signAdminToken({ userId: "admin-p4", username: "admin", role: "OWNER", name: "Owner" })

  // -------------------------------------------------------------------------
  // 1. SECRET & OTP LOG SANITIZATION
  // -------------------------------------------------------------------------
  console.log("📌 Section 1: Observability Secret & OTP Redaction")
  const redacted = sanitizeTelemetryText(
    "https://api.kavenegar.com/v1/SECRET-API-KEY-12345/verify/lookup.json?receptor=09121234567&token=654321&template=verify Authorization: Bearer secretTokenXYZ"
  )
  assert(
    !redacted.includes("SECRET-API-KEY-12345") &&
      !redacted.includes("654321") &&
      !redacted.includes("secretTokenXYZ"),
    "Telemetry sanitizer strips API keys, OTP tokens, and Bearer tokens"
  )

  // -------------------------------------------------------------------------
  // 2. ZARINPAL RELIABILITY (TIMEOUT, 4XX, 5XX, INVALID JSON, DISCONNECT)
  // -------------------------------------------------------------------------
  console.log("\n📌 Section 2: ZarinPal Timeout, HTTP Guard, Invalid JSON & Network Tests")
  const zp = new ZarinPalPaymentGateway("12345678-1234-1234-1234-123456789012", true)
  const originalFetch = global.fetch

  try {
    // A. Timeout on initiatePayment (single bounded attempt, no blind retry)
    let initiateCalls = 0
    process.env.PAYMENT_TIMEOUT_MS = "1000"
    global.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      initiateCalls++
      const err = new Error("The operation timed out")
      err.name = "TimeoutError"
      throw err
    }) as typeof fetch

    let initTimedOut = false
    try {
      await zp.initiatePayment({
        amountToman: 50000,
        callbackUrl: "http://localhost:3000/api/booking/callback",
        description: "Test",
        customerPhone: "09120000001",
        bookingReference: "KB-ZP-TO",
      })
    } catch {
      initTimedOut = true
    }
    assert(initTimedOut && initiateCalls === 1, "ZarinPal timeout rejects without blind initiation retries")

    // B. ZarinPal verify Timeout -> isUncertain=true
    const verTimeout = await zp.verifyPayment({ authority: "A0001", amountToman: 50000 })
    assert(
      !verTimeout.success && verTimeout.isUncertain === true && verTimeout.failureCategory === "TIMEOUT",
      "ZarinPal verify timeout classifies as uncertain TIMEOUT"
    )

    // C. Invalid JSON (502 HTML)
    global.fetch = (async () =>
      new Response("<html><body>502 Bad Gateway</body></html>", { status: 502 })) as typeof fetch
    const ver502 = await zp.verifyPayment({ authority: "A0002", amountToman: 50000 })
    assert(
      !ver502.success && ver502.isUncertain === true && ver502.failureCategory === "HTTP_5XX",
      "ZarinPal 502 HTML handles gracefully without SyntaxError and stays uncertain"
    )

    // D. HTTP 200 Invalid non-JSON body
    global.fetch = (async () => new Response("NOT_JSON_PAYLOAD", { status: 200 })) as typeof fetch
    const verBadJson = await zp.verifyPayment({ authority: "A0003", amountToman: 50000 })
    assert(
      !verBadJson.success && verBadJson.isUncertain === true && verBadJson.failureCategory === "INVALID_JSON",
      "ZarinPal 200 non-JSON classifies safely as INVALID_JSON (uncertain)"
    )

    // E. HTTP 4xx explicit ZarinPal rejection -> isUncertain=false
    global.fetch = (async () =>
      new Response(JSON.stringify({ errors: { code: -50, message: "Amount mismatch" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch
    const ver400 = await zp.verifyPayment({ authority: "A0004", amountToman: 50000 })
    assert(
      !ver400.success && ver400.isUncertain === false,
      "ZarinPal HTTP 400 structured error classifies as definitive bank rejection"
    )

    // F. Network disconnection
    global.fetch = (async () => {
      throw new TypeError("fetch failed: ECONNRESET")
    }) as typeof fetch
    const verNet = await zp.verifyPayment({ authority: "A0005", amountToman: 50000 })
    assert(
      !verNet.success && verNet.isUncertain === true && verNet.failureCategory === "NETWORK_ERROR",
      "ZarinPal network disconnect classifies as uncertain NETWORK_ERROR"
    )

    // -----------------------------------------------------------------------
    // 3. KAVENEGAR RELIABILITY (TIMEOUT, 4XX, 5XX, INVALID JSON, DISCONNECT)
    // -----------------------------------------------------------------------
    console.log("\n📌 Section 3: Kavenegar Timeout, HTTP Guard, Invalid JSON & Network Tests")
    const kav = new KavenegarSmsProvider("KAV-TEST-SECRET-KEY-999")

    global.fetch = (async () => {
      const e = new Error("TimeoutError")
      e.name = "TimeoutError"
      throw e
    }) as typeof fetch
    const kavTimeout = await kav.sendCustomSms("09120000010", "تست تایم‌اوت")
    assert(
      !kavTimeout.success &&
        kavTimeout.failureCategory === "TIMEOUT" &&
        kavTimeout.isRetryable === true &&
        kavTimeout.isUncertain === true,
      "Kavenegar timeout classifies as retryable & uncertain TIMEOUT"
    )

    global.fetch = (async () => new Response("<html>Bad Gateway</html>", { status: 502 })) as typeof fetch
    const kav502 = await kav.sendOtp("09120000010", "123456")
    assert(
      !kav502.success && kav502.failureCategory === "HTTP_5XX" && kav502.isRetryable === true,
      "Kavenegar 502 HTML safely returns retryable HTTP_5XX without leaking key/OTP"
    )

    global.fetch = (async () => new Response("corrupt", { status: 200 })) as typeof fetch
    const kavBadJson = await kav.sendBookingConfirmation("09120000010", {
      trackingCode: "KB-1",
      serviceName: "Test",
      jalaliDate: "۱۴۰۵/۰۹/۰۵",
      time: "14:00",
    })
    assert(
      !kavBadJson.success && kavBadJson.failureCategory === "INVALID_JSON" && kavBadJson.isUncertain === true,
      "Kavenegar 200 non-JSON classifies as uncertain INVALID_JSON"
    )

    global.fetch = (async () =>
      new Response(JSON.stringify({ return: { status: 411, message: "Invalid receptor" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch
    const kav4xx = await kav.sendCustomSms("09120000010", "test")
    assert(
      !kav4xx.success && kav4xx.isRetryable === false,
      "Kavenegar 4xx permanent failure does NOT mark isRetryable=true"
    )

    global.fetch = (async () => {
      throw new TypeError("fetch failed: socket hang up")
    }) as typeof fetch
    const kavNet = await kav.sendCustomSms("09120000010", "test")
    assert(
      !kavNet.success && kavNet.failureCategory === "NETWORK_ERROR" && kavNet.isRetryable === true,
      "Kavenegar network disconnect classifies as retryable NETWORK_ERROR"
    )
  } finally {
    global.fetch = originalFetch
    delete process.env.PAYMENT_TIMEOUT_MS
  }

  // -------------------------------------------------------------------------
  // 4. PAYMENT UNCERTAIN VERIFY -> RECOVERY & DUPLICATE CALLBACKS
  // -------------------------------------------------------------------------
  console.log("\n📌 Section 4: Uncertain Gateway Verify Preserves PENDING State & Recovers Cleanly")
  const dateStr = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const hold = await reserveSlotHold({
    barberId: barber.id,
    serviceId: service.id,
    dateStr,
    timeStr: "14:00",
    customerName: "کاربر درگاه",
    customerPhone: "09121112233",
  })
  const payRec = await prisma.payment.create({
    data: {
      appointmentId: hold.appointmentId,
      authority: "UNCERTAIN-AUTH-1",
      amountToman: hold.depositAmount,
      amountRial: hold.depositAmount * 10,
      gateway: "ZARINPAL",
      status: "PENDING",
    },
  })

  const uncertainGateway: PaymentGatewayProvider = {
    name: "ZARINPAL",
    async initiatePayment() {
      throw new Error("not used")
    },
    async verifyPayment() {
      return {
        success: false,
        isUncertain: true,
        failureCategory: "TIMEOUT",
        errorCode: "TIMEOUT",
        errorMessage: "Timeout contacting ZarinPal",
      }
    },
  }

  const cbUncertain = await handlePaymentCallback({
    authority: payRec.authority,
    gatewayStatus: "OK",
    gatewayOverride: uncertainGateway,
  })
  const payAfterUncertain = await prisma.payment.findUnique({ where: { id: payRec.id } })
  const appAfterUncertain = await prisma.appointment.findUnique({ where: { id: hold.appointmentId } })
  assert(
    cbUncertain.success === false &&
      cbUncertain.isUncertain === true &&
      payAfterUncertain?.status === "PENDING" &&
      appAfterUncertain?.status === "HELD",
    "Uncertain ZarinPal timeout leaves Payment PENDING and never confirms or cancels slot"
  )

  // Now gateway recovers -> callback succeeds and duplicate callback is idempotent!
  const recoveredGateway: PaymentGatewayProvider = {
    name: "ZARINPAL",
    async initiatePayment() {
      throw new Error("not used")
    },
    async verifyPayment() {
      return { success: true, refId: "ZP-998877", cardPan: "603799******1111" }
    },
  }
  const cbOk1 = await handlePaymentCallback({
    authority: payRec.authority,
    gatewayStatus: "OK",
    gatewayOverride: recoveredGateway,
  })
  const cbOk2 = await handlePaymentCallback({
    authority: payRec.authority,
    gatewayStatus: "OK",
    gatewayOverride: recoveredGateway,
  })
  assert(
    cbOk1.success && !cbOk1.isIdempotentRepeat && cbOk2.success && cbOk2.isIdempotentRepeat,
    "Recovered ZarinPal verify confirms booking cleanly and subsequent duplicate callback is idempotent"
  )

  // -------------------------------------------------------------------------
  // 5. OUTBOX DUPLICATE PREVENTION, RETRY EXHAUSTION, WORKER RESTART & RECOVERY
  // -------------------------------------------------------------------------
  console.log("\n📌 Section 5: Outbox Deduplication, Retry Exhaustion, Restart Recovery & Failure States")

  // Duplicate enqueue guard
  const e1 = await enqueueNotificationJob(prisma, {
    phone: "09123334455",
    recipientName: "تست تکراری",
    type: "REMINDER",
    message: "یادآوری KB-DUP-44",
    dedupContains: "KB-DUP-44",
  })
  const e2 = await enqueueNotificationJob(prisma, {
    phone: "09123334455",
    recipientName: "تست تکراری",
    type: "REMINDER",
    message: "یادآوری KB-DUP-44",
    dedupContains: "KB-DUP-44",
  })
  assert(e1.enqueued === true && e2.enqueued === false, "enqueueNotificationJob blocks duplicate job creation")

  // Concurrent processNotificationJob claims strictly once
  MockSmsProvider.clearAll()
  const [claimA, claimB] = await Promise.all([
    processNotificationJob(e1.job.id),
    processNotificationJob(e1.job.id),
  ])
  const claimedCount = [claimA, claimB].filter((c) => c.claimed).length
  assert(
    claimedCount === 1 && MockSmsProvider.sentMessages.length === 1,
    "Concurrent outbox job processing claims & sends strictly once (zero duplicate SMS)"
  )

  // Permanent failure -> immediately FAILED
  MockSmsProvider.clearAll()
  MockSmsProvider.nextFailures.push({
    error: "Invalid receptor parameter",
    failureCategory: "HTTP_4XX",
    isRetryable: false,
  })
  const permJob = await enqueueNotificationJob(prisma, {
    phone: "09123334466",
    type: "CUSTOM",
    message: "Permanent failure test",
  })
  const permOutcome = await processNotificationJob(permJob.job.id)
  assert(permOutcome.finalStatus === "FAILED", "Permanent 4xx failure immediately marks NotificationJob FAILED")

  // Retry exhaustion (TIMEOUT -> RETRY_PENDING x2 -> UNKNOWN)
  MockSmsProvider.clearAll()
  MockSmsProvider.nextFailures.push(
    { error: "Timeout 1", failureCategory: "TIMEOUT", isRetryable: true, isUncertain: true },
    { error: "Timeout 2", failureCategory: "TIMEOUT", isRetryable: true, isUncertain: true },
    { error: "Timeout 3", failureCategory: "TIMEOUT", isRetryable: true, isUncertain: true }
  )
  const retryJob = await enqueueNotificationJob(prisma, {
    phone: "09123334477",
    type: "CUSTOM",
    message: "Timeout exhaustion test",
  })
  const att1 = await processNotificationJob(retryJob.job.id, { maxAttempts: 3, baseBackoffMs: 1, skipScheduleGuard: true })
  const att2 = await processNotificationJob(retryJob.job.id, { maxAttempts: 3, baseBackoffMs: 1, skipScheduleGuard: true })
  const att3 = await processNotificationJob(retryJob.job.id, { maxAttempts: 3, baseBackoffMs: 1, skipScheduleGuard: true })
  assert(
    att1.finalStatus === "RETRY_PENDING" && att2.finalStatus === "RETRY_PENDING" && att3.finalStatus === "UNKNOWN",
    "Retry exhaustion on TIMEOUT transitions RETRY_PENDING -> RETRY_PENDING -> UNKNOWN"
  )

  // Worker restart recovery of stranded SENDING job
  MockSmsProvider.clearAll()
  const stranded = await prisma.notificationJob.create({
    data: {
      phone: "09123334488",
      type: "CUSTOM",
      message: "Stranded before worker crash",
      status: "SENDING",
      provider: "MOCK",
      scheduledAt: new Date(Date.now() - 120_000),
    },
  })
  const recoveredNum = await recoverStuckSendingJobs(60_000)
  const outboxRun = await processDueNotificationJobs()
  const recoveredJob = await prisma.notificationJob.findUnique({ where: { id: stranded.id } })
  assert(
    recoveredNum >= 1 && outboxRun.sent >= 1 && recoveredJob?.status === "SENT",
    "Worker restart recovers stranded SENDING job and delivers cleanly to SENT"
  )

  // -------------------------------------------------------------------------
  // 6. ADMIN RESCHEDULE (BUG-002): REAL DELIVERY, FAILED SMS SAFETY & TX ROLLBACK
  // -------------------------------------------------------------------------
  console.log("\n📌 Section 6: Admin Reschedule Notification (BUG-002) & Tx Rollback")

  // A. Successful reschedule SMS (no fake SMS_IR!)
  const resSuccess = await reschedulePost(
    new NextRequest("http://localhost:3000/api/admin/appointments/reschedule", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: `admin_token=${ownerToken}` },
      body: JSON.stringify({
        appointmentId: hold.appointmentId,
        newDateStr: dateStr,
        newTimeStr: "15:00",
        reason: "تغییر تایم به درخواست مشتری",
      }),
    })
  )
  const resSuccessData = await resSuccess.json()
  const resJobOk = await prisma.notificationJob.findFirst({
    where: { phone: "09121112233", type: "RESCHEDULE" },
    orderBy: { createdAt: "desc" },
  })
  assert(
    resSuccess.status === 200 &&
      resSuccessData.notificationStatus === "SENT" &&
      resJobOk?.status === "SENT" &&
      resJobOk?.provider !== "SMS_IR",
    "Admin reschedule commits and dispatches real RESCHEDULE SMS (provider=MOCK, status=SENT)"
  )

  // B. Failed SMS during reschedule: reschedule STILL COMMITS, job is RETRY_PENDING, then recovers!
  MockSmsProvider.nextFailures.push({
    error: "Upstream 503",
    failureCategory: "HTTP_5XX",
    isRetryable: true,
  })
  const resSmsFail = await reschedulePost(
    new NextRequest("http://localhost:3000/api/admin/appointments/reschedule", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: `admin_token=${ownerToken}` },
      body: JSON.stringify({
        appointmentId: hold.appointmentId,
        newDateStr: dateStr,
        newTimeStr: "16:00",
        reason: "تست قطعی پیامک",
      }),
    })
  )
  const resFailData = await resSmsFail.json()
  const resJobFailed = await prisma.notificationJob.findFirst({
    where: { phone: "09121112233", type: "RESCHEDULE", message: { contains: "16:00" } },
  })
  assert(
    resSmsFail.status === 200 &&
      resFailData.notificationStatus === "RETRY_PENDING" &&
      resJobFailed?.status === "RETRY_PENDING" &&
      resJobFailed?.sentAt === null,
    "Failed SMS does NOT roll back reschedule; job stored as RETRY_PENDING (not fake SENT)"
  )

  // Retry recovery delivers the reschedule SMS cleanly
  const retryDelivery = await processNotificationJob(resJobFailed!.id, { skipScheduleGuard: true })
  assert(retryDelivery.finalStatus === "SENT", "Retry recovers failed reschedule NotificationJob to SENT")

  // C. DB transaction rollback (conflicting slot): zero orphan NotificationJob created
  const conflictApp = await prisma.appointment.create({
    data: {
      trackingCode: "KB-ROLLBACK-CONF",
      barberId: barber.id,
      serviceId: service.id,
      customerName: "مشتری تداخل",
      customerPhone: "09128889900",
      date: new Date(resFailData.appointment.dateUtc),
      endDate: new Date(new Date(resFailData.appointment.dateUtc).getTime() + 60 * 60 * 1000),
      status: "CONFIRMED",
      totalPrice: service.price,
      depositPaid: service.depositPrice,
      balanceDue: service.price - service.depositPrice,
    },
  })
  // Wait: put conflictApp at 17:00 on dateStr, then try to reschedule hold onto 17:00!
  const { createUtcFromTehranTime } = await import("../lib/jalali")
  await prisma.appointment.update({
    where: { id: conflictApp.id },
    data: {
      date: createUtcFromTehranTime(dateStr, "17:00"),
      endDate: new Date(createUtcFromTehranTime(dateStr, "17:00").getTime() + 60 * 60 * 1000),
    },
  })
  const countBeforeRollback = await prisma.notificationJob.count()
  const badResched = await reschedulePost(
    new NextRequest("http://localhost:3000/api/admin/appointments/reschedule", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: `admin_token=${ownerToken}` },
      body: JSON.stringify({
        appointmentId: hold.appointmentId,
        newDateStr: dateStr,
        newTimeStr: "17:00",
      }),
    })
  )
  const countAfterRollback = await prisma.notificationJob.count()
  assert(
    badResched.status === 409 && countBeforeRollback === countAfterRollback,
    "Reschedule transaction rollback (slot conflict 409) leaves zero orphan NotificationJob rows"
  )

  // -------------------------------------------------------------------------
  // 7. SCHEDULED AUTOMATION CYCLE & CRON AUTH (BUG-008)
  // -------------------------------------------------------------------------
  console.log("\n📌 Section 7: Scheduled Reminder/Birthday Outbox & Cron Endpoint (BUG-008)")

  // Seed upcoming confirmed appointment within 2h reminder window
  const remDate = new Date(Date.now() + 60 * 60 * 1000)
  await prisma.appointment.create({
    data: {
      trackingCode: "KB-REM-808",
      barberId: barber.id,
      serviceId: service.id,
      customerName: "مشتری یادآوری",
      customerPhone: "09125556677",
      date: remDate,
      endDate: new Date(remDate.getTime() + 60 * 60 * 1000),
      status: "CONFIRMED",
      totalPrice: service.price,
      depositPaid: service.depositPrice,
      balanceDue: service.price - service.depositPrice,
    },
  })

  const cronUnauth = await cronPost(new NextRequest("http://localhost:3000/api/cron/notifications", { method: "POST" }))
  assert(cronUnauth.status === 401, "Cron endpoint rejects unauthenticated calls with 401")

  const cycle1 = await runScheduledNotificationCycle()
  const cycle2 = await runScheduledNotificationCycle()
  assert(
    cycle1.remindersEnqueued === 1 && cycle1.outbox.sent >= 1 && cycle2.remindersEnqueued === 0,
    "Scheduled notification cycle enqueues reminder idempotently (1st=1, 2nd=0) and delivers SENT"
  )

  await cleanupFixtures()
  await prisma.$disconnect()

  console.log("\n==================================================================")
  console.log(`  PHASE 4 SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`)
  console.log("==================================================================")
  if (failed > 0) process.exit(1)
}

runPhase4Tests().catch((err) => {
  console.error("Fatal Phase 4 test error:", err)
  process.exit(1)
})
