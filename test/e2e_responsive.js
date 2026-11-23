const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const VIEWPORT_MATRIX = [
  { width: 320, height: 568, name: '320px-iphone-se' },
  { width: 360, height: 640, name: '360px-compact-android' },
  { width: 375, height: 812, name: '375px-iphone-x' },
  { width: 390, height: 844, name: '390px-iphone-13' },
  { width: 414, height: 896, name: '414px-iphone-plus' },
  { width: 430, height: 932, name: '430px-iphone-promax' },
  { width: 768, height: 1024, name: '768px-ipad-portrait' },
  { width: 1024, height: 768, name: '1024px-ipad-landscape' },
  { width: 1280, height: 800, name: '1280px-laptop' },
  { width: 1440, height: 900, name: '1440px-desktop' },
  { width: 1920, height: 1080, name: '1920px-wide-desktop' }
];

async function measurePageOverflow(page) {
  return await page.evaluate(() => {
    const prevHtml = document.documentElement.style.overflowX;
    const prevBody = document.body.style.overflowX;
    document.documentElement.style.overflowX = 'visible';
    document.body.style.overflowX = 'visible';

    const clientW = document.documentElement.clientWidth;
    const scrollW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const hasOverflow = scrollW > clientW + 1;

    document.documentElement.style.overflowX = prevHtml;
    document.body.style.overflowX = prevBody;

    return { clientW, scrollW, hasOverflow, overflowPx: Math.max(0, scrollW - clientW) };
  });
}

