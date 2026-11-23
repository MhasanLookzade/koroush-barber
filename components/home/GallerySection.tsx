"use client"

import { useState } from "react"
import { Sparkles, ZoomIn, X } from "lucide-react"

interface GalleryItem {
  id: number
  src: string
  title: string
  category: string
  aspect?: string
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 1,
    src: "/images/gallery-1.svg",
    title: "جایگاه اختصاصی پیرایش VIP",
    category: "فضای سالن",
  },
  {
    id: 2,
    src: "/images/gallery-2.svg",
    title: "تیغ‌های سنتی ژاپنی و قیچی‌های دست‌ساز",
    category: "ادوات کار",
  },
  {
    id: 3,
    src: "/images/gallery-3.svg",
    title: "سرویس حوله گرم استریل با اکالیپتوس",
    category: "مراقبت پوست",
  },
  {
    id: 4,
    src: "/images/gallery-4.svg",
    title: "بار اسپرسو و لاونج انتظار اختصاصی",
    category: "پذیرایی",
  },
  {
    id: 5,
    src: "/images/gallery-5.svg",
    title: "روغن‌های ارگانیک و واکس‌های دست‌ساز",
    category: "محصولات",
  },
  {
    id: 6,
    src: "/images/gallery-6.svg",
    title: "سوییت خصوصی پیرایش VIP",
    category: "سوئیت اختصاصی",
  },
]

export function GallerySection() {
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null)

  return (
    <section id="gallery" className="py-24 bg-[#0F1210] relative overflow-hidden" dir="rtl">
      {/* Decorative top border */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#2D332F] to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#181D1A] border border-[#C8A96B]/30 text-xs sm:text-sm font-semibold text-[#E4C88E]">
            <Sparkles className="w-3.5 h-3.5 text-[#C8A96B]" />
            <span>تجربه بصری و اتمسفر سالن</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-[#F7F4EE] tracking-tight">
            فضایی آرام و اختصاصی برای شما
          </h2>

          <p className="text-base sm:text-lg text-[#C5BDB2]">
            طراحی داخلی با تم آبسیدین، چوب طبیعی و نورپردازی ملایم تا لحظات پیرایش شما توام با آرامش کامل باشد.
          </p>
        </div>

        {/* 6-Item Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {GALLERY_ITEMS.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveItem(item)}
              className="group relative rounded-3xl overflow-hidden aspect-[4/3] bg-[#141715] border border-[#242A27] hover:border-[#C8A96B]/60 transition-all duration-300 shadow-xl cursor-pointer"
            >
              <img
                src={item.src}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0F0E] via-[#0D0F0E]/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

              {/* Content caption */}
              <div className="absolute inset-x-0 bottom-0 p-6 flex items-end justify-between">
                <div>
                  <span className="text-[11px] font-medium text-[#C8A96B] px-2.5 py-0.5 rounded-md bg-[#1C221F] border border-[#C8A96B]/30">
                    {item.category}
                  </span>
                  <h3 className="text-base sm:text-lg font-heading font-bold text-[#F7F4EE] mt-2">
                    {item.title}
                  </h3>
                </div>

                <div className="w-10 h-10 rounded-xl bg-[#C8A96B]/20 text-[#E4C88E] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ZoomIn className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Lightbox Modal */}
      {activeItem && (
        <div
          className="fixed inset-0 z-50 bg-[#0D0F0E]/95 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-8"
          onClick={() => setActiveItem(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-[#141715] rounded-3xl overflow-hidden border border-[#C8A96B]/40 shadow-2xl p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveItem(null)}
              className="absolute top-6 left-6 z-10 w-10 h-10 rounded-full bg-[#0D0F0E]/80 border border-[#2B322E] text-[#F7F4EE] flex items-center justify-center hover:bg-[#C8A96B] hover:text-[#0D0F0E] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden bg-[#0D0F0E]">
              <img
                src={activeItem.src}
                alt={activeItem.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-4 text-center">
              <span className="text-xs text-[#C8A96B] font-semibold">{activeItem.category}</span>
              <h3 className="text-xl font-heading font-bold text-[#F7F4EE] mt-1">{activeItem.title}</h3>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
