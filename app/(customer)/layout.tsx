"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  CalendarClock,
  User,
  Bell,
  LogOut,
  Menu,
  X,
} from "lucide-react"

const navigation = [
  { name: "داشبورد", href: "/dashboard", icon: LayoutDashboard },
  { name: "نوبت‌های من", href: "/dashboard/appointments", icon: CalendarClock },
  { name: "پروفایل", href: "/dashboard/profile", icon: User },
  { name: "اعلان‌ها", href: "/dashboard/notifications", icon: Bell },
]

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [customer, setCustomer] = useState<{
    name: string
    email?: string | null
    avatar?: string | null
    isVerified?: boolean
  } | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/customer/me")
      if (res.ok) {
        const data = await res.json()
        if (data.customer) {
          setIsLoggedIn(true)
          setCustomer(data.customer)
        } else {
          setIsLoggedIn(false)
        }
      } else {
        setIsLoggedIn(false)
      }
    } catch {
      setIsLoggedIn(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/customer/logout", { method: "POST" })
      setIsLoggedIn(false)
      setCustomer(null)
      window.location.href = "/"
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">در حال بررسی احراز هویت...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Mobile sidebar overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity",
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-screen w-64 bg-card border-l border-border transition-transform duration-300 lg:relative lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        )}
        aria-label="منوی کاربری"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-border lg:hidden">
            <span className="font-heading font-semibold text-lg">پنل کاربری</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="بستن منو"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Profile */}
          <div className="flex flex-col items-center gap-3 p-6 border-b border-border">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--color-gold-bright))] flex items-center justify-center text-primary-foreground font-heading font-bold text-2xl">
                {customer?.name?.charAt(0) || "ک"}
              </div>
              {customer?.isVerified && (
                <span className="absolute bottom-0 left-0 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white text-xs">
                  ✓
                </span>
              )}
            </div>
            <div className="text-center w-full">
              <h3 className="font-heading font-semibold text-lg truncate">{customer?.name}</h3>
              {customer?.email && (
                <p className="text-sm text-muted-foreground truncate">{customer.email}</p>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1" aria-label="منوی اصلی">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-border">
            <Button
              variant="outline"
              className="w-full gap-2 text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              خروج از حساب
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between px-4 border-b border-border bg-background/80 backdrop-blur lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="باز کردن منو"
            aria-expanded={isSidebarOpen}
            aria-controls="sidebar"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </Button>
          <span className="font-heading font-semibold text-lg">پنل کاربری</span>
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8" id="main-content" role="main">
          {children}
        </main>
      </div>
    </div>
  )
}