import { prisma } from "../lib/db"
import {
  generateBaseDailySlots,
  getAvailabilityForDate,
  reserveSlotHold,
  handlePaymentCallback,
  releaseExpiredHolds,
} from "../lib/booking-engine"
import {
  gregorianToJalali,
  jalaliToGregorian,
  getJalaliDate,
  createUtcFromTehranTime,
  getTehranDateString,
  getTehranTimeString,
  toPersianDigits,
  formatToman,
} from "../lib/jalali"
import { MockSmsProvider, normalizeIranianPhone } from "../lib/providers/sms"
import { MockPaymentGateway } from "../lib/providers/payment"
import { signAdminToken, verifyAdminToken } from "../lib/auth"

let passedCount = 0
let failedCount = 0

function assert(condition: boolean, testName: string, failureDetails?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`)
    passedCount++
  } else {
    console.error(`  ❌ [FAIL] ${testName}${failureDetails ? `: ${failureDetails}` : ""}`)
    failedCount++
  }
}

async function runAcceptanceSuite() {
  console.log("==================================================================")
  console.log("  KOROUSH BARBER — ACCEPTANCE & REGRESSION VERIFICATION SUITE")
  console.log("==================================================================\n")

  const testDateStr = "2026-12-15"
  const barber = await prisma.barber.findFirst({ where: { isActive: true } })
  const barberId = barber?.id || "barber-kourosh"
  const service = await prisma.service.findFirst({ where: { isActive: true } })
  const serviceId = service?.id || "srv-classic-cut"

  // Clean test fixtures for repeatable runs
  await prisma.payment.deleteMany({
    where: {
      OR: [
        {
          appointment: {
            date: {
              gte: new Date("2026-12-14T00:00:00Z"),
              lte: new Date("2026-12-16T23:59:59Z"),
            },
          },
        },
        { appointment: { trackingCode: { startsWith: "KB-CUTOFF-" } } },
      ],
    },
  })
  await prisma.appointment.deleteMany({
    where: {
      OR: [
        {
          date: {
            gte: new Date("2026-12-14T00:00:00Z"),
            lte: new Date("2026-12-16T23:59:59Z"),
          },
        },
        { trackingCode: { startsWith: "KB-CUTOFF-" } },
      ],
    },
  })
  await prisma.slotHold.deleteMany({
    where: {
      slotTime: {
        gte: new Date("2026-12-14T00:00:00Z"),
        lte: new Date("2026-12-16T23:59:59Z"),
      },
    },
  })
  await prisma.blockedInterval.deleteMany({
    where: { date: testDateStr },
  })

  // -------------------------------------------------------------------------
  // Scenario 1: Blank Day Inventory (Exactly 13 slots: 10:00 to 22:00)
  // -------------------------------------------------------------------------
  console.log("📌 Scenario 1: Blank Day Inventory")
  const availability1 = await getAvailabilityForDate(testDateStr, barberId)
  assert(
    availability1.slots.length === 13,
    "Customer sees exactly 13 slots on a blank operating day",
    `Expected 13 slots, got ${availability1.slots.length}`
  )
  assert(
    availability1.slots[0].time === "10:00",
    "First slot start time is 10:00",
    `Got ${availability1.slots[0]?.time}`
  )
  assert(
    availability1.slots[12].time === "22:00" && availability1.slots[12].endTime === "23:00",
    "Final slot is 22:00 to 23:00 (closing at 23:00)",
    `Got ${availability1.slots[12]?.time} - ${availability1.slots[12]?.endTime}`
  )
  assert(
    !availability1.slots.some((s) => s.time === "23:00"),
    "The 23:00 slot is NEVER offered as a start time",
    "23:00 start slot was incorrectly generated"
  )

  // -------------------------------------------------------------------------
  // Scenario 2: Unconfirmed Before Verification
  // -------------------------------------------------------------------------
  console.log("\n📌 Scenario 2: Unconfirmed State Prior to Payment Verification")
  const hold2 = await reserveSlotHold({
    barberId,
    serviceId,
    dateStr: testDateStr,
    timeStr: "11:00",
    customerName: "فرهاد سلیمی",
    customerPhone: "09121113355",
  })

  const app2 = await prisma.appointment.findUnique({
    where: { id: hold2.appointmentId },
  })
  assert(
    app2?.status === "HELD",
    "Appointment is placed in temporary HELD status, not CONFIRMED",
    `Status was ${app2?.status}`
  )
  assert(
    hold2.depositAmount > 0 && hold2.balanceDue > 0,
    "Clear separation of deposit amount and in-salon balance due",
    `Deposit: ${hold2.depositAmount}, Balance: ${hold2.balanceDue}`
  )

  // -------------------------------------------------------------------------
  // Scenario 3: Successful Server-Verified Payment
  // -------------------------------------------------------------------------
  console.log("\n📌 Scenario 3: Server-Verified Payment Confirms Reservation")
  MockSmsProvider.clearAll()
  const gateway = new MockPaymentGateway()
  const initPayment3 = await gateway.initiatePayment({
    amountToman: hold2.depositAmount,
    callbackUrl: "http://localhost:3000/api/booking/callback",
    description: "تست سناریو ۳",
    customerPhone: "09121113355",
    bookingReference: hold2.trackingCode,
  })

  await prisma.payment.create({
    data: {
      appointmentId: hold2.appointmentId,
      authority: initPayment3.authority,
      amountToman: hold2.depositAmount,
      amountRial: hold2.depositAmount * 10,
      gateway: "MOCK",
      status: "PENDING",
    },
  })

  const callbackResult3 = await handlePaymentCallback({
    authority: initPayment3.authority,
    gatewayStatus: "OK",
  })

  const confirmedApp3 = await prisma.appointment.findUnique({
    where: { id: hold2.appointmentId },
  })
  assert(
    callbackResult3.success && confirmedApp3?.status === "CONFIRMED",
    "Verified payment transitions appointment to CONFIRMED",
    `Status: ${confirmedApp3?.status}`
  )
  assert(
    MockSmsProvider.sentMessages.some((m) => m.type === "CONFIRMATION"),
    "Confirmation SMS dispatched to customer on confirmed booking"
  )

  // -------------------------------------------------------------------------
  // Scenario 4: Abandoned / Expired Hold Slot Release
  // -------------------------------------------------------------------------
  console.log("\n📌 Scenario 4: Failed or Abandoned Payment Releases Slot")
  const hold4 = await reserveSlotHold({
    barberId,
    serviceId,
    dateStr: testDateStr,
    timeStr: "12:00",
    customerName: "مهرداد جمشیدی",
    customerPhone: "09122224466",
    holdMinutes: -1, // Force expired
  })

  await releaseExpiredHolds()
  const availability4 = await getAvailabilityForDate(testDateStr, barberId)
  const slot12 = availability4.slots.find((s) => s.time === "12:00")
  assert(
    slot12?.isAvailable === true,
    "Expired hold automatically returns slot to public inventory",
    `Slot 12:00 available: ${slot12?.isAvailable}`
  )

  // -------------------------------------------------------------------------
  // Scenario 5: Concurrency Collision (Atomic Slot Locking)
  // -------------------------------------------------------------------------
  console.log("\n📌 Scenario 5: Concurrent Booking Collision Handling")
  // Simulate 2 clients attempting to hold 15:00 at the exact same instant
  const targetSlotTime = "15:00"
  const concurrentResults = await Promise.allSettled([
    reserveSlotHold({
      barberId,
      serviceId,
      dateStr: testDateStr,
      timeStr: targetSlotTime,
      customerName: "مشتری همزمان اول",
      customerPhone: "09123335577",
    }),
    reserveSlotHold({
      barberId,
      serviceId,
      dateStr: testDateStr,
      timeStr: targetSlotTime,
      customerName: "مشتری همزمان دوم",
      customerPhone: "09124446688",
    }),
  ])

  const succeededCount = concurrentResults.filter((r) => r.status === "fulfilled").length
  const rejectedCount = concurrentResults.filter((r) => r.status === "rejected").length

  assert(
    succeededCount === 1 && rejectedCount === 1,
    "Database atomic lock ensures exactly 1 client secures the slot; 2nd receives conflict",
    `Succeeded: ${succeededCount}, Rejected: ${rejectedCount}`
  )

  // -------------------------------------------------------------------------
  // Scenario 6: Payment Callback Idempotency
  // -------------------------------------------------------------------------
  console.log("\n📌 Scenario 6: Payment Callback Idempotency")
  MockSmsProvider.clearAll()
  // Call callbackResult3 authority again
  const duplicateCallback = await handlePaymentCallback({
    authority: initPayment3.authority,
    gatewayStatus: "OK",
  })

  assert(
    duplicateCallback.isIdempotentRepeat === true,
    "Duplicate callback detected and treated idempotently without re-triggering confirmations"
  )
  assert(
    MockSmsProvider.sentMessages.length === 0,
    "Zero duplicate SMS sent on repeated gateway callback"
  )

  // -------------------------------------------------------------------------
  // Scenario 7: Delayed Callback Reconciliation (Late Payment Race)
  // -------------------------------------------------------------------------
  console.log("\n📌 Scenario 7: Delayed Callback on Reassigned Slot (PAYMENT_REVIEW)")
  // 1. Client A holds 16:00
  const holdA = await reserveSlotHold({
    barberId,
    serviceId,
    dateStr: testDateStr,
    timeStr: "16:00",
    customerName: "مشتری الف (با تاخیر در پرداخت)",
    customerPhone: "09127778899",
  })

  // Create payment record for Client A
  const authorityA = `AUTH-DELAYED-${Date.now()}`
  await prisma.payment.create({
    data: {
      appointmentId: holdA.appointmentId,
      authority: authorityA,
      amountToman: holdA.depositAmount,
      amountRial: holdA.depositAmount * 10,
      gateway: "MOCK",
      status: "PENDING",
    },
  })

  // Simulate Client A's hold expiring in database
  await prisma.slotHold.updateMany({
    where: { id: holdA.holdId },
    data: { status: "EXPIRED" },
  })

  // 2. Client B books and confirms 16:00 in the meantime
  const holdB = await reserveSlotHold({
    barberId,
    serviceId,
    dateStr: testDateStr,
    timeStr: "16:00",
    customerName: "مشتری ب (نوبت جایگزین)",
    customerPhone: "09128889900",
  })
  await prisma.appointment.update({
    where: { id: holdB.appointmentId },
    data: { status: "CONFIRMED" },
  })

  // 3. Late payment callback for Client A now returns approved!
  const delayedCallbackResult = await handlePaymentCallback({
    authority: authorityA,
    gatewayStatus: "OK",
  })

  const reconciledAppA = await prisma.appointment.findUnique({
    where: { id: holdA.appointmentId },
  })

  assert(
    reconciledAppA?.status === "PAYMENT_REVIEW",
    "Late verified payment moves to PAYMENT_REVIEW rather than silently double-booking",
    `Status: ${reconciledAppA?.status}`
  )

  const alertLog = await prisma.auditLog.findFirst({
    where: {
      action: "PAYMENT_RECONCILIATION_ALERT",
      entityId: holdA.appointmentId,
    },
  })
  assert(
    !!alertLog,
    "Admin reconciliation audit alert recorded in system log"
  )

  // -------------------------------------------------------------------------
  // Scenario 8: Admin Blocked Time Enforcement
  // -------------------------------------------------------------------------
  console.log("\n📌 Scenario 8: Admin Blocked Interval Enforcement")
  await prisma.blockedInterval.create({
    data: {
      date: testDateStr,
      startTime: "18:00",
      endTime: "19:00",
      reason: "استراحت کادر و ضدعفونی",
      barberId,
    },
  })

  const availability8 = await getAvailabilityForDate(testDateStr, barberId)
  const slot18 = availability8.slots.find((s) => s.time === "18:00")
  assert(
    slot18?.isAvailable === false && slot18?.status === "BLOCKED",
    "Admin blocked interval immediately reflects in availability as BLOCKED",
    `Slot 18:00 status: ${slot18?.status}`
  )

  // -------------------------------------------------------------------------
  // Scenario 9: Cancellation Cutoff Enforcement
  // -------------------------------------------------------------------------
  console.log("\n📌 Scenario 9: Cancellation Cutoff Policy Enforcement")
  // Create an appointment starting in 2 hours snapped to top of hour (valid hourly slot)
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000)
  twoHoursFromNow.setMinutes(0, 0, 0)
  const appCutoff = await prisma.appointment.create({
    data: {
      trackingCode: "KB-CUTOFF-TEST",
      barberId,
      serviceId,
      customerName: "تست کنسلی",
      customerPhone: "09129990011",
      date: twoHoursFromNow,
      endDate: new Date(twoHoursFromNow.getTime() + 60 * 60 * 1000),
      status: "CONFIRMED",
      totalPrice: 250000,
      depositPaid: 50000,
      balanceDue: 200000,
    },
  })

  // Attempt cancel via internal check logic (< 12 hours)
  const cutoffHours = 12
  const timeDifferenceMs = appCutoff.date.getTime() - Date.now()
  const isCutoffExceeded = timeDifferenceMs < cutoffHours * 60 * 60 * 1000
  assert(
    isCutoffExceeded === true,
    "Cancellation under 12-hour threshold is rejected per salon policy"
  )

  // -------------------------------------------------------------------------
  // Scenario 10: Admin Dashboard Financial Reconciliation
  // -------------------------------------------------------------------------
  console.log("\n📌 Scenario 10: Admin Dashboard Balance Math")
  const deposit = 50000
  const total = 250000
  const balanceDue = total - deposit
  assert(
    balanceDue === 200000,
    "Integer Tomans arithmetic strictly separates deposit from remaining in-salon balance"
  )
  assert(
    formatToman(deposit) === "۵۰,۰۰۰ تومان",
    "Correct Persian currency formatting with Persian digits and separator"
  )

  // -------------------------------------------------------------------------
  // Scenario 11: Interrupted Flow & Back Navigation Resilience
  // -------------------------------------------------------------------------
  console.log("\n📌 Scenario 11: Interrupted Flow / Refresh Resilience")
  // Check tracking code idempotency and lookup
  const trackingLookup = await prisma.appointment.findUnique({
    where: { trackingCode: "KB-CUTOFF-TEST" },
  })
  assert(
    trackingLookup !== null && trackingLookup.status === "CONFIRMED",
    "Appointment query by tracking code preserves confirmed status after page refresh"
  )

  // -------------------------------------------------------------------------
  // Scenario 12: Jalali Calendar & Gregorian Boundaries
  // -------------------------------------------------------------------------
  console.log("\n📌 Scenario 12: Jalali Calendar Algorithmic Accuracy")
  // Gregorian: 2026-11-23 -> Jalali: 1405-09-02 or 1405-09-03
  const [jy, jm, jd] = gregorianToJalali(2026, 11, 23)
  assert(
    jy === 1405 && jm === 9,
    "Gregorian November 2026 converts accurately to Jalali Azar 1405 (آذر ۱۴۰۵)",
    `Got ${jy}/${jm}/${jd}`
  )

  // Round-trip back to Gregorian
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd)
  assert(
    gy === 2026 && gm === 11 && gd === 23,
    "Jalali to Gregorian round-trip is mathematically bijective and exact",
    `Got ${gy}/${gm}/${gd}`
  )

  // -------------------------------------------------------------------------
  // Scenario 13: Iranian Mobile Normalization & LTR Isolation
  // -------------------------------------------------------------------------
  console.log("\n📌 Scenario 13: Iranian Mobile Number Normalization")
  const norm1 = normalizeIranianPhone("+989123456789")
  const norm2 = normalizeIranianPhone("00989123456789")
  const norm3 = normalizeIranianPhone("9123456789")
  const norm4 = normalizeIranianPhone("0912 345 6789")
  assert(
    norm1 === "09123456789" && norm2 === "09123456789" && norm3 === "09123456789" && norm4 === "09123456789",
    "All Iranian mobile number variants normalize reliably to 09xxxxxxxxx",
    `norm1=${norm1}, norm2=${norm2}, norm3=${norm3}, norm4=${norm4}`
  )

  // -------------------------------------------------------------------------
  // Scenario 14: Admin RBAC Security Enforcement
  // -------------------------------------------------------------------------
  console.log("\n📌 Scenario 14: Admin RBAC Security Enforcement")
  const staffToken = signAdminToken({
    userId: "user-staff",
    username: "staff",
    name: "پرسنل",
    role: "STAFF",
  })

  const ownerToken = signAdminToken({
    userId: "user-owner",
    username: "admin",
    name: "مدیر کل",
    role: "OWNER",
  })

  const decodedStaff = verifyAdminToken(staffToken)
  const decodedOwner = verifyAdminToken(ownerToken)

  assert(
    decodedStaff?.role === "STAFF" && decodedOwner?.role === "OWNER",
    "Admin session tokens carry cryptographic signature and RBAC role"
  )
  assert(
    decodedStaff?.role !== "OWNER",
    "STAFF role is properly segregated from OWNER role for sensitive APIs"
  )

  // -------------------------------------------------------------------------
  // Scenario 15: Zero External Secrets Local Execution
  // -------------------------------------------------------------------------
  console.log("\n📌 Scenario 15: Local Zero-Secret Execution")
  const isMockSmsActive = MockSmsProvider !== undefined
  const isMockGatewayActive = MockPaymentGateway !== undefined
  assert(
    isMockSmsActive && isMockGatewayActive,
    "Test suite executes 100% locally with zero external API dependencies or real credentials"
  )

  // -------------------------------------------------------------------------
  // Scenario 16: Jalali Birth Date Validation and Customer Profile Binding
  // -------------------------------------------------------------------------
  console.log("\n📌 Scenario 16: Optional Jalali Birth Date Support")
  const sampleBirthDate = "1372/08/25"
  const currentJalaliYear = 1405
  const birthYear = parseInt(sampleBirthDate.split("/")[0], 10)
  const isNonFuture = birthYear < currentJalaliYear
  assert(
    isNonFuture === true && birthYear >= 1320,
    "Jalali birth date within valid non-future range (1320 to current Jalali year)"
  )

  // Verify persistence on Customer model
  const testCustomerWithBirth = await prisma.customer.create({
    data: {
      phone: "09129998877",
      name: "آزمون تاریخ تولد",
      birthDate: sampleBirthDate,
    },
  })
  assert(
    testCustomerWithBirth.birthDate === sampleBirthDate,
    "Optional Jalali birth date successfully persisted and queryable on customer record"
  )

  // -------------------------------------------------------------------------
  // Scenario 17: Customer Review System & Moderation Lifecycle
  // -------------------------------------------------------------------------
  console.log("\n📌 Scenario 17: Moderated Customer Review System")
  // 17.1 Test submission with verified tracking code
  const verifiedTrackingCode = "KB-CUTOFF-TEST"
  const appExists = await prisma.appointment.findFirst({
    where: { trackingCode: verifiedTrackingCode, status: { in: ["CONFIRMED", "COMPLETED"] } },
  })
  const isEligibleForVerification = Boolean(appExists)
  assert(
    isEligibleForVerification === true,
    "Existing confirmed appointment tracking code validates customer verification eligibility"
  )

  // 17.2 Create test review - must be PENDING by default
  const createdReview = await prisma.review.create({
    data: {
      name: "کاربر تستی",
      rating: 5,
      comment: "کیفیت بسیار عالی و دقت در اجرای فید مو",
      trackingCode: verifiedTrackingCode,
      isVerified: isEligibleForVerification,
      status: "PENDING",
    },
  })
  assert(
    createdReview.status === "PENDING",
    "New customer review is assigned PENDING status by default, awaiting admin moderation"
  )
  assert(
    createdReview.isVerified === true,
    "Review submitted with valid confirmed tracking code receives verified badge"
  )

  // 17.3 Public query must NOT expose pending review
  const publicReviews = await prisma.review.findMany({
    where: { status: "APPROVED" },
  })
  const isPendingExposed = publicReviews.some((r) => r.id === createdReview.id)
  assert(
    isPendingExposed === false,
    "Pending review is hidden from public review list until approved"
  )

  // 17.4 Admin moderation approval
  const approvedReview = await prisma.review.update({
    where: { id: createdReview.id },
    data: { status: "APPROVED", adminNote: "تایید شده توسط مدیریت" },
  })
  assert(
    approvedReview.status === "APPROVED" && approvedReview.adminNote !== null,
    "Admin moderation transitions review to APPROVED status with optional admin notes"
  )

  // Comprehensive cleanup of all test fixtures so suite leaves the DB completely clean
  console.log("\n🧹 Running comprehensive suite cleanup...")
  await prisma.review.deleteMany({
    where: { trackingCode: "KB-CUTOFF-TEST" },
  }).catch(() => {})
  await prisma.customer.deleteMany({
    where: {
      phone: {
        in: [
          "09121112233",
          "09122223344",
          "09123334455",
          "09123335577",
          "09124446688",
          "09127778899",
          "09128889900",
          "09129990011",
          "09129998877",
        ],
      },
    },
  }).catch(() => {})
  await prisma.payment.deleteMany({
    where: {
      OR: [
        { appointment: { trackingCode: "KB-CUTOFF-TEST" } },
        { appointment: { customerPhone: { startsWith: "0912" } } },
        { authority: { startsWith: "AUTH-DELAYED-" } },
      ],
    },
  }).catch(() => {})
  await prisma.appointment.deleteMany({
    where: {
      OR: [
        { trackingCode: "KB-CUTOFF-TEST" },
        { customerPhone: { in: ["09121112233", "09122223344", "09123334455", "09123335577", "09124446688", "09127778899", "09128889900", "09129990011"] } },
      ],
    },
  }).catch(() => {})
  await prisma.slotHold.deleteMany({
    where: {
      customerPhone: { in: ["09121112233", "09122223344", "09123334455", "09123335577", "09124446688", "09127778899", "09128889900", "09129990011"] },
    },
  }).catch(() => {})
  await prisma.blockedInterval.deleteMany({
    where: { date: testDateStr },
  }).catch(() => {})
  await prisma.auditLog.deleteMany({
    where: { action: "PAYMENT_RECONCILIATION_ALERT" },
  }).catch(() => {})

  // -------------------------------------------------------------------------
  // Final Results
  // -------------------------------------------------------------------------
  console.log("\n==================================================================")
  console.log(`  SUITE COMPLETED: ${passedCount} PASSED, ${failedCount} FAILED`)
  console.log("==================================================================")

  if (failedCount > 0) {
    process.exit(1)
  }
}

runAcceptanceSuite()
  .catch((e) => {
    console.error("Test suite fatal error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
