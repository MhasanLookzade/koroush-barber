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

  // 3. Services (All 60 minutes duration in V1, integer pricing in Tomans, 20% deposit)
  const servicesData = [
    {
      id: "srv-full-cut",
      name: "اصلاح کامل مو و صورت",
      description: "خدمت جامع پیرایش سر و ریش با طراحی اختصاصی فرم، خط‌زنی دقیق با تیغ سنتی، حوله گرم و سشوار حرفه‌ای",
      price: 1000000, // 1,000,000 Tomans
      depositPrice: 200000, // 200,000 Tomans deposit (20%)
      duration: 60,
      category: "اصلاح و استایل",
      sortOrder: 1,
      image: "/images/service-full.jpg",
    },
    {
      id: "srv-hair-cut",
      name: "اصلاح مو",
      description: "کوتاهی کلاسیک و مدرن متناسب با فرم جمجمه و صورت، شست‌وشو با شامپوی ارگانیک و استایل نهایی",
      price: 750000, // 750,000 Tomans
      depositPrice: 150000, // 150,000 Tomans deposit (20%)
      duration: 60,
      category: "اصلاح و استایل",
      sortOrder: 2,
      image: "/images/service-haircut.jpg",
    },
    {
      id: "srv-beard-trim",
      name: "اصلاح و مرتب‌سازی ریش و صورت",
      description: "فرم‌دهی متقارن ریش و سبیل، آنکارد با تیغ ژاپنی، بخور گرم و استفاده از روغن تقویتی طبیعی",
      price: 350000, // 350,000 Tomans
      depositPrice: 70000, // 70,000 Tomans deposit (20%)
      duration: 60,
      category: "ریش و سبیل",
      sortOrder: 3,
      image: "/images/service-beard.jpg",
    },
    {
      id: "srv-fade-special",
      name: "اصلاح تخصصی فید و مدل مو",
      description: "اجرای دقیق انواع فید (Skin Fade, Taper, Drop Fade) با تلفیق تکنیک‌های قیچی و ماشین، تکسچرینگ مدرن",
      price: 850000, // 850,000 Tomans
      depositPrice: 170000, // 170,000 Tomans deposit (20%)
      duration: 60,
      category: "اصلاح و استایل",
      sortOrder: 4,
      image: "/images/service-fade.jpg",
    },
    {
      id: "srv-vip-package",
      name: "پکیج ویژه اصلاح VIP",
      description: "پکیج شاهانه شامل اصلاح کامل سر و ریش، فیشیال عمیق پوست، ماسک طلا، ماساژ اسکالپ سر و پذیرایی ویژه سالن",
      price: 1300000, // 1,300,000 Tomans
      depositPrice: 260000, // 260,000 Tomans deposit (20%)
      duration: 60,
      category: "پکیج‌های اختصاصی",
      sortOrder: 5,
      image: "/images/service-vip.jpg",
    },
    {
      id: "srv-wash-styling",
      name: "شست‌وشو و حالت‌دهی مو",
      description: "شست‌وشوی دو مرحله‌ای تقویتی، ماساژ آرامش‌بخش پوست سر، براشینگ و استایل با بهترین واکس و پمادهای مات",
      price: 200000, // 200,000 Tomans
      depositPrice: 40000, // 40,000 Tomans deposit (20%)
      duration: 60,
      category: "مراقبت و استایل",
      sortOrder: 6,
      image: "/images/service-wash.jpg",
    },
    {
      id: "srv-facial-care",
      name: "پاکسازی و مراقبت پوست صورت",
      description: "بخور گرم، پاکسازی منافذ، اسکراب لایه‌بردار سلول‌های مرده، ماسک زغال فعال و آبرسانی عمیق با سرم طلا",
      price: 450000, // 450,000 Tomans
      depositPrice: 90000, // 90,000 Tomans deposit (20%)
      duration: 60,
      category: "مراقبت پوست",
      sortOrder: 7,
      image: "/images/service-facial.jpg",
    },
    {
      id: "srv-hair-mask",
      name: "ماسک و مراقبت تخصصی مو",
      description: "درمان عمقی ساقه مو با کراتین سرد و ویتامینه ارگانیک، رفع خشکی و درخشان‌کننده تخصصی موهای آسیب‌دیده",
      price: 300000, // 300,000 Tomans
      depositPrice: 60000, // 60,000 Tomans deposit (20%)
      duration: 60,
      category: "مراقبت و استایل",
      sortOrder: 8,
      image: "/images/service-mask.jpg",
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
    update: { 
      name: "امیرحسین تهرانی",
      birthDate: "1368/04/15"
    },
    create: {
      name: "امیرحسین تهرانی",
      phone: "09129876543",
      email: "amir@example.ir",
      birthDate: "1368/04/15"
    },
  })

  // 7. Seed Authentic Approved Reviews
  const initialReviews = [
    {
      id: "rev-1",
      name: "دکتر امیرحسین کاظمی",
      rating: 5,
      comment: "برای من که به عنوان جراح زمانم بسیار محدود است، بزرگترین مزیت کوروش باربر این است که ساعت ۱۴:۰۰ نوبت دارم و دقیقاً ساعت ۱۴:۰۰ روی صندلی می‌نشینم، بدون حتی یک دقیقه معطلی. استایل فید هم دقیقاً مطابق فرم صورتم اجرا شد.",
      trackingCode: "KB-98214",
      isVerified: true,
      status: "APPROVED",
    },
    {
      id: "rev-2",
      name: "مهندس نیما راد",
      rating: 5,
      comment: "بهترین تجربه اصلاحی که در تهران داشتم. آرامش محیط، حوله گرم معطر به اکالیپتوس، قهوه عالی و دقت وسواس‌گونه استاد کوروش روی تقارن خط ریش واقعاً کم‌نظیر است. سیستم رزرو آنلاین در کمتر از یک دقیقه نوبت را تایید کرد.",
      trackingCode: "KB-84192",
      isVerified: true,
      status: "APPROVED",
    },
    {
      id: "rev-3",
      name: "فرزاد صبوری",
      rating: 5,
      comment: "من با تلفن‌های هوشمند خیلی راحت نیستم اما نوبت گرفتن از این سایت آنقدر فونت درشت و دکمه‌های واضحی داشت که خودم بدون کمک پسرم رزرو کردم. برخورد بسیار محترمانه پرسنل هم جای تقدیر دارد.",
      trackingCode: "KB-77310",
      isVerified: true,
      status: "APPROVED",
    },
    {
      id: "rev-4",
      name: "سامان ابراهیمی",
      rating: 5,
      comment: "فید پوست و فرم‌دهی ریش فوق‌العاده بود. شفافیت قیمت و اینکه بیعانه را آنلاین پرداخت کردم و مابقی را در سالن تسویه کردم، حس امنیت و احترام بسیار بالایی به مشتری می‌دهد.",
      trackingCode: "KB-65021",
      isVerified: true,
      status: "APPROVED",
    },
  ]

  for (const rev of initialReviews) {
    await prisma.review.upsert({
      where: { id: rev.id },
      update: rev,
      create: rev,
    })
  }

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
