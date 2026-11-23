"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toPersianDigits, getTehranDateString, formatJalaliDateOnly } from "@/lib/jalali"
import { JalaliDatePicker } from "@/components/ui/JalaliDatePicker"
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  ShieldAlert,
  Ban,
  RefreshCw,
} from "lucide-react"

interface BlockedInterval {
  id: string
  date: string
  startTime: string
  endTime: string
  reason: string
}

interface ScheduleOverride {
  id: string
  date: string
  isClosed: boolean
  reason?: string
}

export default function AdminAvailabilityPage() {
  const [blockedIntervals, setBlockedIntervals] = useState<BlockedInterval[]>([])
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Block interval form state
  const [blockDate, setBlockDate] = useState(getTehranDateString())
  const [blockStartTime, setBlockStartTime] = useState("14:00")
  const [blockEndTime, setBlockEndTime] = useState("15:00")
  const [blockReason, setBlockReason] = useState("استراحت ناهار / ضدعفونی ابزارها")

  // Override / Holiday closure form state
  const [overrideDate, setOverrideDate] = useState(getTehranDateString())
  const [overrideClosed, setOverrideClosed] = useState(true)
  const [overrideReason, setOverrideReason] = useState("تعطیل رسمی سالن")

  const fetchAvailability = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/availability")
      if (!res.ok) throw new Error("خطا در بارگذاری ساعات کاری")
      const data = await res.json()
      setBlockedIntervals(data.blockedIntervals || [])
      setOverrides(data.scheduleOverrides || [])
    } catch {
      setError("امکان ارتباط با سرور وجود ندارد")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAvailability()
  }, [])

  // Handle Create Block Interval with Conflict Warning
  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    try {
      setLoading(true)
      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: blockDate,
          startTime: blockStartTime,
          endTime: blockEndTime,
          reason: blockReason,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "خطا در مسدودسازی بازه")
      }

      setSuccessMsg(data.message)
      fetchAvailability()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در ثبت مسدودی")
    } finally {
      setLoading(false)
    }
  }

  // Handle Delete Block Interval
  const handleDeleteBlock = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/availability?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("خطا در حذف مسدودی")
      setSuccessMsg("بازه مسدودی حذف شد و به ظرفیت سالن بازگشت.")
      fetchAvailability()
    } catch {
      setError("خطا در حذف بازه")
    }
  }

  // Handle Date Closure Override
  const handleCreateOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    try {
      setLoading(true)
      const res = await fetch("/api/admin/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: overrideDate,
          isClosed: overrideClosed,
          reason: overrideReason,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "خطا در تنظیم تعطیلی")

      setSuccessMsg(data.message)
      fetchAvailability()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطای عملیات")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold font-heading text-[#F5F1E8]">
          ساعات کاری، مسدودی‌ها و تعطیلات سالن
        </h1>
        <p className="text-xs text-[#A8A39A] mt-1">
          مدیریت بازه‌های استراحت، مرخصی و تعطیلات با بررسی خودکار عدم تداخل با نوبت‌های تایید شده
        </p>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div role="status" className="p-4 rounded-xl bg-green-950/40 border border-green-500/40 text-green-200 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-green-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Standard Operating Hours Overview */}
      <Card className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-[#C8A96B]" />
          <h2 className="text-base font-bold font-heading">برنامه کاری استاندارد سالن (۷ روز هفته)</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs">
          {["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"].map((day) => (
            <div key={day} className="p-3 rounded-xl bg-[#1F2321] border border-[#2D332F] space-y-1">
              <span className="font-bold text-[#F5F1E8] block">{day}</span>
              <span className="font-mono text-[#C8A96B] text-[11px] block">۱۰:۰۰ - ۲۳:۰۰</span>
              <span className="text-[10px] text-green-400">۱۳ بازه فعال</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Form: Block Interval */}
        <Card className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#2D332F]">
            <Ban className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm">مسدودسازی بازه زمانی خاص (استراحت / مرخصی)</h3>
          </div>

          <form onSubmit={handleCreateBlock} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-[#A8A39A] block">تاریخ مورد نظر (جلالی):</label>
              <JalaliDatePicker
                value={blockDate}
                onChange={(d) => setBlockDate(d)}
                placeholder="انتخاب تاریخ جلالی..."
                className="w-full text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[#A8A39A] block">از ساعت:</label>
                <select
                  value={blockStartTime}
                  onChange={(e) => setBlockStartTime(e.target.value)}
                  className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] focus:outline-none"
                >
                  {["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[#A8A39A] block">تا ساعت:</label>
                <select
                  value={blockEndTime}
                  onChange={(e) => setBlockEndTime(e.target.value)}
                  className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] focus:outline-none"
                >
                  {["11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[#A8A39A] block">علت مسدودی:</label>
              <input
                type="text"
                required
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="مثال: استراحت ناهار یا ضدعفونی"
                className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-5 rounded-xl text-xs gap-1.5"
            >
              <Plus className="w-4 h-4" />
              ثبت مسدودی (با بررسی عدم تداخل)
            </Button>
          </form>
        </Card>

        {/* Form: Full-Day Holiday Override */}
        <Card className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#2D332F]">
            <Calendar className="w-4 h-4 text-[#C8A96B]" />
            <h3 className="font-bold text-sm">تنظیم تعطیلی کامل تاریخ خاص (مناسبت‌ها / تعطیلات)</h3>
          </div>

          <form onSubmit={handleCreateOverride} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-[#A8A39A] block">تاریخ مورد نظر (جلالی):</label>
              <JalaliDatePicker
                value={overrideDate}
                onChange={(d) => setOverrideDate(d)}
                placeholder="انتخاب تاریخ جلالی..."
                className="w-full text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[#A8A39A] block">علت تعطیلی سالن:</label>
              <input
                type="text"
                required
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="مثال: تعطیل رسمی یا تعمیرات داخلی"
                className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-[#A8A39A]">
              <input
                type="checkbox"
                checked={overrideClosed}
                onChange={(e) => setOverrideClosed(e.target.checked)}
                className="rounded bg-[#1F2321] border-[#2D332F]"
              />
              <span>سالن در این تاریخ کاملاً تعطیل باشد (عدم امکان رزرو نوبت)</span>
            </label>

            <Button
              type="submit"
              className="w-full bg-[#1F2321] hover:bg-[#C8A96B] text-[#F5F1E8] hover:text-[#0D0F0E] font-bold py-5 rounded-xl border border-[#2D332F] text-xs transition-colors"
            >
              ثبت وضعیت تعطیلی تاریخ
            </Button>
          </form>
        </Card>
      </div>

      {/* Active Blocked Intervals List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold font-heading text-[#F5F1E8]">
          بازه‌های مسدود شده فعال ({toPersianDigits(blockedIntervals.length)})
        </h3>

        {blockedIntervals.length === 0 ? (
          <div className="p-6 text-center bg-[#161917] border border-[#2D332F] rounded-2xl text-xs text-[#A8A39A]">
            هیچ بازه مسدود شده‌ای ثبت نشده است؛ تمامی ساعات کاری طبق برنامه باز هستند.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {blockedIntervals.map((b) => (
              <div
                key={b.id}
                className="bg-[#161917] border border-[#2D332F] p-4 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#F5F1E8]">{formatJalaliDateOnly(b.date)}</span>
                    <span className="font-mono text-[#C8A96B] text-[11px] dir-ltr" dir="ltr">
                      {toPersianDigits(b.startTime)} - {toPersianDigits(b.endTime)}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#A8A39A] block mt-1">{b.reason}</span>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeleteBlock(b.id)}
                  className="h-8 w-8 text-red-400 hover:bg-red-500/10"
                  title="حذف مسدودی و آزادسازی بازه"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
