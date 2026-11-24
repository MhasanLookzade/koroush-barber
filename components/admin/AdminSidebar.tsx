"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Scissors,
  LayoutDashboard,
  Calendar,
  Clock,
  Users,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  MessageSquare,
  X,
  ExternalLink,
  Cake,
  Send,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useAdminNav } from "./AdminNavContext"

const navItems = [
  { href: "/admin", label: "داشبورد و زمان‌بندی هفتگی", icon: LayoutDashboard },
  { href: "/admin/appointments", label: "سوابق و جستجوی نوبت‌ها", icon: Calendar },
  { href: "/admin/availability", label: "ساعات کاری و تعطیلات", icon: Clock },
  { href: "/admin/services", label: "خدمات و تعرفه‌ها", icon: Scissors },
  { href: "/admin/customers", label: "دایرکتوری مشتریان", icon: Users },
  { href: "/admin/birthdays", label: "تولد مشتریان", icon: Cake },
  { href: "/admin/sms", label: "مرکز پیامک‌ها", icon: Send },
  { href: "/admin/reviews", label: "نظرات مراجعان", icon: MessageSquare },
  { href: "/admin/payments", label: "گزارش مالی و تراکنش‌ها", icon: CreditCard },
  { href: "/admin/settings", label: "تنظیمات سالن", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { isMobileOpen, closeMobileNav } = useAdminNav()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [pendingReviewsCount, setPendingReviewsCount] = useState<number>(0)
  const [adminUser, setAdminUser] = useState<{ name: string; role: string } | null>(null)

  useEffect(() => {
    async function loadPendingCount() {
      try {
        const res = await fetch("/api/admin/reviews?status=PENDING")
        if (res.ok) {
          const data = await res.json()
          if (data.counts?.pending) {
            setPendingReviewsCount(data.counts.pending)
          }
        }
      } catch {
        // Ignored
      }
    }
    loadPendingCount()

    async function fetchMe() {
      try {
        const res = await fetch("/api/admin/auth/me")
        if (res.ok) {
          const data = await res.json()
          setAdminUser(data.user)
        }
      } catch {
        // Ignored
      }
    }
    fetchMe()
  }, [pathname])

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" })
      window.location.href = "/admin-login"
    } catch {
      window.location.href = "/admin-login"
    }
  }

  return (
    <>
      {/* 1. DESKTOP SIDEBAR (Visible on lg and larger) */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-l border-[#2D332F] bg-[#161917] transition-all duration-200 z-20 shrink-0",
          isCollapsed ? "w-16" : "w-64"
        )}
        aria-label="منوی مدیریت"
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between px-4 border-b border-[#2D332F]">
          <Link href="/admin" className="flex items-center gap-2.5 text-[#F5F1E8]">
            <div className="w-9 h-9 rounded-xl bg-[#C8A96B]/10 text-[#C8A96B] flex items-center justify-center shrink-0">
              <Scissors className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div>
                <span className="block text-sm font-bold font-heading text-[#F5F1E8]">
                  کوروش باربر
                </span>
                <span className="block text-[10px] text-[#C8A96B] font-mono">PANEL MANAGEMENT</span>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#A8A39A] hover:bg-[#1F2321] hover:text-[#F5F1E8] transition-colors cursor-pointer"
            aria-label={isCollapsed ? "گسترش منو" : "بستن منو"}
          >
            {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-xs sm:text-sm font-medium transition-all",
                  isActive
                    ? "bg-[#C8A96B] text-[#0D0F0E] font-bold shadow-md"
                    : "text-[#A8A39A] hover:bg-[#1F2321] hover:text-[#F5F1E8]"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="flex-1">{item.label}</span>}
                {!isCollapsed && item.href === "/admin/reviews" && pendingReviewsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-bold">
                    {pendingReviewsCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Logout Footer */}
        <div className="p-3 border-t border-[#2D332F]">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            title={isCollapsed ? "خروج" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>خروج از پنل</span>}
          </button>
        </div>
      </aside>

      {/* 2. MOBILE DRAWER (Visible on viewports < lg) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" dir="rtl">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={closeMobileNav}
            aria-hidden="true"
          />

          {/* Slide-over Drawer */}
          <aside className="fixed inset-y-0 right-0 w-72 max-w-[85vw] bg-[#161917] border-l border-[#2D332F] shadow-2xl flex flex-col z-50 animate-slideInRight">
            {/* Header */}
            <div className="flex h-16 items-center justify-between px-4 border-b border-[#2D332F]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C8A96B]/10 text-[#C8A96B] flex items-center justify-center">
                  <Scissors className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-sm font-bold font-heading text-[#F5F1E8]">
                    کوروش باربر
                  </span>
                  <span className="block text-[9px] text-[#C8A96B] font-mono">PANEL MANAGEMENT</span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeMobileNav}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#A8A39A] hover:text-[#F5F1E8] hover:bg-[#1F2321] transition-colors cursor-pointer"
                aria-label="بستن منو"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Mini Bar */}
            {adminUser && (
              <div className="px-4 py-3 bg-[#1F2321]/60 border-b border-[#2D332F] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#C8A96B]" />
                  <span className="text-xs font-semibold text-[#F5F1E8]">{adminUser.name}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-[#0D0F0E] text-[10px] text-[#C8A96B] font-mono">
                  {adminUser.role}
                </span>
              </div>
            )}

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileNav}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3.5 py-3 text-xs sm:text-sm font-medium transition-all min-h-[44px]",
                      isActive
                        ? "bg-[#C8A96B] text-[#0D0F0E] font-bold shadow-md"
                        : "text-[#A8A39A] hover:bg-[#1F2321] hover:text-[#F5F1E8]"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.href === "/admin/reviews" && pendingReviewsCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-bold">
                        {pendingReviewsCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Drawer Footer Actions */}
            <div className="p-3 border-t border-[#2D332F] space-y-2">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-[#A8A39A] hover:bg-[#1F2321] hover:text-[#F5F1E8] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-[#C8A96B]" />
                  <span>مشاهده سایت مشتری</span>
                </div>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>خروج از پنل مدیریت</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
