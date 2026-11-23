"use client"

import { useState } from "react"
import { ChevronDown, HelpCircle } from "lucide-react"

interface FaqItem {
  id: number
  question: string
  answer: string
}

const FAQS: FaqItem[] = [
  {
    id: 1,
    question: "چرا برای قطعی شدن نوبت، پرداخت ۲۰٪ بیعانه الزامی است؟",
    answer:
      "برای احترام به وقت مراجعان و تضمین اینکه در ساعت انتخاب شده سالن به صورت کاملاً اختصاصی در اختیار شماست، ۲۰٪ بیعانه آنلاین دریافت می‌شود تا از تداخل و نوبت‌های صوری جلوگیری گردد. مابقی مبلغ در محل سالن کارت کشیده می‌شود.",
  },
  {
    id: 2,
    question: "قوانین لغو یا تغییر زمان نوبت چیست؟",
    answer:
      "شما می‌توانید تا ۱۲ ساعت قبل از موعد نوبت، از طریق صفحه «پیگیری نوبت» با وارد کردن شماره موبایل خود، نوبت را لغو نمایید یا با هماهنگی تلفنی سالن آن را جابه‌جا کنید.",
  },
  {
    id: 3,
    question: "آیا در سالن معطلی وجود دارد؟",
    answer:
      "خیر، وجه تمایز اصلی کوروش باربر پایبندی قطعی به زمان است. به ازای هر مشتری بازه ۶۰ دقیقه‌ای در نظر گرفته شده و نوبت‌ها هم‌پوشانی ندارند؛ بنابراین شما رأس ساعت مقرر اصلاح خود را آغاز خواهید کرد.",
  },
  {
    id: 4,
    question: "آیا امکان مراجعه حضوری بدون رزرو قبلی وجود دارد؟",
    answer:
      "خیر. پذیرش در سالن صرفاً از طریق سیستم رزرواسیون سایت و با وقت قبلی صورت می‌گیرد تا آرامش و خلوت بودن فضای سالن برای تک تک مراجعان حفظ شود.",
  },
  {
    id: 5,
    question: "تسویه مانده هزینه خدمت در سالن به چه صورت انجام می‌شود؟",
    answer:
      "پس از کسر بیعانه پرداخت شده اینترنتی، مابقی مبلغ در محل سالن از طریق کارتخوان با تمامی کارت‌های بانکی عضو شبکه شتاب تسویه می‌گردد.",
  },
]

export function FaqSection() {
  const [openId, setOpenId] = useState<number | null>(1)

  const toggle = (id: number) => {
    setOpenId(openId === id ? null : id)
  }

  return (
    <section id="faq" className="py-24 bg-[#0D0F0E] relative overflow-hidden" dir="rtl">
      {/* Decorative divider */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#2D332F] to-transparent" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#181D1A] border border-[#C8A96B]/30 text-xs sm:text-sm font-semibold text-[#E4C88E]">
            <HelpCircle className="w-3.5 h-3.5 text-[#C8A96B]" />
            <span>پاسخ به ابهامات متداول</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-[#F7F4EE] tracking-tight">
            پرسش‌های متداول مراجعان
          </h2>

          <p className="text-base sm:text-lg text-[#C5BDB2]">
            تمام جزئیاتی که قبل از رزرو اولین نوبت نیاز دارید بدانید.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {FAQS.map((faq) => {
            const isOpen = openId === faq.id
            return (
              <div
                key={faq.id}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? "bg-[#141715] border-[#C8A96B]/50 shadow-lg"
                    : "bg-[#121413] border-[#222825] hover:border-[#38413C]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(faq.id)}
                  className="w-full p-6 text-right flex items-center justify-between gap-4 cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg font-bold text-[#F7F4EE]">
                    {faq.question}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full bg-[#1C221F] border border-[#2B322E] flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-[#E4C88E] border-[#C8A96B]/50" : "text-[#8C8477]"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-0 text-sm sm:text-base text-[#C5BDB2] leading-relaxed border-t border-[#1C221F] mt-2 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
