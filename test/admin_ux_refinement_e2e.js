const { chromium } = require('playwright');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('==================================================================');
  console.log('  KOROUSH BARBER — COMPREHENSIVE E2E VERIFICATION SUITE');
  console.log('==================================================================');

  // 1. Ensure test data exists (Customer with birthday for CRM testing)
  await prisma.customer.upsert({
    where: { phone: '09121112233' },
    create: {
      phone: '09121112233',
      name: 'علیرضا تهرانی',
      birthDate: '1370/09/04',
      smsConsent: true,
      adminNotes: 'مشتری تست ویژه',
    },
    update: {
      name: 'علیرضا تهرانی',
      birthDate: '1370/09/04',
      smsConsent: true,
    },
  });

  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  let AUTH_SECRET = 'dev-secret-key-for-development-only-change-in-production';
  const match = envContent.match(/NEXTAUTH_SECRET="?([^"\n\r]+)"?/);
  if (match) AUTH_SECRET = match[1];

  const session = {
    userId: 'admin-1',
    username: 'admin',
    name: 'استاد کوروش',
    role: 'OWNER',
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
  };
  const sessionData = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(sessionData).digest('base64url');
  const token = sessionData + '.' + signature;

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passCount++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failCount++;
    }
  }

  try {
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'admin_token',
        value: token,
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'admin_auth',
        value: token,
        domain: 'localhost',
        path: '/',
      },
    ]);

    const page = await context.newPage();

    // --------------------------------------------------------------------------
    // Test 1: Homepage Scroll Behavior
    // --------------------------------------------------------------------------
    console.log('\n📌 Test 1: Homepage Scroll Behavior (No Unintended Scroll)');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    let scrollY = await page.evaluate(() => window.scrollY);
    assert(scrollY === 0, `Initial scrollY is 0 (actual: ${scrollY})`);

    await page.waitForTimeout(1000);
    scrollY = await page.evaluate(() => window.scrollY);
    assert(scrollY === 0, `scrollY remains 0 after 1s (actual: ${scrollY})`);

    // Click Intentional CTA: "رزرو آنلاین نوبت"
    const ctaButton = page.locator('text=رزرو آنلاین نوبت').first();
    if (await ctaButton.isVisible()) {
      await ctaButton.click();
      await page.waitForTimeout(800);
      scrollY = await page.evaluate(() => window.scrollY);
      assert(scrollY > 500, `CTA successfully scrolls down to booking desk (scrollY: ${scrollY})`);
    }

    // --------------------------------------------------------------------------
    // Test 2: Admin Appointment Scheduling & Date Navigation
    // --------------------------------------------------------------------------
    console.log('\n📌 Test 2: Admin Scheduling & Date Navigation (/admin)');
    await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });

    // Verify today's date is selected by default in APP_TIMEZONE (2026-11-24)
    const isTodayBadgeVisible = await page.locator('text=امروز').first().isVisible();
    assert(isTodayBadgeVisible, 'Today badge is visible on initial dashboard load');

    // Verify Daily Navigation toolbar is present
    const prevDayBtn = page.locator('button:has-text("روز قبل")').first();
    const nextDayBtn = page.locator('button:has-text("روز بعد")').first();
    assert(await prevDayBtn.isVisible(), '"روز قبل" button is present and visible');
    assert(await nextDayBtn.isVisible(), '"روز بعد" button is present and visible');

    // Click "روز قبل" -> date should decrement, URL updates with ?date=
    await prevDayBtn.click();
    await page.waitForTimeout(600);
    let currentUrl = page.url();
    assert(currentUrl.includes('date='), `URL query param ?date= updated after clicking روز قبل (${currentUrl})`);

    // Verify "بازگشت به امروز" button appears when not on today
    const backToTodayBtn = page.locator('button:has-text("بازگشت به امروز")').first();
    assert(await backToTodayBtn.isVisible(), '"بازگشت به امروز" button appears when viewing non-today date');

    // Click "بازگشت به امروز" -> resets to today
    await backToTodayBtn.click();
    await page.waitForTimeout(600);
    const todayPill = await page.locator('text=روز جاری سالن').first().isVisible();
    assert(todayPill, '"بازگشت به امروز" restores view to today');

    // --------------------------------------------------------------------------
    // Test 3: Compact Timeline (13 Slots: 10:00 to 23:00)
    // --------------------------------------------------------------------------
    console.log('\n📌 Test 3: Compact Timeline (13 Slots, Sleek Height, Status Badges)');
    const timelineHeading = await page.locator('text=تایم‌لاین ساعتی سالن').first().isVisible();
    assert(timelineHeading, 'Timeline heading is present');

    const slotPills = await page.locator('text=الی').all();
    assert(slotPills.length >= 13, `All 13 hourly salon slots are rendered (found ${slotPills.length} slots)`);

    // Check compact height: each slot row should be under 110px on desktop
    const slotCard = page.locator('[data-slot-item="10:00"]').first();
    const box = await slotCard.boundingBox();
    if (box) {
      assert(box.height < 110, `Slot card height is sleek and compact (height: ${Math.round(box.height)}px)`);
    }

    // --------------------------------------------------------------------------
    // Test 4: Customer Profile -> SMS Center Navigation
    // --------------------------------------------------------------------------
    console.log('\n📌 Test 4: CRM Customer Profile -> SMS Center Navigation');
    await page.goto('http://localhost:3000/admin/customers', { waitUntil: 'networkidle' });
    const customerRow = page.locator('text=علیرضا تهرانی').first();
    if (await customerRow.isVisible()) {
      await customerRow.click();
      await page.waitForTimeout(500);

      const sendSmsToCustBtn = page.locator('button:has-text("ارسال پیامک به مشتری")').first();
      assert(await sendSmsToCustBtn.isVisible(), '"ارسال پیامک به مشتری" button is present in customer profile modal');

      // Click button and verify navigation to SMS Center
      await sendSmsToCustBtn.click();
      await page.waitForTimeout(800);
      const smsUrl = page.url();
      assert(smsUrl.includes('/admin/sms') && smsUrl.includes('customerId='), `Navigated to SMS center with customerId (${smsUrl})`);
    }

    // --------------------------------------------------------------------------
    // Test 5: Birthday Cards -> SMS Center Navigation
    // --------------------------------------------------------------------------
    console.log('\n📌 Test 5: Birthday Cards -> SMS Center Navigation');
    await page.goto('http://localhost:3000/admin/birthdays', { waitUntil: 'networkidle' });
    const birthdaySendBtn = page.locator('a[href*="/admin/sms?tab=compose"]:has-text("ارسال پیامک")').first();
    assert(await birthdaySendBtn.isVisible(), '"ارسال پیامک" button on birthday card links directly to SMS Center');

    // --------------------------------------------------------------------------
    // Test 6: SMS Center Workflow & Strict Tab Order
    // --------------------------------------------------------------------------
    console.log('\n📌 Test 6: SMS Center Tabs, Templates & Reminders');
    await page.goto('http://localhost:3000/admin/sms', { waitUntil: 'networkidle' });

    // Verify Tab 1 is active by default ("ارسال پیامک جدید")
    const activeTabTitle = await page.locator('button:has-text("ارسال پیامک جدید")').first().getAttribute('class');
    assert(activeTabTitle.includes('bg-[#C8A96B]'), 'Tab 1 ("ارسال پیامک جدید") is the DEFAULT active tab');

    // Verify All 4 Tabs exist in strict order
    const tabButtons = await page.locator('button:has-text("ارسال پیامک جدید"), button:has-text("قالب‌های پیامک"), button:has-text("یادآوری‌ها و زمان‌بندی"), button:has-text("لاگ‌ها و تاریخچه ارسال")').all();
    assert(tabButtons.length === 4, `All 4 SMS Center tabs exist (found: ${tabButtons.length})`);

    // Verify dynamic variable tokens are present
    const varToken = page.locator('button:has-text("{customer_name}")').first();
    assert(await varToken.isVisible(), 'Dynamic variable token {customer_name} is clickable');

    // Click token -> inserts into textarea
    await varToken.click();
    const textareaVal = await page.locator('textarea').first().inputValue();
    assert(textareaVal.includes('{customer_name}'), 'Clicking token successfully inserts {customer_name} into message');

    // Switch to Tab 2: "قالب‌های پیامک"
    await page.locator('button:has-text("قالب‌های پیامک")').first().click();
    await page.waitForTimeout(500);
    const createTplBtn = page.locator('button:has-text("ایجاد قالب جدید")').first();
    assert(await createTplBtn.isVisible(), '"ایجاد قالب جدید" button is visible in Templates tab');

    // Switch to Tab 3: "یادآوری‌ها و زمان‌بندی"
    await page.locator('button:has-text("یادآوری‌ها و زمان‌بندی")').first().click();
    await page.waitForTimeout(500);
    const reminderHeading = page.locator('text=قوانین و زمان‌بندی یادآوری‌های خودکار سالن').first();
    assert(await reminderHeading.isVisible(), 'Reminder rules configuration is visible in Reminders tab');

    // Switch to Tab 4: "لاگ‌ها و تاریخچه ارسال" (MUST BE LAST)
    await page.locator('button:has-text("لاگ‌ها و تاریخچه ارسال")').first().click();
    await page.waitForTimeout(500);
    const searchLogInput = page.locator('input[placeholder*="جستجوی شماره همراه"]').first();
    assert(await searchLogInput.isVisible(), 'Log search and filter outbox is visible in Logs tab (Tab 4)');

    // --------------------------------------------------------------------------
    // Test 7: Working Hours Settings Buttons Colors (/admin/availability)
    // --------------------------------------------------------------------------
    console.log('\n📌 Test 7: Working Hours Button Colors (/admin/availability)');
    await page.goto('http://localhost:3000/admin/availability', { waitUntil: 'networkidle' });
    const blockSubmitBtn = page.locator('button:has-text("ثبت مسدودی")').first();
    const blockBtnClass = await blockSubmitBtn.getAttribute('class');
    assert(blockBtnClass.includes('bg-[#C8A96B]'), 'Block slot submit button uses brand gold #C8A96B');

    const holidaySubmitBtn = page.locator('button:has-text("ثبت وضعیت تعطیلی تاریخ")').first();
    const holidayBtnClass = await holidaySubmitBtn.getAttribute('class');
    assert(holidayBtnClass.includes('bg-[#C8A96B]'), 'Holiday override submit button uses brand gold #C8A96B');

    // --------------------------------------------------------------------------
    // Test 8: Responsive Layout & Zero Overflow (320px to 1440px)
    // --------------------------------------------------------------------------
    console.log('\n📌 Test 8: Responsive Layout & Zero Horizontal Overflow');
    const viewports = [
      { width: 320, height: 568, name: '320px (iPhone SE 1st gen)' },
      { width: 375, height: 667, name: '375px (iPhone SE 2nd gen)' },
      { width: 414, height: 896, name: '414px (iPhone 11/XR)' },
      { width: 768, height: 1024, name: '768px (iPad Mini)' },
      { width: 1024, height: 768, name: '1024px (iPad Pro / Small Laptop)' },
      { width: 1440, height: 900, name: '1440px (Desktop Full HD)' },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      assert(!overflow, `No horizontal overflow at ${vp.name} on /admin`);

      // Touch target verification on mobile (< 640px)
      if (vp.width < 640) {
        const prevDayBox = await prevDayBtn.boundingBox();
        if (prevDayBox) {
          assert(prevDayBox.height >= 40, `Touch target height is accessible at ${vp.name} (height: ${Math.round(prevDayBox.height)}px)`);
        }
      }
    }

    console.log('\n==================================================================');
    console.log(`  E2E SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('==================================================================');

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main();
