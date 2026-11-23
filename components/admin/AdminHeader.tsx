"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ExternalLink, LogOut, Shield, User, Clock, Bell } from "lucide-react"
import { getJalaliDate } from "@/lib/jalali"

export function AdminHeader() {
  const router = useRouter()
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
    await fetch("/api/admin/auth/logout", { method: "POST" })
    router.push("/admin-login")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#2D332F] bg-[#161917] px-6">
      {/* Date display in Tehran timezone */}
      <div className="flex items-center gap-2 text-xs text-[#A8A39A]">
        <Clock className="w-4 h-4 text-[#C8A96B]" />
        <span>امروز: </span>
        <span className="font-bold text-[#F5F1E8]">{dateDisplay}</span>
      </div>

      {/* Right-side quick controls */}
      <div className="flex items-center gap-3">
        <Link href="/" target="_blank" rel="noopener noreferrer">
          <Button
            variant="outline"
            size="sm"
            className="border-[#2D332F] text-[#A8A39A] hover:text-[#F5F1E8] hover:bg-[#1F2321] text-xs gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            مشاهده سایت مشتری
          </Button>
        </Link>

        {adminUser && (
          <div className="flex items-center gap-2 bg-[#1F2321] border border-[#2D332F] px-3 py-1.5 rounded-xl text-xs">
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
          className="text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          خروج
        </Button>
      </div>
    </header>
  )
}
