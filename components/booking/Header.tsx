"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Scissors, Menu, X, Crown } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/#services", label: "خدمات و تعرفه‌ها" },
  { href: "/#booking", label: "رزرو نوبت" },
  { href: "/#comparison", label: "قبل و بعد" },
  { href: "/#about", label: "درباره سالن" },
  { href: "/#gallery", label: "گالری" },
  { href: "/#contact", label: "تماس و آدرس" },
  { href: "/booking/status", label: "پیگیری نوبت" },
]

interface HeaderProps {
  id?: string
}

export function Header({ id }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleMobileLinkClick = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <header
      id={id}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-luxury"
          : "bg-transparent"
      )}
      role="banner"
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="منوی اصلی">
        <div className="flex h-16 lg:h-20 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3" aria-label="کوروش باربر - خانه">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--color-gold-bright))]">
                <Scissors className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
                <span className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-primary/50 to-[hsl(var(--color-gold-bright)_/_0.5)] blur-lg opacity-50 animate-pulse-gold" aria-hidden="true" />
              </div>
              <div className="hidden sm:block text-left">
                <span className="block text-heading-lg font-heading font-bold text-foreground tracking-tight">
                  کوروش باربر
                </span>
                <span className="block text-caption font-medium text-primary tracking-widest uppercase">
                  Kourosh Barber
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative px-4 py-2.5 text-body-md font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/50 rounded-xl"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA - Using luxury button variants */}
          <div className="hidden lg:flex lg:items-center lg:gap-3">
            <Link href="/contact" className="btn-luxury-outline text-body-md">
              <span className="hidden sm:inline">موقعیت و تماس</span>
              <span className="sm:hidden">تماس</span>
            </Link>
            <Link href="/book" className="btn-luxury text-body-md gap-2">
              <Scissors className="h-4 w-4" aria-hidden="true" />
              <span>رزرو نوبت</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            <Button
              variant="luxury-ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? "بستن منو" : "باز کردن منو"}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          id="mobile-menu"
          className={cn(
            "lg:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-border/50 bg-background",
            isMobileMenuOpen ? "max-h-96 opacity-100 pb-6" : "max-h-0 opacity-0"
          )}
          role="navigation"
          aria-label="منوی موبایل"
        >
          <div className="px-4 py-6 space-y-4">
            <div className="flex flex-col gap-2 border-t border-border/50 pt-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleMobileLinkClick}
                  className="px-3 py-3 text-body-md font-medium text-muted-foreground rounded-xl transition-colors hover:text-foreground hover:bg-accent/50"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-3 border-t border-border/50 pt-4">
              <Link href="/contact" onClick={handleMobileLinkClick} className="btn-luxury-outline w-full justify-center">
                موقعیت و تماس
              </Link>
              <Link href="/book" onClick={handleMobileLinkClick} className="btn-luxury w-full justify-center gap-2">
                <Scissors className="h-4 w-4" />
                رزرو نوبت
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}