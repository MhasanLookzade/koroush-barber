const { chromium } = require("playwright")
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function runTests() {
  console.log("==================================================================")
  console.log("       ADMIN CUSTOMER PROFILE DELETION TEST SUITE                 ")
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

  const phoneApi = "09129997701"
  const phoneUi = "09129997702"

  try {
    // 0. Clean up previous test runs if any
    await prisma.appointment.deleteMany({
      where: { customerPhone: { in: [phoneApi, phoneUi] } },
    })
    await prisma.customer.deleteMany({
      where: { phone: { in: [phoneApi, phoneUi] } },
    })

    const barber = await prisma.barber.findFirst({ where: { isActive: true } })
    const service = await prisma.service.findFirst({ where: { isActive: true } })

    // =========================================================================
    // TEST 1: API DELETION WITH INTEGRITY CHECKS (ONDELETE SETNULL & AUDIT LOG)
    // =========================================================================
    console.log("--- 1. Testing DELETE /api/admin/customers API ---")
    // Create customer with an appointment and a notification
    const customer1 = await prisma.customer.create({
      data: {
        phone: phoneApi,
        name: "کامران نجفی",
        birthDate: "1368/04/10",
        notes: "مشتری آزمایشی جهت حذف",
      },
    })

    const appt1 = await prisma.appointment.create({
      data: {
        trackingCode: "KB-DELTEST-1",
        barberId: barber.id,
        serviceId: service.id,
        customerId: customer1.id,
        customerName: "کامران نجفی",
        customerPhone: phoneApi,
        date: new Date(Date.now() + 24 * 3600 * 1000),
        endDate: new Date(Date.now() + 25 * 3600 * 1000),
        status: "CONFIRMED",
        totalPrice: 200000,
        depositPaid: 100000,
        balanceDue: 100000,
      },
    })

    await prisma.notification.create({
      data: {
        customerId: customer1.id,
        type: "REMINDER",
        title: "یادآوری نوبت",
        message: "تست اعلان",
      },
    })

    // Get admin auth token
    const loginRes = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123456" }),
    })
    assert(loginRes.ok, "Admin login successful")
    const setCookieHeader = loginRes.headers.get("set-cookie") || ""
    const adminTokenMatch = setCookieHeader.match(/admin_token=([^;]+)/)
    const adminToken = adminTokenMatch ? adminTokenMatch[1] : ""

    const headersWithAuth = {
      Cookie: `admin_token=${adminToken}`,
    }

    // Call DELETE endpoint
    const deleteRes = await fetch(`http://localhost:3000/api/admin/customers?id=${customer1.id}`, {
      method: "DELETE",
      headers: headersWithAuth,
    })

    assert(deleteRes.ok, "DELETE /api/admin/customers returned 200 OK")
    const deleteData = await deleteRes.json()
    assert(deleteData.success === true, "Response has success: true")

    // Verify Customer is gone
    const checkCustomer = await prisma.customer.findUnique({
      where: { id: customer1.id },
    })
    assert(checkCustomer === null, "Customer record deleted from database")

    // Verify Appointment is preserved with customerId = null
    const checkAppt = await prisma.appointment.findUnique({
      where: { id: appt1.id },
    })
    assert(checkAppt !== null, "Appointment was preserved in database")
    assert(checkAppt.customerId === null, "Appointment.customerId set to null (SetNull onDelete integrity)")
    assert(checkAppt.customerName === "کامران نجفی", "Appointment financial and customer info intact")

    // Verify Notification was cascaded
    const checkNotifCount = await prisma.notification.count({
      where: { customerId: customer1.id },
    })
    assert(checkNotifCount === 0, "Customer notifications cascaded and deleted")

    // Verify AuditLog entry
    const audit = await prisma.auditLog.findFirst({
      where: {
        action: "ADMIN_DELETE_CUSTOMER",
        entityId: customer1.id,
      },
    })
    assert(audit !== null, "AuditLog recorded ADMIN_DELETE_CUSTOMER action")

    // =========================================================================
    // TEST 2: PLAYWRIGHT E2E UI TEST (POPUP CONFIRMATION FLOW & ROW REMOVAL)
    // =========================================================================
    console.log("\n--- 2. Playwright E2E UI Test (Admin Customer Delete Popup Flow) ---")
    // Create customer for UI test
    const customer2 = await prisma.customer.create({
      data: {
        phone: phoneUi,
        name: "پرویز صیاد",
        birthDate: "1360/02/15",
      },
    })

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

    // Locate customer row for phoneUi
    const customerRow = page.locator(`tr:has-text("${phoneUi}")`)
    await customerRow.waitFor({ timeout: 5000 })
    assert(await customerRow.isVisible(), `Customer row for ${phoneUi} is visible in table`)

    // Open modal
    await customerRow.locator('button:has-text("پرونده کامل")').click()
    await page.waitForTimeout(500)

    const modal = page.locator('div[role="dialog"]')
    assert(await modal.isVisible(), "Customer modal is open")

    // Check delete button
    const deleteBtn = modal.locator('button:has-text("حذف مشتری")')
    assert(await deleteBtn.isVisible(), "Delete customer button is visible")

    // Click delete button -> shows confirmation popup modal
    await deleteBtn.click()
    await page.waitForTimeout(300)

    const popupModal = page.locator('div[role="alertdialog"]')
    assert(await popupModal.isVisible(), "Dedicated popup modal is displayed on screen")

    const confirmTitle = popupModal.locator('text=آیا از حذف کامل این مشتری از دایرکتوری اطمینان دارید؟')
    assert(await confirmTitle.isVisible(), "Confirmation popup title is visible")

    // Click cancel in popup first
    const cancelBtn = popupModal.locator('button:has-text("انصراف")')
    assert(await cancelBtn.isVisible(), "Cancel button is visible in popup")
    await cancelBtn.click()
    await page.waitForTimeout(300)
    assert(!(await popupModal.isVisible()), "Popup modal closed after clicking cancel")

    // Click delete button again
    await deleteBtn.click()
    await page.waitForTimeout(300)

    // Confirm deletion in popup
    const confirmDeleteBtn = popupModal.locator('button:has-text("بله، حذف مشتری")')
    assert(await confirmDeleteBtn.isVisible(), "Final confirmation button is visible in popup")
    await confirmDeleteBtn.click()

    // Wait for popup and modal to close and row to disappear
    await popupModal.waitFor({ state: "hidden", timeout: 5000 })
    await modal.waitFor({ state: "hidden", timeout: 5000 })
    assert(!(await modal.isVisible()), "Customer modal closed after deletion")

    await page.waitForTimeout(1000)
    const rowAfterDelete = page.locator(`tr:has-text("${phoneUi}")`)
    const rowVisible = await rowAfterDelete.isVisible()
    assert(!rowVisible, "Customer row removed from the table immediately")

    // Verify in database
    const checkDbCustomer2 = await prisma.customer.findUnique({
      where: { phone: phoneUi },
    })
    assert(checkDbCustomer2 === null, "Customer verified deleted from database")

    await browser.close()
    console.log("  ✓ Playwright UI deletion test passed completely")
    passed++

    // Clean up
    await prisma.appointment.deleteMany({
      where: { customerPhone: { in: [phoneApi, phoneUi] } },
    })
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
