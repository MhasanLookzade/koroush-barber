"use client"

import { MapPin, Phone, Clock, MessageSquare, Navigation, ShieldCheck } from "lucide-react"

export function LocationContactSection() {
  return (
    <section id="location" data-alias="contact" className="py-24 bg-[#0F1210] relative overflow-hidden" dir="rtl">
      <span id="contact" className="sr-only" />
      {/* Decorative top border */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#2D332F] to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#181D1A] border border-[#C8A96B]/30 text-xs sm:text-sm font-semibold text-[#E4C88E]">
            <MapPin className="w-3.5 h-3.5 text-[#C8A96B]" />
            <span>دسترسی و ارتباط مستقیم</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-[#F7F4EE] tracking-normal text-balance">
            ساعات کاری و موقعیت سالن
          </h2>

          <p className="text-base sm:text-lg text-[#C5BDB2]">
            پذیرش در سالن صرفاً با تعیین وقت قبلی از طریق رزرواسیون سایت امکان‌پذیر است.
          </p>
        </div>

        {/* 2-Column Layout: Contact Cards & Interactive Location Map Info */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Right Column: Contact & Working Hours Cards (5 cols) */}
          <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
            
            {/* Working Hours Card */}
            <div className="p-6 sm:p-7 rounded-3xl bg-[#141715] border border-[#262D29] shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#C8A96B]/15 text-[#E4C88E] flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F7F4EE]">ساعات فعالیت سالن</h3>
                  <p className="text-xs text-[#A89E90]">۷ روز هفته بدون تعطیلی</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#101311] border border-[#202522] space-y-2 text-sm">
                <div className="flex items-center justify-between text-[#E6E0D6]">
                  <span>شنبه تا جمعه:</span>
                  <strong className="text-base font-bold text-[#E4C88E]" dir="ltr">10:00 - 23:00</strong>
                </div>
                <div className="flex items-center justify-between text-xs text-[#8C8477] pt-2 border-t border-[#1C201D]">
                  <span>فاصله هر نوبت:</span>
                  <span>دقیقاً ۶۰ دقیقه اختصاصی</span>
                </div>
              </div>
            </div>

            {/* Direct Phone & WhatsApp Actions */}
            <div className="p-6 sm:p-7 rounded-3xl bg-[#141715] border border-[#262D29] shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#C8A96B]/15 text-[#E4C88E] flex items-center justify-center">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F7F4EE]">تماس مستقیم و پشتیبانی</h3>
                  <p className="text-xs text-[#A89E90]">پاسخگویی در ساعات کاری سالن</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <a
                  href="tel:02122446688"
                  className="p-3.5 rounded-2xl bg-[#1B211E] hover:bg-[#252C28] border border-[#2D3530] flex items-center justify-center gap-2 text-sm font-bold text-[#F7F4EE] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#C8A96B]" />
                  <span dir="ltr">021-22446688</span>
                </a>

                <a
                  href="https://wa.me/989121112233"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-2xl bg-[#1A2620] hover:bg-[#20332B] border border-emerald-800/40 flex items-center justify-center gap-2 text-sm font-bold text-emerald-300 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>پشتیبانی واتساپ</span>
                </a>
              </div>
            </div>

            {/* Salon Access & Timing Note */}
            <div className="p-5 rounded-3xl bg-[#141715] border border-[#262D29] flex items-center gap-3.5 text-xs text-[#A89E90]">
              <div className="w-10 h-10 rounded-xl bg-[#202623] text-[#C8A96B] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <span>
                جهت حفظ نظم و آرامش مراجعان، لطفاً <strong className="text-[#F7F4EE]">۵ دقیقه قبل از ساعت نوبت</strong> در سالن حضور داشته باشید.
              </span>
            </div>

          </div>

          {/* Left Column: Location Card & Navigation (7 cols) */}
          <div className="lg:col-span-7 p-7 sm:p-9 rounded-3xl bg-[#141715] border border-[#262D29] shadow-xl flex flex-col justify-between space-y-6">
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#C8A96B]/15 text-[#E4C88E] flex items-center justify-center">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#F7F4EE]">آدرس سالن</h3>
                  <p className="text-xs text-[#A89E90]">تهران، زعفرانیه و الهیه</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#101311] border border-[#202522] space-y-2">
                <p className="text-base text-[#F7F4EE] font-semibold leading-relaxed">
                  تهران، خیابان مقدس اردبیلی، مجتمع تجاری پیروز، طبقه ۲، واحد ۲۰۴ (آرایشگاه کوروش)
                </p>
                <p className="text-xs text-[#8C8477]">
                  دسترسی آسان از خیابان ولیعصر و بزرگراه چمران • خارج از طرح ترافیک تهران
                </p>
              </div>
            </div>

            {/* Stylized Map View Placeholder with Coordinates */}
            <div className="relative aspect-[16/8] rounded-2xl overflow-hidden bg-[#101311] border border-[#252B28] flex items-center justify-center text-center p-6">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#C8A96B]/20 border border-[#C8A96B]/50 flex items-center justify-center mx-auto text-[#E4C88E]">
                  <Navigation className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#F7F4EE]">موقعیت مکانی دقیق روی نقشه</div>
                  <div className="text-xs text-[#8C8477] mt-0.5" dir="ltr">35.7981° N, 51.4182° E</div>
                </div>
              </div>
            </div>

            {/* 3 Nav Router Buttons: Google Maps, Neshan, Balad */}
            <div className="grid grid-cols-3 gap-3">
              <a
                href="https://maps.google.com/?q=35.7981,51.4182"
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-3 rounded-xl bg-[#1A1F1C] hover:bg-[#252C28] border border-[#2B332F] text-xs font-semibold text-[#F7F4EE] text-center transition-colors flex items-center justify-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5 text-[#C8A96B]" />
                <span>گوگل مپ</span>
              </a>

              <a
                href="https://nshn.ir"
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-3 rounded-xl bg-[#1A1F1C] hover:bg-[#252C28] border border-[#2B332F] text-xs font-semibold text-[#F7F4EE] text-center transition-colors flex items-center justify-center gap-1.5"
              >
                <span>مسیریابی نشان</span>
              </a>

              <a
                href="https://balad.ir"
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-3 rounded-xl bg-[#1A1F1C] hover:bg-[#252C28] border border-[#2B332F] text-xs font-semibold text-[#F7F4EE] text-center transition-colors flex items-center justify-center gap-1.5"
              >
                <span>مسیریابی بلد</span>
              </a>
            </div>

          </div>

        </div>

      </div>
    </section>
  )
}
