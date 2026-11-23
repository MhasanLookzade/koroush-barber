"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Scissors, Menu, X, CalendarCheck, Phone, ArrowUpLeft } from "lucide-react"

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navLinks = [
    { href: "#services", label: "خدمات و تعرفه‌ها" },
    { href: "#booking", label: "رزرو نوبت" },
    { href: "#comparison", label: "قبل و بعد" },
    { href: "#about", label: "درباره سالن" },
    { href: "#gallery", label: "گالری" },
    { href: "#reviews", label: "نظرات" },
    { href: "#contact", label: "ساعت و آدرس" },
  ]

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault()
      const targetSelector = href === "#services" ? "#booking" : href
      const element = document.querySelector(targetSelector) || document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: "smooth" })
        setMobileMenuOpen(false)
      } else {
        // If on another route, navigate to homepage with hash
        window.location.href = "/" + href
      }
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#0F1210]/95 backdrop-blur-xl border-b border-[#2A312D] shadow-2xl py-3"
          : "bg-transparent py-5"
      }`}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Logo & Monogram */}
          <a
            href="#"
            onClick={(e) => handleSmoothScroll(e, "#")}
            className="flex items-center gap-3.5 group cursor-pointer"
            aria-label="آرایشگاه کوروش - بازگشت به بالای صفحه"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#E4C88E] via-[#C8A96B] to-[#9A773F] p-0.5 shadow-lg group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-[#141715] rounded-[14px] flex items-center justify-center">
                <Scissors className="w-5 h-5 text-[#E4C88E] transition-transform duration-300 group-hover:rotate-45" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-xl sm:text-2xl text-[#F7F4EE] tracking-tight">
                آرایشگاه کوروش
              </span>
              <span className="text-[11px] font-semibold text-[#C8A96B] tracking-[0.2em] uppercase font-mono">
                KOUROSH BARBER
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-[#171B19]/80 backdrop-blur-md px-4 py-2 rounded-full border border-[#2B332F]" aria-label="منوی اصلی سایت">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className="px-3.5 py-1.5 rounded-full text-sm font-medium text-[#C5BDB2] hover:text-[#F7F4EE] hover:bg-[#252C28] transition-all"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Track Appointment Status Link */}
            <Link
              href="/booking/status"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#C8A96B] bg-[#C8A96B]/10 hover:bg-[#C8A96B]/20 border border-[#C8A96B]/30 transition-colors"
              title="پیگیری نوبت رزرو شده"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>پیگیری نوبت</span>
            </Link>

            {/* Direct Booking CTA */}
            <a
              href="#booking"
              onClick={(e) => handleSmoothScroll(e, "#booking")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-[#0D0F0E] bg-gradient-to-r from-[#E4C88E] via-[#C8A96B] to-[#B58B59] hover:brightness-110 shadow-[0_0_20px_rgba(200,169,107,0.35)] transition-all hover:scale-[1.02] active:scale-95"
            >
              <span>رزرو نوبت</span>
              <ArrowUpLeft className="w-4 h-4" />
            </a>
          </div>

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#171B19] text-[#F7F4EE] border border-[#2B332F] hover:bg-[#242A27] transition-colors"
            aria-expanded={mobileMenuOpen}
            aria-label="باز کردن منوی موبایل"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[76px] bg-[#0F1210]/98 backdrop-blur-2xl border-b border-[#2A312D] p-6 shadow-2xl transition-all">
          <nav className="flex flex-col gap-2.5" aria-label="منوی موبایل">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className="px-4 py-3 rounded-xl text-base font-semibold text-[#E6E0D6] hover:bg-[#1E2421] hover:text-[#C8A96B] transition-colors flex items-center justify-between"
              >
                <span>{link.label}</span>
                <ArrowUpLeft className="w-4 h-4 text-[#8C8477]" />
              </a>
            ))}

            <div className="pt-4 border-t border-[#262D29] flex flex-col gap-3">
              <Link
                href="/booking/status"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-[#C8A96B] bg-[#C8A96B]/10 border border-[#C8A96B]/30"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>پیگیری یا لغو نوبت من</span>
              </Link>
              <a
                href="#booking"
                onClick={(e) => handleSmoothScroll(e, "#booking")}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-bold text-[#0D0F0E] bg-gradient-to-r from-[#E4C88E] to-[#C8A96B] shadow-lg"
              >
                <span>رزرو آنلاین نوبت</span>
                <Scissors className="w-4 h-4" />
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
