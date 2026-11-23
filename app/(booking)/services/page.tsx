import { Metadata } from "next"
import { Header } from "@/components/booking/Header"
import { Footer } from "@/components/booking/Footer"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatToman } from "@/lib/jalali"
import { Scissors, Sparkles, Crown, Clock, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react"

export const metadata: Metadata = {
  title: "خدمات و تعرفه‌ها | آرایشگاه کوروش",
  description: "لیست خدمات، قیمت‌ها و مبالغ بیعانه در آرایشگاه کوروش. تمامی نوبت‌ها ۶۰ دقیقه اختصاصی هستند.",
}

const servicesList = [
  {
    id: "srv-classic-cut",
    name: "اصلاح و استایل کلاسیک مو",
    category: "اصلاح مو",
    duration: "۶۰ دقیقه",
    price: 250000,
    deposit: 50000,
    description:
      "طراحی فرم متناسب با ساختار چهره، شستشوی سر با شامپوی تقویتی، سشوار و استایل نهایی با واکس مات.",
    features: ["مشاوره فرم صورت", "شستشوی اختصاصی", "استایل نهایی"],
  },
  {
    id: "srv-beard-sculpting",
    name: "اصلاح تخصصی ریش و خط‌زنی با تیغ",
    category: "ریش و سبیل",
    duration: "۶۰ دقیقه",
    price: 150000,
    deposit: 50000,
    description:
      "حالت‌دهی ریش با قیچی، خط‌زنی دقیق آنکارد با تیغ سنتی، بخور و حوله گرم، استفاده از روغن نرم‌کننده طبیعی.",
    features: ["آنکارد دقیق با تیغ", "بخور و حوله گرم", "روغن تقویتی آرگان"],
  },
  {
    id: "srv-vip-package",
    name: "پکیج کامل VIP پیرایش و مراقبت",
    category: "پکیج‌های اختصاصی",
    duration: "۶۰ دقیقه",
    price: 500000,
    deposit: 100000,
    description:
      "شامل اصلاح کامل مو، استایل ریش، پاکسازی پوست با اسکراب ارگانیک، ماساژ اسکالپ سر و ماسک طلا.",
    features: ["اصلاح کامل مو و ریش", "پاکسازی و اسکراب پوست", "ماسک تقویت و طلا"],
  },
  {
    id: "srv-facial-care",
    name: "فیشیال و پاکسازی عمیق پوست",
    category: "مراقبت پوست",
    duration: "۶۰ دقیقه",
    price: 350000,
    deposit: 70000,
    description:
      "تخلیه کومودون‌ها، بخور سرد و گرم، اسکراب لایه‌بردار، ماسک ضد آلودگی و آبرسانی عمقی پوست صورت.",
    features: ["تخلیه منافذ پوست", "بخور گرم و سرد", "آبرسانی عمیق هیدرودرمی"],
  },
]

export default function ServicesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0F0E] text-[#F5F1E8]" dir="rtl">
      <Header />

      <main className="flex-1 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-bold tracking-widest text-[#C8A96B] uppercase">تعرفه شفاف و خدمات</span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-[#F5F1E8]">
              منوی خدمات کوروش باربر
            </h1>
            <p className="text-sm text-[#A8A39A] leading-relaxed">
              در آرایشگاه کوروش، زمان شما سرمایه ماست. هر خدمت دقیقاً ۶۰ دقیقه زمان بدون تداخل دارد.
            </p>
          </div>

          {/* Guarantee Banner */}
          <div className="bg-[#161917] border border-[#2D332F] p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#C8A96B]/10 text-[#C8A96B] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs sm:text-sm">
                <span className="font-bold text-[#F5F1E8] block">تضمین نظم و شفافیت مالی</span>
                <span className="text-[#A8A39A]">قیمت‌ها قطعی بوده و بیعانه پرداختی از صورت‌حساب نهایی کسر می‌گردد.</span>
              </div>
            </div>
            <Link href="/booking">
              <Button className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold px-6 py-5 rounded-xl shrink-0 text-sm">
                رزرو نوبت حالا
              </Button>
            </Link>
          </div>

          {/* Service Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {servicesList.map((srv) => (
              <Card
                key={srv.id}
                className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] rounded-2xl overflow-hidden hover:border-[#C8A96B]/50 transition-all flex flex-col justify-between"
              >
                <div className="p-6 sm:p-8 space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-xs px-3 py-1 rounded-full bg-[#1F2321] text-[#C8A96B] border border-[#2D332F]">
                      {srv.category}
                    </span>
                    <span className="text-xs text-[#A8A39A] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {srv.duration}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold font-heading text-[#F5F1E8]">{srv.name}</h3>
                  <p className="text-xs sm:text-sm text-[#A8A39A] leading-relaxed">{srv.description}</p>

                  <div className="space-y-2 pt-2">
                    {srv.features.map((feat, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-[#F5F1E8]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#C8A96B] shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 sm:p-8 pt-0">
                  <div className="pt-4 border-t border-[#2D332F] flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#A8A39A] block">مبلغ کل:</span>
                      <span className="text-lg font-bold text-[#F5F1E8]">{formatToman(srv.price)}</span>
                      <span className="text-[11px] text-[#C8A96B] block">بیعانه رزرو: {formatToman(srv.deposit)}</span>
                    </div>

                    <Link href="/booking">
                      <Button className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold px-6 py-5 rounded-xl gap-2 text-xs">
                        رزرو نوبت
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
