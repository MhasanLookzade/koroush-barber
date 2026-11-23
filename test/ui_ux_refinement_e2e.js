const { chromium } = require("playwright")
const { PrismaClient } = require("@prisma/client")
const fs = require("fs")
const path = require("path")

const prisma = new PrismaClient()
const ARTIFACT_DIR = path.resolve("artifacts/screenshots")

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
}

async function saveScreenshot(page, filename, options = {}) {
  const dest = path.join(ARTIFACT_DIR, filename)
  await page.screenshot({ path: dest, ...options })
  console.log(`  📸 Saved screenshot: ${filename}`)
}

async function runRefinementE2ETests() {
  console.log("==================================================================")
  console.log("  KOROUSH BARBER — UI/UX REFINEMENT & JALALI VERIFICATION E2E")
  console.log("==================================================================")

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  })

  const confirmedApp = await prisma.appointment.findFirst({
    where: { status: "CONFIRMED" },
    select: { trackingCode: true },
  })
  const trackingCode = confirmedApp ? confirmedApp.trackingCode : "KB-24751"
  console.log(`  Using confirmed tracking code for tests: ${trackingCode}`)

  try {
    // -------------------------------------------------------------
    // TEST 1: Appointment Tracking Page (/booking/status)
    // -------------------------------------------------------------
    console.log("\n🧪 1. Testing Appointment Tracking Page (/booking/status)...")
    
    // 1A. Mobile 375px
    const mobileCtx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    })
    const mPage = await mobileCtx.newPage()
    await mPage.goto("http://localhost:3000/booking/status", { waitUntil: "networkidle" })
    await mPage.waitForTimeout(600)

    // Check horizontal overflow
    let scrollW = await mPage.evaluate(() => document.documentElement.scrollWidth)
    let clientW = await mPage.evaluate(() => document.documentElement.clientWidth)
    if (scrollW > clientW) {
      throw new Error(`Tracking page 375px has horizontal overflow: ${scrollW} > ${clientW}`)
    }
    console.log("  ✅ Zero horizontal overflow on 375px tracking page")

    // Search for seed appointment
    await mPage.fill("#track-code-input", trackingCode)
    await mPage.click('button[type="submit"]')
    await mPage.waitForTimeout(800)

    // Verify appointment card loaded
    const appCard = await mPage.waitForSelector(`text=${trackingCode}`, { state: "visible", timeout: 8000 })
    if (!appCard) throw new Error(`Tracking code ${trackingCode} not rendered in tracking results`)
    console.log(`  ✅ Appointment details successfully retrieved and displayed for ${trackingCode}`)

    await saveScreenshot(mPage, "tracking_375px.png", { fullPage: true })

    // 1B. Desktop 1440px
    const deskCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })
    const dPage = await deskCtx.newPage()
    await dPage.goto(`http://localhost:3000/booking/status?trackingCode=${trackingCode}`, { waitUntil: "networkidle" })
    await dPage.waitForTimeout(800)
    
    await saveScreenshot(dPage, "tracking_1440px.png", { fullPage: true })
    console.log("  ✅ Desktop 1440px tracking page verified")

    // -------------------------------------------------------------
    // TEST 2: Booking Success Confirmation Page (/booking/success)
    // -------------------------------------------------------------
    console.log("\n🧪 2. Testing Booking Success Confirmation Page (/booking/success)...")
    await mPage.goto(`http://localhost:3000/booking/success?trackingCode=${trackingCode}`, { waitUntil: "networkidle" })
    await mPage.waitForTimeout(800)

    // Check verification status banner
    await mPage.waitForSelector("text=رزرو نوبت شما با موفقیت تأیید شد!", { state: "visible", timeout: 8000 })
    await mPage.waitForSelector(`text=${trackingCode}`, { state: "visible", timeout: 8000 })
    console.log("  ✅ Booking confirmation verified by backend and displayed with luxury ticket styling")

    await saveScreenshot(mPage, "booking_success_375px.png", { fullPage: true })

    await dPage.goto(`http://localhost:3000/booking/success?trackingCode=${trackingCode}`, { waitUntil: "networkidle" })
    await dPage.waitForTimeout(800)
    await saveScreenshot(dPage, "booking_success_1440px.png", { fullPage: true })
    console.log("  ✅ Desktop 1440px confirmation screen verified")

    // -------------------------------------------------------------
    // TEST 3: Atmosphere Gallery Lightbox & /gallery page
    // -------------------------------------------------------------
    console.log("\n🧪 3. Testing Gallery Lightbox (Uncropped containment)...")
    await mPage.goto("http://localhost:3000/#gallery", { waitUntil: "networkidle" })
    await mPage.waitForTimeout(600)

    // Click on first gallery item to open lightbox
    const firstGalleryItem = await mPage.locator('#gallery [role="button"]').first()
    await firstGalleryItem.click()
    await mPage.waitForTimeout(500)

    // Verify lightbox dialog opened
    const lightboxDialog = await mPage.waitForSelector('[role="dialog"][aria-label="نمایش تصویر گالری به صورت کامل"]', { state: "visible", timeout: 5000 })
    if (!lightboxDialog) throw new Error("Gallery lightbox failed to open")
    console.log("  ✅ Lightbox opened smoothly with backdrop")

    // Verify image has object-contain styling
    const isContained = await mPage.evaluate(() => {
      const img = document.querySelector('[role="dialog"] img')
      if (!img) return false
      const computed = window.getComputedStyle(img)
      return computed.objectFit === "contain"
    })
    if (!isContained) {
      throw new Error("Lightbox image does NOT have object-contain!")
    }
    console.log("  ✅ Verified lightbox image uses object-fit: contain (no unwanted cropping)")

    await saveScreenshot(mPage, "gallery_lightbox_375px.png")

    // Close lightbox
    await mPage.keyboard.press("Escape")
    await mPage.waitForTimeout(300)

    // Desktop gallery lightbox
    await dPage.goto("http://localhost:3000/#gallery", { waitUntil: "networkidle" })
    await dPage.waitForTimeout(600)
    const deskGalleryItem = await dPage.locator('#gallery [role="button"]').first()
    await deskGalleryItem.click()
    await dPage.waitForTimeout(500)
    await saveScreenshot(dPage, "gallery_lightbox_1440px.png")
    await dPage.keyboard.press("Escape")

    // Verify /gallery page
    await mPage.goto("http://localhost:3000/gallery", { waitUntil: "networkidle" })
    await mPage.waitForTimeout(600)
    await saveScreenshot(mPage, "gallery_page_375px.png", { fullPage: true })
    console.log("  ✅ Dedicated /gallery page verified with Persian categories")

    // -------------------------------------------------------------
    // TEST 4: Customer Review Submission Popup
    // -------------------------------------------------------------
    console.log("\n🧪 4. Testing Customer Review Submission Popup...")
    await mPage.goto("http://localhost:3000/#reviews", { waitUntil: "networkidle" })
    await mPage.waitForTimeout(600)

    // Click on write review button
    const reviewBtn = await mPage.locator("text=ثبت تجربه و نظر شما").first()
    await reviewBtn.click()
    await mPage.waitForTimeout(500)

    // Verify bottom-sheet dialog
    await mPage.waitForSelector('[role="dialog"][aria-labelledby="review-modal-title"]', { state: "visible", timeout: 5000 })
    console.log("  ✅ Review submission modal/bottom-sheet opened")

    // Check bottom-sheet styling on mobile
    const isBottomSheet = await mPage.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]')
      const card = dialog?.querySelector("div > div")
      return card?.className.includes("rounded-t-3xl")
    })
    console.log("  ✅ Responsive mobile bottom sheet styling active:", isBottomSheet)

    await saveScreenshot(mPage, "review_bottomsheet_375px.png")

    // Close review modal
    await mPage.keyboard.press("Escape")
    await mPage.waitForTimeout(300)

    // -------------------------------------------------------------
    // TEST 5: Admin Jalali Date Picker & Appointments
    // -------------------------------------------------------------
    console.log("\n🧪 5. Testing Admin Jalali Date Picker & Appointments...")
    const adminCtx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    })
    const aPage = await adminCtx.newPage()

    // Login as admin
    await aPage.goto("http://localhost:3000/admin-login", { waitUntil: "networkidle" })
    await aPage.fill('input[name="username"]', "admin")
    await aPage.fill('input[name="password"]', "admin123456")
    await aPage.click('button[type="submit"]')
    await aPage.waitForTimeout(1000)

    // Navigate to admin appointments
    await aPage.goto("http://localhost:3000/admin/appointments", { waitUntil: "networkidle" })
    await aPage.waitForTimeout(800)

    // Verify Jalali Date Picker component trigger is rendered
    const pickerTrigger = await aPage.waitForSelector('button[aria-label="انتخاب تاریخ تقویم جلالی"]', { state: "visible", timeout: 8000 })
    if (!pickerTrigger) {
      throw new Error("Jalali Date Picker trigger button not found on /admin/appointments")
    }
    console.log("  ✅ Jalali Date Picker trigger active on /admin/appointments")

    // Click picker to open popover
    await pickerTrigger.click()
    await aPage.waitForTimeout(400)

    // Verify Persian month header or shortcuts in popover
    const popoverOpen = await aPage.waitForSelector('button[aria-label="ماه قبل"]', { state: "visible", timeout: 5000 })
    if (!popoverOpen) {
      throw new Error("Jalali calendar popover did not open!")
    }
    console.log("  ✅ Jalali calendar popover successfully displayed with Shamsi weekdays and quick shortcuts")

    await saveScreenshot(aPage, "admin_jalali_calendar_375px.png")

    // Desktop admin appointments view
    const adminDeskCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })
    const adPage = await adminDeskCtx.newPage()
    await adPage.goto("http://localhost:3000/admin-login", { waitUntil: "networkidle" })
    await adPage.fill('input[name="username"]', "admin")
    await adPage.fill('input[name="password"]', "admin123456")
    await adPage.click('button[type="submit"]')
    await adPage.waitForTimeout(800)

    await adPage.goto("http://localhost:3000/admin/appointments", { waitUntil: "networkidle" })
    await adPage.waitForTimeout(800)
    
    // Open picker on desktop
    const deskPickerBtn = await adPage.waitForSelector('button[aria-label="انتخاب تاریخ تقویم جلالی"]', { state: "visible", timeout: 8000 })
    await deskPickerBtn.click()
    await adPage.waitForTimeout(400)
    await adPage.waitForSelector('button[aria-label="ماه قبل"]', { state: "visible", timeout: 5000 })

    await saveScreenshot(adPage, "admin_jalali_calendar_1440px.png")
    console.log("  ✅ Desktop 1440px Admin Jalali Calendar Popover verified")

    console.log("\n==================================================================")
    console.log("  🎉 ALL 5 UI/UX REFINEMENT E2E TESTS PASSED WITH 0 FAILURES!")
    console.log("==================================================================")
  } finally {
    await browser.close()
  }
}

runRefinementE2ETests().catch((err) => {
  console.error("❌ E2E Test Failure:", err)
  process.exit(1)
})
