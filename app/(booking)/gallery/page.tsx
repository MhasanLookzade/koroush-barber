"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/booking/Header"
import { Footer } from "@/components/booking/Footer"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Scissors,
  Crown,
  Star,
  Sparkles,
  Camera,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  Grid,
  Instagram,
  CheckCircle2,
} from "lucide-react"
import { toPersianDigits } from "@/lib/jalali"

interface GalleryItem {
  id: number
  src: string
  alt: string
  category: "haircuts" | "beards" | "interior" | "before-after"
  title: string
  description: string
}

const galleryCategories = [
  { id: "all", label: "همه تصاویر", icon: Grid },
  { id: "haircuts", label: "پیرایش و استایل مو", icon: Scissors },
  { id: "beards", label: "طراحی ریش و سبیل", icon: Sparkles },
  { id: "interior", label: "فضای اختصاصی سالن", icon: Crown },
  { id: "before-after", label: "قبل و بعد", icon: Star },
]

const galleryImages: GalleryItem[] = [
  // Haircuts
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1000&h=800&fit=crop",
    alt: "پیرایش کلاسیک مردانه",
    category: "haircuts",
    title: "پیرایش کلاسیک جنتلمن",
    description: "فرم‌دهی دقیق متناسب با استخوان‌بندی چهره به همراه سشوار کشی فرمال.",
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1000&h=800&fit=crop",
    alt: "فید و سایه حرفه‌ای",
    category: "haircuts",
    title: "فید و سایه‌زنی میلی‌متری (Skin Fade)",
    description: "فید مدرن و بدون مرز با تیغ و ماشین وال ۵ ستاره آمریکایی.",
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1000&h=800&fit=crop",
    alt: "استایل مدرن تکسچر",
    category: "haircuts",
    title: "استایل بافت‌دار و مدرن",
    description: "تکسچرسازی ساقه مو با قیچی پوینت و پودر حجم‌دهنده مات.",
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1601043288522-2b7bde5d4c7c?w=1000&h=800&fit=crop",
    alt: "پکیج اختصاصی داماد",
    category: "haircuts",
    title: "پکیج کامل پیرایش داماد VIP",
    description: "پاکسازی پوست، طراحی فرم مو و گریم متعادل‌سازی نچرال عکاسی.",
  },

  // Beards
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1000&h=800&fit=crop",
    alt: "طراحی سبیل کلاسیک",
    category: "beards",
    title: "فرم‌دهی سبیل کلاسیک با تیغ تیز",
    description: "خط‌اندازی متقارن با تیغ ژاپنی دست‌ساز و وکس نرم‌کننده.",
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1000&h=800&fit=crop",
    alt: "طراحی و آنکارد ریش کامل",
    category: "beards",
    title: "آنکارد و زاویه‌سازی ریش",
    description: "خط گونه و خط گردن تمیز با بخور حوله گرم اکالیپتوس و ادکلن دست‌ساز.",
  },
  {
    id: 7,
    src: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1000&h=800&fit=crop",
    alt: "فید ریش طبیعی",
    category: "beards",
    title: "فید اتصال ریش به خط ریش",
    description: "گرادیان طبیعی سایه ریش متصل به موهای گیجگاه بدون خط تیز زننده.",
  },
  {
    id: 8,
    src: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1000&h=800&fit=crop",
    alt: "مراقبت و تغذیه ریش",
    category: "beards",
    title: "روغن‌تراپی و تقویت ریش",
    description: "استفاده از سرم آرگان مراکشی و جوجوبا برای درخشندگی طبیعی و رفع خشکی.",
  },

  // Interior
  {
    id: 9,
    src: "https://images.unsplash.com/photo-1519070843027-46d28d8b65b7?w=1000&h=800&fit=crop",
    alt: "اتمسفر سالن اختصاصی",
    category: "interior",
    title: "فضای دلباز و مدرن سالن کوروش",
    description: "نورپردازی استاندارد ۵۵۰۰ کلوین، سیستم تهویه هوای تازه و موسیقی ملایم جاز.",
  },
  {
    id: 10,
    src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1000&h=800&fit=crop",
    alt: "صندلی‌های چرمی لوکس",
    category: "interior",
    title: "صندلی‌های ارگونومیک چرم دست‌دوز",
    description: "نهایت راحتی حین پیرایش‌های طولانی و سرویس‌های تخصصی پوست.",
  },
  {
    id: 11,
    src: "https://images.unsplash.com/photo-1601043288522-2b7bde5d4c7c?w=1000&h=800&fit=crop",
    alt: "لاونج انتظار اختصاصی",
    category: "interior",
    title: "لاونج انتظار و بار اسپرسو",
    description: "پذیرایی رایگان از مشتریان با اسپرسوی تازه برشته شده و دمنوش‌های ارگانیک.",
  },
  {
    id: 12,
    src: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1000&h=800&fit=crop",
    alt: "استیشن پیرایش تمیز و استریل",
    category: "interior",
    title: "استیشن‌های مجهز به استریل UV",
    description: "ضدعفونی کلیه شانه و قیچی‌ها جلوی چشمان مشتری قبل از هر سرویس.",
  },

  // Before/After
  {
    id: 13,
    src: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1000&h=800&fit=crop",
    alt: "تغییر کامل چهره و استایل",
    category: "before-after",
    title: "تغییر کامل استایل مو بر پایه فرم صورت",
    description: "اصلاح فرم نامتقارن مو به یک استایل ترند، پرپشت و چشم‌نواز.",
  },
  {
    id: 14,
    src: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1000&h=800&fit=crop",
    alt: "طراحی کامل ریش و آنکارد",
    category: "before-after",
    title: "تحول فرم ریش و پوشش فضاهای خالی",
    description: "آنکارد هندسی فک و چانه که خطوط صورت را کشیده‌تر و جذاب‌تر نشان می‌دهد.",
  },
  {
    id: 15,
    src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1000&h=800&fit=crop",
    alt: "پوشش موهای سفید نچرال",
    category: "before-after",
    title: "رنگ و کلاژن‌تراپی نچرال موهای خاکستری",
    description: "پوشش طبیعی بدون رفله قرمز یا ظاهر رنگ‌شده غیرطبیعی.",
  },
  {
    id: 16,
    src: "https://images.unsplash.com/photo-1601043288522-2b7bde5d4c7c?w=1000&h=800&fit=crop",
    alt: "نتیجه پکیج کامل VIP داماد",
    category: "before-after",
    title: "نتیجه پکیج طلایی آماده‌سازی مراسم",
    description: "آماده‌سازی پوست و مو برای ماندگاری فرم عالی تا پایان جشن.",
  },
]

