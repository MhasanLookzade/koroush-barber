import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding Koroush Barber database with authentic Persian data...")

  // 1. Master Barber (Koroush)
  const masterBarber = await prisma.barber.upsert({
    where: { id: "barber-kourosh" },
    update: {
      name: "کوروش (مدیر و آرایشگر ارشد)",
      title: "استاد پیرایش و استایل مردانه",
      bio: "با ۱۵ سال تجربه تخصصی در طراحی استایل کلاسیک و مدرن مردانه در معتبرترین سالن‌های تهران.",
      phone: "09121112233",
      email: "kourosh@kouroshbarber.ir",
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
      email: "kourosh@kouroshbarber.ir",
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

  // 3. Services (All 60 minutes duration in V1, integer pricing in Tomans)
  const servicesData = [
    {
      id: "srv-classic-cut",
      name: "اصلاح و استایل کلاسیک مو",
      description: "طراحی فرم متناسب با ساختار چهره، شستشوی سر با شامپوی تقویتی، سشوار و استایل نهایی با واکس مات",
      price: 250000, // 250,000 Tomans
      depositPrice: 50000, // 50,000 Tomans deposit
      duration: 60,
      category: "اصلاح مو",
      sortOrder: 1,
      image: "/images/service-haircut.jpg",
    },
    {
      id: "srv-beard-sculpting",
      name: "اصلاح تخصصی ریش و خط‌زنی با تیغ",
      description: "حالت‌دهی ریش با قیچی، خط‌زنی دقیق آنکارد با تیغ سنتی، بخور و حوله گرم، استفاده از روغن نرم‌کننده طبیعی",
      price: 150000,
      depositPrice: 50000,
      duration: 60,
      category: "ریش و سبیل",
      sortOrder: 2,
      image: "/images/service-beard.jpg",
    },
    {
      id: "srv-vip-package",
      name: "پکیج کامل VIP پیرایش و مراقبت",
      description: "شامل اصلاح کامل مو، استایل ریش، پاکسازی پوست با اسکراب ارگانیک، ماساژ اسکالپ سر و ماسک طلا",
      price: 500000,
      depositPrice: 100000,
      duration: 60,
      category: "پکیج‌های اختصاصی",
      sortOrder: 3,
      image: "/images/service-vip.jpg",
    },
    {
      id: "srv-facial-care",
      name: "فیشیال و پاکسازی عمیق پوست",
      description: "تخلیه کومودون‌ها، بخور سرد و گرم، اسکراب لایه‌بردار، ماسک ضد آلودگی و آبرسانی عمقی پوست",
      price: 350000,
      depositPrice: 70000,
      duration: 60,
      category: "مراقبت پوست",
      sortOrder: 4,
      image: "/images/service-facial.jpg",
    },
  ]

  for (const srv of servicesData) {
    await prisma.service.upsert({
      where: { id: srv.id },
      update: srv,
      create: srv,
    })
  }

  // 4. Admin Users (Owner and Staff)
  const ownerPasswordHash = await bcrypt.hash("admin123456", 10)
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

  const staffPasswordHash = await bcrypt.hash("staff123456", 10)
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

  // 6. Demo Customer & Appointment (for demonstration & verification)
  const demoCustomer = await prisma.customer.upsert({
    where: { phone: "09129876543" },
    update: { name: "امیرحسین تهرانی" },
    create: {
      name: "امیرحسین تهرانی",
      phone: "09129876543",
      email: "amir@example.ir",
    },
  })

  console.log("✅ Seed completed successfully!")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
