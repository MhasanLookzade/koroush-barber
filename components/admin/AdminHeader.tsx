"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ExternalLink, LogOut, Shield, Clock, Menu } from "lucide-react"
import { getJalaliDate } from "@/lib/jalali"
import { useAdminNav } from "./AdminNavContext"

export function AdminHeader() {
  const router = useRouter()
  const { toggleMobileNav } = useAdminNav()
  const [adminUser, setAdminUser] = useState<{ username: string; name: string; role: string } | null>(null)
  const [dateDisplay, setDateDisplay] = useState<string>("")

  useEffect(() => {
    const today = getJalaliDate(new Date())
    setDateDisplay(`${today.dayName}، ${today.day} ${today.monthName} ${today.year}`)

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
  }, [])

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" })
      window.location.href = "/admin-login"
    } catch {
      window.location.href = "/admin-login"
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 sm:h-20 items-center justify-between border-b border-[#2D332F] bg-[#161917] px-3 sm:px-6">
      {/* Mobile Hamburger & Date Display */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleMobileNav}
          className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-[#1F2321] border border-[#2D332F] text-[#F5F1E8] hover:text-[#C8A96B] transition-colors cursor-pointer"
          aria-label="باز کردن منوی مدیریت"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-[#A8A39A]">
          <Clock className="w-3.5 h-3.5 text-[#C8A96B] shrink-0 hidden sm:inline" />
          <span className="hidden sm:inline">امروز: </span>
          <span className="font-bold text-[#F5F1E8] text-[11px] sm:text-xs truncate max-w-[150px] sm:max-w-none">
            {dateDisplay}
          </span>
        </div>
      </div>

      {/* Quick Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link href="/" target="_blank" rel="noopener noreferrer">
          <Button
            variant="outline"
            size="sm"
            className="border-[#2D332F] text-[#A8A39A] hover:text-[#F5F1E8] hover:bg-[#1F2321] text-[11px] sm:text-xs gap-1 sm:gap-1.5 px-2 sm:px-3 h-8 sm:h-9"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">مشاهده سایت مشتری</span>
            <span className="sm:hidden">سایت</span>
          </Button>
        </Link>

        {adminUser && (
          <div className="hidden md:flex items-center gap-2 bg-[#1F2321] border border-[#2D332F] px-3 py-1.5 rounded-xl text-xs">
            <Shield className="w-3.5 h-3.5 text-[#C8A96B]" />
            <span className="text-[#F5F1E8] font-medium">{adminUser.name}</span>
            <span className="px-1.5 py-0.5 rounded bg-[#0D0F0E] text-[10px] text-[#C8A96B] font-mono">
              {adminUser.role}
            </span>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-1 px-2 sm:px-3 h-8 sm:h-9 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">خروج</span>
        </Button>
      </div>
    </header>
  )
}
