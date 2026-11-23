"use client"

import { Star, CheckCircle2, Quote, UserCheck } from "lucide-react"

interface Review {
  id: number
  author: string
  role: string
  rating: number
  date: string
  comment: string
  service: string
}

const REVIEWS: Review[] = [
  {
    id: 1,
    author: "دکتر امیرحسین کاظمی",
    role: "پزشک متخصص • مشتری ثابت ۱ ساله",
    rating: 5,
    date: "۲ هفته پیش",
    comment:
      "برای من که به عنوان جراح زمانم بسیار محدود است، بزرگترین مزیت کوروش باربر این است که ساعت ۱۴:۰۰ نوبت دارم و دقیقاً ساعت ۱۴:۰۰ روی صندلی می‌نشینم، بدون حتی یک دقیقه معطلی. استایل فید هم دقیقاً مطابق خواسته‌ام اجرا می‌شود.",
    service: "اصلاح کامل مو و صورت",
  },
  {
    id: 2,
    author: "مهندس نیما راد",
    role: "مدیر عامل شرکت نرم‌افزاری",
    rating: 5,
    date: "۱ ماه پیش",
    comment:
      "بهترین تجربه اصلاحی که در تهران داشتم. آرامش محیط، بوی خوش اکالیپتوس در حوله گرم، قهوه عالی و دقت وسواس‌گونه استاد کوروش روی تقارن خط ریش واقعاً کم‌نظیر است. سیستم رزرو آنلاین سایت هم در کمتر از یک دقیقه کار را تمام می‌کند.",
    service: "پکیج ویژه اصلاح VIP",
  },
  {
    id: 3,
    author: "فرزاد صبوری",
    role: "مشتری ۶۲ ساله سالن",
    rating: 5,
    date: "۳ هفته پیش",
    comment:
      "من با تلفن‌های هوشمند خیلی راحت نیستم اما نوبت گرفتن از این سایت آنقدر فونت درشت و دکمه‌های واضحی داشت که خودم بدون کمک پسرم رزرو کردم. برخورد بسیار محترمانه پرسنل هم جای تقدیر دارد.",
    service: "اصلاح مو",
  },
  {
    id: 4,
    author: "سامان ابراهیمی",
    role: "معمار و طراح داخلی",
    rating: 5,
    date: "همین هفته",
    comment:
      "فید پوست و فرم‌دهی ریش فوق‌العاده بود. شفافیت قیمت و اینکه بیعانه را آنلاین دادم و مابقی را کارت کشیدم بدون هیچ هزینه اضافی، حس اعتماد و امنیت بسیار بالایی به مشتری می‌دهد.",
    service: "اصلاح تخصصی فید و مدل مو",
  },
]

export function ReviewsSection() {
  return (
    <section id="reviews" className="py-24 bg-[#0D0F0E] relative overflow-hidden" dir="rtl">
      {/* Decorative line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#2D332F] to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#181D1A] border border-[#C8A96B]/30 text-xs sm:text-sm font-semibold text-[#E4C88E]">
            <Star className="w-3.5 h-3.5 fill-[#E4C88E] text-[#E4C88E]" />
            <span>نظرات مراجعان تایید شده</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-[#F7F4EE] tracking-tight">
            روایت تجربه مشتریان کوروش باربر
          </h2>

          <p className="text-base sm:text-lg text-[#C5BDB2]">
            بیش از ۹۸٪ رضایت مندی ثبت شده با امتیاز میانگین ۴.۹ از ۵ ستاره
          </p>
        </div>

        {/* Reviews 4-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {REVIEWS.map((rev) => (
            <div
              key={rev.id}
              className="bg-[#141715] p-7 sm:p-8 rounded-3xl border border-[#242A27] hover:border-[#C8A96B]/40 transition-all duration-300 shadow-xl flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                {/* Rating Stars & Quote Icon */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[#E4C88E]">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#E4C88E]" />
                    ))}
                  </div>
                  <Quote className="w-8 h-8 text-[#262C29]" />
                </div>

                {/* Comment Text */}
                <p className="text-sm sm:text-base text-[#D4CCC1] leading-relaxed">
                  «{rev.comment}»
                </p>
              </div>

              {/* Author Info & Verified Badge */}
              <div className="pt-4 border-t border-[#1F2522] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-[#F7F4EE]">{rev.author}</h4>
                    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>نوبت تایید شده</span>
                    </span>
                  </div>
                  <p className="text-xs text-[#8C8477] mt-0.5">{rev.role}</p>
                </div>

                <div className="text-left text-xs">
                  <span className="text-[#C8A96B] font-medium block">{rev.service}</span>
                  <span className="text-[#6D6559] text-[11px]">{rev.date}</span>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
