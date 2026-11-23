import { Metadata } from "next"
import { Header } from "@/components/booking/Header"
import { Footer } from "@/components/booking/Footer"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Scissors, Star, MapPin, Clock, Crown, ArrowLeft, ChevronRight, CheckCircle, Award, Sparkles } from "lucide-react"

export const metadata: Metadata = {
  title: "تیم آرایشگرها | کوروش باربر",
  description: "آشنایی با تیم آرایشگرهای حرفه‌ای کوروش باربر - تخصص، تجربه و هنرمندی",
}

const barbers = [
  {
    id: "1",
    name: "استاد علیرضا محمدی",
    title: "موسس و آرایشگر ارشد",
    bio: "با بیش از ۲۰ سال تجربه در باربری کلاسیک و مدرن، استاد علیرضا موسس کوروش باربر است. تخصص او در قص موهای پیشرفته، فید‌های پیچیده و طراحی ریش منحصر به فرد است.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    specialties: ["قص مو کلاسیک", "فید و سایه", "طراحی ریش", "مشاوره استایل"],
    rating: 4.9,
    reviewCount: 234,
    services: ["قص مو کلاسیک", "قص مو مدرن", "فید و سایه", "ترتیب ریش", "سبیل کلاسیک"],
    schedule: "شنبه تا چهارشنبه: ۹ صبح تا ۹ شب",
  },
  {
    id: "2",
    name: "محمد رضا کریمی",
    title: "آرایشگر ارشد - متخصص ریش",
    bio: "متخصص ریش و سبیل با ۱۵ سال تجربه. محمد رضا در فنون سنتی سبیل با تیغه و مراقبت پیشرفته از ریش، استادیت دارد.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    specialties: ["سبیل کلاسیک", "طراحی ریش", "مراقبت ریش", "فید ریش"],
    rating: 4.8,
    reviewCount: 189,
    services: ["سبیل کلاسیک", "ترتیب ریش", "فید ریش", "مراقبت کامل ریش"],
    schedule: "یکشنبه تا جمعه: ۱۰ صبح تا ۸ شب",
  },
  {
    id: "3",
    name: "سینا احمدی",
    title: "آرایشگر - متخصص مو و استایل",
    bio: "سینا متخصص استایل‌های مدرن مو، رنگ‌آمیزی حرفه‌ای و ترم‌های ترمیمی است. با ۱۰ سال تجربه در سالن‌های بین‌المللی.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face",
    specialties: ["قص مو مدرن", "رنگ مو", "ترم مو", "استایل مناسبت"],
    rating: 4.7,
    reviewCount: 156,
    services: ["قص مو مدرن", "فید و سایه", "استایل و ترتیبات", "ترم و مراقبت مو"],
    schedule: "دوشنبه تا شنبه: ۹ صبح تا ۹ شب",
  },
  {
    id: "4",
    name: "احسان محمدی",
    title: "آرایشگر - متخصص پوست و مراقبت",
    bio: "احسان با تخصص در مراقبت از پوست مردانه، خدمات اصلاح صورت، ماسک‌های تخصصی و ضد'Alاقه را ارائه می‌دهد.",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face",
    specialties: ["اصلاح صورت", "ماسک چهره", "ضد'Alاقه", "ماساژ صورت"],
    rating: 4.8,
    reviewCount: 142,
    services: ["اصلاح صورت", "ماسک چهره", "ضد'Alاقه"],
    schedule: "شنبه تا چهارشنبه: ۹ صبح تا ۹ شب",
  },
  {
    id: "5",
    name: "امیرحسین رضایی",
    title: "آرایشگر جوان - استایل‌های جدید",
    bio: "امیرحسین با یادگیری آخرین ترندهای جهانی باربری، استایل‌های نوین و خلاقانه را برای جيل جوان ارائه می‌دهد.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    specialties: ["قص مو مدرن", "فید و سایه", "طراحی ریش مدرن"],
    rating: 4.6,
    reviewCount: 98,
    services: ["قص مو مدرن", "فید و سایه", "ترتیب ریش", "فید ریش"],
    schedule: "یکشنبه تا پنج‌شنبه: ۱۰ صبح تا ۸ شب",
  },
  {
    id: "6",
    name: "رضا کریمی",
    title: "آرایشگر - متخصص پکیج‌های VIP",
    bio: "رضا تخصص دارد در اجرای پکیج‌های کامل عریسان و VIP با دقت بالا و زمان‌بندی کامل.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    specialties: ["پکیج VIP", "پکیج عریسان", "پکیج دوستانه", "مشاوره کامل"],
    rating: 4.9,
    reviewCount: 167,
    services: ["پکیج VIP", "پکیج عریسان", "پکیج دوستانه"],
    schedule: "شنبه تا جمعه: ۹ صبح تا ۹ شب",
  },
]

