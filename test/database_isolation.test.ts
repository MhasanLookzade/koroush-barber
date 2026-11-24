import { prisma } from "../lib/db"
import { isValidSlotTime, reserveSlotHold } from "../lib/booking-engine"
import { resetDevDatabase } from "../scripts/reset-dev-db"

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

async function runDatabaseIsolationSuite() {
  console.log("==================================================================")
  console.log("  KOROUSH BARBER — DATABASE ISOLATION & BOOKING INTEGRITY TESTS")
  console.log("==================================================================\n")

  // ---------------------------------------------------------------------------
  // Test 1: Empty Business Database Verification
  // ---------------------------------------------------------------------------
  console.log("📌 Test 1: Baseline Clean Database Verification")
  const appointmentCount = await prisma.appointment.count()
  const customerCount = await prisma.customer.count()
  const paymentCount = await prisma.payment.count()
  const reviewCount = await prisma.review.count()
  const slotHoldCount = await prisma.slotHold.count()

  assert(
    appointmentCount === 0,
    "Zero appointment records exist in baseline database",
    `Found: ${appointmentCount}`
  )
  assert(
    customerCount === 0,
    "Zero customer records exist in baseline database",
    `Found: ${customerCount}`
  )
  assert(
    paymentCount === 0,
    "Zero payment records exist in baseline database",
    `Found: ${paymentCount}`
  )
  assert(
    reviewCount === 0,
    "Zero fake reviews exist in baseline database",
    `Found: ${reviewCount}`
  )
  assert(
    slotHoldCount === 0,
    "Zero lingering slot holds exist in baseline database",
    `Found: ${slotHoldCount}`
  )

  // Baseline master fixtures must exist
  const serviceCount = await prisma.service.count()
  const barberCount = await prisma.barber.count()
  const adminCount = await prisma.adminUser.count()
  assert(
    serviceCount >= 8,
    "All 8 baseline salon services are provisioned",
    `Found: ${serviceCount}`
  )
  assert(
    barberCount >= 1,
    "Master barber (Koroush) is provisioned",
    `Found: ${barberCount}`
  )
  assert(
    adminCount >= 1,
    "Master admin account is provisioned",
    `Found: ${adminCount}`
  )

  // ---------------------------------------------------------------------------
  // Test 2: Slot Time Validation & 10:49 Rejection
  // ---------------------------------------------------------------------------
  console.log("\n📌 Test 2: Strict Hourly Slot Validation & Fractional Rejection")
  assert(
    isValidSlotTime("10:49") === false,
    "Invalid fractional start time '10:49' is strictly rejected"
  )
  assert(
    isValidSlotTime("14:15") === false,
    "Invalid fractional start time '14:15' is strictly rejected"
  )
  assert(
    isValidSlotTime("09:00") === false,
    "Off-operating start time '09:00' before 10:00 is rejected"
  )
  assert(
    isValidSlotTime("23:00") === false,
    "Closing start time '23:00' is rejected (last valid slot is 22:00 for 60m duration)"
  )
  assert(
    isValidSlotTime("10:00") === true,
    "Valid start time '10:00' is accepted"
  )
  assert(
    isValidSlotTime("14:00") === true,
    "Valid start time '14:00' is accepted"
  )
  assert(
    isValidSlotTime("22:00") === true,
    "Final valid start time '22:00' is accepted"
  )

  // Attempting reserveSlotHold with 10:49 must throw an exception
  const barber = await prisma.barber.findFirst({ where: { isActive: true } })
  const barberId = barber?.id || "barber-kourosh"
  const service = await prisma.service.findFirst({ where: { isActive: true } })
  const serviceId = service?.id || "srv-classic-cut"

  let rejected1049 = false
  try {
    await reserveSlotHold({
      barberId,
      serviceId,
      dateStr: "2026-12-20",
      timeStr: "10:49",
      customerName: "تست خطا",
      customerPhone: "09121110000",
    })
  } catch {
    rejected1049 = true
  }
  assert(
    rejected1049 === true,
    "reserveSlotHold immediately throws validation error for '10:49'"
  )

  // ---------------------------------------------------------------------------
  // Test 3: Atomic Double-Booking Protection
  // ---------------------------------------------------------------------------
  console.log("\n📌 Test 3: Atomic Double-Booking Protection (Concurrent Slot Race)")
  const testIsoDate = "2026-12-25"
  const targetSlot = "16:00"

  // Fire 2 simultaneous hold requests for the exact same slot
  const [race1, race2] = await Promise.allSettled([
    reserveSlotHold({
      barberId,
      serviceId,
      dateStr: testIsoDate,
      timeStr: targetSlot,
      customerName: "مشتری همزمان اول",
      customerPhone: "09125551122",
    }),
    reserveSlotHold({
      barberId,
      serviceId,
      dateStr: testIsoDate,
      timeStr: targetSlot,
      customerName: "مشتری همزمان دوم",
      customerPhone: "09126663344",
    }),
  ])

  const oneFulfilled = (race1.status === "fulfilled" && race2.status === "rejected") ||
                       (race1.status === "rejected" && race2.status === "fulfilled")
  assert(
    oneFulfilled === true,
    "Concurrent hold race produces exactly 1 winner and 1 rejected conflict",
    `Race1: ${race1.status}, Race2: ${race2.status}`
  )

  // ---------------------------------------------------------------------------
  // Test 4: Development Database Reset Safety & Integrity
  // ---------------------------------------------------------------------------
  console.log("\n📌 Test 4: Development Database Reset Integrity (resetDevDatabase)")
  await resetDevDatabase()

  const afterResetApps = await prisma.appointment.count()
  const afterResetCustomers = await prisma.customer.count()
  const afterResetHolds = await prisma.slotHold.count()
  const afterResetPayments = await prisma.payment.count()
  const afterResetServices = await prisma.service.count()

  assert(
    afterResetApps === 0,
    "db:reset:dev leaves exactly 0 appointments"
  )
  assert(
    afterResetCustomers === 0,
    "db:reset:dev leaves exactly 0 customers"
  )
  assert(
    afterResetHolds === 0,
    "db:reset:dev leaves exactly 0 lingering slot holds"
  )
  assert(
    afterResetPayments === 0,
    "db:reset:dev leaves exactly 0 lingering payments"
  )
  assert(
    afterResetServices >= 8,
    "Baseline services remain intact after db:reset:dev",
    `Count: ${afterResetServices}`
  )

  // ---------------------------------------------------------------------------
  // Final Verdict
  // ---------------------------------------------------------------------------
  console.log("\n==================================================================")
  console.log(`  SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log("==================================================================")

  if (failed > 0) {
    process.exit(1)
  }
}

runDatabaseIsolationSuite()
  .catch((e) => {
    console.error("Database isolation suite fatal:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
