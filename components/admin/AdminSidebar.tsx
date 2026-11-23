"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

const navItems = [
  { href: "/admin", label: "داشبورد مدیریت", icon: LayoutDashboard },
  { href: "/admin/appointments", label: "نوبت‌ها و تقویم", icon: Calendar },
  { href: "/admin/availability", label: "ساعات کاری و مسدودی", icon: Clock },
  { href: "/admin/services", label: "خدمات و تعرفه‌ها", icon: Scissors },
  { href: "/admin/customers", label: "دایرکتوری مشتریان", icon: Users },
  { href: "/admin/payments", label: "گزارش مالی و تراکنش‌ها", icon: CreditCard },
  { href: "/admin/settings", label: "تنظیمات سالن", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" })
      router.push("/admin-login")
      router.refresh()
    } catch {
      router.push("/admin-login")
    }
  }

  return (
    <aside
      className={cn(
        "flex flex-col border-l border-[#2D332F] bg-[#161917] transition-all duration-200 z-20",
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
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#A8A39A] hover:bg-[#1F2321] hover:text-[#F5F1E8] transition-colors"
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
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Logout Footer */}
      <div className="p-3 border-t border-[#2D332F]">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
          title={isCollapsed ? "خروج" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>خروج از پنل</span>}
        </button>
      </div>
    </aside>
  )
}
