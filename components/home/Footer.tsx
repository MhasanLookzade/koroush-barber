"use client"

import Link from "next/link"
import { Scissors, MapPin, Phone, Clock, ShieldCheck, ArrowUp } from "lucide-react"

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <footer className="bg-[#090B0A] text-[#A89E90] border-t border-[#1F2522] pt-16 pb-24 md:pb-12" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid (4 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#1A1F1C]">
          
          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E4C88E] to-[#9A773F] p-0.5">
                <div className="w-full h-full bg-[#121513] rounded-[14px] flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-[#E4C88E]" />
                </div>
              </div>
              <div>
                <span className="block font-heading font-extrabold text-lg text-[#F7F4EE]">
                  آرایشگاه کوروش
                </span>
                <span className="block text-[10px] font-mono tracking-widest text-[#C8A96B] uppercase">
                  KOUROSH BARBER
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#8C8477] leading-relaxed">
              استایل حرفه‌ای، دقیقاً سر وقت شما. سالن تخصصی پیرایش و استایل آقایان با نوبت‌های ۶۰ دقیقه‌ای اختصاصی و رزرو آنلاین.
            </p>

            <div className="flex items-center gap-2 text-xs text-[#E4C88E]">
              <ShieldCheck className="w-4 h-4 text-[#C8A96B]" />
              <span>پایبند به استانداردهای بهداشتی هتل ۵ ستاره</span>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#F7F4EE] tracking-wide">بخش‌های سایت</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <a href="#services" className="hover:text-[#E4C88E] transition-colors">خدمات و تعرفه‌ها</a>
              </li>
              <li>
                <a href="#booking" className="hover:text-[#E4C88E] transition-colors">رزرو آنلاین نوبت</a>
              </li>
              <li>
                <a href="#comparison" className="hover:text-[#E4C88E] transition-colors">مقایسه قبل و بعد</a>
              </li>
              <li>
                <a href="#about" className="hover:text-[#E4C88E] transition-colors">درباره استاد کوروش</a>
              </li>
              <li>
                <a href="#gallery" className="hover:text-[#E4C88E] transition-colors">گالری فضای سالن</a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#E4C88E] transition-colors">پرسش‌های متداول</a>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Care & Services */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#F7F4EE] tracking-wide">امور مراجعان</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link href="/booking/status" className="text-[#E4C88E] hover:underline font-semibold flex items-center gap-1.5">
                  <span>پیگیری نوبت یا لغو</span>
                </Link>
              </li>
              <li>
                <span className="text-[#8C8477]">لغو نوبت: تا ۱۲ ساعت قبل</span>
              </li>
              <li>
                <span className="text-[#8C8477]">پرداخت: ۲۰٪ بیعانه آنلاین + مانده در سالن</span>
              </li>
              <li>
                <span className="text-[#8C8477]">پارکینگ: مجتمع تجاری پیروز (رایگان)</span>
              </li>
              <li className="pt-2">
                <Link href="/admin-login" className="text-xs text-[#5A5348] hover:text-[#A89E90] transition-colors">
                  ورود پرسنل و مدیریت سالن
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Hours */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#F7F4EE] tracking-wide">ساعت کاری و آدرس</h4>
            <div className="space-y-2.5 text-xs text-[#A89E90]">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[#C8A96B] shrink-0 mt-0.5" />
                <span>هر روز هفته: ۱۰:۰۰ الی ۲۳:۰۰</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#C8A96B] shrink-0 mt-0.5" />
                <span>تهران، خیابان مقدس اردبیلی، مجتمع تجاری پیروز، ط ۲، واحد ۲۰۴</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#C8A96B] shrink-0" />
                <a href="tel:02122446688" className="hover:text-[#E4C88E] font-mono text-sm" dir="ltr">
                  021-22446688
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Back to Top */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6F675A]">
          <div>
            © {new Date().getFullYear()} تمامی حقوق محفوظ است • آرایشگاه کوروش (Koroush Barber)
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="p-2.5 rounded-xl bg-[#141715] hover:bg-[#1E2320] border border-[#242A27] text-[#C8A96B] transition-colors flex items-center gap-1.5 cursor-pointer"
            aria-label="بازگشت به ابتدای صفحه"
          >
            <span>بازگشت به بالا</span>
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>

      </div>
    </footer>
  )
}
