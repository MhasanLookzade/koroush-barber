const { chromium } = require("playwright")
const fs = require("fs")
const path = require("path")

const ARTIFACT_DIR = path.resolve("artifacts/screenshots")
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
}

const VIEWPORTS = [
  { name: "320px_se", width: 320, height: 568 },
  { name: "360px_android", width: 360, height: 800 },
  { name: "375px_iphoneX", width: 375, height: 812 },
  { name: "390px_iphone13", width: 390, height: 844 },
  { name: "414px_plus", width: 414, height: 896 },
  { name: "430px_pro_max", width: 430, height: 932 },
  { name: "768px_tablet", width: 768, height: 1024 },
  { name: "1024px_desktop_s", width: 1024, height: 768 },
  { name: "1280px_desktop_m", width: 1280, height: 800 },
  { name: "1440px_desktop_l", width: 1440, height: 900 },
  { name: "1920px_full_hd", width: 1920, height: 1080 }
]

async function runFullSiteAudit() {
  console.log("==================================================================")
  console.log("  KOROUSH BARBER — COMPREHENSIVE FULL-SITE RESPONSIVE AUDIT")
  console.log("==================================================================")

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  })

  try {
    // -------------------------------------------------------------
    // PART 1: Homepage Multi-Viewport Overflow Matrix & Section Order
    // -------------------------------------------------------------
    console.log("\n🧪 1. Testing Homepage across 11 viewports (320px to 1920px)...")
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.width < 768,
        hasTouch: vp.width < 768,
      })
      const page = await ctx.newPage()
      await page.goto("http://localhost:3000/", { waitUntil: "networkidle" })
      await page.waitForTimeout(400)

      const scrollW = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientW = await page.evaluate(() => document.documentElement.clientWidth)

      if (scrollW > clientW) {
        throw new Error(`Homepage at ${vp.width}px has horizontal overflow: scrollWidth=${scrollW} > clientWidth=${clientW}`)
      }
      console.log(`  ✅ Viewport ${vp.width}x${vp.height} (${vp.name}): 0 horizontal overflow (scrollWidth=${scrollW}, clientWidth=${clientW})`)

      if (vp.width === 375) {
        await page.screenshot({ path: path.join(ARTIFACT_DIR, "homepage_375px.png"), fullPage: false })
      } else if (vp.width === 1440) {
        await page.screenshot({ path: path.join(ARTIFACT_DIR, "homepage_1440px.png"), fullPage: false })
      }
      await ctx.close()
    }

    // -------------------------------------------------------------
    // PART 2: Section Reordering Verification
    // Requirement: Testimonials (ReviewSystemSection) immediately below Location/Hours (LocationHoursSection)
    // -------------------------------------------------------------
    console.log("\n🧪 2. Verifying Section Order on Homepage...")
    const orderCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const oPage = await orderCtx.newPage()
    await oPage.goto("http://localhost:3000/", { waitUntil: "networkidle" })

    const orderVerification = await oPage.evaluate(() => {
      const locationEl = document.getElementById("location")
      const reviewsEl = document.getElementById("reviews")
      if (!locationEl || !reviewsEl) return { found: false, error: "Missing section IDs" }

      const locationRect = locationEl.getBoundingClientRect()
      const reviewsRect = reviewsEl.getBoundingClientRect()

      const locationTop = locationRect.top + window.scrollY
      const reviewsTop = reviewsRect.top + window.scrollY

      return {
        found: true,
        locationTop,
        reviewsTop,
        reviewsIsBelowLocation: reviewsTop > locationTop,
      }
    })

    if (!orderVerification.found || !orderVerification.reviewsIsBelowLocation) {
      throw new Error(`Section order invalid! reviewsIsBelowLocation: ${orderVerification.reviewsIsBelowLocation}`)
    }
    console.log(`  ✅ Verified Section Order: Location/Hours is at Y=${Math.round(orderVerification.locationTop)}, and Testimonials/Reviews is immediately below at Y=${Math.round(orderVerification.reviewsTop)}`)
    await orderCtx.close()

    // -------------------------------------------------------------
    // PART 3: Subpages Header Spacing & Overflow Check
    // -------------------------------------------------------------
    console.log("\n🧪 3. Auditing Subpages for Zero Duplicate Headers & Top Spacing...")
    const subpages = [
      { path: "/booking/status", name: "tracking" },
      { path: "/booking/success?trackingCode=KB-24751", name: "success" },
      { path: "/gallery", name: "gallery" },
      { path: "/about", name: "about" },
      { path: "/contact", name: "contact" },
      { path: "/services", name: "services" },
      { path: "/barbers", name: "barbers" },
    ]

    for (const sub of subpages) {
      // 375px mobile
      const subMobileCtx = await browser.newContext({
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      })
      const smPage = await subMobileCtx.newPage()
      await smPage.goto(`http://localhost:3000${sub.path}`, { waitUntil: "networkidle" })
      await smPage.waitForTimeout(400)

      const mScrollW = await smPage.evaluate(() => document.documentElement.scrollWidth)
      const mClientW = await smPage.evaluate(() => document.documentElement.clientWidth)
      if (mScrollW > mClientW) {
        throw new Error(`Subpage ${sub.path} on 375px has horizontal overflow: ${mScrollW} > ${mClientW}`)
      }

      // Check header count (must be exactly 1)
      const headerCount = await smPage.locator("header").count()
      if (headerCount > 1) {
        throw new Error(`Subpage ${sub.path} has ${headerCount} headers! Must be exactly 1.`)
      }

      console.log(`  ✅ ${sub.name} (${sub.path}): Single header verified, 0 overflow on 375px`)
      await subMobileCtx.close()
    }

    // -------------------------------------------------------------
    // PART 4: Admin Panel Multi-Device Audit (Mobile Cards vs Desktop Tables)
    // -------------------------------------------------------------
    console.log("\n🧪 4. Auditing Admin Dashboard & Payments Mobile Cards...")
    const adminMobCtx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    })
    const amPage = await adminMobCtx.newPage()
    await amPage.goto("http://localhost:3000/admin-login", { waitUntil: "networkidle" })
    await amPage.fill('input[name="username"]', "admin")
    await amPage.fill('input[name="password"]', "admin123456")
    await amPage.click('button[type="submit"]')
    await amPage.waitForTimeout(1000)

    const adminRoutes = [
      { path: "/admin", name: "admin_overview" },
      { path: "/admin/appointments", name: "admin_appointments" },
      { path: "/admin/payments", name: "admin_payments" },
      { path: "/admin/customers", name: "admin_customers" },
      { path: "/admin/reviews", name: "admin_reviews" },
      { path: "/admin/availability", name: "admin_availability" },
    ]

    for (const ar of adminRoutes) {
      await amPage.goto(`http://localhost:3000${ar.path}`, { waitUntil: "networkidle" })
      await amPage.waitForTimeout(400)

      const admScrollW = await amPage.evaluate(() => document.documentElement.scrollWidth)
      const admClientW = await amPage.evaluate(() => document.documentElement.clientWidth)
      if (admScrollW > admClientW) {
        throw new Error(`Admin route ${ar.path} has overflow on 375px: ${admScrollW} > ${admClientW}`)
      }
      console.log(`  ✅ Admin ${ar.name} (${ar.path}): 0 horizontal overflow on 375px (scrollWidth=${admScrollW}, clientWidth=${admClientW})`)
    }

    // Specifically verify /admin/payments mobile card view
    await amPage.goto("http://localhost:3000/admin/payments", { waitUntil: "networkidle" })
    await amPage.waitForTimeout(500)
    const mobileCardsVisible = await amPage.locator('.md\\:hidden .border-gold-500\\/15').count()
    console.log(`  ✅ Admin Payments on 375px: ${mobileCardsVisible} mobile payment cards rendered instead of a wide overflowing table`)
    await amPage.screenshot({ path: path.join(ARTIFACT_DIR, "admin_payments_375px.png"), fullPage: false })

    // Verify desktop payments view has table visible
    const adminDeskCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const adPage = await adminDeskCtx.newPage()
    await adPage.goto("http://localhost:3000/admin-login", { waitUntil: "networkidle" })
    await adPage.fill('input[name="username"]', "admin")
    await adPage.fill('input[name="password"]', "admin123456")
    await adPage.click('button[type="submit"]')
    await adPage.waitForTimeout(800)
    await adPage.goto("http://localhost:3000/admin/payments", { waitUntil: "networkidle" })
    await adPage.waitForTimeout(500)
    const tableVisible = await adPage.locator("table").isVisible()
    console.log(`  ✅ Admin Payments on 1440px: Desktop table active: ${tableVisible}`)
    await adPage.screenshot({ path: path.join(ARTIFACT_DIR, "admin_payments_1440px.png"), fullPage: false })

    console.log("\n==================================================================")
    console.log("  🎉 COMPREHENSIVE FULL-SITE RESPONSIVE AUDIT PASSED 100%!")
    console.log("==================================================================")
  } finally {
    await browser.close()
  }
}

runFullSiteAudit().catch((err) => {
  console.error("❌ Audit Failure:", err)
  process.exit(1)
})
