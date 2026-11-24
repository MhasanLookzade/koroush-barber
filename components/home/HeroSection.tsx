"use client"

import { Scissors, Clock, ShieldCheck, Sparkles, Star, Award, CheckCircle2 } from "lucide-react"

export function HeroSection() {
  const scrollTo = (id: string) => {
    const el = document.querySelector(id)
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center pt-28 pb-16 overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -right-48 w-96 h-96 rounded-full bg-[#C8A96B]/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 -left-48 w-96 h-96 rounded-full bg-[#E4C88E]/8 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Right Column: Hero Value Proposition */}
          <div className="lg:col-span-7 space-y-7 text-right">
            
            {/* VIP Brand Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#1A1F1C] border border-[#C8A96B]/40 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C8A96B] animate-pulse" />
              <span className="text-xs sm:text-sm font-semibold text-[#E4C88E] tracking-wide">
                سالن تخصصی پیرایش و استایل مردانه • تهران
              </span>
            </div>

            {/* Main Promise Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-black text-[#F7F4EE] leading-[1.2] tracking-tight">
              استایل حرفه‌ای،
              <span className="block mt-2 bg-gradient-to-r from-[#E4C88E] via-[#C8A96B] to-[#9A773F] bg-clip-text text-transparent">
                دقیقاً سر وقت شما.
              </span>
            </h1>

            {/* Clear Subtitle */}
            <p className="text-lg sm:text-xl text-[#C5BDB2] max-w-2xl leading-relaxed font-normal">
              آرایشگاه کوروش با نوبت‌های اختصاصی <strong className="text-[#F7F4EE]">۶۰ دقیقه‌ای</strong> و زمان‌بندی بدون معطلی. از ۱۰:۰۰ صبح تا ۲۳:۰۰ شب، در محیطی آرام و مدرن با مواد اولیه اروپایی.
            </p>

            {/* Key Value Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-2">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#141715] border border-[#252B28]">
                <Clock className="w-5 h-5 text-[#C8A96B] shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-[#E6E0D6]">عدم معطلی و تاخیر</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#141715] border border-[#252B28]">
                <ShieldCheck className="w-5 h-5 text-[#C8A96B] shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-[#E6E0D6]">بیعانه شفاف ۲۰٪</span>
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-center gap-2.5 p-3 rounded-xl bg-[#141715] border border-[#252B28]">
                <Sparkles className="w-5 h-5 text-[#C8A96B] shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-[#E6E0D6]">استریل با اشعه UV</span>
              </div>
            </div>

            {/* Direct Action CTA */}
            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                type="button"
                onClick={() => scrollTo("#booking")}
                className="inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-4 rounded-2xl text-base sm:text-lg font-bold text-[#0D0F0E] bg-gradient-to-r from-[#E4C88E] via-[#C8A96B] to-[#B58B59] hover:brightness-110 shadow-[0_4px_25px_rgba(200,169,107,0.35)] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer min-h-[52px]"
              >
                <span>رزرو آنلاین نوبت</span>
                <Scissors className="w-5 h-5" />
              </button>
            </div>

            {/* Social Trust Snippet */}
            <div className="pt-2 flex items-center gap-4 text-xs sm:text-sm text-[#A89E90]">
              <div className="flex items-center gap-1 text-[#E4C88E]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#E4C88E]" />
                ))}
              </div>
              <span><strong>۴.۹</strong> از ۵ (بیش از ۴۰۰ نوبت رضایت‌بخش ثبت شده)</span>
            </div>
          </div>

          {/* Left Column: Visual Showcase Artwork */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Outer Glow & Glass Frame */}
              <div className="relative rounded-3xl p-3 bg-gradient-to-br from-[#C8A96B]/30 via-transparent to-[#C8A96B]/10 border border-[#C8A96B]/30 shadow-2xl backdrop-blur-sm">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#141715]">
                  <img
                    src="/images/salon-hero.svg"
                    alt="فضای داخلی و جایگاه اختصاصی آرایشگاه کوروش"
                    className="w-full h-full object-cover"
                  />
                  {/* Subtle Gradient Vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F1210] via-transparent to-transparent opacity-80" />
                </div>

                {/* Floating Badge 1: Fixed 60-min slot */}
                <div className="absolute -bottom-5 -right-4 sm:-right-6 bg-[#161A18]/95 backdrop-blur-xl border border-[#C8A96B]/40 rounded-2xl p-4 shadow-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C8A96B]/20 flex items-center justify-center text-[#E4C88E]">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[#A89E90]">مدت زمان هر نوبت</div>
                    <div className="text-sm sm:text-base font-bold text-[#F7F4EE]">دقیقاً ۶۰ دقیقه اختصاصی</div>
                  </div>
                </div>

                {/* Floating Badge 2: Daily Hours */}
                <div className="absolute -top-4 -left-4 bg-[#161A18]/95 backdrop-blur-xl border border-[#2B332F] rounded-2xl p-3 sm:p-4 shadow-xl flex items-center gap-2.5">
                  <Award className="w-5 h-5 text-[#E4C88E]" />
                  <div>
                    <div className="text-[11px] font-medium text-[#A89E90]">ساعت کاری سالن</div>
                    <div className="text-xs sm:text-sm font-bold text-[#E4C88E]">۱۰:۰۰ الی ۲۳:۰۰ هر روز</div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
