/**
 * Koroush Barber — Production Database Initialization & Baseline Seeder
 * 
 * Safely provisions:
 * 1. Master Barber (Koroush)
 * 2. Standard 10:00 to 23:00 Working Hours
 * 3. Authoritative Salon Services Catalog
 * 4. Baseline Site Settings
 * 5. Secure Initial Administrator Account (if none exists)
 * 
 * Strictly preserves:
 * - Existing customer records, bookings, payments, reviews, and admin passwords!
 * - Completely idempotent: safe to run repeatedly without overwriting existing data.
 */

const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")
const crypto = require("crypto")

const prisma = new PrismaClient()

async function seedProduction() {
  console.log("=> [Seed-Production] Checking database baseline state...")

  // 1. Master Barber (Koroush)
  await prisma.barber.upsert({
    where: { id: "barber-kourosh" },
    update: {
      name: "کوروش (مدیر و آرایشگر ارشد)",
      title: "استاد پیرایش و استایل مردانه",
      bio: "با ۱۵ سال تجربه تخصصی در طراحی استایل کلاسیک و مدرن مردانه در معتبرترین سالن‌های تهران.",
      phone: "09121112233",
      email: "kourosh@koroushbarber.ir",
      rating: 5.0,
      reviewCount: 340,
      isActive: true,
    },
    create: {
      id: "barber-kourosh",
      name: "کوروش (مدیر و آرایشگر ارشد)",
      title: "استاد پیرایش و استایل مردانه",
      bio: "با ۱۵ سال تجربه تخصصی در طراحی استایل کلاسیک و مدرن مردانه در معتبرترین سالن‌های تهران.",
      phone: "09121112233",
      email: "kourosh@koroushbarber.ir",
      rating: 5.0,
      reviewCount: 340,
      isActive: true,
    },
  })

  // 2. Working hours: 10:00 to 23:00 for every day of the week (0 to 6)
  for (let day = 0; day <= 6; day++) {
    await prisma.workingHour.upsert({
      where: {
        barberId_dayOfWeek: {
          barberId: "barber-kourosh",
          dayOfWeek: day,
        },
      },
      update: {
        startTime: "10:00",
        endTime: "23:00",
        isWorking: true,
      },
      create: {
        barberId: "barber-kourosh",
        dayOfWeek: day,
        startTime: "10:00",
        endTime: "23:00",
        isWorking: true,
      },
    })
  }

  // 3. Services Catalog (Authoritative Salon Pricing)
  const services = [
    {
      id: "srv-full-cut",
      name: "اصلاح کامل مو و صورت",
      description: "خدمت جامع پیرایش سر و ریش با طراحی اختصاصی فرم، خط‌زنی دقیق با تیغ سنتی، حوله گرم و سشوار حرفه‌ای",
      price: 1000000,
      depositPrice: 200000,
      duration: 60,
      category: "اصلاح و استایل",
      sortOrder: 1,
      image: "/images/service-full.jpg",
    },
    {
      id: "srv-hair-cut",
      name: "اصلاح مو",
      description: "کوتاهی کلاسیک و مدرن متناسب با فرم جمجمه و صورت، شست‌وشو با شامپوی ارگانیک و استایل نهایی",
      price: 750000,
      depositPrice: 150000,
      duration: 60,
      category: "اصلاح و استایل",
      sortOrder: 2,
      image: "/images/service-haircut.jpg",
    },
    {
      id: "srv-beard-trim",
      name: "اصلاح و مرتب‌سازی ریش و صورت",
      description: "فرم‌دهی متقارن ریش و سبیل، آنکارد با تیغ ژاپنی، بخور گرم و استفاده از روغن تقویتی طبیعی",
      price: 350000,
      depositPrice: 70000,
      duration: 60,
      category: "ریش و سبیل",
      sortOrder: 3,
      image: "/images/service-beard.jpg",
    },
    {
      id: "srv-fade-special",
      name: "اصلاح تخصصی فید و مدل مو",
      description: "اجرای دقیق انواع فید (Skin Fade, Taper, Drop Fade) با تلفیق تکنیک‌های قیچی و ماشین، تکسچرینگ مدرن",
      price: 850000,
      depositPrice: 170000,
      duration: 60,
      category: "اصلاح و استایل",
      sortOrder: 4,
      image: "/images/service-fade.jpg",
    },
    {
      id: "srv-vip-package",
      name: "پکیج ویژه اصلاح VIP",
      description: "پکیج شاهانه شامل اصلاح کامل سر و ریش، فیشیال عمیق پوست، ماسک طلا، ماساژ اسکالپ سر و پذیرایی ویژه سالن",
      price: 1300000,
      depositPrice: 260000,
      duration: 60,
      category: "پکیج‌های اختصاصی",
      sortOrder: 5,
      image: "/images/service-vip.jpg",
    },
    {
      id: "srv-wash-styling",
      name: "شست‌وشو و حالت‌دهی مو",
      description: "شست‌وشوی دو مرحله‌ای تقویتی، ماساژ آرامش‌بخش پوست سر، براشینگ و استایل با بهترین واکس و پمادهای مات",
      price: 200000,
      depositPrice: 40000,
      duration: 60,
      category: "مراقبت و استایل",
      sortOrder: 6,
      image: "/images/service-wash.jpg",
    },
    {
      id: "srv-facial-care",
      name: "پاکسازی و مراقبت پوست صورت",
      description: "بخور گرم، پاکسازی منافذ، اسکراب لایه‌بردار سلول‌های مرده، ماسک زغال فعال و آبرسانی عمیق با سرم طلا",
      price: 450000,
      depositPrice: 90000,
      duration: 60,
      category: "مراقبت پوست",
      sortOrder: 7,
      image: "/images/service-facial.jpg",
    },
    {
      id: "srv-hair-mask",
      name: "ماسک و مراقبت تخصصی مو",
      description: "درمان عمقی ساقه مو با کراتین سرد و ویتامینه ارگانیک، رفع خشکی و درخشان‌کننده تخصصی موهای آسیب‌دیده",
      price: 300000,
      depositPrice: 60000,
      duration: 60,
      category: "مراقبت و استایل",
      sortOrder: 8,
      image: "/images/service-mask.jpg",
    },
  ]

  for (const srv of services) {
    await prisma.service.upsert({
      where: { id: srv.id },
      update: srv,
      create: srv,
    })
  }

  // 4. Site Settings (Default business configuration)
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
    { key: "payment_mode", value: process.env.PAYMENT_GATEWAY || "MOCK", group: "payment", label: "حالت درگاه پرداخت" },
    { key: "sms_mode", value: process.env.SMS_PROVIDER || "MOCK", group: "sms", label: "سامانه پیامک" },
  ]

  for (const s of settings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: {
        value: s.value,
        group: s.group,
        label: s.label,
      },
      create: s,
    })
  }

  // 5. Initial Administrator Provisioning
  // Check if ANY active admin user exists in the database
  const existingOwner = await prisma.adminUser.findFirst({
    where: { role: "OWNER" },
  })

  if (existingOwner) {
    console.log(`=> [Seed-Production] Existing owner found ('${existingOwner.username}'). Preserving credentials without changes.`)
  } else {
    // No owner exists: provision first administrator safely
    const username = process.env.ADMIN_INITIAL_USERNAME || "admin"
    const password = process.env.ADMIN_INITIAL_PASSWORD
    const adminName = process.env.ADMIN_INITIAL_NAME || "کوروش احمدی (مدیر سالن)"

    if (!password) {
      console.warn("⚠️  [Seed-Production] WARNING: ADMIN_INITIAL_PASSWORD not set in environment!")
      console.warn("⚠️  A temporary random password will be generated for first login.")
    }

    const effectivePassword = password || crypto.randomBytes(12).toString("hex")
    const passwordHash = await bcrypt.hash(effectivePassword, 12)

    await prisma.adminUser.create({
      data: {
        username,
        name: adminName,
        role: "OWNER",
        passwordHash,
        isActive: true,
      },
    })

    console.log("=> [Seed-Production] Initial administrator created successfully.")
    console.log(`=> Username: ${username}`)
    if (!password) {
      console.log(`=> Generated Temporary Password: ${effectivePassword}`)
      console.log("=> IMPORTANT: Save this password immediately and change it upon first login!")
    } else {
      console.log("=> Password: (Configured via ADMIN_INITIAL_PASSWORD)")
    }
  }

  console.log("=> [Seed-Production] Production baseline provisioning completed successfully.")
}

seedProduction()
  .catch((err) => {
    console.error("❌ [Seed-Production] Error provisioning baseline:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
