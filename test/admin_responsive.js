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
    { width: 375, height: 812, name: '375px' },
    { width: 320, height: 568, name: '320px' }
  ];

  const adminRoutes = [
    '/admin',
    '/admin/appointments',
    '/admin/customers',
    '/admin/reviews'
  ];

  for (const vp of viewports) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: true,
      hasTouch: true
    });

    await ctx.addCookies([{
      name: 'admin_token',
      value: token,
      domain: 'localhost',
      path: '/'
    }]);

    const page = await ctx.newPage();

    for (const route of adminRoutes) {
      await page.goto('http://localhost:3000' + route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

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

      console.log(`[Admin ${vp.name}] ${route}: clientW=${res.clientW}, scrollW=${res.scrollW}, overflow=${res.hasOverflow}`);

      const filename = `admin_${route.replace(/\//g, '_')}_${vp.name}.png`;
      await page.screenshot({ path: path.join(screenshotDir, filename), fullPage: true });
    }

    await ctx.close();
  }

  await browser.close();
  console.log('✅ Admin mobile responsiveness test completed.');
}

testAdmin().catch(console.error);
