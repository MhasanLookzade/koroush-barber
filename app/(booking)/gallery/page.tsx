import { Metadata } from "next"
import { Header } from "@/components/booking/Header"
import { Footer } from "@/components/booking/Footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Scissors, Crown, Star, Sparkles, Camera, ChevronLeft, ChevronRight, X, Maximize2, Grid, Search } from "lucide-react"

export const metadata: Metadata = {
  title: "گالری | کوروش باربر",
  description: "گالری تصاویر آرایشگاه کوروش باربر - استایل‌های مو، طراحی ریش، محیط آرایشگاه و قبل/بعد",
}

const galleryCategories = [
  { id: "all", label: "همه", icon: Grid },
  { id: "haircuts", label: "قص مو", icon: Scissors },
  { id: "beards", label: "سبیل و ریش", icon: Sparkles },
  { id: "interior", label: "محیط آرایشگاه", icon: Crown },
  { id: "before-after", label: "قبل و بعد", icon: Star },
]

const galleryImages = [
  // Haircuts
  { id: 1, src: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=800&fit=crop", alt: "قص مو کلاسیک", category: "haircuts", title: "قص مو کلاسیک" },
  { id: 2, src: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&h=800&fit=crop", alt: "فید و سایه", category: "haircuts", title: "فید و سایه حرفه‌ای" },
  { id: 3, src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=800&fit=crop", alt: "استایل مو", category: "haircuts", title: "استایل مدرن" },
  { id: 4, src: "https://images.unsplash.com/photo-1601043288522-2b7bde5d4c7c?w=800&h=800&fit=crop", alt: "قص مو عریسان", category: "haircuts", title: "پکیج عریسان" },

  // Beards
  { id: 5, src: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&h=800&fit=crop", alt: "سبیل کلاسیک", category: "beards", title: "سبیل کلاسیک با تیغه" },
  { id: 6, src: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&h=800&fit=crop", alt: "طراحی ریش", category: "beards", title: "طراحی ریش کامل" },
  { id: 7, src: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=800&fit=crop", alt: "فید ریش", category: "beards", title: "فید ریش طبیعی" },
  { id: 8, src: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&h=800&fit=crop", alt: "مراقبت ریش", category: "beards", title: "مراقبت و روغن‌گذاری" },

  // Interior
  { id: 9, src: "https://images.unsplash.com/photo-1519070843027-46d28d8b65b7?w=800&h=800&fit=crop", alt: "محیط آرایشگاه", category: "interior", title: "محیط لوکس آرایشگاه" },
  { id: 10, src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=800&fit=crop", alt: "صندلی‌های آرایشگاه", category: "interior", title: "صندلی‌های kral" },
  { id: 11, src: "https://images.unsplash.com/photo-1601043288522-2b7bde5d4c7c?w=800&h=800&fit=crop", alt: "منطقه انتظار", category: "interior", title: "لابی و منطقه انتظار" },
  { id: 12, src: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=800&fit=crop", alt: "استیشن کار", category: "interior", title: "استیشن‌های کاری مدرن" },

  // Before/After
  { id: 13, src: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=800&fit=crop", alt: "قبل و بعد قص مو", category: "before-after", title: "تبدیل استایل مو" },
  { id: 14, src: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&h=800&fit=crop", alt: "قبل و بعد ریش", category: "before-after", title: "طراحی کامل ریش" },
  { id: 15, src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=800&fit=crop", alt: "قبل و بعد استایل", category: "before-after", title: "تغییر استایل مو" },
  { id: 16, src: "https://images.unsplash.com/photo-1601043288522-2b7bde5d4c7c?w=800&h=800&fit=crop", alt: "قبل و بعد پکیج", category: "before-after", title: "نتیجه پکیج کامل" },
]

export default function GalleryPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden py-16 lg:py-24">
          <div className="absolute inset-0 hero-pattern opacity-20" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" aria-hidden="true" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6 animate-fade-in">
              <Camera className="h-4 w-4" aria-hidden="true" />
              <span>گالری تصاویر</span>
            </div>
            <h1 className="mb-4 text-display-lg font-heading font-bold tracking-tight text-foreground animate-slide-up">
              گالری <span className="gradient-gold">تصاویر</span>
            </h1>
            <p className="mx-auto max-w-2xl text-body-lg text-muted-foreground animate-slide-up stagger-1">
              نگاهی به کارهای ما، محیط آرایشگاه و نتایج قبل/بعد از خدمات
            </p>
          </div>
        </section>

        <section className="py-8 bg-muted/30 border-y border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap gap-2 justify-center" role="tablist" aria-label="دسته‌بندی گالری">
              {galleryCategories.map((cat) => (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={cat.id === "all"}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                    cat.id === "all"
                      ? "bg-primary text-primary-foreground shadow-luxury"
                      : "bg-background text-muted-foreground hover:bg-accent/50 hover:text-foreground border border-border/50"
                  }`}
                >
                  <cat.icon className="h-4 w-4" aria-hidden="true" />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="list" aria-label="تصاویر گالری">
              {galleryImages.map((image, index) => (
                <article
                  key={image.id}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-card border border-border/50 animate-slide-up"
                  style={{ animationDelay: `${index * 0.04}s` }}
                  role="listitem"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="secondary" className="text-xs mb-1">{galleryCategories.find(c => c.id === image.category)?.label}</Badge>
                        <h3 className="font-medium text-foreground">{image.title}</h3>
                      </div>
                      <button
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/90 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`باز کردن ${image.title} در حجم کامل`}
                      >
                        <Maximize2 className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button variant="outline" className="btn-luxury-outline gap-2">
                <Camera className="h-4 w-4" />
                مشاهده گالری کامل در اینستاگرام
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-display-sm font-heading font-bold tracking-tight">
                تجربه تصویری کوروش باربر
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: Camera, title: "عکس‌های واقعی", desc: "تمام عکس‌ها از کارهای واقعی آرایشگرهای ما در آرایشگاه گرفته شده‌اند" },
                { icon: Star, title: "قبل و بعد", desc: "مقایسه نتایج قبل و بعد از خدمات برای انتخاب بهتر" },
                { icon: Crown, title: "محیط لوکس", desc: "فضای طراحی شده با دقت برای تجربه ریلکس و لذت‌بخش" },
              ].map((item, index) => (
                <Card key={index} className="card-luxury-hover text-center p-6">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">{item.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="mb-4 text-display-sm font-heading font-bold tracking-tight">
              نتیجه خود را به اشتراک بگذارید
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground mb-8">
              از تجربه خود در کوروش باربر عکس بگیرید و با هشتگ #KouroshBarber به اشتراک بگذارید.
              بهترین عکس‌ها در گالری ما نمایش داده می‌شوند.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button className="btn-luxury gap-2">
                <Camera className="h-5 w-5" />
                اشتراک‌گذاری عکس
              </Button>
              <Button variant="outline" className="btn-luxury-outline gap-2">
                <Sparkles className="h-5 w-5" />
                xem عکس‌های دیگران
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}