const { chromium } = require('playwright');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

async function testAdmin() {
  const AUTH_SECRET = 'koroush-barber-luxury-secret-key-2026';
  const session = {
    userId: 'admin-1',
    username: 'admin',
    name: 'استاد کوروش',
    role: 'OWNER',
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600
  };
  const data = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  const token = data + '.' + signature;

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const screenshotDir = path.join(__dirname, '..', 'artifacts', 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const viewports = [
    { width: 320, height: 568, name: '320px' },
    { width: 375, height: 812, name: '375px' },
    { width: 768, height: 1024, name: '768px' },
    { width: 1024, height: 768, name: '1024px' },
    { width: 1440, height: 900, name: '1440px' }
  ];

  const adminRoutes = [
    '/admin',
    '/admin/appointments',
    '/admin/customers',
    '/admin/reviews',
    '/admin/services',
    '/admin/availability',
    '/admin/payments',
    '/admin/settings'
  ];

  let allPassed = true;

  for (const vp of viewports) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.width < 1024,
      hasTouch: vp.width < 1024
    });

    await ctx.addCookies([{
      name: 'admin_token',
      value: token,
      domain: 'localhost',
      path: '/'
    }, {
      name: 'admin_auth',
      value: token,
      domain: 'localhost',
      path: '/'
    }]);

    const page = await ctx.newPage();

    // 1. Test Mobile Hamburger Drawer on viewports < 1024px
    if (vp.width < 1024) {
      await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      const hamburger = await page.$('button[aria-label="باز کردن منوی مدیریت"]');
      if (hamburger) {
        await hamburger.click();
        await page.waitForTimeout(200);
        const drawerOpen = await page.$('aside[class*="animate-slideInRight"]');
        console.log(`[Admin ${vp.name}] Hamburger drawer opened: ${!!drawerOpen}`);
        if (!drawerOpen) {
          console.error(`❌ Mobile drawer failed to open on ${vp.name}`);
          allPassed = false;
        }
        // Close drawer
        const closeBtn = await page.$('button[aria-label="بستن منو"]');
        if (closeBtn) {
          await closeBtn.click();
          await page.waitForTimeout(200);
        }
      }
    }

    // 2. Test all routes for horizontal overflow
    for (const route of adminRoutes) {
      await page.goto('http://localhost:3000' + route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      const res = await page.evaluate(() => {
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

      const status = res.hasOverflow ? 'FAIL ❌' : 'PASS ✅';
      if (res.hasOverflow) allPassed = false;

      console.log(`[Admin ${vp.name}] ${route}: clientW=${res.clientW}, scrollW=${res.scrollW}, status=${status}`);

      const filename = `admin_${route.replace(/\//g, '_')}_${vp.name}.png`;
      await page.screenshot({ path: path.join(screenshotDir, filename), fullPage: false });
    }

    await ctx.close();
  }

  await browser.close();

  if (!allPassed) {
    throw new Error('Some admin routes failed responsive overflow tests!');
  }

  console.log('🎉 ALL ADMIN ROUTES & VIEWPORTS PASSED WITH ZERO OVERFLOW!');
}

testAdmin().catch((err) => {
  console.error('❌ Admin test failed:', err);
  process.exit(1);
});
