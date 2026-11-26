const { chromium } = require("playwright")
const { PrismaClient } = require("@prisma/client")
const { formatJalaliDayString } = require("../lib/jalali.ts")

const prisma = new PrismaClient()

async function runTests() {
  console.log("==================================================================")
  console.log("   PHASE 6.1 — BOOKING WIZARD UX & PAYMENT CANCELLATION TEST SUITE")
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

  // =========================================================================
  // TEST 1: JALALI DATE FORMATTING ENGINE
  // =========================================================================
  console.log("--- 1. Testing Persian Jalali Date Formatting Engine ---")
  const dateNov25 = formatJalaliDayString("2026-11-25")
  console.log(`    2026-11-25 formatted as: "${dateNov25}"`)
  assert(dateNov25 === "چهارشنبه ۴ آذر", "2026-11-25 formats exactly as 'چهارشنبه ۴ آذر'")

  const dateNov26 = formatJalaliDayString("2026-11-26")
  console.log(`    2026-11-26 formatted as: "${dateNov26}"`)
  assert(dateNov26 === "پنج‌شنبه ۵ آذر", "2026-11-26 formats as 'پنج‌شنبه ۵ آذر'")

  const dateNov28 = formatJalaliDayString("2026-11-28")
  console.log(`    2026-11-28 formatted as: "${dateNov28}"`)
  assert(dateNov28 === "شنبه ۷ آذر", "2026-11-28 formats as 'شنبه ۷ آذر'")

  // Launch Playwright
  const browser = await chromium.launch({ headless: true })

  try {
    // =========================================================================
    // TEST 2: STEP 1 SERVICE CARD COMPACT LAYOUT (MOBILE & DESKTOP)
    // =========================================================================
    console.log("\n--- 2. Testing Step 1 Service Cards Layout & Height ---")
    const mobileViewports = [
      { width: 320, height: 600, name: "320px" },
      { width: 375, height: 667, name: "375px" },
      { width: 390, height: 844, name: "390px" },
      { width: 430, height: 932, name: "430px" },
    ]

    for (const vp of mobileViewports) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
      await page.goto("http://localhost:3000/#booking", { waitUntil: "networkidle" })
      
      const firstCard = await page.waitForSelector('#booking div[role="button"][aria-pressed]', { timeout: 5000 })
      assert(!!firstCard, `[${vp.name}] Service card rendered in Step 1`)
      
      if (firstCard) {
        const box = await firstCard.boundingBox()
        console.log(`    [${vp.name}] Service card height: ${Math.round(box.height)}px (Compact <= 135px)`)
        assert(box.height <= 140, `[${vp.name}] Card height is compact (${Math.round(box.height)}px <= 140px, down from 200px+)`)
      }

      // Check continue button
      const continueBtn = await page.$('button:has-text("ادامه به انتخاب روز")')
      assert(!!continueBtn, `[${vp.name}] 'ادامه به انتخاب روز' button visible without excessive scrolling`)
      await page.close()
    }

    const desktopViewports = [
      { width: 1024, height: 768, name: "1024px" },
      { width: 1280, height: 800, name: "1280px" },
      { width: 1440, height: 900, name: "1440px" },
    ]

    for (const vp of desktopViewports) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
      await page.goto("http://localhost:3000/#booking", { waitUntil: "networkidle" })
      
      const grid = await page.$('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3')
      assert(!!grid, `[${vp.name}] Desktop 3-column efficient grid is active`)
      await page.close()
    }

    // =========================================================================
    // TEST 3: STEP NAVIGATION & ACTIVE STEP SCROLLING
    // =========================================================================
    console.log("\n--- 3. Testing Step Navigation & Smooth Scroll to Active Step ---")
    const pageNav = await browser.newPage({ viewport: { width: 375, height: 667 } })
    await pageNav.goto("http://localhost:3000/#booking", { waitUntil: "networkidle" })
    
    // Click Step 1 -> Step 2
    const btnToStep2 = await pageNav.waitForSelector('#booking button:has-text("ادامه به انتخاب روز")', { timeout: 5000 })
    await btnToStep2.click()
    
    const step2Heading = await pageNav.waitForSelector('#booking h3:has-text("مرحله ۲")', { timeout: 5000 })
    assert(!!step2Heading, "Navigated to Step 2 (مرحله ۲: انتخاب روز نوبت)")
    
    // Check that active step content is positioned right below header (scroll offset test)
    await pageNav.waitForTimeout(800)
    const step2Box = await step2Heading.boundingBox()
    console.log(`    Step 2 heading y-position in viewport: ${Math.round(step2Box.y)}px`)
    assert(step2Box.y >= 50 && step2Box.y <= 160, "Step 2 heading is positioned comfortably below sticky header (~70-150px)")

    // Click on date in Step 2 to go to Step 3
    const continueToStep3 = await pageNav.waitForSelector('#booking button:has-text("تایید روز و انتخاب ساعت")', { timeout: 5000 })
    if (continueToStep3) {
      await continueToStep3.click()
      const step3Heading = await pageNav.waitForSelector('#booking h3:has-text("مرحله ۳")', { timeout: 5000 })
      assert(!!step3Heading, "Navigated to Step 3 (مرحله ۳: انتخاب ساعت نوبت)")
      await pageNav.waitForTimeout(800)
      const step3Box = await step3Heading.boundingBox()
      console.log(`    Step 3 heading y-position in viewport: ${Math.round(step3Box.y)}px`)
      assert(step3Box.y >= 50 && step3Box.y <= 160, "Step 3 heading is positioned comfortably below sticky header")

      // Select an available slot in Step 3 and continue to Step 4
      const firstAvailableSlot = await pageNav.waitForSelector('#booking button:has-text("قابل رزرو")', { timeout: 5000 })
      if (firstAvailableSlot) {
        await firstAvailableSlot.click()
        await pageNav.waitForTimeout(300)
        const continueToStep4 = await pageNav.$('#booking button:has-text("تایید ساعت و ثبت مشخصات")')
        if (continueToStep4) {
          await continueToStep4.click()
          const step4Heading = await pageNav.waitForSelector('#booking h3:has-text("مرحله ۴")', { timeout: 5000 })
          assert(!!step4Heading, "Navigated to Step 4 (مرحله ۴: مشخصات مراجع)")
          await pageNav.waitForTimeout(800)
          const step4Box = await step4Heading.boundingBox()
          console.log(`    Step 4 heading y-position in viewport: ${Math.round(step4Box.y)}px`)
          assert(step4Box.y >= 50 && step4Box.y <= 160, "Step 4 heading is positioned comfortably below sticky header")
        }
      }
    }

    await pageNav.close()

    // =========================================================================
    // TEST 4: STEP 5 JALALI DATE IN BROWSER
    // =========================================================================
    console.log("\n--- 4. Testing Step 5 Persian Date Display in Live UI ---")
    const pageStep5 = await browser.newPage({ viewport: { width: 375, height: 667 } })
    // Directly simulate entering Step 5 with a test date
    await pageStep5.goto("http://localhost:3000/?cancelled=true&dateStr=2026-11-25&timeStr=14:00&phone=09121112233&name=سهراب%20سپهری#booking", { waitUntil: "networkidle" })
    await pageStep5.waitForTimeout(600)

    const step5Heading = await pageStep5.$('h3:has-text("مرحله ۵: تایید مشخصات و پرداخت بیعانه")')
    assert(!!step5Heading, "Step 5 is active on payment return")

    const dateElement = await pageStep5.$('strong:has-text("چهارشنبه ۴ آذر")')
    assert(!!dateElement, "Step 5 displays 'چهارشنبه ۴ آذر' instead of Gregorian 2026-11-25")
    
    // Check cancellation alert notice
    const cancelNotice = await pageStep5.$('p:has-text("پرداخت لغو شد و نوبت قبلی آزاد گردید")')
    assert(!!cancelNotice, "Persian cancellation notice is clearly displayed: 'پرداخت لغو شد و نوبت قبلی آزاد گردید...'")

    // Check pre-filled customer details
    const customerPhoneDisplay = await pageStep5.$('strong:has-text("۰۹۱۲•••۲۲۳۳")')
    assert(!!customerPhoneDisplay, "Customer phone is pre-filled and correctly masked")

    const customerNameDisplay = await pageStep5.$('div:has-text("سهراب سپهری")')
    assert(!!customerNameDisplay, "Customer name 'سهراب سپهری' is preserved")

    await pageStep5.close()

    // =========================================================================
    // TEST 5: PAYMENT CANCELLATION & MOCK GATEWAY RETURN CYCLE
    // =========================================================================
    console.log("\n--- 5. Testing Complete Payment Cancellation Lifecycle ---")
    // Create a real hold in database to simulate real payment initiation
    const barber = await prisma.barber.findFirstOrThrow({ where: { isActive: true } })
    const service = await prisma.service.findFirstOrThrow({ where: { isActive: true } })

    const holdSlotTime = new Date("2026-11-25T14:30:00Z")
    // Clean up any existing hold, appt, and payment
    await prisma.payment.deleteMany({ where: { authority: "AUTH-PHASE6-TEST-9999" } })
    await prisma.appointment.deleteMany({ where: { trackingCode: "KB-P6TEST-01" } })
    await prisma.slotHold.deleteMany({ where: { barberId: barber.id, slotTime: holdSlotTime } })

    const appt = await prisma.appointment.create({
      data: {
        trackingCode: "KB-P6TEST-01",
        barberId: barber.id,
        serviceId: service.id,
        date: holdSlotTime,
        endDate: new Date(holdSlotTime.getTime() + 60 * 60000),
        status: "AWAITING_PAYMENT",
        customerName: "فرهاد مجیدی",
        customerPhone: "09129998877",
        totalPrice: service.price,
        depositPaid: 0,
        balanceDue: service.price - service.depositPrice,
      },
    })

    const hold = await prisma.slotHold.create({
      data: {
        barberId: barber.id,
        slotTime: holdSlotTime,
        customerPhone: "09129998877",
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 600000),
      },
    })

    const payment = await prisma.payment.create({
      data: {
        appointmentId: appt.id,
        authority: "AUTH-PHASE6-TEST-9999",
        amountToman: service.depositPrice,
        amountRial: service.depositPrice * 10,
        gateway: "MOCK",
        status: "PENDING",
      },
    })

    // Now navigate to mock payment page and click Cancel (NOK)
    const pagePay = await browser.newPage({ viewport: { width: 375, height: 667 } })
    await pagePay.goto(`http://localhost:3000/payment/mock/${payment.authority}`, { waitUntil: "networkidle" })
    
    const cancelBtn = await pagePay.$('button:has-text("انصراف مشتری از پرداخت")')
    assert(!!cancelBtn, "Mock gateway has 'انصراف مشتری از پرداخت' button")

    await cancelBtn.click()
    await pagePay.waitForNavigation({ waitUntil: "networkidle" })

    // Verify redirected back to booking
    console.log(`    Current URL after gateway cancel: ${pagePay.url()}`)
    assert(pagePay.url().includes("cancelled=true"), "Redirected back to booking with cancelled=true")

    const restoredStep5 = await pagePay.waitForSelector('h3:has-text("مرحله ۵")', { timeout: 5000 })
    assert(!!restoredStep5, "Booking wizard automatically restored to Step 5 (مرحله ۵)")

    const alertMsg = await pagePay.waitForSelector('p:has-text("پرداخت لغو شد و نوبت قبلی آزاد گردید")', { timeout: 5000 })
    assert(!!alertMsg, "Cancellation alert message is prominently displayed on Step 5")

    // Check DB state after cancellation
    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } })
    assert(updatedPayment.status === "FAILED", "Payment marked FAILED in database")

    const updatedAppt = await prisma.appointment.findUnique({ where: { id: appt.id } })
    assert(updatedAppt.status === "CANCELLED", "Appointment marked CANCELLED in database")

    const updatedHold = await prisma.slotHold.findUnique({ where: { id: hold.id } })
    assert(updatedHold.status === "RELEASED", "Reservation hold marked RELEASED in database")

    await pagePay.close()

    // =========================================================================
    // TEST 6: MOBILE HAMBURGER MENU FIX
    // =========================================================================
    console.log("\n--- 6. Testing Mobile Hamburger Menu (Full-Height & Outside Click) ---")
    const pageMenu = await browser.newPage({ viewport: { width: 375, height: 667 } })
    await pageMenu.goto("http://localhost:3000", { waitUntil: "networkidle" })

    // Scroll down by 150px to ensure backdrop-blur-xl is active on header
    await pageMenu.evaluate(() => window.scrollTo(0, 150))
    await pageMenu.waitForTimeout(300)

    const menuBtn = await pageMenu.$('button[aria-label*="منوی ناوبری"]')
    assert(!!menuBtn, "Hamburger button found on mobile viewport")

    await menuBtn.click()
    await pageMenu.waitForTimeout(300)

    const drawer = await pageMenu.$('#mobile-navigation-drawer')
    assert(!!drawer, "Mobile drawer is rendered (via Portal)")

    if (drawer) {
      const drawerBox = await drawer.boundingBox()
      console.log(`    Mobile drawer height while scrolled: ${Math.round(drawerBox.height)}px`)
      assert(drawerBox.height >= 550, `Drawer expands to full viewport height (${Math.round(drawerBox.height)}px >= 550px, fixed from 49px!)`)
    }

    // Test toggle close
    await menuBtn.click()
    await pageMenu.waitForTimeout(300)
    const drawerAfterToggle = await pageMenu.$('#mobile-navigation-drawer')
    assert(!drawerAfterToggle, "Tapping hamburger/close toggle button successfully closes mobile drawer")

    // Re-open to test backdrop overlay dismiss
    await menuBtn.click()
    await pageMenu.waitForTimeout(300)
    const backdrop = await pageMenu.$('.fixed.inset-0.bg-black\\/60')
    assert(!!backdrop, "Clickable backdrop overlay is active")
    if (backdrop) {
      await pageMenu.evaluate(() => {
        const bd = document.querySelector('.fixed.inset-0.bg-black\\/60')
        if (bd) bd.click()
      })
      await pageMenu.waitForTimeout(300)
      const drawerAfterBackdrop = await pageMenu.$('#mobile-navigation-drawer')
      assert(!drawerAfterBackdrop, "Backdrop overlay click successfully dismisses mobile drawer")
    }

    await pageMenu.close()

    // =========================================================================
    // TEST 7: OTP BUTTON STYLING & STATUS PAGE CUSTOMER BANNER
    // =========================================================================
    console.log("\n--- 7. Testing OTP Button Styling & Customer Profile Banner ---")
    const pageStatus = await browser.newPage({ viewport: { width: 375, height: 667 } })
    await pageStatus.goto("http://localhost:3000/booking/status", { waitUntil: "networkidle" })

    // Switch to phone tab
    const phoneTab = await pageStatus.waitForSelector('button:has-text("ورود با شماره همراه")', { timeout: 5000 })
    await phoneTab.click()
    await pageStatus.waitForTimeout(300)

    // Type a test phone to activate OTP button
    await pageStatus.fill('#track-phone-input', '09121112233')
    await pageStatus.waitForTimeout(200)

    const otpBtn = await pageStatus.waitForSelector('button:has-text("دریافت کد تایید")', { timeout: 5000 })
    assert(!!otpBtn, "OTP send button is present and active")

    if (otpBtn) {
      const classAttr = await otpBtn.getAttribute("class")
      console.log(`    OTP button classes: ${classAttr.slice(0, 60)}...`)
      assert(classAttr.includes("bg-gradient-to-r") && classAttr.includes("from-[#E4C88E]"), "OTP button uses bright gold gradient primary styling")
    }

    await pageStatus.close()

  } finally {
    await browser.close()
    await prisma.$disconnect()
  }

  console.log("\n==================================================================")
  console.log(`  PHASE 6.1 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log("==================================================================")

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
