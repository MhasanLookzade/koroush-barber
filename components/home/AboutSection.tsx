"use client"

import { Scissors, Award, Sparkles, CheckCircle2, Shield, HeartHandshake } from "lucide-react"

export function AboutSection() {
  return (
    <section id="about" className="py-24 bg-[#0D0F0E] relative overflow-hidden" dir="rtl">
      {/* Decorative divider */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#2D332F] to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Right Column: Visual Portrait */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="relative rounded-3xl p-3 bg-gradient-to-br from-[#C8A96B]/30 via-[#181B19] to-transparent border border-[#C8A96B]/30 shadow-2xl">
                <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-[#141715]">
                  <img
                    src="/images/barber-kourosh.svg"
                    alt="استاد کوروش - مدیر و آرایشگر ارشد سالن"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Experience Badge */}
              <div className="absolute -bottom-6 -left-4 sm:-left-6 bg-[#161917]/95 backdrop-blur-xl border border-[#C8A96B]/40 rounded-2xl p-5 shadow-2xl">
                <div className="text-3xl font-extrabold text-[#E4C88E] font-heading">۱۵+</div>
                <div className="text-xs font-semibold text-[#F7F4EE] mt-0.5">سال تجربه تخصصی</div>
                <div className="text-[11px] text-[#A89E90]">پیرایش کلاسیک و مدرن</div>
              </div>
            </div>
          </div>

          {/* Left Column: Story & Philosophy */}
          <div className="lg:col-span-7 space-y-6 text-right">
            
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1A1F1C] border border-[#C8A96B]/30 text-xs sm:text-sm font-semibold text-[#E4C88E]">
              <Award className="w-3.5 h-3.5 text-[#C8A96B]" />
              <span>فلسفه و اصالت کوروش باربر</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-[#F7F4EE] leading-tight tracking-tight">
              پیرایش فقط کوتاهی مو نیست؛
              <span className="block mt-1 text-[#C8A96B]">طراحی چهره و اعتمادبه‌نفس شماست.</span>
            </h2>

            <p className="text-base sm:text-lg text-[#C5BDB2] leading-relaxed">
              در آرایشگاه کوروش، زمان شما باارزش‌ترین دارایی است. ما مفهوم نوبت‌های فشرده و سالن‌های شلوغ را بازتعریف کرده‌ایم: به ازای هر مشتری، سالن به مدت <strong className="text-[#F7F4EE]">۶۰ دقیقه اختصاصی</strong> در اختیار شما قرار می‌گیرد.
            </p>

            {/* Core Values 4-Item List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-2xl bg-[#141715] border border-[#222825] space-y-1.5">
                <div className="flex items-center gap-2 text-[#E4C88E] font-bold text-sm">
                  <Scissors className="w-4 h-4 text-[#C8A96B]" />
                  <span>دقت میلی‌متری در فید و خط‌زنی</span>
                </div>
                <p className="text-xs text-[#8C8477] leading-relaxed">
                  تلفیق سنتی تیغ ژاپنی با ماشین‌های اصلاح ارگونومیک روز دنیا.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#141715] border border-[#222825] space-y-1.5">
                <div className="flex items-center gap-2 text-[#E4C88E] font-bold text-sm">
                  <Shield className="w-4 h-4 text-[#C8A96B]" />
                  <span>بهداشت فردی ۵ ستاره</span>
                </div>
                <p className="text-xs text-[#8C8477] leading-relaxed">
                  تیغ یکبار مصرف برای هر مشتری و استریلیزاسیون کامل ادوات با اشعه UV.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#141715] border border-[#222825] space-y-1.5">
                <div className="flex items-center gap-2 text-[#E4C88E] font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-[#C8A96B]" />
                  <span>محصولات مراقبت ارگانیک</span>
                </div>
                <p className="text-xs text-[#8C8477] leading-relaxed">
                  استفاده انحصاری از روغن‌های گیاهی، اسکراب‌های تقویتی و واکس‌های مات بدون چربی.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#141715] border border-[#222825] space-y-1.5">
                <div className="flex items-center gap-2 text-[#E4C88E] font-bold text-sm">
                  <HeartHandshake className="w-4 h-4 text-[#C8A96B]" />
                  <span>پذیرایی و مشاوره فرم چهره</span>
                </div>
                <p className="text-xs text-[#8C8477] leading-relaxed">
                  سرو قهوه تخصصی و بررسی ساختار جمجمه پیش از آغاز هرگونه برش.
                </p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  )
}
