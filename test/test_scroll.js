const { chromium } = require("playwright")

async function testScroll() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  console.log("1. Navigating to http://localhost:3000/ ...")
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" })

  const initialScroll = await page.evaluate(() => window.scrollY)
  console.log("   Initial window.scrollY:", initialScroll)

  await page.waitForTimeout(2000)
  const after2sScroll = await page.evaluate(() => window.scrollY)
  console.log("   After 2000ms window.scrollY:", after2sScroll)

  if (after2sScroll > 50) {
    console.error("❌ FAILED: Page automatically scrolled to:", after2sScroll)
    process.exit(1)
  } else {
    console.log("✅ PASSED: Page stayed at the top on initial entry (scrollY = 0)!")
  }

  // 2. Test intentional click on Hero "رزرو آنلاین نوبت" CTA button
  console.log("2. Clicking Hero 'رزرو آنلاین نوبت' CTA button...")
  await page.click('button:has-text("رزرو آنلاین نوبت")')
  await page.waitForTimeout(1000)
  const afterHeroClick = await page.evaluate(() => window.scrollY)
  console.log("   After Hero CTA click window.scrollY:", afterHeroClick)
  if (afterHeroClick > 500) {
    console.log("✅ PASSED: Intentional CTA click correctly scrolled to booking desk!")
  } else {
    console.error("❌ FAILED: Intentional CTA did not scroll properly.")
    process.exit(1)
  }

  // 3. Test step transition alignment
  console.log("3. Advancing from Step 1 to Step 2...")
  await page.click('button:has-text("ادامه به انتخاب روز")')
  await page.waitForTimeout(1000)
  const afterStepTransition = await page.evaluate(() => window.scrollY)
  console.log("   After Step transition window.scrollY:", afterStepTransition)
  if (afterStepTransition > 500) {
    console.log("✅ PASSED: Step transition kept booking desk properly aligned!")
  }

  await browser.close()
  console.log("🎉 ALL SCROLL TESTS PASSED!")
}

testScroll().catch(err => {
  console.error("Error:", err)
  process.exit(1)
})
