"use client"

import { Scissors, Clock, Sparkles, Check, ArrowLeft, Shield } from "lucide-react"
import { formatToman } from "@/lib/jalali"

export interface ServiceItem {
  id: string
  name: string
  description: string
  price: number
  depositPrice: number
  duration: number
  category: string
  featured?: boolean
}

export const HOMEPAGE_SERVICES: ServiceItem[] = [
  {
    id: "srv-full-cut",
    name: "اصلاح کامل مو و صورت",
    description: "خدمت جامع پیرایش سر و ریش با طراحی اختصاصی فرم، خط‌زنی دقیق با تیغ سنتی، حوله گرم و سشوار حرفه‌ای",
    price: 1000000,
    depositPrice: 200000,
    duration: 60,
    category: "اصلاح و استایل",
    featured: true,
  },
  {
    id: "srv-hair-cut",
    name: "اصلاح مو",
    description: "کوتاهی کلاسیک و مدرن متناسب با فرم جمجمه و صورت، شست‌وشو با شامپوی ارگانیک و استایل نهایی",
    price: 750000,
    depositPrice: 150000,
    duration: 60,
    category: "اصلاح و استایل",
  },
  {
    id: "srv-beard-trim",
    name: "اصلاح و مرتب‌سازی ریش و صورت",
    description: "فرم‌دهی متقارن ریش و سبیل، آنکارد با تیغ ژاپنی، بخور گرم و استفاده از روغن تقویتی طبیعی",
    price: 350000,
    depositPrice: 70000,
    duration: 60,
    category: "ریش و سبیل",
  },
  {
    id: "srv-fade-special",
    name: "اصلاح تخصصی فید و مدل مو",
    description: "اجرای دقیق انواع فید (Skin Fade, Taper, Drop Fade) با تلفیق تکنیک‌های قیچی و ماشین، تکسچرینگ مدرن",
    price: 850000,
    depositPrice: 170000,
    duration: 60,
    category: "اصلاح و استایل",
    featured: true,
  },
  {
    id: "srv-vip-package",
    name: "پکیج ویژه اصلاح VIP",
    description: "پکیج شاهانه شامل اصلاح کامل سر و ریش، فیشیال عمیق پوست، ماسک طلا، ماساژ اسکالپ سر و پذیرایی ویژه سالن",
    price: 1300000,
    depositPrice: 260000,
    duration: 60,
    category: "پکیج‌های اختصاصی",
    featured: true,
  },
  {
    id: "srv-wash-styling",
    name: "شست‌وشو و حالت‌دهی مو",
    description: "شست‌وشوی دو مرحله‌ای تقویتی، ماساژ آرامش‌بخش پوست سر، براشینگ و استایل با بهترین واکس و پمادهای مات",
    price: 200000,
    depositPrice: 40000,
    duration: 60,
    category: "مراقبت و استایل",
  },
  {
    id: "srv-facial-care",
    name: "پاکسازی و مراقبت پوست صورت",
    description: "بخور گرم، پاکسازی منافذ، اسکراب لایه‌بردار سلول‌های مرده، ماسک زغال فعال و آبرسانی عمیق با سرم طلا",
    price: 450000,
    depositPrice: 90000,
    duration: 60,
    category: "مراقبت پوست",
  },
  {
    id: "srv-hair-mask",
    name: "ماسک و مراقبت تخصصی مو",
    description: "درمان عمقی ساقه مو با کراتین سرد و ویتامینه ارگانیک، رفع خشکی و درخشان‌کننده تخصصی موهای آسیب‌دیده",
    price: 300000,
    depositPrice: 60000,
    duration: 60,
    category: "مراقبت و استایل",
  },
]

interface ServicesSectionProps {
  onSelectService?: (serviceId: string) => void
}

