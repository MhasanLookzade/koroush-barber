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
import { sanitizeTelemetryInput, sanitizeTelemetryText } from "../lib/http"
import { KavenegarSmsProvider, MockSmsProvider, type SmsProvider } from "../lib/providers/sms"
import {
  DEFAULT_LEASE_DURATION_MS,
  processDueNotificationJobs,
  processNotificationJob,
  recoverStuckSendingJobs,
  runScheduledNotificationCycle,
} from "../lib/notifications"
import { signAdminToken, signCustomerToken } from "../lib/auth"
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

function getTehranJalaliMD(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    timeZone: "Asia/Tehran",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  return `${parts.find((p) => p.type === "month")?.value || "01"}/${parts.find((p) => p.type === "day")?.value || "01"}`
}

function makeCustomSmsProvider(
  sendFn: () => Promise<{
    success: boolean
    messageId?: string
    error?: string
    isRetryable?: boolean
    isUncertain?: boolean
    failureCategory?: "TIMEOUT" | "NETWORK_ERROR" | "HTTP_5XX" | "HTTP_4XX"
    deliveryNote?: "ACCEPTED_BY_PROVIDER" | "REJECTED_OR_FAILED" | "UNCERTAIN"
  }>
): SmsProvider {
  const base = new MockSmsProvider()
  return {
    name: "MOCK",
    isConfigured: () => true,
    sendOtp: base.sendOtp.bind(base),
    sendBookingConfirmation: base.sendBookingConfirmation.bind(base),
    sendReminder: base.sendReminder.bind(base),
    sendBirthdayGreeting: base.sendBirthdayGreeting.bind(base),
    sendCustomSms: async () => sendFn(),
  }
}

