"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Scissors,
  Menu,
  X,
  CalendarCheck,
  Phone,
  ArrowUpLeft,
  Sparkles,
} from "lucide-react"

export function Header({ id }: { id?: string }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const isHome = pathname === "/"

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const orig = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = orig
      }
    }
  }, [mobileMenuOpen])

  // Close on Escape key
  useEffect(() => {
    if (!mobileMenuOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mobileMenuOpen])

  const navLinks = [
    { href: "#booking", label: "خدمات و نوبت‌دهی", id: "booking" },
    { href: "#comparison", label: "قبل و بعد", id: "comparison" },
    { href: "#about", label: "درباره سالن", id: "about" },
    { href: "/gallery", label: "گالری تصاویر", id: "gallery" },
    { href: "#contact", label: "ساعات و موقعیت", id: "contact" },
    { href: "#reviews", label: "روایت مشتریان", id: "reviews" },
  ]

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setMobileMenuOpen(false)
    if (href.startsWith("#")) {
      if (isHome) {
        e.preventDefault()
        const el = document.querySelector(href)
        if (el) {
          el.scrollIntoView({ behavior: "smooth" })
        }
      }
      // If not on homepage, let default Link or standard anchor navigation to /#section happen
    }
  }

  return (
    <header
      id={id || "site-header"}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || !isHome
          ? "bg-[#0D0F0E]/95 backdrop-blur-xl border-b border-[#242A27] shadow-2xl py-3 sm:py-3.5"
          : "bg-transparent py-4 sm:py-5"
      }`}
      role="banner"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 h-12 sm:h-14">
          
          {/* 1. Brand Logo & Monogram */}
          <Link
            href="/"
            className="flex items-center gap-2.5 sm:gap-3.5 group cursor-pointer shrink-0"
            aria-label="آرایشگاه کوروش - صفحه اصلی"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#E4C88E] via-[#C8A96B] to-[#9A773F] p-0.5 shadow-lg group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-[#141715] rounded-[14px] flex items-center justify-center">
                <Scissors className="w-5 h-5 text-[#E4C88E] transition-transform duration-300 group-hover:rotate-45" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-black text-sm xs:text-base sm:text-2xl text-[#F7F4EE] tracking-normal leading-tight whitespace-nowrap">
                آرایشگاه کوروش
              </span>
              <span className="hidden xs:block text-[9px] sm:text-[11px] font-semibold text-[#C8A96B] tracking-[0.18em] uppercase font-mono leading-none mt-0.5">
                KOUROSH BARBER
              </span>
            </div>
          </Link>

          {/* 2. Desktop Navigation Pills */}
          <nav
            className="hidden lg:flex items-center gap-1 bg-[#141715]/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#242A27]"
            aria-label="منوی ناوبری اصلی"
          >
            {navLinks.map((link) => {
              const fullHref = isHome ? link.href : (link.href.startsWith("#") ? `/${link.href}` : link.href)
              const isActive = link.href === "/gallery" ? pathname === "/gallery" : false

              return (
                <Link
                  key={link.label}
                  href={fullHref}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#C8A96B] text-[#0D0F0E] shadow-sm font-bold"
                      : "text-[#A8A39A] hover:text-[#F7F4EE] hover:bg-[#1C221F]"
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* 3. Action CTAs */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Redesigned Prominent Tracking Button: پیگیری نوبت من */}
            <Link
              href="/booking/status"
              className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 sm:py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all border shadow-sm ${
                pathname === "/booking/status"
                  ? "bg-[#C8A96B] text-[#0D0F0E] border-[#C8A96B] shadow-[0_0_15px_rgba(200,169,107,0.35)]"
                  : "text-[#F7F4EE] bg-[#181D1A] hover:bg-[#222924] hover:text-[#E4C88E] border-[#C8A96B]/30 hover:border-[#C8A96B] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#C8A96B]/50"
              }`}
              title="پیگیری نوبت رزرو شده در آرایشگاه کوروش"
              aria-label="پیگیری نوبت من"
            >
              <CalendarCheck className="w-4 h-4 text-[#C8A96B] shrink-0" />
              <span className="whitespace-nowrap font-bold tracking-tight">پیگیری نوبت من</span>
            </Link>

            {/* Direct Booking CTA (Desktop & Tablet) */}
            <Link
              href={isHome ? "#booking" : "/#booking"}
              onClick={(e) => handleNavClick(e, "#booking")}
              className="hidden md:inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-[#0D0F0E] bg-gradient-to-r from-[#E4C88E] via-[#C8A96B] to-[#B58B59] hover:brightness-110 shadow-[0_0_20px_rgba(200,169,107,0.3)] transition-all hover:scale-[1.02] active:scale-95"
            >
              <span>رزرو آنلاین</span>
              <ArrowUpLeft className="w-4 h-4" />
            </Link>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#141715] text-[#F7F4EE] border border-[#242A27] hover:bg-[#1E2320] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C8A96B]/50"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "بستن منوی ناوبری" : "باز کردن منوی ناوبری"}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Mobile Menu Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-x-0 top-[64px] sm:top-[72px] bottom-0 bg-[#0D0F0E]/98 backdrop-blur-2xl border-t border-[#242A27] p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in fade-in duration-200"
          dir="rtl"
        >
          <nav className="flex flex-col gap-2" aria-label="منوی موبایل">
            {navLinks.map((link) => {
              const fullHref = isHome ? link.href : (link.href.startsWith("#") ? `/${link.href}` : link.href)
              return (
                <Link
                  key={link.label}
                  href={fullHref}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="px-4 py-3.5 rounded-2xl text-sm font-semibold text-[#E6E0D6] hover:bg-[#181D1A] hover:text-[#C8A96B] transition-colors flex items-center justify-between border border-transparent hover:border-[#262C28]"
                >
                  <span>{link.label}</span>
                  <ArrowUpLeft className="w-4 h-4 text-[#7E776C]" />
                </Link>
              )
            })}
          </nav>

          <div className="pt-6 border-t border-[#222825] flex flex-col gap-3 pb-6">
            <Link
              href="/booking/status"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-[#E4C88E] bg-[#161A18] border border-[#C8A96B]/30 hover:border-[#C8A96B] min-h-[44px]"
            >
              <CalendarCheck className="w-4 h-4 text-[#C8A96B]" />
              <span>پیگیری نوبت من</span>
            </Link>

            <Link
              href={isHome ? "#booking" : "/#booking"}
              onClick={(e) => handleNavClick(e, "#booking")}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-[#0D0F0E] bg-gradient-to-r from-[#E4C88E] to-[#C8A96B] shadow-lg min-h-[48px]"
            >
              <span>رزرو آنلاین نوبت (انتخاب ساعت)</span>
              <Scissors className="w-4 h-4" />
            </Link>

            <div className="pt-2 text-center text-xs text-[#7E776C] flex items-center justify-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#C8A96B]" />
              <span>پذیرش و هماهنگی تلفنی: </span>
              <a href="tel:02122446688" className="text-[#A8A39A] hover:text-[#E4C88E] font-mono dir-ltr" dir="ltr">
                ۰۲۱-۲۲۴۴۶۶۸۸
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