async function runMatrix() {
  const screenshotDir = path.join(__dirname, '..', 'artifacts', 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const summary = [];
  const consoleErrors = [];

  for (const vp of VIEWPORT_MATRIX) {
    const isMobile = vp.width <= 768;
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile,
      hasTouch: isMobile,
      userAgent: isMobile
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    const page = await context.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[${vp.name}] ${msg.text()}`);
      }
    });

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // 1. Initial full-page overflow check
    const initialOverflow = await measurePageOverflow(page);

    // Save full page screenshot
    const fullScreenshotPath = path.join(screenshotDir, `full_${vp.name}.png`);
    await page.screenshot({ path: fullScreenshotPath, fullPage: true });

    // 2. Interactive Navigation (Mobile Hamburger or Desktop Links)
    let navInteracted = false;
    if (vp.width < 1024) {
      const hamburger = page.locator('button[aria-label="باز کردن منوی موبایل"]');
      if (await hamburger.isVisible()) {
        await hamburger.click();
        await page.waitForTimeout(300);
        // Verify mobile menu overlay fits
        const navOverflow = await measurePageOverflow(page);
        if (navOverflow.hasOverflow) {
          console.error(`Nav overflow at ${vp.name}: ${navOverflow.overflowPx}px`);
        }
        // Close menu
        await hamburger.click();
        await page.waitForTimeout(200);
        navInteracted = true;
      }
    }

    // 3. Interactive Booking Steps:
    // Step 1: Select a service from showcase
    const serviceButton = page.locator('#services button').first();
    if (await serviceButton.isVisible()) {
      await serviceButton.click();
      await page.waitForTimeout(400);
    }

    // Inside BookingStudio:
    const bookingSection = page.locator('#booking');
    if (await bookingSection.isVisible()) {
      await bookingSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      // Step 1 -> Step 2 button ("تایید خدمت و انتخاب زمان")
      const toStep2Btn = bookingSection.locator('button:has-text("تایید خدمت و انتخاب زمان")');
      if (await toStep2Btn.isVisible()) {
        await toStep2Btn.click();
        await page.waitForTimeout(500);
      }

      // Capture Step 2 (Calendar & Slots) screenshot for critical viewports
      if (['320px-iphone-se', '375px-iphone-x', '390px-iphone-13', '1440px-desktop'].includes(vp.name)) {
        await page.screenshot({
          path: path.join(screenshotDir, `booking_step2_${vp.name}.png`),
          clip: await bookingSection.boundingBox() || undefined
        });
      }

      // Check overflow on Step 2
      const step2Overflow = await measurePageOverflow(page);

      // Select a day (click second day card)
      const dayCards = bookingSection.locator('button:has(div > span:text-matches(".*"))');
      if (await dayCards.count() > 1) {
        await dayCards.nth(1).click();
        await page.waitForTimeout(300);
      }

      // Select an available time slot
      const availableSlot = bookingSection.locator('button:has-text("خالی")').first();
      if (await availableSlot.isVisible()) {
        await availableSlot.click();
        await page.waitForTimeout(300);
      }

      // Step 2 -> Step 3 ("ثبت مشخصات و تایید شماره")
      const toStep3Btn = bookingSection.locator('button:has-text("ثبت مشخصات و تایید شماره")');
      if (await toStep3Btn.isVisible()) {
        await toStep3Btn.click();
        await page.waitForTimeout(500);

        // Capture Step 3 screenshot
        if (['320px-iphone-se', '375px-iphone-x', '390px-iphone-13'].includes(vp.name)) {
          await page.screenshot({
            path: path.join(screenshotDir, `booking_step3_${vp.name}.png`),
            clip: await bookingSection.boundingBox() || undefined
          });
        }
      }

      // Check overflow on Step 3
      const step3Overflow = await measurePageOverflow(page);
    }

    // 4. Test FAQ Accordion
    const faqBtn = page.locator('#faq button').first();
    if (await faqBtn.isVisible()) {
      await faqBtn.scrollIntoViewIfNeeded();
      await faqBtn.click();
      await page.waitForTimeout(200);
    }

    // 5. Test Review Modal
    const reviewBtn = page.locator('#reviews button:has-text("ثبت تجربه و نظر شما")');
    if (await reviewBtn.isVisible()) {
      await reviewBtn.scrollIntoViewIfNeeded();
      await reviewBtn.click();
      await page.waitForTimeout(300);

      const reviewModal = page.locator('div[role="dialog"]');
      if (await reviewModal.isVisible()) {
        if (['375px-iphone-x'].includes(vp.name)) {
          await page.screenshot({ path: path.join(screenshotDir, `review_modal_${vp.name}.png`) });
        }
        // Close dialog
        const closeBtn = reviewModal.locator('button[aria-label="بستن فرم نظر"]');
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          await page.waitForTimeout(200);
        }
      }
    }

    // 6. Test Gallery Lightbox
    const galleryCard = page.locator('#gallery div[role="button"]').first();
    if (await galleryCard.isVisible()) {
      await galleryCard.scrollIntoViewIfNeeded();
      await galleryCard.click();
      await page.waitForTimeout(300);

      const lightbox = page.locator('div[role="dialog"][aria-label="نمایش بزرگتر تصویر گالری"]');
      if (await lightbox.isVisible()) {
        if (['375px-iphone-x'].includes(vp.name)) {
          await page.screenshot({ path: path.join(screenshotDir, `gallery_lightbox_${vp.name}.png`) });
        }
        // Close lightbox
        const closeBtn = lightbox.locator('button[aria-label="بستن پنجره"]');
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          await page.waitForTimeout(200);
        }
      }
    }

    // Final overflow check
    const finalOverflow = await measurePageOverflow(page);

    summary.push({
      viewport: `${vp.width}x${vp.height} (${vp.name})`,
      width: vp.width,
      measuredClientW: finalOverflow.clientW,
      measuredScrollW: finalOverflow.scrollW,
      overflow: finalOverflow.hasOverflow,
      overflowPx: finalOverflow.overflowPx,
      status: !finalOverflow.hasOverflow ? 'PASS' : 'FAIL'
    });

    await context.close();
  }

  await browser.close();

  console.log('\n========================================================================');
  console.log('         KOROUSH BARBER - REAL-BROWSER RESPONSIVE MATRIX RESULTS');
  console.log('========================================================================');
  console.table(summary);

  const allPassed = summary.every(s => s.status === 'PASS');
  console.log(`\nOVERALL STATUS: ${allPassed ? '✅ ALL 11 VIEWPORTS PASSED WITH ZERO OVERFLOW' : '❌ SOME VIEWPORTS FAILED'}`);

  if (consoleErrors.length > 0) {
    console.log('\nConsole Errors Detected:');
    consoleErrors.forEach(e => console.log('  -', e));
  } else {
    console.log('\n✅ Zero browser console errors detected.');
  }

  return { allPassed, summary };
}

runMatrix().then(({ allPassed }) => {
  if (!allPassed) process.exit(1);
}).catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
