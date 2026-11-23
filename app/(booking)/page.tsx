import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Scissors, CheckCircle, Clock, Star, Users, Shield, ArrowLeft, Sparkles } from "lucide-react"

const iconMap = {
  Scissors,
  Clock,
  Star,
  Sparkles,
  Users,
  Shield,
  CheckCircle,
  ArrowLeft,
} as const

type IconName = keyof typeof iconMap

export default function HomePage() {
  const features = [
    { icon: "Clock", title: "رزرو آنلاین ۲۴/۷", desc: "بدون تماس تلفنی، هر زمان از هر مکان نوبت بگیرید" },
    { icon: "Users", title: "آرایشگرهای تخصصی", desc: "تیم مجرب و حرفه‌ای با سابقه طولانی" },
    { icon: "Shield", title: "پرداخت امن در محل", desc: "بدون نیاز به پرداخت آنلاین، در محل تسویه کنید" },
    { icon: "Sparkles", title: "یادآوری هوشمند", desc: "پیامک و اعلان قبل از نوبت برای فراموش نکردن" },
  ]

  const services = [
    { name: "قص مو کلاسیک", category: "مو", price: 250000, duration: 30, icon: "Scissors" as IconName },
    { name: "سبیل کلاسیک", category: "ریش", price: 150000, duration: 20, icon: "Scissors" as IconName },
    { name: "اصلاح صورت", category: "پوست", price: 200000, duration: 40, icon: "Star" as IconName },
    { name: "پکیج عروس", category: "پکیج", price: 1500000, duration: 180, icon: "Sparkles" as IconName },
  ]

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-20 lg:py-32" id="home">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Sparkles className="h-4 w-4" />
              <span>سیستم رزرو نوبت هوشمند آرایشگاه</span>
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              رزرو نوبت آرایشگاه، <br />
              <span className="text-primary">راحت‌تر از همیشه</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
              بدون تماس تلفنی و انتظار، نوبت خود را در ثانیه‌ها رزرو کنید.
              آرایشگر مورد نظر، زمان دلخواه و خدمت مورد نیاز را انتخاب نمایید.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/book">
                <Button size="lg" className="w-full sm:w-auto gap-2 text-lg px-8 py-3">
                  <Scissors className="h-5 w-5" />
                  رزرو نوبت حالا
                </Button>
              </Link>
              <Link href="#services">
                <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 text-lg px-8 py-3">
                  <ArrowLeft className="h-5 w-5" />
                  مشاهده خدمات
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center p-6 rounded-xl bg-background border">
              <div className="text-3xl font-bold text-primary">۵۰۰+</div>
              <div className="text-sm text-muted-foreground">مشتری راضی</div>
            </div>
            <div className="text-center p-6 rounded-xl bg-background border">
              <div className="text-3xl font-bold text-primary">۱۵+</div>
              <div className="text-sm text-muted-foreground">آرایشگر حرفه‌ای</div>
            </div>
            <div className="text-center p-6 rounded-xl bg-background border">
              <div className="text-3xl font-bold text-primary">۲۰+</div>
              <div className="text-sm text-muted-foreground">خدمت متنوع</div>
            </div>
            <div className="text-center p-6 rounded-xl bg-background border">
              <div className="text-3xl font-bold text-primary">۴.۹</div>
              <div className="text-sm text-muted-foreground">امتیاز مشتریان</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28" id="services">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              خدمات محبوب ما
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              از بین خدمات متنوع ما انتخاب کنید، همه با کیفیت بالا و قیمت مناسب
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => {
              const ServiceIcon = iconMap[service.icon]
              return (
                <Card key={index} className="group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <span className="text-2xl"><ServiceIcon className="h-8 w-8 text-primary" /></span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Badge variant="secondary">{service.category}</Badge>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{service.duration} دقیقه</span>
                    </div>
                    <div className="font-semibold text-primary">
                      {service.price.toLocaleString('fa-IR')} تومان
                    </div>
                  </div>
                  <Link href="/book">
                    <Button className="w-full" variant="outline" size="sm">
                      رزرو این خدمت
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              )
            })}
          </div>

          <div className="mt-10 text-center">
            <Link href="/book">
              <Button variant="outline" size="lg" className="gap-2">
                مشاهده تمام خدمات
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-muted/30" id="features">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              چرا BarberBook؟
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              ویژگی‌های منحصر به فرد که تجربه رزرو نوبت را برای شما آسان می‌کنند
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const FeatureIcon = iconMap[feature.icon as IconName]
              return (
                <Card key={index} className="text-center p-6">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FeatureIcon className="h-7 w-7" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">{feature.desc}</p>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28" id="about">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">
                درباره آرایشگاه باربر‌بوک
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  آرایشگاه باربر‌بوک با بیش از ۱۰ سال تجربه در صنعت آرایشگری و باربری،
                  Platz am besten Ort für moderne und klassische Frisuren.
                </p>
                <p>
                  تیم ما شامل آرایشگرهای مجرب و باگواهینامه بین‌المللی است که
                  با استفاده از بهترین مواد و تجهیزات، 서비ات باکیفیت ارائه می‌دهند.
                </p>
                <p>
                  ما معتقدیم که هر مشتری منحصر به فرد است و تستحق خدمات
                  شخصی‌سازی شده و با کیفیت بالا دارد.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button variant="outline" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  مشاهده تیم ما
                </Button>
                <Link href="/book">
                  <Button className="gap-2">
                    <Scissors className="h-4 w-4" />
                    رزرو نوبت
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border p-1">
                <div className="aspect-[4/3] rounded-xl bg-background/50 flex items-center justify-center">
                  <div className="text-center p-8">
                    <Scissors className="mx-auto h-16 w-16 text-primary/30 mb-4" />
                    <p className="text-muted-foreground">تصویر آرایشگاه</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-primary text-primary-foreground" id="contact">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            امروز نوبت خود را رزرو کنید
          </h2>
          <p className="mb-8 mx-auto max-w-2xl text-primary-foreground/80">
            همکاری با بهترین آرایشگرها، خدمات متنوع و رزرو آسان - همه در یکجا
          </p>
          <Link href="/book">
            <Button size="lg" variant="secondary" className="gap-2 text-lg px-8 py-3">
              <Scissors className="h-5 w-5" />
              رزرو نوبت رایگان
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}