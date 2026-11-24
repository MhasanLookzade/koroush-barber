import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'artifacts/screenshots/typography');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'mobile-320', width: 320, height: 640 },
  { name: 'mobile-360', width: 360, height: 740 },
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-414', width: 414, height: 896 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-1024', width: 1024, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('--- TYPOGRAPHY VERIFICATION SUITE ---');

  // 1. Check Homepage
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  const fontsLoaded = await page.evaluate(async () => {
    await document.fonts.ready;
    const bodyFont = window.getComputedStyle(document.body).fontFamily;
    const h1 = document.querySelector('h1');
    const h1Font = h1 ? window.getComputedStyle(h1).fontFamily : null;
    const h1LineHeight = h1 ? window.getComputedStyle(h1).lineHeight : null;
    const bodyLineHeight = window.getComputedStyle(document.body).lineHeight;
    const fontFaces = Array.from(document.fonts).map(f => ({
      family: f.family,
      weight: f.weight,
      status: f.status
    }));

    return {
      bodyFont,
      h1Font,
      h1LineHeight,
      bodyLineHeight,
      fontFacesCount: fontFaces.length,
      loadedFamilies: [...new Set(fontFaces.filter(f => f.status === 'loaded').map(f => f.family))]
    };
  });

  console.log('Homepage Typography Audit:', JSON.stringify(fontsLoaded, null, 2));

  // Screenshot homepage desktop
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_homepage_desktop_1440.png'), fullPage: true });

  // Screenshot homepage mobile
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_homepage_mobile_375.png'), fullPage: false });

  // Scroll to booking desk and take screenshot
  const bookingEl = await page.$('#booking');
  if (bookingEl) {
    await bookingEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_booking_mobile_375.png'), fullPage: false });
  }

  // 2. Check Tracking Page
  await page.goto('http://localhost:3000/booking/status', { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_tracking_desktop_1440.png'), fullPage: false });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_tracking_mobile_375.png'), fullPage: false });

  // 3. Check Admin Login & Dashboard
  await page.goto('http://localhost:3000/admin-login', { waitUntil: 'networkidle' });
  await page.fill('#admin-username', 'admin');
  await page.fill('#admin-password', 'admin123456');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle' });

  // Admin Dashboard Desktop
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_admin_dashboard_desktop_1440.png'), fullPage: false });

  // Admin Dashboard Mobile
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_admin_dashboard_mobile_375.png'), fullPage: false });

  // 4. Check Admin SMS Center
  await page.goto('http://localhost:3000/admin/sms', { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_admin_sms_desktop_1440.png'), fullPage: false });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_admin_sms_mobile_375.png'), fullPage: false });

  // 5. Overflow audit across all 10 viewports on homepage
  console.log('\n--- MULTI-VIEWPORT OVERFLOW AUDIT ---');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      return {
        hasOverflow: scrollWidth > docWidth,
        scrollWidth,
        clientWidth: docWidth,
        diff: scrollWidth - docWidth
      };
    });
    console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}): Overflow = ${overflow.hasOverflow ? 'FAIL (' + overflow.diff + 'px)' : 'PASS'}`);
  }

  await browser.close();
  console.log('\nAll visual typography checks and screenshots completed!');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