export function ServicesSection({ onSelectService }: ServicesSectionProps) {
  const handleSelect = (serviceId: string) => {
    if (onSelectService) {
      onSelectService(serviceId)
    }
    const bookingEl = document.querySelector("#booking")
    if (bookingEl) {
      bookingEl.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section id="services" className="py-24 bg-[#0D0F0E] relative overflow-hidden" dir="rtl">
      {/* Subtle border line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#2D332F] to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1A1F1C] border border-[#C8A96B]/30 text-xs sm:text-sm font-semibold text-[#E4C88E]">
            <Sparkles className="w-3.5 h-3.5 text-[#C8A96B]" />
            <span>تعرفه‌های مصوب و شفاف</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-[#F7F4EE] tracking-tight">
            خدمات تخصصی پیرایش و مراقبت
          </h2>

          <p className="text-base sm:text-lg text-[#C5BDB2] leading-relaxed">
            مدت هر خدمت دقیقاً <strong className="text-[#E4C88E]">۶۰ دقیقه</strong> است. بیعانه ۲۰٪ برای تضمین نوبت به صورت اینترنتی پرداخت می‌شود و مانده در سالن تسویه می‌گردد.
          </p>
        </div>

        {/* 8-Service Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOMEPAGE_SERVICES.map((srv) => {
            const balanceDue = srv.price - srv.depositPrice
            return (
              <div
                key={srv.id}
                className={`group relative rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between ${
                  srv.featured
                    ? "bg-[#151917] border-2 border-[#C8A96B]/50 hover:border-[#C8A96B] shadow-[0_4px_25px_rgba(200,169,107,0.1)]"
                    : "bg-[#141715] border border-[#252B28] hover:border-[#38413C]"
                }`}
              >
                {/* Featured Badge */}
                {srv.featured && (
                  <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-[#E4C88E] to-[#C8A96B] text-[11px] font-extrabold text-[#0D0F0E] shadow-md flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#0D0F0E]" />
                    <span>پیشنهاد ویژه</span>
                  </div>
                )}

                {/* Top Info */}
                <div className="space-y-4">
                  {/* Category & Duration Pill */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-[#1E2320] text-[#A89E90] font-medium border border-[#2B322E]">
                      {srv.category}
                    </span>
                    <span className="flex items-center gap-1 text-[#C8A96B] font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{srv.duration} دقیقه</span>
                    </span>
                  </div>

                  {/* Service Title */}
                  <h3 className="text-xl font-heading font-bold text-[#F7F4EE] group-hover:text-[#E4C88E] transition-colors leading-snug">
                    {srv.name}
                  </h3>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-[#A89E90] leading-relaxed line-clamp-3">
                    {srv.description}
                  </p>
                </div>

                {/* Bottom Pricing & Action */}
                <div className="pt-6 mt-6 border-t border-[#222825] space-y-4">
                  
                  {/* Transparent 3-Part Accounting Breakdown */}
                  <div className="space-y-2 bg-[#101311] p-3.5 rounded-2xl border border-[#202522]">
                    <div className="flex items-center justify-between text-xs text-[#A89E90]">
                      <span>قیمت کل:</span>
                      <strong className="text-sm font-bold text-[#F7F4EE]">{formatToman(srv.price)}</strong>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#C8A96B] font-medium">
                      <span>بیعانه رزرو (۲۰٪):</span>
                      <strong>{formatToman(srv.depositPrice)}</strong>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#8C8477] pt-1 border-t border-[#1C201D]">
                      <span>مانده در سالن:</span>
                      <span>{formatToman(balanceDue)}</span>
                    </div>
                  </div>

                  {/* Reserve Button */}
                  <button
                    type="button"
                    onClick={() => handleSelect(srv.id)}
                    className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      srv.featured
                        ? "bg-[#C8A96B] hover:bg-[#E4C88E] text-[#0D0F0E] shadow-[0_2px_15px_rgba(200,169,107,0.3)] hover:scale-[1.02]"
                        : "bg-[#1F2522] hover:bg-[#C8A96B] text-[#F7F4EE] hover:text-[#0D0F0E] border border-[#2D3530]"
                    }`}
                  >
                    <span>رزرو این خدمت</span>
                    <Scissors className="w-4 h-4" />
                  </button>

                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
