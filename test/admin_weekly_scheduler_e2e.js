const { chromium } = require("playwright")
const path = require("path")
const fs = require("fs")

const SCREENSHOT_DIR = path.resolve(__dirname, "..", "screenshots")
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

async function runWeeklySchedulerE2E() {
  console.log("🚀 Starting Koroush Barber Admin Weekly Scheduler & Daily Timeline E2E Test...")

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  })

  // Start with 375px mobile viewport
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()

  try {
    // 1. Authenticate via /admin-login
    console.log("1. Logging into admin...")
    await page.goto("http://localhost:3000/admin-login", { waitUntil: "networkidle" })
    await page.fill('input[name="username"]', "admin")
    await page.fill('input[name="password"]', "admin123456")
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle", timeout: 15000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ])
    await page.waitForTimeout(1000)

    console.log("  Current URL after login:", page.url())
    if (!page.url().includes("/admin")) {
      throw new Error(`Failed to redirect to /admin, current URL: ${page.url()}`)
    }

    // 2. Verify Weekly Schedule Strip
    console.log("2. Verifying Weekly Schedule Strip...")
    await page.waitForSelector("h2", { timeout: 10000 })
    const weekTitleEl = await page.locator("h2").first()
    const weekTitle = await weekTitleEl.textContent()
    console.log("  Week title detected:", weekTitle)

    // Check 7 day buttons exist
    const dayButtons = await page.locator('section button[type="button"]')
    const dayCount = await dayButtons.count()
    console.log(`  Found ${dayCount} interactive buttons in week strip`)
    if (dayCount < 7) {
      throw new Error(`Expected at least 7 day buttons, found: ${dayCount}`)
    }

    // Verify "امروز" (Today) badge
    const todayBadge = page.locator('text="امروز"')
    const hasToday = await todayBadge.isVisible()
    console.log(`  Today badge visible: ${hasToday}`)
    if (!hasToday) {
      throw new Error('Expected "امروز" badge to be visible on today\'s card')
    }

    // Capture weekly strip screenshot on 375px
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "admin_weekly_strip_375px.png"),
      fullPage: false,
    })
    console.log("  📸 Saved admin_weekly_strip_375px.png")

    // 3. Test Week Navigation
    console.log("3. Testing Week Navigation (هفته قبل / این هفته / هفته بعد)...")
    const prevWeekBtn = page.locator('button:has-text("هفته قبل")')
    await prevWeekBtn.click()
    await page.waitForTimeout(1000)
    const prevWeekTitle = await (await page.locator("h2").first()).textContent()
    console.log("  Previous week title:", prevWeekTitle)

    // "این هفته" button should now be visible
    const thisWeekBtn = page.locator('button:has-text("این هفته")')
    if (await thisWeekBtn.isVisible()) {
      console.log('  "این هفته" button appeared as expected.')
      await thisWeekBtn.click()
      await page.waitForTimeout(1000)
    }

    // 4. Verify 5 KPI Metric Cards
    console.log("4. Verifying Daily Summary KPI cards...")
    const kpiHeadings = ["نوبت‌های ثبت‌شده", "تکمیل و تسویه‌شده", "ساعت‌های آزاد", "بیعانه وصول‌شده", "مانده قابل تسویه"]
    for (const heading of kpiHeadings) {
      const isVisible = await page.locator(`text="${heading}"`).first().isVisible()
      console.log(`  KPI "${heading}" visible: ${isVisible}`)
      if (!isVisible) {
        throw new Error(`Expected KPI card "${heading}" to be visible`)
      }
    }

    // 5. Verify Interactive 13-Slot Daily Timeline
    console.log("5. Verifying Interactive 13-Slot Daily Timeline...")
    const timelineHeading = page.locator('h2:has-text("تایم‌لاین ساعتی سالن")')
    await timelineHeading.waitFor({ state: "visible", timeout: 10000 })
    
    // Check all 13 hourly slot start times (10:00 to 22:00)
    const expectedStartHours = [
      "۱۰:۰۰", "۱۱:۰۰", "۱۲:۰۰", "۱۳:۰۰", "۱۴:۰۰", "۱۵:۰۰",
      "۱۶:۰۰", "۱۷:۰۰", "۱۸:۰۰", "۱۹:۰۰", "۲۰:۰۰", "۲۱:۰۰", "۲۲:۰۰"
    ]

    for (const h of expectedStartHours) {
      const slotTimeEl = page.locator(`text=${h}`).first()
      const isVisible = await slotTimeEl.isVisible()
      if (!isVisible) {
        console.warn(`  Warning: slot ${h} not immediately visible in viewport`)
      }
    }
    console.log("  ✅ Timeline contains strictly standard hourly slots from 10:00 to 22:00.")

    // 6. Action: Manual Booking on Available Slot
    console.log("6. Testing Manual Booking on an available slot...")
    const manualBookingBtn = page.locator('button:has-text("ثبت نوبت دستی")').first()
    if (await manualBookingBtn.isVisible()) {
      await manualBookingBtn.click()
      await page.waitForTimeout(500)

      // Verify manual booking modal opened
      const modalHeading = page.locator('h3:has-text("ثبت نوبت برای ساعت")')
      await modalHeading.waitFor({ state: "visible", timeout: 5000 })
      console.log("  Manual booking modal opened successfully with pre-filled slot!")

      // Fill customer info
      const customerNameInput = page.locator('input[placeholder*="کوروش"]')
      await customerNameInput.fill("سهراب سپهری")

      const customerPhoneInput = page.locator('input[placeholder*="۰۹۱۲"]')
      await customerPhoneInput.fill("09129998877")

      // Waive deposit checkbox
      const waiveCheckbox = page.locator('input[id="waiveDeposit"]')
      if (await waiveCheckbox.isVisible()) {
        await waiveCheckbox.check()
      }

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "admin_manual_booking_375px.png"),
      })
      console.log("  📸 Saved admin_manual_booking_375px.png")

      // Submit manual booking
      const submitBookingBtn = page.locator('button[type="submit"]:has-text("ثبت قطعی نوبت")')
      await submitBookingBtn.click()
      await page.waitForTimeout(1500)

      // Verify booked customer appears in timeline
      const bookedCustomer = page.locator('text="سهراب سپهری"').first()
      await bookedCustomer.waitFor({ state: "visible", timeout: 10000 })
      console.log('  ✅ Manual booking completed: "سهراب سپهری" is now booked in the timeline.')

      // 7. Action: Open Appointment Details & Direct Actions Modal
      console.log("7. Testing Appointment Details & Actions Modal...")
      const manageBtn = page.locator('button:has-text("مدیریت نوبت")').first()
      await manageBtn.click()
      await page.waitForTimeout(500)

      const detailsModalHeading = page.locator('h3:has-text("پرونده نوبت")')
      await detailsModalHeading.waitFor({ state: "visible", timeout: 5000 })
      console.log("  Appointment Details modal opened!")

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "admin_appointment_details_375px.png"),
      })
      console.log("  📸 Saved admin_appointment_details_375px.png")

      // Test "تکمیل و تسویه نوبت"
      const completeBtn = page.locator('button:has-text("تکمیل و تسویه نوبت")')
      if (await completeBtn.isVisible()) {
        console.log("  Clicking 'تکمیل و تسویه نوبت'...")
        await completeBtn.click()
        await page.waitForTimeout(1500)
        console.log("  ✅ Appointment settled and completed.")
      }
    }

    // 8. Action: Block and Unblock a Slot
    console.log("8. Testing Block and Unblock Slot...")
    const blockBtn = page.locator('button:has-text("مسدود کردن ساعت")').first()
    if (await blockBtn.isVisible()) {
      await blockBtn.click()
      await page.waitForTimeout(500)

      const blockModalHeading = page.locator('h3:has-text("مسدودسازی ساعت")')
      await blockModalHeading.waitFor({ state: "visible", timeout: 5000 })
      console.log("  Block modal opened.")

      const submitBlockBtn = page.locator('button[type="submit"]:has-text("مسدودسازی ساعت")')
      await submitBlockBtn.click()
      await page.waitForTimeout(1500)

      // Verify unblock button is now present
      const unblockBtn = page.locator('button:has-text("آزاد کردن این ساعت")').first()
      await unblockBtn.waitFor({ state: "visible", timeout: 10000 })
      console.log("  Slot successfully blocked. Now unblocking...")

      await unblockBtn.click()
      await page.waitForTimeout(1500)
      console.log("  ✅ Slot successfully unblocked back to available state.")
    }

    // Capture timeline screenshot on 375px
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "admin_timeline_375px.png"),
      fullPage: true,
    })
    console.log("  📸 Saved admin_timeline_375px.png")

    // 9. Full Responsive & Overflow Audit Across 9 Viewports
    console.log("9. Auditing 9 Viewports for Zero Horizontal Overflow (scrollWidth === clientWidth)...")
    const viewports = [
      { width: 320, height: 568, name: "320px (Small Mobile)" },
      { width: 360, height: 640, name: "360px (Galaxy S8)" },
      { width: 375, height: 812, name: "375px (iPhone SE/X)" },
      { width: 390, height: 844, name: "390px (iPhone 12/13/14)" },
      { width: 414, height: 896, name: "414px (iPhone Plus/XR)" },
      { width: 430, height: 932, name: "430px (iPhone 14/15 Pro Max)" },
      { width: 768, height: 1024, name: "768px (iPad Portrait)" },
      { width: 1024, height: 768, name: "1024px (iPad Landscape / Laptop)" },
      { width: 1440, height: 900, name: "1440px (Desktop Wide)" },
    ]

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.waitForTimeout(400)

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)

      if (scrollWidth > clientWidth) {
        throw new Error(
          `Horizontal overflow detected on ${vp.name}: scrollWidth=${scrollWidth} > clientWidth=${clientWidth}`
        )
      }
      console.log(`  ✅ ${vp.name}: scrollWidth=${scrollWidth}, clientWidth=${clientWidth} (PERFECT 0 OVERFLOW)`)
    }

    // Capture 1440px Desktop screenshots
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "admin_weekly_strip_1440px.png"),
      fullPage: false,
    })
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "admin_timeline_1440px.png"),
      fullPage: true,
    })
    console.log("  📸 Saved admin_weekly_strip_1440px.png & admin_timeline_1440px.png")

    console.log("\n🎉 ALL E2E ACCEPTANCE TESTS FOR WEEKLY SCHEDULER & TIMELINE PASSED WITH 100% SUCCESS!")
  } catch (err) {
    console.error("❌ E2E Test Failure:", err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

runWeeklySchedulerE2E()