export default function GalleryPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const filteredImages = selectedCategory === "all"
    ? galleryImages
    : galleryImages.filter((img) => img.category === selectedCategory)

  const activeItem = activeLightboxIndex !== null ? filteredImages[activeLightboxIndex] : null

  // Body scroll lock
  useEffect(() => {
    if (activeItem) {
      const original = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = original
      }
    }
  }, [activeItem])

  const handleNext = useCallback(() => {
    if (activeLightboxIndex === null) return
    setActiveLightboxIndex((activeLightboxIndex + 1) % filteredImages.length)
  }, [activeLightboxIndex, filteredImages.length])

  const handlePrev = useCallback(() => {
    if (activeLightboxIndex === null) return
    setActiveLightboxIndex((activeLightboxIndex - 1 + filteredImages.length) % filteredImages.length)
  }, [activeLightboxIndex, filteredImages.length])

  const handleClose = useCallback(() => {
    setActiveLightboxIndex(null)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (activeLightboxIndex === null) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
      if (e.key === "ArrowLeft") handleNext()
      if (e.key === "ArrowRight") handlePrev()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeLightboxIndex, handleClose, handleNext, handlePrev])

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
        handleNext()
      } else {
        handlePrev()
      }
    }
    setTouchStartX(null)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0F0E] text-[#F7F4EE]" dir="rtl">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 lg:py-24 border-b border-[#242A27]">
          <div className="absolute inset-0 bg-gradient-to-b from-[#161917] via-[#0D0F0E] to-[#0D0F0E]" aria-hidden="true" />
          
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#1A1F1C] border border-[#C8A96B]/30 px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#E4C88E] mb-6">
              <Camera className="h-4 w-4 text-[#C8A96B]" aria-hidden="true" />
              <span>گالری اختصاصی آثار و محیط سالن</span>
            </div>
            <h1 className="mb-4 text-3xl sm:text-5xl lg:text-6xl font-heading font-black tracking-tight text-[#F7F4EE]">
              هنر و دقت در <span className="text-[#C8A96B]">پیرایش کوروش</span>
            </h1>
            <p className="mx-auto max-w-2xl text-sm sm:text-base text-[#A8A39A] leading-relaxed">
              نمونه‌های واقعی از مهارت استادکاران، طراحی اختصاصی ریش، فضای سالن VIP و نتایج پیش از نوبت و پس از پایان سرویس.
            </p>
          </div>
        </section>

        {/* Filter Navigation */}
        <section className="sticky top-16 z-30 py-4 bg-[#141715]/90 backdrop-blur-md border-b border-[#242A27]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap gap-2 justify-center" role="tablist" aria-label="دسته‌بندی گالری">
              {galleryCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id)
                    setActiveLightboxIndex(null)
                  }}
                  role="tab"
                  aria-selected={selectedCategory === cat.id}
                  className={`inline-flex items-center gap-2 rounded-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-[#C8A96B] text-[#0D0F0E] shadow-lg shadow-[#C8A96B]/20 font-bold"
                      : "bg-[#1C221F] text-[#A8A39A] hover:bg-[#252C28] hover:text-[#F7F4EE] border border-[#2D332F]"
                  }`}
                >
                  <cat.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{cat.label}</span>
                  {cat.id !== "all" && (
                    <span className="text-[10px] opacity-80 mr-1 bg-black/20 px-1.5 py-0.2 rounded-full">
                      {toPersianDigits(galleryImages.filter((i) => i.category === cat.id).length)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Responsive Grid */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6" role="list">
              {filteredImages.map((image, index) => (
                <article
                  key={image.id}
                  onClick={() => setActiveLightboxIndex(index)}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-[#141715] border border-[#242A27] hover:border-[#C8A96B]/60 transition-all duration-300 shadow-md cursor-pointer select-none"
                  role="listitem"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setActiveLightboxIndex(index)
                    }
                  }}
                  aria-label={`مشاهده ${image.title}`}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D0F0E] via-[#0D0F0E]/40 to-transparent opacity-75 group-hover:opacity-90 transition-opacity" />

                  <div className="absolute inset-x-0 bottom-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <div className="flex items-end justify-between">
                      <div className="pr-1">
                        <span className="text-[10px] font-semibold text-[#C8A96B] bg-[#1C221F] border border-[#C8A96B]/30 px-2 py-0.5 rounded-md inline-block mb-1.5">
                          {galleryCategories.find((c) => c.id === image.category)?.label}
                        </span>
                        <h3 className="font-heading font-bold text-sm text-[#F7F4EE] leading-snug">
                          {image.title}
                        </h3>
                      </div>
                      <div
                        className="w-9 h-9 rounded-xl bg-[#C8A96B]/20 text-[#E4C88E] flex items-center justify-center opacity-85 group-hover:opacity-100 transition-opacity shrink-0"
                        aria-hidden="true"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-14 text-center">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#181D1A] border border-[#2D332F] text-sm font-semibold text-[#E4C88E] hover:border-[#C8A96B] hover:text-[#F7F4EE] transition-colors"
              >
                <Instagram className="h-4 w-4 text-[#C8A96B]" />
                <span>مشاهده آخرین ویدیوها و هایلایت‌ها در اینستاگرام کوروش</span>
                <ChevronLeft className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="py-14 bg-[#141715] border-y border-[#242A27]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Camera,
                  title: "تصاویر کاملاً واقعی و طبیعی",
                  desc: "تمام عکس‌ها نمونه کارهای واقعی ثبت‌شده در سالن کوروش هستند و از هیچ مدل ژورنالی غیرواقعی استفاده نشده است.",
                },
                {
                  icon: Star,
                  title: "مقایسه قبل و بعد",
                  desc: "می‌توانید پیش از رزرو نوبت، تغییرات حاصل از هر تکنیک پیرایش و خط‌اندازی ریش را مقایسه کنید.",
                },
                {
                  icon: Crown,
                  title: "سوئیت و جایگاه VIP",
                  desc: "محیطی ایزوله با صندلی‌های چرم ارگونومیک، نور استاندارد عکاسی و پذیرایی نوشیدنی تازه برشته.",
                },
              ].map((item, index) => (
                <Card key={index} className="bg-[#1A1F1C] border-[#2A312D] text-center p-6 rounded-2xl shadow-md">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C8A96B]/10 text-[#C8A96B] border border-[#C8A96B]/20">
                    <item.icon className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-base sm:text-lg text-[#F7F4EE]">{item.title}</CardTitle>
                  <p className="text-xs sm:text-sm text-[#A8A39A] mt-2 leading-relaxed">{item.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Accessible Full-Screen Lightbox Modal (object-contain, uncropped) */}
      {activeItem && activeLightboxIndex !== null && (
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
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-3 px-1 border-b border-[#252C28]/60 mb-3">
              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm font-semibold text-[#C8A96B] bg-[#1C221F] px-3 py-1 rounded-full border border-[#C8A96B]/30">
                  تصویر {toPersianDigits(activeLightboxIndex + 1)} از {toPersianDigits(filteredImages.length)}
                </span>
                <span className="text-xs text-[#A8A39A] hidden sm:inline">
                  {galleryCategories.find((c) => c.id === activeItem.category)?.label}
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

            {/* Main Image Frame - object-contain prevents cropping */}
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

      <Footer />
    </div>
  )
}
