const { chromium } = require("playwright")

async function testAdminLoginBrowser() {
  console.log("🌐 Launching browser for Admin Login UI verification...")
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()

  try {
    // 1. Visit /admin without authentication -> Should be redirected to /admin-login
    console.log("1. Visiting /admin unauthenticated...")
    await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle" })
    const currentUrl = page.url()
    console.log("  Current URL after redirect:", currentUrl)
    if (!currentUrl.includes("/admin-login")) {
      throw new Error(`Expected redirect to /admin-login, but got: ${currentUrl}`)
    }
    console.log("  ✅ Redirected to /admin-login as expected.")

    // 2. Check for overflow on 375px mobile
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    console.log(`  375px viewport dimensions: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`)
    if (scrollWidth > clientWidth) {
      throw new Error(`Horizontal overflow on login page: ${scrollWidth} > ${clientWidth}`)
    }
    console.log("  ✅ Zero horizontal overflow on mobile login page.")

    // 3. Fill and submit login
    console.log("2. Submitting login form...")
    await page.fill('input[name="username"]', "admin")
    await page.fill('input[name="password"]', "admin123456")
    
    // Click submit button
    await page.click('button[type="submit"]')

    // Wait for URL to be /admin
    await page.waitForURL("**/admin", { timeout: 10000 })
    console.log("  ✅ Navigated to /admin.")

    // Wait for dashboard content to load
    await page.waitForSelector("h1", { timeout: 15000 })
    const h1Text = await page.textContent("h1")
    console.log("  Dashboard Heading:", h1Text)

    if (!h1Text.includes("داشبورد") && !h1Text.includes("مدیریت")) {
      throw new Error(`Unexpected h1 content: ${h1Text}`)
    }
    console.log("  ✅ Dashboard content successfully loaded and verified.")

    // Check for overflow on 375px mobile dashboard
    const dashScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const dashClientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    console.log(`  Dashboard 375px scrollWidth=${dashScrollWidth}, clientWidth=${dashClientWidth}`)

    console.log("🎉 BROWSER LOGIN E2E TEST COMPLETED SUCCESSFULLY!")
  } finally {
    await browser.close()
  }
}

testAdminLoginBrowser().catch(err => {
  console.error("❌ Browser test failed:", err)
  process.exit(1)
})
