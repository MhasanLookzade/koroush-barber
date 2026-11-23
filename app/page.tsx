import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/booking/Header"
import { Footer } from "@/components/booking/Footer"
import { formatToman } from "@/lib/jalali"
import {
  Scissors,
  Clock,
  ShieldCheck,
  Sparkles,
  MapPin,
  Phone,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  Star,
  Users,
} from "lucide-react"

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name: "آرایشگاه کوروش | Koroush Barber",
    image: "https://kouroshbarber.ir/images/salon.jpg",
    telephone: "+98-21-22446688",
    address: {
      "@type": "PostalAddress",
      streetAddress: "خیابان مقدس اردبیلی، مجتمع تجاری پیروز، طبقه ۲، واحد ۲۰۴",
      addressLocality: "تهران",
      addressRegion: "تهران",
      addressCountry: "IR",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "10:00",
        closes: "23:00",
      },
    ],
    priceRange: "۱۵۰,۰۰۰ تومان - ۵۰۰,۰۰۰ تومان",
  }

  const services = [
    {
      title: "اصلاح و استایل کلاسیک مو",
      category: "اصلاح تخصصی",
      duration: "۶۰ دقیقه",
      price: 250000,
      deposit: 50000,
      desc: "طراحی فرم بر مبنای ساختار چهره، شستشوی سر با شامپوی تقویتی، براشینگ و استایل نهایی با واکس مات.",
    },
    {
      title: "اصلاح تخصصی ریش و آنکارد",
      category: "ریش و سبیل",
      duration: "۶۰ دقیقه",
      price: 150000,
      deposit: 50000,
      desc: "خط‌زنی متقارن با تیغ استریل، بخور گرم، ماساژ صورت و استفاده از روغن تقویتی ارگانیک.",
    },
    {
      title: "پکیج کامل پیرایش و مراقبت VIP",
      category: "پکیج اختصاصی",
      duration: "۶۰ دقیقه",
      price: 500000,
      deposit: 100000,
      desc: "اصلاح کامل مو و ریش، پاکسازی پوست با اسکراب، ماساژ اسکالپ سر و ماسک تسکین‌دهنده صورت.",
    },
    {
      title: "فیشیال و پاکسازی عمیق پوست",
      category: "مراقبت پوست",
      duration: "۶۰ دقیقه",
      price: 350000,
      deposit: 70000,
      desc: "بخور گرم و سرد، پاکسازی عمقی منافذ، لایه‌برداری ملایم، ماسک ضد خستگی و آبرسانی پوست.",
    },
  ]

  const steps = [
    {
      num: "۰۱",
      title: "انتخاب خدمت و ساعت دلخواه",
      desc: "یکی از ۱۳ بازه ۶۰ دقیقه‌ای در ساعات ۱۰:۰۰ الی ۲۳:۰۰ را بدون تداخل انتخاب کنید.",
    },
    {
      num: "۰۲",
      title: "تایید شماره موبایل با پیامک",
      desc: "شماره خود را با رمز یکبار مصرف (OTP) تایید کرده و مشخصات را ثبت نمایید.",
    },
    {
      num: "۰۳",
      title: "پرداخت امن بیعانه و دریافت نوبت",
      desc: "با پرداخت بیعانه در درگاه شاپرک، نوبت شما قطعی و کد رهگیری پیامک می‌شود.",
    },
  ]

  const faqs = [
    {
      q: "مدت زمان هر نوبت چقدر است؟",
      a: "در کوروش باربر، هر نوبت دقیقاً ۶۰ دقیقه زمان اختصاصی به همراه مشاوره اولیه است تا کیفیت پیرایش بدون هیچ عجله‌ای تضمین شود.",
    },
    {
      q: "چرا پرداخت بیعانه الزامی است؟",
      a: "برای احترام به وقت شما و سایر مراجعین، رزرو نوبت با پرداخت بیعانه قطعی می‌شود تا بازه زمانی کاملاً به شما اختصاص یابد. مانده هزینه در سالن تسویه می‌گردد.",
    },
    {
      q: "شرایط لغو یا جابجایی نوبت چگونه است؟",
      a: "تا ۱۲ ساعت قبل از زمان نوبت می‌توانید از طریق پنل پیگیری، نوبت خود را بدون جریمه لغو نمایید.",
    },
    {
      q: "آیا برای تاخیر مهلتی وجود دارد؟",
      a: "از آنجا که هر نوبت راس ساعت آغاز می‌شود، خواهشمند است ۵ دقیقه قبل از زمان مقرر در سالن حضور داشته باشید.",
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0F0E] text-[#F5F1E8]" dir="rtl">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Header />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32 overflow-hidden border-b border-[#2D332F]/50">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#C8A96B]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-[#647266]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              {/* Monogram / Brand Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#161917] border border-[#2D332F] text-xs font-medium text-[#C8A96B]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>آرایشگاه کوروش • تجربه متمایز پیرایش مردانه</span>
              </div>

              {/* Main Headline & Signature Promise */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-heading tracking-tight text-[#F5F1E8] leading-tight">
                استایل حرفه‌ای، <br />
                <span className="text-[#C8A96B]">دقیقاً سر وقت شما.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-[#A8A39A] leading-relaxed max-w-2xl mx-auto">
                رزرو آنلاین و شفاف نوبت پیرایش مردانه در زعفرانیه تهران. بدون اتلاف وقت و معطلی،
                نوبت خود را در ۶۰ ثانیه ثبت کنید.
              </p>

              {/* CTA Group */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link href="/booking" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-base px-10 py-7 rounded-xl gap-2 shadow-[0_0_25px_rgba(200,169,107,0.3)] transition-all"
                  >
                    <Scissors className="w-5 h-5" />
                    رزرو نوبت
                  </Button>
                </Link>

                <Link href="/booking/status" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-[#2D332F] text-[#F5F1E8] hover:bg-[#161917] text-base px-8 py-7 rounded-xl gap-2"
                  >
                    <CalendarCheck className="w-5 h-5 text-[#C8A96B]" />
                    پیگیری نوبت‌های من
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-8 grid grid-cols-3 gap-4 border-t border-[#2D332F]/60 max-w-lg mx-auto text-center text-xs text-[#A8A39A]">
                <div>
                  <span className="block font-bold text-base text-[#F5F1E8]">۱۰:۰۰ - ۲۳:۰۰</span>
                  <span>ساعات کاری همه روزه</span>
                </div>
                <div>
                  <span className="block font-bold text-base text-[#F5F1E8]">۶۰ دقیقه</span>
                  <span>زمان اختصاصی هر نوبت</span>
                </div>
                <div>
                  <span className="block font-bold text-base text-[#F5F1E8]">صفر دقیقه</span>
                  <span>معطلی در سالن</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES SECTION */}
        <section className="py-20 lg:py-28 bg-[#121413] border-b border-[#2D332F]/50" id="services">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold tracking-widest text-[#C8A96B] uppercase">منوی خدمات</span>
              <h2 className="text-3xl sm:text-4xl font-bold font-heading text-[#F5F1E8]">
                خدمات تخصصی پیرایش و مراقبت
              </h2>
              <p className="text-sm text-[#A8A39A]">
                تمامی خدمات با مرغوب‌ترین متریال بهداشتی و ابزارهای استریل ارائه می‌گردند.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((srv, idx) => (
                <div
                  key={idx}
                  className="bg-[#161917] border border-[#2D332F] p-6 sm:p-8 rounded-2xl flex flex-col justify-between hover:border-[#C8A96B]/50 transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-[#C8A96B] font-medium bg-[#1F2321] px-3 py-1 rounded-full border border-[#2D332F]">
                        {srv.category}
                      </span>
                      <span className="text-xs text-[#A8A39A]">{srv.duration}</span>
                    </div>
                    <h3 className="text-xl font-bold text-[#F5F1E8] group-hover:text-[#C8A96B] transition-colors">
                      {srv.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#A8A39A] leading-relaxed">
                      {srv.desc}
                    </p>
                  </div>

                  <div className="mt-8 pt-4 border-t border-[#2D332F] flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#A8A39A] block">مبلغ کل:</span>
                      <span className="text-lg font-bold text-[#F5F1E8]">
                        {formatToman(srv.price)}
                      </span>
                      <span className="text-[11px] text-[#C8A96B] block">
                        بیعانه: {formatToman(srv.deposit)}
                      </span>
                    </div>

                    <Link href="/booking">
                      <Button
                        size="sm"
                        className="bg-[#1F2321] hover:bg-[#C8A96B] text-[#F5F1E8] hover:text-[#0D0F0E] font-bold border border-[#2D332F] hover:border-[#C8A96B] px-5 py-5 rounded-xl gap-1 text-xs transition-all"
                      >
                        رزرو این خدمت
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-20 lg:py-28 border-b border-[#2D332F]/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold tracking-widest text-[#C8A96B] uppercase">فرآیند آسان</span>
              <h2 className="text-3xl sm:text-4xl font-bold font-heading text-[#F5F1E8]">
                رزرو نوبت در ۳ گام ساده
              </h2>
              <p className="text-sm text-[#A8A39A]">
                سیستم نوبت‌دهی هوشمند بدون نیاز به تماس تلفنی و معطلی
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((st, i) => (
                <div
                  key={i}
                  className="bg-[#161917] p-8 rounded-2xl border border-[#2D332F] space-y-4 relative overflow-hidden"
                >
                  <span className="text-4xl font-mono font-bold text-[#2D332F] block">
                    {st.num}
                  </span>
                  <h3 className="text-lg font-bold text-[#F5F1E8]">{st.title}</h3>
                  <p className="text-xs sm:text-sm text-[#A8A39A] leading-relaxed">{st.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SALON ATMOSPHERE / GALLERY */}
        <section className="py-20 lg:py-28 bg-[#121413] border-b border-[#2D332F]/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold tracking-widest text-[#C8A96B] uppercase">محیط سالن</span>
              <h2 className="text-3xl sm:text-4xl font-bold font-heading text-[#F5F1E8]">
                فضایی آرام، لوکس و اختصاصی
              </h2>
              <p className="text-sm text-[#A8A39A]">
                طراحی شده برای آسایش و آرامش شما در طول مدت پیرایش
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="aspect-[4/3] rounded-2xl bg-[#1A1D1B] border border-[#2D332F] flex flex-col items-center justify-center p-6 text-center text-[#A8A39A] space-y-2">
                <Scissors className="w-8 h-8 text-[#C8A96B]" />
                <span className="font-bold text-sm text-[#F5F1E8]">صندلی‌های ارگونومیک کلاسیک</span>
                <span className="text-xs">تجهیزات به‌روز پیرایش مردانه با بالاترین سطح راحتی</span>
              </div>
              <div className="aspect-[4/3] rounded-2xl bg-[#1A1D1B] border border-[#2D332F] flex flex-col items-center justify-center p-6 text-center text-[#A8A39A] space-y-2">
                <Sparkles className="w-8 h-8 text-[#C8A96B]" />
                <span className="font-bold text-sm text-[#F5F1E8]">بخش اختصاصی اسکین‌کر و فیشیال</span>
                <span className="text-xs">تجهیزات پیشرفته بخور و پاکسازی پوست صورت</span>
              </div>
              <div className="aspect-[4/3] rounded-2xl bg-[#1A1D1B] border border-[#2D332F] flex flex-col items-center justify-center p-6 text-center text-[#A8A39A] space-y-2">
                <ShieldCheck className="w-8 h-8 text-[#C8A96B]" />
                <span className="font-bold text-sm text-[#F5F1E8]">استریلیزاسیون پزشکی ابزارها</span>
                <span className="text-xs">ضدعفونی با اشعه UV و بسته‌بندی پک یکبار مصرف برای هر مشتری</span>
              </div>
            </div>
          </div>
        </section>

        {/* LOCATION & HOURS */}
        <section className="py-20 lg:py-28 border-b border-[#2D332F]/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="bg-[#161917] border border-[#2D332F] rounded-3xl p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <span className="text-xs font-bold tracking-widest text-[#C8A96B] uppercase">اطلاعات مراجعه</span>
                <h2 className="text-3xl font-bold font-heading text-[#F5F1E8]">
                  موقعیت مکانی و ساعات پذیرش
                </h2>
                <div className="space-y-4 text-sm text-[#A8A39A]">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#C8A96B] shrink-0 mt-0.5" />
                    <span>
                      تهران، زعفرانیه، خیابان مقدس اردبیلی، مجتمع تجاری پیروز، طبقه ۲، واحد ۲۰۴
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-[#C8A96B] shrink-0 mt-0.5" />
                    <span>همه روزه از ساعت ۱۰:۰۰ الی ۲۳:۰۰ (۱۳ بازه یک ساعته)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-[#C8A96B] shrink-0 mt-0.5" />
                    <span className="font-mono dir-ltr text-[#F5F1E8]" dir="ltr">۰۲۱-۲۲۴۴۶۶۸۸</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link href="/booking">
                    <Button className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold px-8 py-6 rounded-xl gap-2">
                      رزرو نوبت حضوری
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="bg-[#1F2321] p-6 rounded-2xl border border-[#2D332F] space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-[#C8A96B]/10 text-[#C8A96B] flex items-center justify-center mx-auto">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-[#F5F1E8]">دسترسی آسان با پارکینگ اختصاصی</h3>
                <p className="text-xs text-[#A8A39A] leading-relaxed">
                  مجتمع پیروز دارای پارکینگ اختصاصی برای مراجعین محترم است. جهت مسیریابی از طریق بلد یا نشان کلیک کنید.
                </p>
                <a
                  href="https://nshn.ir"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-[#C8A96B] hover:underline pt-2 font-medium"
                >
                  باز کردن نقشه در نشان / گوگل مپس &larr;
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="py-20 lg:py-28 bg-[#121413]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold tracking-widest text-[#C8A96B] uppercase">پرسش‌های متداول</span>
              <h2 className="text-3xl font-bold font-heading text-[#F5F1E8]">سوالات رایج مشتریان</h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="bg-[#161917] p-6 rounded-2xl border border-[#2D332F] space-y-2"
                >
                  <h3 className="font-bold text-base text-[#F5F1E8]">{faq.q}</h3>
                  <p className="text-xs sm:text-sm text-[#A8A39A] leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* PERSISTENT STICKY MOBILE BOOKING CTA (< 768px) */}
      <aside aria-label="رزرو سریع نوبت" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#161917]/95 backdrop-blur-lg border-t border-[#2D332F] p-3 px-4 shadow-2xl pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div>
            <span className="text-[11px] text-[#A8A39A] block">استایل حرفه‌ای سر وقت</span>
            <span className="text-xs font-bold text-[#F5F1E8]">نوبت‌های خالی امروز و فردا</span>
          </div>
          <Link href="/booking" className="shrink-0">
            <Button className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold px-6 py-5 rounded-xl gap-1.5 text-sm shadow-lg">
              <Scissors className="w-4 h-4" />
              رزرو نوبت
            </Button>
          </Link>
        </div>
      </aside>

      <Footer />
    </div>
  )
}
