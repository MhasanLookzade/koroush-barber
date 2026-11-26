const { chromium } = require("playwright")
const { PrismaClient } = require("@prisma/client")
const path = require("path")

const prisma = new PrismaClient()
const artifactDir = "C:\\Users\\blue\\.gemini\\antigravity\\brain\\316e144f-9ee8-4352-8239-a0d440b576f0"

async function runVisualTests() {
  console.log("==================================================================")
  console.log("  DELETE CONFIRMATION POPUP MODAL — MOBILE & DESKTOP VISUAL TEST  ")
  console.log("==================================================================\n")

  const phoneMobile = "09129996601"
  const phoneDesktop = "09129996602"

  // Clean and prepare test customers
  await prisma.customer.deleteMany({
    where: { phone: { in: [phoneMobile, phoneDesktop] } },
  })

  await prisma.customer.create({
    data: {
      phone: phoneMobile,
      name: "سامان مقدم",
      birthDate: "1369/08/22",
      adminNotes: "تست حذف در موبایل",
    },
  })

  await prisma.customer.create({
    data: {
      phone: phoneDesktop,
      name: "بهرام رادان",
      birthDate: "1363/02/08",
      adminNotes: "تست حذف در دسکتاپ",
    },
  })

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  })

  try {
    // -------------------------------------------------------------------------
    // 1. MOBILE TEST (375px x 812px)
    // -------------------------------------------------------------------------
    console.log("--- 1. Testing Mobile Layout (375px) ---")
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    })
    const mobilePage = await mobileContext.newPage()

    // Login
    await mobilePage.goto("http://localhost:3000/admin-login", { waitUntil: "networkidle" })
    await mobilePage.fill('input[name="username"]', "admin")
    await mobilePage.fill('input[name="password"]', "admin123456")
    await Promise.all([
      mobilePage.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {}),
      mobilePage.click('button[type="submit"]'),
    ])

    await mobilePage.goto("http://localhost:3000/admin/customers", { waitUntil: "networkidle" })
    await mobilePage.waitForTimeout(1000)

    // On mobile view (< md), customer items are rendered as cards in the mobile container
    const mobileCard = mobilePage.locator('div.grid.grid-cols-1.gap-3').locator(`text=${phoneMobile}`).first()
    await mobileCard.waitFor({ timeout: 5000 })
    console.log("  ✓ Mobile customer card found")

    // Click card to open modal
    await mobileCard.click()
    await mobilePage.waitForTimeout(500)

    const customerModal = mobilePage.locator('div[role="dialog"]')
    if (!(await customerModal.isVisible())) {
      throw new Error("Customer profile modal not visible on mobile")
    }
    console.log("  ✓ Customer profile modal opened on mobile")

    // Click delete customer button
    const deleteBtn = customerModal.locator('button:has-text("حذف مشتری")')
    await deleteBtn.scrollIntoViewIfNeeded()
    await deleteBtn.click()
    await mobilePage.waitForTimeout(400)

    // Check alertdialog popup
    const popupDialog = mobilePage.locator('div[role="alertdialog"]')
    if (!(await popupDialog.isVisible())) {
      throw new Error("Delete confirmation popup modal is not visible on mobile!")
    }
    console.log("  ✓ Dedicated Delete confirmation popup modal is visible on mobile")

    // Check horizontal overflow on mobile
    const scrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await mobilePage.evaluate(() => document.documentElement.clientWidth)
    console.log(`  Mobile dimensions: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`)
    if (scrollWidth > clientWidth) {
      throw new Error(`Horizontal overflow detected on mobile: ${scrollWidth} > ${clientWidth}`)
    }
    console.log("  ✓ Zero horizontal overflow on mobile (375px)")

    // Capture mobile screenshot
    const mobileScreenshotPath = path.join(artifactDir, "delete_popup_mobile_375.png")
    await mobilePage.screenshot({ path: mobileScreenshotPath, fullPage: false })
    console.log(`  ✓ Captured mobile screenshot: ${mobileScreenshotPath}`)

    // Click cancel button
    const cancelBtn = popupDialog.locator('button:has-text("انصراف")')
    await cancelBtn.click()
    await mobilePage.waitForTimeout(300)

    if (await popupDialog.isVisible()) {
      throw new Error("Popup dialog did not close after clicking cancel")
    }
    console.log("  ✓ Popup dialog closed properly upon clicking 'انصراف'")

    await mobileContext.close()

    // -------------------------------------------------------------------------
    // 2. DESKTOP TEST (1280px x 800px)
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Testing Desktop Layout (1280px) ---")
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    })
    const desktopPage = await desktopContext.newPage()

    // Login
    await desktopPage.goto("http://localhost:3000/admin-login", { waitUntil: "networkidle" })
    await desktopPage.fill('input[name="username"]', "admin")
    await desktopPage.fill('input[name="password"]', "admin123456")
    await Promise.all([
      desktopPage.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {}),
      desktopPage.click('button[type="submit"]'),
    ])

    await desktopPage.goto("http://localhost:3000/admin/customers", { waitUntil: "networkidle" })
    await desktopPage.waitForTimeout(1000)

    // Locate desktop table row
    const desktopRow = desktopPage.locator(`tr:has-text("${phoneDesktop}")`)
    await desktopRow.waitFor({ timeout: 5000 })
    console.log("  ✓ Desktop customer row found")

    await desktopRow.locator('button:has-text("پرونده کامل")').click()
    await desktopPage.waitForTimeout(500)

    const desktopModal = desktopPage.locator('div[role="dialog"]')
    if (!(await desktopModal.isVisible())) {
      throw new Error("Desktop profile modal not open")
    }

    // Click delete customer button
    const desktopDeleteBtn = desktopModal.locator('button:has-text("حذف مشتری")')
    await desktopDeleteBtn.click()
    await desktopPage.waitForTimeout(400)

    const desktopPopup = desktopPage.locator('div[role="alertdialog"]')
    if (!(await desktopPopup.isVisible())) {
      throw new Error("Desktop confirmation popup not visible")
    }
    console.log("  ✓ Delete confirmation popup modal is visible on desktop")

    // Capture desktop screenshot
    const desktopScreenshotPath = path.join(artifactDir, "delete_popup_desktop_1280.png")
    await desktopPage.screenshot({ path: desktopScreenshotPath, fullPage: false })
    console.log(`  ✓ Captured desktop screenshot: ${desktopScreenshotPath}`)

    // Click confirm deletion: "بله، حذف مشتری"
    const confirmDeleteBtn = desktopPopup.locator('button:has-text("بله، حذف مشتری")')
    await confirmDeleteBtn.click()

    // Wait for popup and modal to close
    await desktopPopup.waitFor({ state: "hidden", timeout: 5000 })
    await desktopModal.waitFor({ state: "hidden", timeout: 5000 })
    console.log("  ✓ Both popup and customer modal closed after confirmation")

    await desktopPage.waitForTimeout(1000)
    const rowAfterDelete = desktopPage.locator(`tr:has-text("${phoneDesktop}")`)
    const isVisible = await rowAfterDelete.isVisible()
    if (isVisible) {
      throw new Error("Row still visible in table after deletion!")
    }
    console.log("  ✓ Customer row removed immediately from desktop table")

    // Verify in database
    const checkDeleted = await prisma.customer.findUnique({
      where: { phone: phoneDesktop },
    })
    if (checkDeleted !== null) {
      throw new Error("Customer still exists in database!")
    }
    console.log("  ✓ Customer verified permanently deleted from database")

    await desktopContext.close()

    // Clean up
    await prisma.customer.deleteMany({
      where: { phone: { in: [phoneMobile, phoneDesktop] } },
    })

    console.log("\n==================================================================")
    console.log("  ALL MOBILE & DESKTOP VISUAL & FUNCTIONAL CHECKS PASSED (100%)   ")
    console.log("==================================================================")
  } finally {
    await browser.close()
    await prisma.$disconnect()
  }
}

runVisualTests().catch((e) => {
  console.error("Test failed:", e)
  process.exit(1)
})