export default function BarbersPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden py-16 lg:py-24">
          <div className="absolute inset-0 hero-pattern opacity-20" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" aria-hidden="true" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6 animate-fade-in">
              <Crown className="h-4 w-4" aria-hidden="true" />
              <span>تیم حرفه‌ای آرایشگرها</span>
            </div>
            <h1 className="mb-4 text-display-lg font-heading font-bold tracking-tight text-foreground animate-slide-up">
              تیم <span className="gradient-gold">ما</span>
            </h1>
            <p className="mx-auto max-w-2xl text-body-lg text-muted-foreground animate-slide-up stagger-1">
              آرایشگرهای برتر با تخصص، تجربه و عشق به هنر باربری - هر کدام мастер در زمینه خود
            </p>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {barbers.map((barber, index) => (
                <article key={barber.id} className="group animate-slide-up" style={{ animationDelay: `${index * 0.08}s` }}>
                  <Card className="card-luxury-hover h-full overflow-hidden">
                    <div className="relative aspect-square overflow-hidden">
                      <Avatar className="h-full w-full">
                        <AvatarImage src={barber.avatar} alt={barber.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <AvatarFallback className="text-3xl font-heading font-bold bg-primary/10 text-primary">
                          {barber.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="h-4 w-4 text-primary" aria-hidden="true" />
                        <Badge variant="secondary" className="text-xs">{barber.title}</Badge>
                      </div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">{barber.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{barber.bio}</p>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-0">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                        <span className="font-semibold text-foreground">{barber.rating}</span>
                        <span>({barber.reviewCount} نظر)</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {barber.specialties.slice(0, 3).map((specialty) => (
                          <Badge key={specialty} variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                            {specialty}
                          </Badge>
                        ))}
                        {barber.specialties.length > 3 && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            +{barber.specialties.length - 3} بیشتر
                          </Badge>
                        )}
                      </div>

                      <div className="border-t border-border/50 pt-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" aria-hidden="true" />
                          <span className="truncate">{barber.schedule}</span>
                        </div>
                      </div>

                      <Link href="/book" className="block">
                        <Button className="w-full justify-between" variant="outline" size="sm">
                          <span>رزرو با {barber.name.split(' ')[0]}</span>
                          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-display-sm font-heading font-bold tracking-tight">
                چرا آرایشگرهای کوروش باربر؟
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { icon: Award, title: "مجرب و مجاز", desc: "گواهینامه‌های بین‌المللی و بیش از ۱۰ سال تجربه" },
                { icon: Sparkles, title: "هنر و خلاقیت", desc: "استایل‌های منحصر به فرد و شخصی‌سازی شده" },
                { icon: CheckCircle, title: "دقت و کیفیت", desc: "توجه به جزئیات و استفاده از بهترین ابزارها" },
                { icon: Crown, title: "رضایت مشتری", desc: "امتیاز ۴.۸ از ۵ با صدها نظر مثبت" },
              ].map((benefit, index) => (
                <Card key={index} className="card-luxury-hover text-center p-6">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <benefit.icon className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">{benefit.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="mb-4 text-display-sm font-heading font-bold tracking-tight">
              آرایشگر خود را انتخاب کنید
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground mb-8">
              هر کدام از آرایشگرهای ما در زمینه خاص خود متخصص‌اند. برای بهترین نتیجه، آرایشگری را انتخاب کنید که تخصصش با نیاز شما هم‌خوانی دارد.
            </p>
            <Link href="/book">
              <Button size="lg" className="btn-luxury gap-2 text-lg px-10 py-4">
                <Scissors className="h-5 w-5" />
                رزرو نوبت با آرایشگر
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}