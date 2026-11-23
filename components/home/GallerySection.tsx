"use client"

import { useState, useEffect, useCallback } from "react"
import { Sparkles, ZoomIn, X, ChevronRight, ChevronLeft, ArrowRight, ArrowLeft } from "lucide-react"
import { toPersianDigits } from "@/lib/jalali"

interface GalleryItem {
  id: number
  src: string
  title: string
  category: string
  description: string
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 1,
    src: "/images/gallery-1.svg",
    title: "جایگاه اختصاصی پیرایش VIP",
    category: "فضای سالن",
    description: "صندلی چرم طبیعی دست‌دوز، آینه برنز با نور ملایم و تهویه مطبوع مستقل.",
  },
  {
    id: 2,
    src: "/images/gallery-2.svg",
    title: "تیغ‌های سنتی ژاپنی و قیچی‌های دست‌ساز",
    category: "ادوات کار",
    description: "فولاد ضدزنگ دمشقی با برندگی میکرومتری برای خط‌زنی آنکارد و فید تمیز.",
  },
  {
    id: 3,
    src: "/images/gallery-3.svg",
    title: "سرویس حوله گرم استریل با اکالیپتوس",
    category: "مراقبت پوست",
    description: "بخور حوله گرم گیاهی برای گشودن منافذ پوست و تسکین کامل خستگی روزانه.",
  },
  {
    id: 4,
    src: "/images/gallery-4.svg",
    title: "بار اسپرسو و لاونج انتظار اختصاصی",
    category: "پذیرایی",
    description: "سرو قهوه تخصصی تازه برشته شده و نوشیدنی‌های ارگانیک در محیطی خلوت و آرام.",
  },
  {
    id: 5,
    src: "/images/gallery-5.svg",
    title: "روغن‌های ارگانیک و واکس‌های دست‌ساز",
    category: "محصولات",
    description: "فرمولاسیون اختصاصی بدون چربی اضافه برای تغذیه ساقه مو و ریش.",
  },
  {
    id: 6,
    src: "/images/gallery-6.svg",
    title: "سوییت خصوصی پیرایش VIP",
    category: "سوئیت اختصاصی",
    description: "محیطی کاملاً ایزوله بدون دید از سالن عمومی برای تجربه نهایت آرامش و حریم خصوصی.",
  },
]

