const { chromium } = require("playwright")
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function runTests() {
  console.log("==================================================================")
  console.log("   CUSTOMER DIRECTORY & JALALI BIRTHDATE HARDENING TEST SUITE    ")
  console.log("==================================================================\n")

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`)
      passed++
    } else {
      console.error(`  ✗ FAIL: ${message}`)
      failed++
    }
  }

  const testPhones = ["09129998801", "09129998802", "09129998803", "09129998804"]

  try {
    // Clean up test data
    await prisma.appointment.deleteMany({
      where: { customerPhone: { in: testPhones } },
    })
    await prisma.slotHold.deleteMany({
      where: { customerPhone: { in: testPhones } },
    })
    await prisma.customer.deleteMany({
      where: { phone: { in: testPhones } },
    })

    // Get an existing barber and service
    const barber = await prisma.barber.findFirst({ where: { isActive: true } })
    const service = await prisma.service.findFirst({ where: { isActive: true } })

    if (!barber || !service) {
      throw new Error("No active barber or service found in database to run tests.")
    }

    // Dynamic import of reserveSlotHold
    const { reserveSlotHold } = await import("../lib/booking-engine.ts")

    // Future date helper (3 days in future)
    const futureDate = new Date(Date.now() + 3 * 24 * 3600 * 1000)
    const futureDateStr = futureDate.toISOString().split("T")[0]

    // =========================================================================
    // TEST 1: NEW CUSTOMER REGISTRATION & CANONICAL NAME ESTABLISHMENT
    // =========================================================================
    console.log("--- 1. Testing New Customer First Booking (Canonical Name & BirthDate) ---")
    const phone1 = "09129998801"

    const holdResult1 = await reserveSlotHold({
      barberId: barber.id,
      serviceId: service.id,
      dateStr: futureDateStr,
      timeStr: "11:00",
      customerName: "علیرضا تهرانی",
      customerPhone: phone1,
      customerBirthDate: "1372/06/15",
    })

    assert(Boolean(holdResult1.holdId), "SlotHold created successfully for new customer")
    assert(Boolean(holdResult1.appointmentId), "Appointment created successfully")

    const customer1 = await prisma.customer.findUnique({
      where: { phone: phone1 },
    })

    assert(customer1 !== null, "Customer record created in directory")
    assert(customer1.name === "علیرضا تهرانی", `Customer canonical name is "علیرضا تهرانی" (got "${customer1.name}")`)
    assert(customer1.birthDate === "1372/06/15", `Customer birthDate is "1372/06/15" (got "${customer1.birthDate}")`)

    const appt1 = await prisma.appointment.findUnique({
      where: { id: holdResult1.appointmentId },
    })
    assert(appt1.customerName === "علیرضا تهرانی", "Appointment saved customerName")
    assert(appt1.customerBirthDate === "1372/06/15", "Appointment saved customerBirthDate")

    // =========================================================================
    // TEST 2: REPEAT BOOKING DOES NOT OVERWRITE CANONICAL NAME WITH NICKNAME
    // =========================================================================
    console.log("\n--- 2. Testing Repeat Booking Canonical Protection ---")

    const holdResult2 = await reserveSlotHold({
      barberId: barber.id,
      serviceId: service.id,
      dateStr: futureDateStr,
      timeStr: "12:00",
      customerName: "علی", // Shorthand / nickname
      customerPhone: phone1, // Same customer phone
      // no birth date entered
    })

    const customerAfterRepeat = await prisma.customer.findUnique({
      where: { phone: phone1 },
    })

    assert(
      customerAfterRepeat.name === "علیرضا تهرانی",
      `Customer directory preserved canonical name "علیرضا تهرانی" instead of degrading to "علی" (current: "${customerAfterRepeat.name}")`
    )
    assert(
      customerAfterRepeat.birthDate === "1372/06/15",
      "Customer directory preserved previously registered birthDate"
    )

    const appt2 = await prisma.appointment.findUnique({
      where: { id: holdResult2.appointmentId },
    })
    assert(appt2.customerName === "علی", "Appointment specifically reflects nickname entered for this visit")
    assert(appt2.customerBirthDate === "1372/06/15", "Appointment inherited birthDate from customer directory")

    // =========================================================================
    // TEST 3: UPGRADING PLACEHOLDER CUSTOMER NAME ON SUBSEQUENT BOOKING
    // =========================================================================
    console.log("\n--- 3. Testing Upgrading Placeholder Customer Name ---")
    const phone2 = "09129998802"
    // Create customer with placeholder name (simulating OTP verify before booking)
    await prisma.customer.create({
      data: {
        phone: phone2,
        name: "کاربر جدید",
        birthDate: null,
      },
    })

    await reserveSlotHold({
      barberId: barber.id,
      serviceId: service.id,
      dateStr: futureDateStr,
      timeStr: "13:00",
      customerName: "سهراب سپهری",
      customerPhone: phone2,
      customerBirthDate: "1365/07/14",
    })

    const customerPlaceholderUpgraded = await prisma.customer.findUnique({
      where: { phone: phone2 },
    })

    assert(
      customerPlaceholderUpgraded.name === "سهراب سپهری",
      `Placeholder customer name upgraded to "سهراب سپهری" (got "${customerPlaceholderUpgraded.name}")`
    )
    assert(
      customerPlaceholderUpgraded.birthDate === "1365/07/14",
      `Placeholder customer birthDate populated with "1365/07/14" (got "${customerPlaceholderUpgraded.birthDate}")`
    )

    // =========================================================================
    // TEST 4: ADMIN PATCH API VALIDATIONS (NAME, BIRTHDATE FORMAT)
    // =========================================================================
    console.log("\n--- 4. Testing Admin PATCH Customer Profile API ---")
    const loginRes = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123456" }),
    })
    assert(loginRes.ok, "Admin login successful")
    const setCookieHeader = loginRes.headers.get("set-cookie") || ""
    const adminTokenMatch = setCookieHeader.match(/admin_token=([^;]+)/)
    const adminToken = adminTokenMatch ? adminTokenMatch[1] : ""
    assert(Boolean(adminToken), "Extracted admin_token from login response")

    const headersWithAuth = {
      "Content-Type": "application/json",
      Cookie: `admin_token=${adminToken}`,
    }

    // 4.1 Successful name and birthDate update
    const patchRes1 = await fetch("http://localhost:3000/api/admin/customers", {
      method: "PATCH",
      headers: headersWithAuth,
      body: JSON.stringify({
        id: customer1.id,
        name: "علیرضا تهرانی‌راد",
        birthDate: "1372/06/20",
        notes: "مشتری VIP سالن",
      }),
    })
    assert(patchRes1.ok, "PATCH /api/admin/customers returned 200 OK")
    const patchData1 = await patchRes1.json()
    assert(patchData1.success === true, "Response has success: true")
    assert(patchData1.customer.name === "علیرضا تهرانی‌راد", "Customer name updated in DB")
    assert(patchData1.customer.birthDate === "1372/06/20", "Customer birthDate updated in DB")

    // 4.2 Validation rejection on invalid Jalali date format
    const patchResBadDate = await fetch("http://localhost:3000/api/admin/customers", {
      method: "PATCH",
      headers: headersWithAuth,
      body: JSON.stringify({
        id: customer1.id,
        birthDate: "1372-99-99", // Invalid format
      }),
    })
    assert(patchResBadDate.status === 400, "PATCH with invalid Jalali birthDate rejected with 400")

    // 4.3 Validation rejection on empty name
    const patchResEmptyName = await fetch("http://localhost:3000/api/admin/customers", {
      method: "PATCH",
      headers: headersWithAuth,
      body: JSON.stringify({
        id: customer1.id,
        name: "   ", // Empty name
      }),
    })
    assert(patchResEmptyName.status === 400, "PATCH with empty name rejected with 400")

    // 4.4 Clearing birthDate with null
    const patchResClearBirth = await fetch("http://localhost:3000/api/admin/customers", {
      method: "PATCH",
      headers: headersWithAuth,
      body: JSON.stringify({
        id: customer1.id,
        birthDate: null,
      }),
    })
    assert(patchResClearBirth.ok, "PATCH clearing birthDate returned 200 OK")
    const clearedCustomer = await prisma.customer.findUnique({ where: { id: customer1.id } })
    assert(clearedCustomer.birthDate === null, "Customer birthDate successfully cleared to null")

    // =========================================================================
    // TEST 5: NO "مشتری گرامی" IN ENTIRE DATABASE
    // =========================================================================
    console.log("\n--- 5. Testing Elimination of 'مشتری گرامی' in DB ---")
    const legacyCount = await prisma.customer.count({
      where: { name: { contains: "مشتری گرامی" } },
    })
    assert(legacyCount === 0, `Zero occurrences of "مشتری گرامی" in Customer table (count: ${legacyCount})`)

    // =========================================================================
    // TEST 6: PLAYWRIGHT E2E UI TEST IN ADMIN CRM MODAL
    // =========================================================================
    console.log("\n--- 6. Playwright E2E UI Test (Admin Customer Modal & BirthDatePicker) ---")
    const browser = await chromium.launch({
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      headless: true,
    })
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    })
    const page = await context.newPage()

    // Login via UI
    await page.goto("http://localhost:3000/admin-login", { waitUntil: "networkidle" })
    await page.fill('input[name="username"]', "admin")
    await page.fill('input[name="password"]', "admin123456")
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {}),
      page.click('button[type="submit"]'),
    ])

    // Navigate to customers page
    await page.goto("http://localhost:3000/admin/customers", { waitUntil: "networkidle" })
    await page.waitForTimeout(1000)

    // Check customer row for phone1
    const customerRow = page.locator(`tr:has-text("${phone1}")`)
    await customerRow.waitFor({ timeout: 5000 })
    assert(await customerRow.isVisible(), `Customer row for ${phone1} is visible in table`)

    // Open modal
    await customerRow.locator('button:has-text("پرونده کامل")').click()
    await page.waitForTimeout(500)

    // Verify modal is visible
    const modal = page.locator('div[role="dialog"]')
    assert(await modal.isVisible(), "Customer details modal opened")

    // Verify editable canonical name input
    const nameInput = modal.locator('input[placeholder="نام کامل مشتری..."]')
    assert(await nameInput.isVisible(), "Canonical name input is present in modal")
    await nameInput.fill("علیرضا تهرانی (VIP)")

    // Verify JalaliBirthDatePicker selects
    const yearSelect = modal.locator('select[aria-label="سال تولد"]')
    const monthSelect = modal.locator('select[aria-label="ماه تولد"]')
    const daySelect = modal.locator('select[aria-label="روز تولد"]')

    assert(await yearSelect.isVisible(), "Jalali Year select is visible")
    assert(await monthSelect.isVisible(), "Jalali Month select is visible")
    assert(await daySelect.isVisible(), "Jalali Day select is visible")

    // Select birth date: 1374 / 07 / 15
    await yearSelect.selectOption("1374")
    await monthSelect.selectOption("07")
    await daySelect.selectOption("15")

    // Click "ذخیره تغییرات پرونده"
    const saveButton = modal.locator('button:has-text("ذخیره تغییرات پرونده")')
    assert(await saveButton.isVisible(), "Save profile button is visible")
    await saveButton.click()

    // Wait for success indicator
    const successMsg = modal.locator('text=تغییرات با موفقیت ذخیره شد')
    await successMsg.waitFor({ state: "visible", timeout: 5000 })
    assert(await successMsg.isVisible(), "Success message displayed after saving")

    // Verify in database
    const verifiedDbCustomer = await prisma.customer.findUnique({
      where: { phone: phone1 },
    })
    assert(
      verifiedDbCustomer.name === "علیرضا تهرانی (VIP)",
      `Database verified updated name: "${verifiedDbCustomer.name}"`
    )
    assert(
      verifiedDbCustomer.birthDate === "1374/07/15",
      `Database verified updated Jalali birthDate: "${verifiedDbCustomer.birthDate}"`
    )

    await browser.close()
    console.log("  ✓ Playwright UI verification passed completely")
    passed++

    // Clean up test records
    await prisma.appointment.deleteMany({
      where: { customerPhone: { in: testPhones } },
    })
    await prisma.slotHold.deleteMany({
      where: { customerPhone: { in: testPhones } },
    })
    await prisma.customer.deleteMany({
      where: { phone: { in: testPhones } },
    })
    console.log("\n  ✓ Test records cleaned up successfully")
  } catch (err) {
    console.error("\nUnexpected error during test execution:", err)
    failed++
  } finally {
    await prisma.$disconnect()
    console.log("\n==================================================================")
    console.log(`TEST RUN FINISHED: ${passed} PASSED, ${failed} FAILED`)
    console.log("==================================================================")
    if (failed > 0) {
      process.exit(1)
    }
  }
}

runTests()