async function cleanup() {
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

async function runPhase5Suite() {
  const isPostgres = Boolean(process.env.DATABASE_URL?.startsWith("postgres"))
  console.log("==================================================================")
  console.log(`  PHASE 5 — FINAL RELIABILITY & NOTIFICATION SUITE (${isPostgres ? "PostgreSQL" : "SQLite"})`)
  console.log("==================================================================\n")

  await cleanup()
  const barber = await prisma.barber.findFirstOrThrow({ where: { isActive: true } })
  const service = await prisma.service.findFirstOrThrow({ where: { isActive: true } })
  const ownerToken = signAdminToken({ userId: "p5-owner", username: "admin", role: "OWNER", name: "Owner" })
  const staffToken = signAdminToken({ userId: "p5-staff", username: "staff", role: "STAFF", name: "Staff" })
  const customerToken = signCustomerToken({ customerId: "p5-cust", phone: "09121110000", name: "Customer" })

  // =========================================================================
  // 1. OUT-41-01: WORKER LEASES, 20-WAY CONCURRENCY, CRASH RECOVERY & RETRIES
  // =========================================================================
  console.log("📌 Section 1: OUT-41-01 Worker Leases, Concurrency & Crash Recovery")

  const oldScheduled = new Date(Date.now() - 3 * 60 * 60_000)
  const agedJob = await prisma.notificationJob.create({
    data: {
      phone: "09128001001",
      type: "CUSTOM",
      message: "Normal aged lease test",
      status: "QUEUED",
      provider: "MOCK",
      scheduledAt: oldScheduled,
    },
  })

  let reclaimedWhileActive = -1
  let duringStatus = ""
  const probeProvider = makeCustomSmsProvider(async () => {
    const mid = await prisma.notificationJob.findUniqueOrThrow({ where: { id: agedJob.id } })
    duringStatus = mid.status
    reclaimedWhileActive = await recoverStuckSendingJobs(DEFAULT_LEASE_DURATION_MS)
    return { success: true, messageId: "p5-ok-1", deliveryNote: "ACCEPTED_BY_PROVIDER" }
  })
  const normalRes = await processNotificationJob(agedJob.id, { providerOverride: probeProvider })
  const afterNormal = await prisma.notificationJob.findUniqueOrThrow({ where: { id: agedJob.id } })
  assert(
    normalRes.claimed &&
      normalRes.finalStatus === "SENT" &&
      duringStatus === "SENDING" &&
      reclaimedWhileActive === 0 &&
      afterNormal.scheduledAt.getTime() === oldScheduled.getTime() &&
      afterNormal.lockedAt === null &&
      afterNormal.leaseExpiresAt === null,
    "Active SENDING job preserves scheduledAt, blocks premature recovery (0), and clears lease on SENT"
  )

  // 20-way concurrent claim attempt on same job
  const race20 = await prisma.notificationJob.create({
    data: {
      phone: "09128001002",
      type: "CUSTOM",
      message: "20-way claim race",
      status: "QUEUED",
      provider: "MOCK",
      scheduledAt: oldScheduled,
    },
  })
  let sendCounter20 = 0
  const slow20 = makeCustomSmsProvider(async () => {
    sendCounter20++
    await new Promise((r) => setTimeout(r, 90))
    return { success: true, messageId: "race20-ok" }
  })
  const workers = isPostgres ? 20 : 10
  const outcomes20 = await Promise.all(
    Array.from({ length: workers }, () => processNotificationJob(race20.id, { providerOverride: slow20 }))
  )
  assert(
    outcomes20.filter((o) => o.claimed).length === 1 && sendCounter20 === 1,
    `${workers} concurrent workers claiming same job: strictly 1 winner and 1 SMS`
  )

  // Stuck job recovery + restart + retry backoff after 5xx failure
  const stuckJob = await prisma.notificationJob.create({
    data: {
      phone: "09128001003",
      type: "CUSTOM",
      message: "Stuck lease + 5xx retry test",
      status: "SENDING",
      provider: "MOCK",
      lockedAt: new Date(Date.now() - 120_000),
      leaseExpiresAt: new Date(Date.now() - 10_000),
      scheduledAt: new Date(Date.now() - 120_000),
    },
  })
  const recCount = await recoverStuckSendingJobs(60_000)
  const fail5xx = await processDueNotificationJobs({
    providerOverride: makeCustomSmsProvider(async () => ({
      success: false,
      error: "503 Service Unavailable",
      failureCategory: "HTTP_5XX",
      isRetryable: true,
    })),
  })
  const after5xx = await prisma.notificationJob.findUniqueOrThrow({ where: { id: stuckJob.id } })
  const retryPass = await processNotificationJob(stuckJob.id, { skipScheduleGuard: true })
  const afterRecoveryPass = await prisma.notificationJob.findUniqueOrThrow({ where: { id: stuckJob.id } })
  assert(
    recCount === 1 &&
      fail5xx.retryPending === 1 &&
      after5xx.status === "RETRY_PENDING" &&
      retryPass.finalStatus === "SENT" &&
      afterRecoveryPass.status === "SENT",
    "Stuck job recovers -> transient 5xx moves to RETRY_PENDING -> retry delivers to SENT"
  )

  // Lease fencing check: if lease was reclaimed/altered while stalled worker ran, late write cannot overwrite newer state
  const fenceJob = await prisma.notificationJob.create({
    data: { phone: "09128001004", type: "CUSTOM", message: "fence test", status: "QUEUED", provider: "MOCK" },
  })
  const fencedOutcome = await processNotificationJob(fenceJob.id, {
    skipScheduleGuard: true,
    providerOverride: makeCustomSmsProvider(async () => {
      // Simulate lease expiration + recovery moving job back to RETRY_PENDING mid-flight
      await prisma.notificationJob.update({
        where: { id: fenceJob.id },
        data: { status: "RETRY_PENDING", lockedAt: null, leaseExpiresAt: null },
      })
      return { success: true, messageId: "late-worker-ok" }
    }),
  })
  const afterFence = await prisma.notificationJob.findUniqueOrThrow({ where: { id: fenceJob.id } })
  assert(
    !fencedOutcome.claimed && fencedOutcome.finalStatus === "SKIPPED" && afterFence.status === "RETRY_PENDING",
    "Fenced completion write refuses to overwrite newer RETRY_PENDING state after lease reclaim"
  )

  // =========================================================================
  // 2. CRN-41-01: CONCURRENT CRON DEDUPLICATION (REMINDERS & BIRTHDAYS)
  // =========================================================================
  console.log("\n📌 Section 2: CRN-41-01 Concurrent Cron Deduplication")
  await cleanup()
  const now = new Date()

  await prisma.siteSetting.upsert({
    where: { key: "sms_reminder_rules" },
    update: { value: JSON.stringify({ appointmentReminder: { enabled: true, hoursBefore: 2 }, birthdayGreeting: { enabled: true } }) },
    create: {
      key: "sms_reminder_rules",
      value: JSON.stringify({ appointmentReminder: { enabled: true, hoursBefore: 2 }, birthdayGreeting: { enabled: true } }),
    },
  })

  await prisma.appointment.create({
    data: {
      barberId: barber.id,
      serviceId: service.id,
      customerName: "مشتری نوبت کرون ۱",
      customerPhone: "09128002001",
      date: new Date(now.getTime() + 45 * 60_000),
      endDate: new Date(now.getTime() + 75 * 60_000),
      status: "CONFIRMED",
      trackingCode: "P5REM01",
      totalPrice: service.price,
    },
  })

  const cronParallel = isPostgres ? [2, 10, 20] : [2, 5]
  for (const n of cronParallel) {
    await prisma.notificationJob.deleteMany({ where: { type: "REMINDER" } })
    MockSmsProvider.clearAll()
    const cycles = await Promise.all(Array.from({ length: n }, () => runScheduledNotificationCycle({ now })))
    const jobs = await prisma.notificationJob.count({ where: { type: "REMINDER" } })
    const sent = MockSmsProvider.sentMessages.filter((m) => m.phone === "09128002001").length
    assert(
      jobs === 1 && sent === 1 && cycles.reduce((a, b) => a + b.remindersEnqueued, 0) === 1,
      `Cron Reminder (${n} simultaneous calls): 1 DB row, 1 enqueued, 1 SMS`
    )
  }

  // Distinct second appointment + repeated sweep
  await prisma.appointment.create({
    data: {
      barberId: barber.id,
      serviceId: service.id,
      customerName: "مشتری نوبت کرون ۲",
      customerPhone: "09128002002",
      date: new Date(now.getTime() + 55 * 60_000),
      endDate: new Date(now.getTime() + 85 * 60_000),
      status: "CONFIRMED",
      trackingCode: "P5REM02",
      totalPrice: service.price,
    },
  })
  const secondSweep = await runScheduledNotificationCycle({ now })
  const repeatSweep = await runScheduledNotificationCycle({ now })
  assert(
    secondSweep.remindersEnqueued === 1 &&
      secondSweep.outbox.sent === 1 &&
      repeatSweep.remindersEnqueued === 0 &&
      (await prisma.notificationJob.count({ where: { type: "REMINDER" } })) === 2,
    "Second distinct reminder enqueues & sends cleanly while repeat cron sweep creates 0 duplicates"
  )

  // Birthday concurrency test
  const bdayMd = getTehranJalaliMD(now)
  await prisma.customer.create({
    data: { phone: "09128002099", name: "مشتری تولد ۵", smsConsent: true, birthDate: `1370/${bdayMd}` },
  })
  MockSmsProvider.clearAll()
  const bdayCalls = isPostgres ? 15 : 4
  await Promise.all(Array.from({ length: bdayCalls }, () => runScheduledNotificationCycle({ now })))
  assert(
    (await prisma.notificationJob.count({ where: { type: "BIRTHDAY", phone: "09128002099" } })) === 1 &&
      MockSmsProvider.sentMessages.filter((m) => m.phone === "09128002099").length === 1,
    `Birthday Cron (${bdayCalls} simultaneous calls): 1 DB row & 1 SMS`
  )

  // =========================================================================
  // 3. UI-41-01 & REC-43-01: UNKNOWN RETRY, FAILED RETRY, AUTH & ATOMIC RECONCILE
  // =========================================================================
  console.log("\n📌 Section 3: UI-41-01 UNKNOWN API Workflow, RBAC & Atomic Reconciliation")
  await cleanup()

  const unkOk = await prisma.notificationJob.create({
    data: { phone: "09128003001", type: "CUSTOM", message: "u-ok", status: "UNKNOWN", provider: "MOCK" },
  })
  const unkFail = await prisma.notificationJob.create({
    data: { phone: "09128003002", type: "CUSTOM", message: "u-fail", status: "UNKNOWN", provider: "MOCK" },
  })
  const unkRaceReconcile = await prisma.notificationJob.create({
    data: { phone: "09128003003", type: "CUSTOM", message: "u-race", status: "UNKNOWN", provider: "MOCK" },
  })

  const req = (method: "GET" | "PATCH", token?: string, body?: unknown, url = "http://localhost:3000/api/admin/sms") =>
    new NextRequest(url, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Cookie: `admin_token=${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })

  // Auth guards
  const unauthRes = await adminSmsPatch(req("PATCH", undefined, { action: "retry", jobId: unkOk.id }))
  const custReq = new NextRequest("http://localhost:3000/api/admin/sms", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: `customer_auth=${customerToken}` },
    body: JSON.stringify({ action: "retry", jobId: unkOk.id, confirmUnknownResend: true }),
  })
  const custRes = await adminSmsPatch(custReq)
  assert(
    unauthRes.status === 401 && custRes.status === 401,
    "Unauthorized and customer-token requests rejected with 401"
  )

  // Blind vs confirmed retry + deliveryStatus accuracy
  const blindRes = await adminSmsPatch(req("PATCH", staffToken, { action: "retry", jobId: unkOk.id }))
  const blindBody = (await blindRes.json()) as { requiresConfirmation?: boolean }
  const confirmedRes = await adminSmsPatch(
    req("PATCH", ownerToken, { action: "retry", jobId: unkOk.id, confirmUnknownResend: true })
  )
  const confirmedBody = (await confirmedRes.json()) as {
    success?: boolean
    finalStatus?: string
    deliveryStatus?: string
  }
  assert(
    blindRes.status === 409 &&
      blindBody.requiresConfirmation === true &&
      confirmedRes.status === 200 &&
      confirmedBody.success === true &&
      confirmedBody.finalStatus === "SENT" &&
      confirmedBody.deliveryStatus === "ACCEPTED_BY_PROVIDER",
    "UNKNOWN requires confirmation (409) and confirmed resend returns ACCEPTED_BY_PROVIDER accurately"
  )

  // Failed retry reporting
  MockSmsProvider.nextFailures.push({ error: "Invalid receptor", failureCategory: "HTTP_4XX", isRetryable: false })
  const failedRetryRes = await adminSmsPatch(
    req("PATCH", ownerToken, { action: "retry", jobId: unkFail.id, confirmUnknownResend: true })
  )
  const failedRetryBody = (await failedRetryRes.json()) as {
    success?: boolean
    finalStatus?: string
    deliveryStatus?: string
  }
  assert(
    failedRetryRes.status === 200 &&
      failedRetryBody.success === false &&
      failedRetryBody.finalStatus === "FAILED" &&
      failedRetryBody.deliveryStatus === "FAILED",
    "Failed retry returns finalStatus=FAILED & success=false accurately"
  )

  // Concurrent atomic reconcile_unknown (REC-43-01 fix verification)
  const recRace = await Promise.all([
    adminSmsPatch(req("PATCH", staffToken, { action: "reconcile_unknown", jobId: unkRaceReconcile.id, resolution: "MARK_SENT" })),
    adminSmsPatch(req("PATCH", ownerToken, { action: "reconcile_unknown", jobId: unkRaceReconcile.id, resolution: "MARK_FAILED" })),
  ])
  const recStatuses = recRace.map((r) => r.status).sort()
  assert(
    recStatuses[0] === 200 && recStatuses[1] === 409,
    "Concurrent reconcile_unknown executions serialize atomically ([200, 409], REC-43-01 fixed)",
    `statuses=${JSON.stringify(recStatuses)}`
  )

  // GET stats exposes unknown separately
  await prisma.notificationJob.create({
    data: { phone: "09128003004", type: "OTP", message: "stat-u", status: "UNKNOWN", provider: "MOCK" },
  })
  const getStatsRes = await adminSmsGet(req("GET", staffToken, undefined, "http://localhost:3000/api/admin/sms?status=UNKNOWN"))
  const getStatsJson = (await getStatsRes.json()) as { stats: { unknown: number }; jobs: Array<{ status: string }> }
  assert(
    getStatsRes.status === 200 && getStatsJson.stats.unknown >= 1 && getStatsJson.jobs.every((j) => j.status === "UNKNOWN"),
    "GET /api/admin/sms returns distinct unknown counter & filtered UNKNOWN records for STAFF/OWNER"
  )

  // =========================================================================
  // 4. OBS-41-01 & SMS-41-02: NESTED ERROR TELEMETRY & PROVIDER ACCEPTANCE
  // =========================================================================
  console.log("\n📌 Section 4: OBS-41-01 Nested Error Redaction & SMS-41-02 Delivery Semantics")

  const kaveUrlErr = new Error(
    "Upstream HTTP 500 calling https://api.kavenegar.com/v1/MYSECRETKEY999/verify/lookup.json?receptor=09129876543&token=459123&TOKEN2=abc"
  )
  const nestedCauseErr = Object.assign(new Error("fetch failed while calling SMS gateway"), {
    cause: {
      code: "ECONNRESET",
      url: "Progress 100% then https%3A%2F%2Fapi.kavenegar.com%2Fv1%2FENCODEDKEY777%2Fsms%2Fsend.json%3FRECEPTOR%3D%2B989123456789%26otp%3D882211",
      response: {
        detail: "token=hiddenTok555",
        data: {
          receptor: "09351112233",
          merchant_id: "11111111-2222-3333-4444-555555555555",
          code: 774411,
        },
      },
    },
  })

  const s1 = sanitizeTelemetryText(kaveUrlErr.message)
  const s2 = sanitizeTelemetryInput(nestedCauseErr)
  const s3 = sanitizeTelemetryText('{"code":123456,"token":987654,"receptor":"091233344')
  const combinedRedacted = `${s1}\n${s2}\n${s3}`
  const leaks = [
    "MYSECRETKEY999",
    "09129876543",
    "459123",
    "ENCODEDKEY777",
    "09123456789",
    "9123456789",
    "882211",
    "hiddenTok555",
    "09351112233",
    "11111111-2222-3333-4444-555555555555",
    "774411",
    "123456",
    "987654",
    "091233344",
  ].filter((x) => combinedRedacted.includes(x))
  assert(
    leaks.length === 0 && s2.includes("ECONNRESET") && s1.includes("[REDACTED]"),
    "sanitizeTelemetryText & sanitizeTelemetryInput redact Kavenegar URLs, unquoted numeric JSON OTPs, nested Error causes, 100%+encoded queries, and receptors while keeping ECONNRESET diagnostic",
    leaks.length > 0 ? `Leaked: ${leaks.join(", ")}\n${combinedRedacted}` : undefined
  )

  // Verify Kavenegar HTTP 200 reports ACCEPTED_BY_PROVIDER (never handset delivery)
  const origFetch = global.fetch
  try {
    process.env.KAVENEGAR_API_KEY = "test-p5-kave-key"
    const kave = new KavenegarSmsProvider("test-p5-kave-key")
    global.fetch = (async () =>
      new Response(JSON.stringify({ return: { status: 200, message: "تایید شد" }, entries: [{ messageid: 987654 }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch
    const kRes = await kave.sendCustomSms("09121112233", "تست معنایی")
    assert(
      kRes.success === true && kRes.deliveryNote === "ACCEPTED_BY_PROVIDER" && kRes.messageId === "987654",
      "Kavenegar 200 returns deliveryNote=ACCEPTED_BY_PROVIDER (accurately distinguishing acceptance from handset receipt)"
    )
  } finally {
    global.fetch = origFetch
    delete process.env.KAVENEGAR_API_KEY
  }

  await cleanup()
  console.log("\n==================================================================")
  console.log(`  PHASE 5 SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log("==================================================================")
  await prisma.$disconnect()
  if (failed > 0) process.exit(1)
}

runPhase5Suite().catch(async (err) => {
  console.error("Phase 5 suite fatal error:", err)
  await prisma.$disconnect()
  process.exit(1)
})
