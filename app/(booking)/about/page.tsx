import { Metadata } from "next"
import { Header } from "@/components/booking/Header"
import { Footer } from "@/components/booking/Footer"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Scissors, Clock, ShieldCheck, Award, MapPin, Phone, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react"

export const metadata: Metadata = {
  title: "درباره ما | آرایشگاه کوروش",
  description: "داستان شکل‌گیری آرایشگاه کوروش - تعهد به استایل اصیل، متریال بهداشتی برتر و نظم زمانی دقیق.",
}

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0F0E] text-[#F5F1E8]" dir="rtl">
      <Header />

      <main className="flex-1 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Header */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-bold tracking-widest text-[#C8A96B] uppercase">داستان برند</span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-[#F5F1E8]">
              درباره آرایشگاه کوروش
            </h1>
            <p className="text-base text-[#A8A39A] leading-relaxed">
              استایل حرفه‌ای، دقیقاً سر وقت شما. تلفیقی از هنر سنتی پیرایش و فناوری مدرن نوبت‌دهی.
            </p>
          </div>

          {/* Philosophy Section */}
          <div className="bg-[#161917] border border-[#2D332F] rounded-3xl p-8 sm:p-12 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#C8A96B] bg-[#1F2321] px-3.5 py-1.5 rounded-full border border-[#2D332F]">
              <Sparkles className="w-4 h-4" />
              <span>فلسفه کاری ما</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold font-heading text-[#F5F1E8]">
              چرا کوروش باربر متولد شد؟
            </h2>

            <p className="text-sm sm:text-base text-[#A8A39A] leading-relaxed">
              تجربه مراجعه به آرایشگاه‌های سنتی در تهران همواره با یک دغدغه همراه بوده است:
              <strong> معطلی‌های طولانی و نوبت‌های تداخلی</strong>. کوروش باربر با یک تعهد بنیادین آغاز به کار کرد:
              هر نوبت یک بازه زمانی کاملاً رزرو شده، بدون تداخل و بدون اتلاف حتی یک دقیقه از وقت شماست.
            </p>

            <p className="text-sm sm:text-base text-[#A8A39A] leading-relaxed">
              ما باور داریم که پیرایش مردانه تنها کوتاه کردن مو نیست؛ بلکه طراحی هویت بصری متناسب با ساختار چهره،
              استفاده از بهداشتی‌ترین متریال ارگانیک، و ایجاد فضایی آرام برای بازیابی انرژی در طول یک روز کاری پرمشغله است.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-[#2D332F]">
              <div className="space-y-1">
                <span className="text-2xl font-bold text-[#C8A96B] font-mono">۱۵+</span>
                <span className="text-xs text-[#A8A39A] block">سال تجربه پیرایش تخصصی</span>
              </div>
              <div className="space-y-1">
                <span className="text-2xl font-bold text-[#C8A96B] font-mono">۶۰</span>
                <span className="text-xs text-[#A8A39A] block">دقیقه تمرکز اختصاصی برای هر مشتری</span>
              </div>
              <div className="space-y-1">
                <span className="text-2xl font-bold text-[#C8A96B] font-mono">۱۰۰٪</span>
                <span className="text-xs text-[#A8A39A] block">پک استریل یکبار مصرف</span>
              </div>
            </div>
          </div>

          {/* Salon Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#161917] p-8 rounded-2xl border border-[#2D332F] space-y-3">
              <Clock className="w-8 h-8 text-[#C8A96B]" />
              <h3 className="text-lg font-bold text-[#F5F1E8]">نظم مطلق زمانی</h3>
              <p className="text-xs sm:text-sm text-[#A8A39A] leading-relaxed">
                تمام ۱۳ نوبت روزانه (۱۰:۰۰ الی ۲۲:۰۰) به گونه‌ای زمان‌بندی شده‌اند که هیچ دو مشتری در یک زمان پذیرش نمی‌شوند.
              </p>
            </div>

            <div className="bg-[#161917] p-8 rounded-2xl border border-[#2D332F] space-y-3">
              <ShieldCheck className="w-8 h-8 text-[#C8A96B]" />
              <h3 className="text-lg font-bold text-[#F5F1E8]">بالاترین استانداردهای بهداشتی</h3>
              <p className="text-xs sm:text-sm text-[#A8A39A] leading-relaxed">
                تیغه‌ها و ابزارها پس از هر مراجعه در دستگاه اتوکلاو و UV استریل شده و حوله‌ها تک‌کاربره می‌باشند.
              </p>
            </div>
          </div>

          {/* CTA Box */}
          <div className="bg-[#1F2321] border border-[#2D332F] rounded-3xl p-8 text-center space-y-4">
            <h3 className="text-2xl font-bold font-heading text-[#F5F1E8]">آماده تجربه تفاوت هستید؟</h3>
            <p className="text-sm text-[#A8A39A] max-w-md mx-auto">
              نوبت خود را در کمتر از ۱ دقیقه آنلاین رزرو کنید و در راس ساعت در سالن حضور یابید.
            </p>
            <div className="pt-2">
              <Link href="/booking">
                <Button className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold px-8 py-6 rounded-xl text-base gap-2">
                  <Scissors className="w-5 h-5" />
                  رزرو نوبت آنلاین
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
