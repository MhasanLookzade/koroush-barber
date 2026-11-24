"use client"

import Link from "next/link"
import { Scissors, MapPin, Phone, Clock, ShieldCheck, ArrowUp, CalendarCheck } from "lucide-react"

export function Footer({ id }: { id?: string }) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <footer id={id || "site-footer"} className="bg-[#090B0A] text-[#A89E90] border-t border-[#1F2522] pt-14 pb-24 md:pb-12" dir="rtl" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid (4 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 pb-12 border-b border-[#1A1F1C]">
          
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
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#F7F4EE] tracking-wide">بخش‌های اصلی</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link href="/#booking" className="hover:text-[#E4C88E] transition-colors">
                  خدمات و رزرو نوبت
                </Link>
              </li>
              <li>
                <Link href="/#comparison" className="hover:text-[#E4C88E] transition-colors">
                  مقایسه قبل و بعد
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="hover:text-[#E4C88E] transition-colors">
                  گالری تصاویر اختصاصی
                </Link>
              </li>
              <li>
                <Link href="/#about" className="hover:text-[#E4C88E] transition-colors">
                  درباره استاد کوروش
                </Link>
              </li>
              <li>
                <Link href="/#contact" className="hover:text-[#E4C88E] transition-colors">
                  ساعات کاری و موقعیت
                </Link>
              </li>
              <li>
                <Link href="/#reviews" className="hover:text-[#E4C88E] transition-colors">
                  روایت و نظرات مشتریان
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Management & Rules */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#F7F4EE] tracking-wide">پیگیری و قوانین</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link href="/booking/status" className="inline-flex items-center gap-1.5 text-[#E4C88E] hover:underline font-medium">
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>پیگیری یا لغو نوبت من</span>
                </Link>
              </li>
              <li>
                <span className="text-[#8C8477] block text-xs leading-relaxed">
                  امکان لغو نوبت با بازگشت کامل بیعانه تا ۱۲ ساعت پیش از موعد آغاز نوبت.
                </span>
              </li>
              <li>
                <span className="text-[#8C8477] block text-xs leading-relaxed">
                  حضور ۱۰ دقیقه زودتر در سالن جهت مشاوره دقیق استایل و فرم چهره توصیه می‌شود.
                </span>
              </li>
            </ul>
          </div>

          {/* Col 4: Address, Hours & Contact */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#F7F4EE] tracking-wide">اطلاعات تماس و حضور</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#C8A96B] shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  تهران، زعفرانیه، خیابان مقدس اردبیلی، مجتمع تجاری پیروز، طبقه ۲، واحد ۲۰۴
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#C8A96B] shrink-0" />
                <a href="tel:02122446688" className="hover:text-[#E4C88E] font-mono dir-ltr" dir="ltr">
                  ۰۲۱-۲۲۴۴۶۶۸۸
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#C8A96B] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[#F7F4EE] font-medium">۱۰:۰۰ الی ۲۳:۰۰</span>
                  <span className="text-[11px] text-[#8C8477]">همه روزه شنبه تا جمعه بدون تعطیلی</span>
                </div>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6F695E]">
          <p>© {new Date().getFullYear()} پیرایش کوروش (KOUROSH BARBER) — تمامی حقوق محفوظ است.</p>

          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141715] border border-[#242A27] text-[#A8A39A] hover:text-[#F7F4EE] hover:border-[#C8A96B] transition-colors cursor-pointer"
            aria-label="بازگشت به ابتدای صفحه"
          >
            <span>بازگشت به بالا</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </footer>
  )
}
