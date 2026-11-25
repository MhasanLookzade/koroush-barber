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
import {
  computeServiceDeposit,
  reserveSlotHold,
  handlePaymentCallback,
} from "../lib/booking-engine"
import { POST as payPost } from "../app/api/booking/pay/route"
import { signCustomerToken } from "../lib/auth"

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

function futureDateStr(daysAhead = 5): string {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

async function seedIsolatedFixtures() {
  await prisma.notificationJob.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.slotHold.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.service.deleteMany()
  await prisma.barber.deleteMany()

  const barber = await prisma.barber.create({
    data: {
      id: "pg-barber-1",
      name: "کوروش تست",
      isActive: true,
    },
  })

  const fixedService = await prisma.service.create({
    data: {
      id: "pg-svc-fixed",
      name: "اصلاح کلاسیک",
      price: 300000,
      depositPrice: 75000,
      depositType: "fixed",
      depositPercent: null,
      duration: 60,
      isActive: true,
    },
  })

  const pctService = await prisma.service.create({
    data: {
      id: "pg-svc-pct",
      name: "پکیج ویژه VIP",
      price: 450000,
      depositPrice: 50000, // Deliberately stale to verify BUG-001 fix!
      depositType: "percentage",
      depositPercent: 30, // 30% of 450,000 = 135,000
      duration: 60,
      isActive: true,
    },
  })

  const zeroService = await prisma.service.create({
    data: {
      id: "pg-svc-zero",
      name: "مشاوره رایگان",
      price: 100000,
      depositPrice: 0,
      depositType: "fixed",
      depositPercent: 0,
      duration: 60,
      isActive: true,
    },
  })

  return { barber, fixedService, pctService, zeroService }
}

async function runPhase3Tests() {
  console.log("==================================================================")
  console.log("  PHASE 3 — PAYMENT ENGINE & POSTGRESQL CONCURRENCY TEST SUITE")
  console.log("==================================================================\n")

  const dbUrl = process.env.DATABASE_URL || ""
  assert(
    dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"),
    "Running against real PostgreSQL DATABASE_URL",
    dbUrl
  )

  const versionRows = await prisma.$queryRawUnsafe<Array<{ version: string }>>("SELECT version()")
  console.log(`PostgreSQL Version: ${versionRows[0]?.version}\n`)

  const { barber, fixedService, pctService, zeroService } = await seedIsolatedFixtures()
  const testDate = futureDateStr(7)

  // -------------------------------------------------------------------------
  // A. PAYMENT CALCULATION & INITIATION TESTS
  // -------------------------------------------------------------------------
  console.log("📌 Section A: Payment Calculation & Validation Tests")

  assert(
    computeServiceDeposit({ price: 300000, depositPrice: 75000, depositType: "fixed" }) === 75000,
    "Fixed deposit computes exact integer Tomans (75,000)"
  )
  assert(
    computeServiceDeposit({ price: 450000, depositPrice: 50000, depositType: "percentage", depositPercent: 30 }) === 135000,
    "Percentage deposit computes 30% of 450,000 = 135,000 (ignores stale depositPrice)"
  )
  assert(
    computeServiceDeposit({ price: 100000, depositPrice: 0, depositType: "fixed" }) === 0,
    "Zero fixed deposit computes 0 cleanly"
  )

  let invalidPctRejected = false
  try {
    computeServiceDeposit({ price: 200000, depositPrice: 50000, depositType: "percentage", depositPercent: 150 })
  } catch {
    invalidPctRejected = true
  }
  assert(invalidPctRejected, "Invalid percentage (>100) throws validation error")

  let missingPctRejected = false
  try {
    computeServiceDeposit({ price: 200000, depositPrice: 50000, depositType: "percentage", depositPercent: null })
  } catch {
    missingPctRejected = true
  }
  assert(missingPctRejected, "Missing percentage (null) throws validation error")

  let invalidTypeRejected = false
  try {
    computeServiceDeposit({ price: 200000, depositPrice: 50000, depositType: "invalid_mode" })
  } catch {
    invalidTypeRejected = true
  }
  assert(invalidTypeRejected, "Invalid depositType throws validation error")

  // Reserve with percentage service & initiate payment even with tampered client amount
  const pctHold = await reserveSlotHold({
    barberId: barber.id,
    serviceId: pctService.id,
    dateStr: testDate,
    timeStr: "10:00",
    customerName: "سارا تست",
    customerPhone: "09121110001",
  })
  assert(pctHold.depositAmount === 135000, "reserveSlotHold returns percentage deposit 135,000")
  assert(pctHold.balanceDue === 315000, "reserveSlotHold locks balanceDue = 315,000")

  const payReqTampered = new NextRequest("http://localhost:3000/api/booking/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-real-ip": "10.0.1.1" },
    body: JSON.stringify({ appointmentId: pctHold.appointmentId, amountToman: 1000 }),
  })
  const payResTampered = await payPost(payReqTampered)
  const payDataTampered = await payResTampered.json()
  assert(payResTampered.status === 200, "Percentage deposit payment initiates cleanly (200)")
  assert(payDataTampered.amountToman === 135000, "Server ignores client amountToman=1000 and charges 135,000")

  const createdPayment = await prisma.payment.findUnique({ where: { authority: payDataTampered.authority } })
  assert(
    createdPayment?.amountToman === 135000 && createdPayment?.amountRial === 1350000,
    "Payment ledger stores 135,000 Toman / 1,350,000 Rial"
  )

  // Zero deposit rejection at /pay
  const zeroHold = await reserveSlotHold({
    barberId: barber.id,
    serviceId: zeroService.id,
    dateStr: testDate,
    timeStr: "11:00",
    customerName: "مشتری صفر",
    customerPhone: "09121110002",
  })
  const zeroPayRes = await payPost(
    new NextRequest("http://localhost:3000/api/booking/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": "10.0.1.2" },
      body: JSON.stringify({ appointmentId: zeroHold.appointmentId }),
    })
  )
  assert(zeroPayRes.status === 400, "Zero deposit service is rejected by online payment gateway initiation (400)")

  // Failed payment (NOK)
  const nokRes = await handlePaymentCallback({ authority: payDataTampered.authority, gatewayStatus: "NOK" })
  assert(nokRes.success === false, "NOK callback returns success=false")
  const nokApp = await prisma.appointment.findUnique({ where: { id: pctHold.appointmentId } })
  assert(nokApp?.status === "CANCELLED", "NOK callback cancels appointment and releases hold")

  // Re-reserve and succeed + duplicate callback idempotency
  const fixedHold = await reserveSlotHold({
    barberId: barber.id,
    serviceId: fixedService.id,
    dateStr: testDate,
    timeStr: "10:00",
    customerName: "سارا تست",
    customerPhone: "09121110001",
  })
  const fixedPayRes = await payPost(
    new NextRequest("http://localhost:3000/api/booking/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": "10.0.1.3" },
      body: JSON.stringify({ appointmentId: fixedHold.appointmentId }),
    })
  )
  const fixedPayData = await fixedPayRes.json()
  const ok1 = await handlePaymentCallback({ authority: fixedPayData.authority, gatewayStatus: "OK" })
  const ok2 = await handlePaymentCallback({ authority: fixedPayData.authority, gatewayStatus: "OK" })
  assert(ok1.success && !ok1.isIdempotentRepeat, "First OK callback confirms appointment")
  assert(ok2.success && ok2.isIdempotentRepeat, "Duplicate OK callback is idempotent")

  const repeatPayAfterConfirm = await payPost(
    new NextRequest("http://localhost:3000/api/booking/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": "10.0.1.4" },
      body: JSON.stringify({ appointmentId: fixedHold.appointmentId }),
    })
  )
  assert(repeatPayAfterConfirm.status === 400, "Repeated payment request on CONFIRMED appointment returns 400")

  // -------------------------------------------------------------------------
  // B. BOOKING HOLD OWNERSHIP & EXPIRY TESTS
  // -------------------------------------------------------------------------
  console.log("\n📌 Section B: Booking Hold Ownership & Expiry Tests")

  const ownHold = await reserveSlotHold({
    barberId: barber.id,
    serviceId: fixedService.id,
    dateStr: testDate,
    timeStr: "12:00",
    customerName: "مالک هلد",
    customerPhone: "09121110003",
  })

  // Wrong phone in /pay
  const wrongPhoneRes = await payPost(
    new NextRequest("http://localhost:3000/api/booking/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": "10.0.2.1" },
      body: JSON.stringify({ appointmentId: ownHold.appointmentId, customerPhone: "09129999999" }),
    })
  )
  assert(wrongPhoneRes.status === 403, "Unauthorized phone payment attempt rejected with 403")

  // Wrong customer session cookie in /pay
  const otherCustomer = await prisma.customer.create({
    data: { phone: "09121110099", name: "مشتری دیگر" },
  })
  const otherToken = signCustomerToken({ customerId: otherCustomer.id, phone: otherCustomer.phone, name: otherCustomer.name })
  const wrongCookieRes = await payPost(
    new NextRequest("http://localhost:3000/api/booking/pay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-real-ip": "10.0.2.2",
        cookie: `customer_auth=${otherToken}`,
      },
      body: JSON.stringify({ appointmentId: ownHold.appointmentId }),
    })
  )
  assert(wrongCookieRes.status === 403, "Mismatched customer_auth cookie rejected with 403")

  // Hold ownership mismatch on SlotHold table
  await prisma.slotHold.update({
    where: { id: ownHold.holdId },
    data: { customerPhone: "09128888888" },
  })
  const holdMismatchRes = await payPost(
    new NextRequest("http://localhost:3000/api/booking/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": "10.0.2.3" },
      body: JSON.stringify({ appointmentId: ownHold.appointmentId }),
    })
  )
  assert(holdMismatchRes.status === 403, "Active hold belonging to another customerPhone returns 403")

  // Restore ownership, initiate payment, then expire hold before callback!
  await prisma.slotHold.update({
    where: { id: ownHold.holdId },
    data: { customerPhone: "09121110003" },
  })
  const expPayRes = await payPost(
    new NextRequest("http://localhost:3000/api/booking/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": "10.0.2.4" },
      body: JSON.stringify({ appointmentId: ownHold.appointmentId }),
    })
  )
  const expPayData = await expPayRes.json()

  // Expire the hold
  await prisma.slotHold.update({
    where: { id: ownHold.holdId },
    data: { status: "EXPIRED", expiresAt: new Date(Date.now() - 60000) },
  })
  const expCallback = await handlePaymentCallback({ authority: expPayData.authority, gatewayStatus: "OK" })
  const expApp = await prisma.appointment.findUnique({ where: { id: ownHold.appointmentId } })
  assert(
    expApp?.status === "PAYMENT_REVIEW" && expCallback.isIdempotentRepeat === false,
    "Callback against expired hold does NOT confirm appointment (routes to PAYMENT_REVIEW)"
  )

  // Payment initiation against expired hold returns 410
  const ownHold2 = await reserveSlotHold({
    barberId: barber.id,
    serviceId: fixedService.id,
    dateStr: testDate,
    timeStr: "13:00",
    customerName: "منقضی",
    customerPhone: "09121110004",
  })
  await prisma.slotHold.update({
    where: { id: ownHold2.holdId },
    data: { expiresAt: new Date(Date.now() - 60000) },
  })
  const expiredPayRes = await payPost(
    new NextRequest("http://localhost:3000/api/booking/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": "10.0.2.5" },
      body: JSON.stringify({ appointmentId: ownHold2.appointmentId }),
    })
  )
  assert(expiredPayRes.status === 410, "Payment initiation against expired hold returns 410")

  // -------------------------------------------------------------------------
  // C. REAL POSTGRESQL CONCURRENCY TESTS
  // -------------------------------------------------------------------------
  console.log("\n📌 Section C: Real PostgreSQL Concurrency & Partial Unique Index Tests")

  // 1. Two customers simultaneously reserve the exact same slot
  const raceSlot1 = await Promise.allSettled([
    reserveSlotHold({
      barberId: barber.id,
      serviceId: fixedService.id,
      dateStr: testDate,
      timeStr: "14:00",
      customerName: "کاربر اول",
      customerPhone: "09122220001",
    }),
    reserveSlotHold({
      barberId: barber.id,
      serviceId: fixedService.id,
      dateStr: testDate,
      timeStr: "14:00",
      customerName: "کاربر دوم",
      customerPhone: "09122220002",
    }),
  ])
  const race1Success = raceSlot1.filter((r) => r.status === "fulfilled").length
  const race1Rejected = raceSlot1.filter((r) => r.status === "rejected").length
  assert(
    race1Success === 1 && race1Rejected === 1,
    "2 concurrent reserveSlotHold calls: strictly 1 succeeds, 1 rejected",
    `success=${race1Success}, rejected=${race1Rejected}`
  )

  // 2. 10 simultaneous customers reserve the exact same slot
  const race10 = await Promise.allSettled(
    Array.from({ length: 10 }, (_, i) =>
      reserveSlotHold({
        barberId: barber.id,
        serviceId: fixedService.id,
        dateStr: testDate,
        timeStr: "15:00",
        customerName: `کاربر همزمان ${i}`,
        customerPhone: `0912333000${i}`,
      })
    )
  )
  const race10Success = race10.filter((r) => r.status === "fulfilled").length
  assert(
    race10Success === 1,
    "10 simultaneous reserveSlotHold calls: strictly 1 succeeds, 9 rejected",
    `success=${race10Success}`
  )

  // 3. Concurrent payment callbacks on same authority
  const cbHold = await reserveSlotHold({
    barberId: barber.id,
    serviceId: fixedService.id,
    dateStr: testDate,
    timeStr: "16:00",
    customerName: "تست کال‌بک همزمان",
    customerPhone: "09124440001",
  })
  const cbPayRes = await payPost(
    new NextRequest("http://localhost:3000/api/booking/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": "10.0.3.1" },
      body: JSON.stringify({ appointmentId: cbHold.appointmentId }),
    })
  )
  const cbPayData = await cbPayRes.json()
  const [cbA, cbB] = await Promise.all([
    handlePaymentCallback({ authority: cbPayData.authority, gatewayStatus: "OK" }),
    handlePaymentCallback({ authority: cbPayData.authority, gatewayStatus: "OK" }),
  ])
  const freshConfirmCount = [cbA, cbB].filter((r) => r.success && !r.isIdempotentRepeat).length
  const idempotentCount = [cbA, cbB].filter((r) => r.success && r.isIdempotentRepeat).length
  const notifCount = await prisma.notificationJob.count({
    where: { type: "CONFIRMATION", message: { contains: cbHold.trackingCode } },
  })
  assert(
    freshConfirmCount === 1 && idempotentCount === 1 && notifCount === 1,
    "2 concurrent callbacks: 1 fresh confirm, 1 idempotent repeat, 1 SMS notification",
    `fresh=${freshConfirmCount}, idem=${idempotentCount}, notif=${notifCount}`
  )

  // 4. Direct PostgreSQL partial unique index enforcement verification
  let pgUniqueHoldBlocked = false
  try {
    const slot15 = (await prisma.slotHold.findFirst({ where: { status: "ACTIVE" } }))!
    await prisma.slotHold.create({
      data: {
        barberId: slot15.barberId,
        slotTime: slot15.slotTime,
        customerPhone: "09129998888",
        expiresAt: new Date(Date.now() + 600000),
        status: "ACTIVE",
      },
    })
  } catch (err: unknown) {
    pgUniqueHoldBlocked = (err as { code?: string }).code === "P2002"
  }
  assert(
    pgUniqueHoldBlocked,
    "PostgreSQL partial unique index SlotHold_active_slot_unique rejects duplicate ACTIVE hold with P2002"
  )

  let pgUniqueConfBlocked = false
  try {
    const confApp = (await prisma.appointment.findFirst({ where: { status: "CONFIRMED" } }))!
    await prisma.appointment.create({
      data: {
        trackingCode: "KB-DUP-TEST",
        barberId: confApp.barberId,
        serviceId: confApp.serviceId,
        customerName: "تکراری",
        customerPhone: "09127776666",
        date: confApp.date,
        endDate: confApp.endDate,
        status: "CONFIRMED",
        totalPrice: 100000,
        depositPaid: 50000,
        balanceDue: 50000,
      },
    })
  } catch (err: unknown) {
    pgUniqueConfBlocked = (err as { code?: string }).code === "P2002"
  }
  assert(
    pgUniqueConfBlocked,
    "PostgreSQL partial unique index Appointment_confirmed_slot_unique rejects duplicate CONFIRMED appointment with P2002"
  )

  // 5. Concurrent confirmation and cancellation race
  const ccHold = await reserveSlotHold({
    barberId: barber.id,
    serviceId: fixedService.id,
    dateStr: testDate,
    timeStr: "17:00",
    customerName: "تست لغو همزمان",
    customerPhone: "09125550001",
  })
  const ccPayRes = await payPost(
    new NextRequest("http://localhost:3000/api/booking/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": "10.0.3.2" },
      body: JSON.stringify({ appointmentId: ccHold.appointmentId }),
    })
  )
  const ccPayData = await ccPayRes.json()
  await Promise.allSettled([
    handlePaymentCallback({ authority: ccPayData.authority, gatewayStatus: "OK" }),
    prisma.$transaction([
      prisma.appointment.update({
        where: { id: ccHold.appointmentId },
        data: { status: "CANCELLED", cancellationReason: "لغو همزمان" },
      }),
      prisma.slotHold.updateMany({
        where: { id: ccHold.holdId, status: "ACTIVE" },
        data: { status: "RELEASED" },
      }),
    ]),
  ])
  const ccApp = await prisma.appointment.findUnique({ where: { id: ccHold.appointmentId } })
  assert(
    ["CONFIRMED", "CANCELLED", "PAYMENT_REVIEW"].includes(ccApp?.status || ""),
    "Concurrent confirm & cancel resolves to a consistent state without double-booking",
    `status=${ccApp?.status}`
  )

  // Cleanup isolated test DB
  await seedIsolatedFixtures()
  await prisma.$disconnect()

  console.log("\n==================================================================")
  console.log(`  PHASE 3 SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`)
  console.log("==================================================================")
  if (failed > 0) process.exit(1)
}

runPhase3Tests().catch((err) => {
  console.error("Fatal Phase 3 test error:", err)
  process.exit(1)
})