export function GallerySection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const activeItem = activeIndex !== null ? GALLERY_ITEMS[activeIndex] : null

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (activeItem) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [activeItem])

  const handleNext = useCallback(() => {
    if (activeIndex === null) return
    setActiveIndex((activeIndex + 1) % GALLERY_ITEMS.length)
  }, [activeIndex])

  const handlePrev = useCallback(() => {
    if (activeIndex === null) return
    setActiveIndex((activeIndex - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length)
  }, [activeIndex])

  const handleClose = useCallback(() => {
    setActiveIndex(null)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (activeIndex === null) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
      if (e.key === "ArrowLeft") handleNext()
      if (e.key === "ArrowRight") handlePrev()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeIndex, handleClose, handleNext, handlePrev])

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX - touchEndX

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped left
        handleNext()
      } else {
        // Swiped right
        handlePrev()
      }
    }
    setTouchStartX(null)
  }

  return (
    <section id="gallery" className="py-20 sm:py-24 bg-[#0F1210] relative overflow-hidden" dir="rtl">
      {/* Decorative top border */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#2D332F] to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#181D1A] border border-[#C8A96B]/30 text-xs sm:text-sm font-semibold text-[#E4C88E]">
            <Sparkles className="w-3.5 h-3.5 text-[#C8A96B]" />
            <span>تجربه بصری و اتمسفر سالن</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-[#F7F4EE] tracking-tight">
            فضایی آرام و اختصاصی برای شما
          </h2>

          <p className="text-sm sm:text-base text-[#C5BDB2] max-w-xl mx-auto leading-relaxed">
            طراحی داخلی با آبسیدین، چوب طبیعی و نورپردازی ملایم تا لحظات پیرایش شما توام با آرامش کامل باشد.
          </p>
        </div>

        {/* 6-Item Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {GALLERY_ITEMS.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => setActiveIndex(idx)}
              className="group relative rounded-3xl overflow-hidden aspect-[4/3] bg-[#141715] border border-[#242A27] hover:border-[#C8A96B]/60 transition-all duration-300 shadow-xl cursor-pointer select-none"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setActiveIndex(idx)
                }
              }}
              aria-label={`مشاهده ${item.title}`}
            >
              <img
                src={item.src}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0F0E] via-[#0D0F0E]/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

              {/* Content caption */}
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 flex items-end justify-between">
                <div>
                  <span className="text-[11px] font-medium text-[#C8A96B] px-2.5 py-0.5 rounded-md bg-[#1C221F] border border-[#C8A96B]/30">
                    {item.category}
                  </span>
                  <h3 className="text-base sm:text-lg font-heading font-bold text-[#F7F4EE] mt-2 leading-snug">
                    {item.title}
                  </h3>
                </div>

                <div className="w-10 h-10 rounded-xl bg-[#C8A96B]/20 text-[#E4C88E] flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 shrink-0">
                  <ZoomIn className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Accessible Full-Screen Lightbox Modal without Unwanted Cropping */}
      {activeItem && activeIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-[#0D0F0E]/95 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
          onClick={handleClose}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          role="dialog"
          aria-modal="true"
          aria-label="نمایش تصویر گالری به صورت کامل"
        >
          <div
            className="relative max-w-5xl w-full max-h-[95vh] flex flex-col bg-[#141715] rounded-3xl overflow-hidden border border-[#C8A96B]/40 shadow-2xl p-3 sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Toolbar: Counter, Badge, and Close Button */}
            <div className="flex items-center justify-between pb-3 px-1 border-b border-[#252C28]/60 mb-3">
              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm font-semibold text-[#C8A96B] bg-[#1C221F] px-3 py-1 rounded-full border border-[#C8A96B]/30">
                  تصویر {toPersianDigits(activeIndex + 1)} از {toPersianDigits(GALLERY_ITEMS.length)}
                </span>
                <span className="text-xs text-[#A8A39A] hidden sm:inline">
                  {activeItem.category}
                </span>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-[#1C221F] border border-[#2B322E] text-[#F7F4EE] flex items-center justify-center hover:bg-[#C8A96B] hover:text-[#0D0F0E] transition-colors cursor-pointer"
                aria-label="بستن پنجره"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Image Frame - Completely Visible with object-contain (NO cropping) */}
            <div className="relative w-full flex-1 min-h-[240px] max-h-[66vh] rounded-2xl bg-[#090B0A] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
              <img
                src={activeItem.src}
                alt={activeItem.title}
                className="max-h-[62vh] max-w-full w-auto h-auto object-contain select-none transition-transform duration-300 rounded-lg"
              />

              {/* Prev Button (Right side in RTL) */}
              <button
                type="button"
                onClick={handlePrev}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-[#0D0F0E]/80 backdrop-blur-md border border-[#2B322E] text-[#F7F4EE] flex items-center justify-center hover:bg-[#C8A96B] hover:text-[#0D0F0E] transition-colors shadow-2xl cursor-pointer"
                aria-label="تصویر قبلی"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Next Button (Left side in RTL) */}
              <button
                type="button"
                onClick={handleNext}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-[#0D0F0E]/80 backdrop-blur-md border border-[#2B322E] text-[#F7F4EE] flex items-center justify-center hover:bg-[#C8A96B] hover:text-[#0D0F0E] transition-colors shadow-2xl cursor-pointer"
                aria-label="تصویر بعدی"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom Details & Keyboard Hint */}
            <div className="pt-3 px-2 text-center flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="text-right sm:text-right w-full sm:w-auto">
                <h3 className="text-base sm:text-lg font-heading font-bold text-[#F7F4EE] leading-tight">
                  {activeItem.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#A89E90] mt-0.5 line-clamp-2">
                  {activeItem.description}
                </p>
              </div>

              <div className="text-[11px] text-[#7E776C] shrink-0 hidden md:block">
                <span>کلیدهای </span>
                <kbd className="px-1.5 py-0.5 bg-[#1C221F] border border-[#2B322E] rounded text-[#C8A96B]">←</kbd>
                <span> و </span>
                <kbd className="px-1.5 py-0.5 bg-[#1C221F] border border-[#2B322E] rounded text-[#C8A96B]">→</kbd>
                <span> یا کشیدن انگشت</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
