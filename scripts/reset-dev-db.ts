/**
 * Koroush Barber — Protected Development Database Reset Command
 *
 * Exclusively for LOCAL DEVELOPMENT environments.
 * Safely clears all transactional/customer data (appointments, customers, payments,
 * reviews, SMS history, audit logs, holds, blocked intervals) while keeping
 * essential application schema and baseline configuration (services, working hours,
 * site settings, admin users) intact.
 *
 * Rejects any production database connection string.
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export async function resetDevelopmentDatabase() {
  console.log("==================================================================")
  console.log("  KOROUSH BARBER — SAFE LOCAL DEVELOPMENT DATABASE RESET")
  console.log("==================================================================")

  // 1. Safety Boundary Verifications
  const dbUrl = process.env.DATABASE_URL || ""
  const nodeEnv = process.env.NODE_ENV || "development"

  if (!dbUrl) {
    console.error("❌ [ABORT] DATABASE_URL environment variable is not defined.")
    process.exit(1)
  }

  if (nodeEnv === "production") {
    console.error("❌ [SECURITY ALERT] Cannot run db:reset:dev in PRODUCTION environment!")
    process.exit(1)
  }

  // Reject known production or external cloud database hosts
  const forbiddenProductionKeywords = [
    "production",
    "prod",
    "neon.tech",
    "supabase.co",
    "railway.app",
    "rds.amazonaws.com",
    "azure.com",
    "gcp.",
    "cleardb",
    "planetscale",
  ]

  const lowerUrl = dbUrl.toLowerCase()
  for (const keyword of forbiddenProductionKeywords) {
    if (lowerUrl.includes(keyword)) {
      console.error(
        `❌ [SECURITY ALERT] Target DATABASE_URL contains '${keyword}'. Reset aborted to protect external/production data!`
      )
      process.exit(1)
    }
  }

  // Mask password in DB URL for safe logging
  const sanitizedUrl = dbUrl.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:******@")
  console.log(`📌 Confirmed Environment: ${nodeEnv}`)
  console.log(`📌 Confirmed Target DB:   ${sanitizedUrl}`)
  console.log("------------------------------------------------------------------")

  try {
    console.log("🧹 [1/3] Purging all business, customer, and transactional records...")

    // Atomic or sequential cleanup of customer and transactional data
    const deletedPayments = await prisma.payment.deleteMany({})
    console.log(`   - Purged Payments:             ${deletedPayments.count} records`)

    const deletedAppointments = await prisma.appointment.deleteMany({})
    console.log(`   - Purged Appointments:         ${deletedAppointments.count} records`)

    const deletedHolds = await prisma.slotHold.deleteMany({})
    console.log(`   - Purged Slot Holds:           ${deletedHolds.count} records`)

    const deletedNotifications = await prisma.notification.deleteMany({})
    console.log(`   - Purged Notifications:        ${deletedNotifications.count} records`)

    const deletedCustomers = await prisma.customer.deleteMany({})
    console.log(`   - Purged Customers:            ${deletedCustomers.count} records`)

    const deletedReviews = await prisma.review.deleteMany({})
    console.log(`   - Purged Reviews:              ${deletedReviews.count} records`)

    const deletedNotificationJobs = await prisma.notificationJob.deleteMany({})
    console.log(`   - Purged SMS / NotificationJobs: ${deletedNotificationJobs.count} records`)

    const deletedAuditLogs = await prisma.auditLog.deleteMany({})
    console.log(`   - Purged Audit Logs:           ${deletedAuditLogs.count} records`)

    const deletedOverrides = await prisma.scheduleOverride.deleteMany({})
    console.log(`   - Purged Schedule Overrides:   ${deletedOverrides.count} records`)

    const deletedBlocked = await prisma.blockedInterval.deleteMany({})
    console.log(`   - Purged Blocked Intervals:    ${deletedBlocked.count} records`)

    const deletedOtp = await prisma.otpChallenge.deleteMany({})
    console.log(`   - Purged OTP Challenges:       ${deletedOtp.count} records`)

    console.log("\n⚙️ [2/3] Provisioning baseline salon configuration & admin access...")

    // 1. Master Barber Koroush
    const masterBarber = await prisma.barber.upsert({
      where: { id: "barber-kourosh" },
      update: {
        name: "کوروش (مدیر و آرایشگر ارشد)",
        title: "استاد پیرایش و استایل مردانه",
        bio: "با ۱۵ سال تجربه تخصصی در طراحی استایل کلاسیک و مدرن مردانه در معتبرترین سالن‌های تهران.",
        phone: "09121112233",
        email: "kourosh@kouroshbarber.ir",
        rating: 5.0,
        reviewCount: 120,
        isActive: true,
      },
      create: {
        id: "barber-kourosh",
        name: "کوروش (مدیر و آرایشگر ارشد)",
        title: "استاد پیرایش و استایل مردانه",
        bio: "با ۱۵ سال تجربه تخصصی در طراحی استایل کلاسیک و مدرن مردانه در معتبرترین سالن‌های تهران.",
        phone: "09121112233",
        email: "kourosh@kouroshbarber.ir",
        rating: 5.0,
        reviewCount: 120,
        isActive: true,
      },
    })

    // 2. Standard Working Hours: 10:00 to 23:00 for 7 days
    for (let day = 0; day <= 6; day++) {
      await prisma.workingHour.upsert({
        where: {
          barberId_dayOfWeek: {
            barberId: masterBarber.id,
            dayOfWeek: day,
          },
        },
        update: {
          startTime: "10:00",
          endTime: "23:00",
          isWorking: true,
        },
        create: {
          barberId: masterBarber.id,
          dayOfWeek: day,
          startTime: "10:00",
          endTime: "23:00",
          isWorking: true,
        },
      })
    }

    // 3. Official Services with 100% authoritative pricing (60-minute duration, 20% deposit)
    const servicesData = [
      {
        id: "srv-full-cut",
        name: "اصلاح کامل مو و صورت",
        description: "خدمت جامع پیرایش سر و ریش با طراحی اختصاصی فرم، خط‌زنی دقیق با تیغ سنتی، حوله گرم و سشوار حرفه‌ای",
        price: 1000000,
        depositPrice: 200000,
        depositType: "fixed",
        depositPercent: 20,
        duration: 60,
        category: "اصلاح و استایل",
        sortOrder: 1,
        image: "/images/service-full.jpg",
        isActive: true,
      },
      {
        id: "srv-hair-cut",
        name: "اصلاح مو",
        description: "کوتاهی کلاسیک و مدرن متناسب با فرم جمجمه و صورت، شست‌وشو با شامپوی ارگانیک و استایل نهایی",
        price: 750000,
        depositPrice: 150000,
        depositType: "fixed",
        depositPercent: 20,
        duration: 60,
        category: "اصلاح و استایل",
        sortOrder: 2,
        image: "/images/service-haircut.jpg",
        isActive: true,
      },
      {
        id: "srv-beard-trim",
        name: "اصلاح و مرتب‌سازی ریش و صورت",
        description: "فرم‌دهی متقارن ریش و سبیل، آنکارد با تیغ ژاپنی، بخور گرم و استفاده از روغن تقویتی طبیعی",
        price: 350000,
        depositPrice: 70000,
        depositType: "fixed",
        depositPercent: 20,
        duration: 60,
        category: "ریش و سبیل",
        sortOrder: 3,
        image: "/images/service-beard.jpg",
        isActive: true,
      },
      {
        id: "srv-fade-special",
        name: "اصلاح تخصصی فید و مدل مو",
        description: "اجرای دقیق انواع فید (Skin Fade, Taper, Drop Fade) با تلفیق تکنیک‌های قیچی و ماشین، تکسچرینگ مدرن",
        price: 850000,
        depositPrice: 170000,
        depositType: "fixed",
        depositPercent: 20,
        duration: 60,
        category: "اصلاح و استایل",
        sortOrder: 4,
        image: "/images/service-fade.jpg",
        isActive: true,
      },
      {
        id: "srv-vip-package",
        name: "پکیج ویژه اصلاح VIP",
        description: "پکیج شاهانه شامل اصلاح کامل سر و ریش، فیشیال عمیق پوست، ماسک طلا، ماساژ اسکالپ سر و پذیرایی ویژه سالن",
        price: 1300000,
        depositPrice: 260000,
        depositType: "fixed",
        depositPercent: 20,
        duration: 60,
        category: "پکیج‌های اختصاصی",
        sortOrder: 5,
        image: "/images/service-vip.jpg",
        isActive: true,
      },
      {
        id: "srv-wash-styling",
        name: "شست‌وشو و حالت‌دهی مو",
        description: "شست‌وشوی دو مرحله‌ای تقویتی، ماساژ آرامش‌بخش پوست سر، براشینگ و استایل با بهترین واکس و پمادهای مات",
        price: 200000,
        depositPrice: 40000,
        depositType: "fixed",
        depositPercent: 20,
        duration: 60,
        category: "مراقبت و استایل",
        sortOrder: 6,
        image: "/images/service-wash.jpg",
        isActive: true,
      },
      {
        id: "srv-facial-care",
        name: "پاکسازی و مراقبت پوست صورت",
        description: "بخور گرم، پاکسازی منافذ، اسکراب لایه‌بردار سلول‌های مرده، ماسک زغال فعال و آبرسانی عمیق با سرم طلا",
        price: 450000,
        depositPrice: 90000,
        depositType: "fixed",
        depositPercent: 20,
        duration: 60,
        category: "مراقبت پوست",
        sortOrder: 7,
        image: "/images/service-facial.jpg",
        isActive: true,
      },
      {
        id: "srv-hair-mask",
        name: "ماسک و مراقبت تخصصی مو",
        description: "درمان عمقی ساقه مو با کراتین سرد و ویتامینه ارگانیک، رفع خشکی و درخشان‌کننده تخصصی موهای آسیب‌دیده",
        price: 300000,
        depositPrice: 60000,
        depositType: "fixed",
        depositPercent: 20,
        duration: 60,
        category: "مراقبت و استایل",
        sortOrder: 8,
        image: "/images/service-mask.jpg",
        isActive: true,
      },
    ]

    for (const srv of servicesData) {
      await prisma.service.upsert({
        where: { id: srv.id },
        update: srv,
        create: srv,
      })
    }

    // 4. Default Admin Accounts
    const ownerPassword = process.env.INITIAL_ADMIN_PASSWORD || "admin123456"
    const ownerPasswordHash = await bcrypt.hash(ownerPassword, 10)
    await prisma.adminUser.upsert({
      where: { username: "admin" },
      update: {
        name: "کوروش احمدی (مدیر)",
        role: "OWNER",
        passwordHash: ownerPasswordHash,
        isActive: true,
      },
      create: {
        username: "admin",
        name: "کوروش احمدی (مدیر)",
        role: "OWNER",
        passwordHash: ownerPasswordHash,
        isActive: true,
      },
    })

    const staffPassword = process.env.INITIAL_STAFF_PASSWORD || "staff123456"
    const staffPasswordHash = await bcrypt.hash(staffPassword, 10)
    await prisma.adminUser.upsert({
      where: { username: "staff" },
      update: {
        name: "علی رضایی (پذیرش و پرسنل)",
        role: "STAFF",
        passwordHash: staffPasswordHash,
        isActive: true,
      },
      create: {
        username: "staff",
        name: "علی رضایی (پذیرش و پرسنل)",
        role: "STAFF",
        passwordHash: staffPasswordHash,
        isActive: true,
      },
    })

    // 5. Site Settings
    const settings = [
      { key: "salon_name", value: "آرایشگاه کوروش | Koroush Barber", group: "general", label: "نام آرایشگاه" },
      { key: "core_promise", value: "استایل حرفه‌ای، دقیقاً سر وقت شما.", group: "general", label: "شعار برند" },
      { key: "salon_address", value: "تهران، زعفرانیه، خیابان مقدس اردبیلی، مجتمع تجاری پیروز، طبقه ۲، واحد ۲۰۴", group: "general", label: "آدرس سالن" },
      { key: "salon_phone", value: "۰۲۱-۲۲۴۴۶۶۸۸", group: "general", label: "تلفن تماس ثابت" },
      { key: "support_mobile", value: "۰۹۱۲۳۴۵۶۷۸۹", group: "general", label: "موبایل پشتیبانی و واتساپ" },
      { key: "opening_time", value: "10:00", group: "business", label: "ساعت شروع کار" },
      { key: "closing_time", value: "23:00", group: "business", label: "ساعت پایان کار" },
      { key: "hold_expiry_minutes", value: "10", group: "business", label: "مدت اعتبار هلد موقت (دقیقه)" },
      { key: "cancellation_cutoff_hours", value: "12", group: "business", label: "فرصت لغو یا جابجایی نوبت (ساعت قبل)" },
      { key: "payment_mode", value: "MOCK", group: "payment", label: "حالت درگاه پرداخت (MOCK / ZARINPAL)" },
      { key: "sms_mode", value: "MOCK", group: "sms", label: "سامانه پیامک (MOCK / KAVENEGAR)" },
    ]

    for (const s of settings) {
      await prisma.siteSetting.upsert({
        where: { key: s.key },
        update: s,
        create: s,
      })
    }

    console.log("\n📊 [3/3] Verifying Final Database State...")
    const [
      appCount,
      custCount,
      payCount,
      revCount,
      holdCount,
      smsCount,
      auditCount,
      overrideCount,
      blockedCount,
      barberCount,
      srvCount,
      adminCount,
    ] = await Promise.all([
      prisma.appointment.count(),
      prisma.customer.count(),
      prisma.payment.count(),
      prisma.review.count(),
      prisma.slotHold.count(),
      prisma.notificationJob.count(),
      prisma.auditLog.count(),
      prisma.scheduleOverride.count(),
      prisma.blockedInterval.count(),
      prisma.barber.count(),
      prisma.service.count(),
      prisma.adminUser.count(),
    ])

    console.log("------------------------------------------------------------------")
    console.log(`  Appointments:        ${appCount} (EXPECTED: 0) ${appCount === 0 ? "✅" : "❌"}`)
    console.log(`  Customers:           ${custCount} (EXPECTED: 0) ${custCount === 0 ? "✅" : "❌"}`)
    console.log(`  Payments:            ${payCount} (EXPECTED: 0) ${payCount === 0 ? "✅" : "❌"}`)
    console.log(`  Reviews:             ${revCount} (EXPECTED: 0) ${revCount === 0 ? "✅" : "❌"}`)
    console.log(`  Slot Holds:          ${holdCount} (EXPECTED: 0) ${holdCount === 0 ? "✅" : "❌"}`)
    console.log(`  SMS Jobs:            ${smsCount} (EXPECTED: 0) ${smsCount === 0 ? "✅" : "❌"}`)
    console.log(`  Audit Logs:          ${auditCount} (EXPECTED: 0) ${auditCount === 0 ? "✅" : "❌"}`)
    console.log(`  Schedule Overrides:  ${overrideCount} (EXPECTED: 0) ${overrideCount === 0 ? "✅" : "❌"}`)
    console.log(`  Blocked Intervals:   ${blockedCount} (EXPECTED: 0) ${blockedCount === 0 ? "✅" : "❌"}`)
    console.log("------------------------------------------------------------------")
    console.log(`  Barbers:             ${barberCount} (Configuration) ✅`)
    console.log(`  Services:            ${srvCount} (Authoritative Catalog) ✅`)
    console.log(`  Admin Users:         ${adminCount} (Secured Access) ✅`)
    console.log("==================================================================")

    if (
      appCount === 0 &&
      custCount === 0 &&
      payCount === 0 &&
      revCount === 0 &&
      holdCount === 0 &&
      smsCount === 0 &&
      auditCount === 0 &&
      overrideCount === 0 &&
      blockedCount === 0
    ) {
      console.log("🎉 SUCCESS: Development database is completely clean and ready!")
    } else {
      console.error("❌ ERROR: One or more business tables still contain data!")
      process.exit(1)
    }
  } catch (err) {
    console.error("❌ [ERROR] Failed to reset development database:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

export const resetDevDatabase = resetDevelopmentDatabase

if (require.main === module) {
  resetDevelopmentDatabase()
}
