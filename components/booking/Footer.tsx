import Link from "next/link"
import { Scissors, MapPin, Phone, Mail, Clock, Instagram, Twitter, Facebook, Crown, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface FooterProps {
  id?: string
}

export function Footer({ id }: FooterProps) {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    services: [
      { href: "/services", label: "تمام خدمات" },
      { href: "/services?category=hair", label: "قص و استایل مو" },
      { href: "/services?category=beard", label: "سبیل و ریش" },
      { href: "/services?category=skin", label: "پوست و مراقبت" },
      { href: "/services?category=packages", label: "پکیج‌های ویژه" },
    ],
    support: [
      { href: "/about", label: "درباره کوروش باربر" },
      { href: "/contact", label: "تماس با ما" },
      { href: "/faq", label: "سوالات متداول" },
      { href: "/terms", label: "قوانین و مقررات" },
      { href: "/privacy", label: "حریم خصوصی" },
    ],
    company: [
      { href: "/barbers", label: "تیم آرایشگرها" },
      { href: "/gallery", label: "گالری تصاویر" },
      { href: "/reviews", label: "نظرات مشتریان" },
      { href: "/careers", label: "همکاری با ما" },
      { href: "/press", label: "رسانه و اخبار" },
    ],
  }

  const socialLinks = [
    { href: "https://instagram.com/kouroshbarber", icon: Instagram, label: "اینستاگرام" },
    { href: "https://t.me/kouroshbarber", icon: Twitter, label: "تلگرام" },
    { href: "https://facebook.com/kouroshbarber", icon: Facebook, label: "فیسبوک" },
  ]

  return (
    <footer id={id} className="border-t border-border/50 bg-background" dir="rtl" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-6">
            <Link href="/" className="flex items-center gap-3" aria-label="کوروش باربر - خانه">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--color-gold-bright))]">
                <Scissors className="h-7 w-7 text-primary-foreground" aria-hidden="true" />
                <span className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-primary/50 to-[hsl(var(--color-gold-bright)_/_0.5)] blur-lg opacity-50 animate-pulse-gold" aria-hidden="true" />
              </div>
              <div className="text-left">
                <span className="block text-heading-lg font-heading font-bold text-foreground tracking-tight">
                  کوروش باربر
                </span>
                <span className="block text-caption font-medium text-primary tracking-widest uppercase">
                  Kourosh Barber
                </span>
              </div>
            </Link>

            <p className="text-body-md text-muted-foreground leading-relaxed max-w-xs">
              آرایشگاه مردانه لوکس با بیش از ۱۵ سال تجربه، ارائه خدمات تخصصی قص مو، سبیل، و مراقبت از پوست با تیمی از آرایشگرهای برتر.
            </p>

            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl border border-border/50",
                    "bg-muted/50 text-muted-foreground",
                    "transition-all duration-300",
                    "hover:bg-primary/10 hover:text-primary hover:border-primary/30",
                    "hover:shadow-[0_0_0_1px_hsl(var(--primary)_/_0.3)]"
                  )}
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" aria-hidden="true" />
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2 text-caption text-muted-foreground/70 border-t border-border/50 pt-4">
              <Crown className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>برند ثبت شده کوروش باربر - تمام حقوق محفوظ است</span>
            </div>
          </div>

          {/* Services Column */}
          <div className="space-y-4">
            <h3 className="text-heading-sm font-heading font-semibold text-foreground">خدمات ما</h3>
            <nav className="flex flex-col gap-2" aria-label="خدمات">
              {footerLinks.services.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-body-sm text-muted-foreground transition-colors hover:text-primary hover:translate-x-1"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Support Column */}
          <div className="space-y-4">
            <h3 className="text-heading-sm font-heading font-semibold text-foreground">پشتیبانی</h3>
            <nav className="flex flex-col gap-2" aria-label="پشتیبانی">
              {footerLinks.support.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-body-sm text-muted-foreground transition-colors hover:text-primary hover:translate-x-1"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Company/Contact Column */}
          <div className="space-y-4">
            <h3 className="text-heading-sm font-heading font-semibold text-foreground">تماس با ما</h3>
            <address className="not-italic space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-body-sm text-muted-foreground leading-relaxed">
                  تهران، خیابان ولیعصر، کوچه ۱۲، پلاک ۴۵
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                <a href="tel:+982188888888" className="text-body-sm text-muted-foreground hover:text-primary transition-colors dir-ltr">
                  ۰۲۱-۸۸۸۸-۸۸۸۸
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                <a href="mailto:info@kouroshbarber.ir" className="text-body-sm text-muted-foreground hover:text-primary transition-colors dir-ltr">
                  info@kouroshbarber.ir
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                <div className="flex flex-col gap-1">
                  <span className="text-body-sm text-muted-foreground">شنبه تا چهارشنبه: ۹ صبح تا ۹ شب</span>
                  <span className="text-body-sm text-muted-foreground">پنج‌شنبه و جمعه: ۱۰ صبح تا ۸ شب</span>
                </div>
              </div>
            </address>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 lg:mt-16">
          <hr className="border-border/50 mb-8" aria-hidden="true" />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-body-sm text-muted-foreground/70 text-center md:text-right">
              &copy; {currentYear} کوروش باربر. تمام حقوق مادی و معنوی محفوظ است.
            </p>

            <div className="flex items-center justify-center md:justify-start gap-6 text-caption text-muted-foreground/60">
              <Link href="/terms" className="hover:text-primary transition-colors">قوانین</Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">حریم خصوصی</Link>
              <Link href="/cookies" className="hover:text-primary transition-colors">کوکی‌ها</Link>
              <Link href="/accessibility" className="hover:text-primary transition-colors">دسترسی‌پذیری</Link>
            </div>

            <div className="flex items-center justify-center md:justify-end gap-2 text-caption text-muted-foreground/60">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>طراحی و توسعه با <span className="text-primary">❤</span> برای شما</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}