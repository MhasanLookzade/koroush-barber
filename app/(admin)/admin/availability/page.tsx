"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
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
  Ban,
  CalendarX,
  Sparkles,
  Unlock,
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
      const res = await fetch(`/api/admin/availability?id=${id}&type=block`, { method: "DELETE" })
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

  // Handle Delete / Cancel Date Closure Override
  const handleDeleteOverride = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/availability?id=${id}&type=override`, { method: "DELETE" })
      if (!res.ok) throw new Error("خطا در حذف تعطیلی")
      setSuccessMsg("تعطیلی تاریخ حذف شد و سالن در این روز بازگشایی گردید.")
      fetchAvailability()
    } catch {
      setError("خطا در حذف تعطیلی تاریخ")
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto" dir="rtl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#F5F1E8]">
          ساعات کاری، مسدودی‌ها و تعطیلات سالن
        </h1>
        <p className="text-xs text-[#8C8477] mt-1">
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
        <div role="status" className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Standard Operating Hours Overview */}
      <Card className="bg-[#141715] border border-[#242A27] text-[#F5F1E8] p-4 sm:p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#C8A96B]/15 border border-[#C8A96B]/30 flex items-center justify-center">
            <Clock className="w-4 h-4 text-[#C8A96B]" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold font-heading">برنامه کاری استاندارد سالن (۷ روز هفته)</h2>
            <p className="text-[11px] text-[#8C8477]">ساعت پذیرش نوبت‌های حضوری و آنلاین در تایم‌زون رسمی تهران</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
          {["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"].map((day) => (
            <div key={day} className="p-3 rounded-xl bg-[#1A1E1B] border border-[#242A27] space-y-1">
              <span className="font-bold text-[#F5F1E8] block">{day}</span>
              <span className="font-mono text-[#C8A96B] text-[11px] block">۱۰:۰۰ - ۲۳:۰۰</span>
              <span className="text-[10px] text-emerald-400 font-medium">۱۳ بازه فعال</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
        {/* Form: Block Interval */}
        <Card className="bg-[#141715] border border-[#242A27] text-[#F5F1E8] p-4 sm:p-6 rounded-2xl space-y-4 overflow-visible">
          <div className="flex items-center gap-2 pb-3 border-b border-[#242A27]">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Ban className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F5F1E8]">مسدودسازی بازه زمانی خاص (استراحت / مرخصی)</h3>
              <p className="text-[11px] text-[#8C8477]">خارج کردن بازه‌های مشخص از فرآیند رزرواسیون آنلاین</p>
            </div>
          </div>

          <form onSubmit={handleCreateBlock} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-[#8C8477] block font-medium">تاریخ مورد نظر (تقویم جلالی):</label>
              <JalaliDatePicker
                value={blockDate}
                onChange={(d) => setBlockDate(d)}
                placeholder="انتخاب تاریخ جلالی..."
                className="w-full text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[#8C8477] block font-medium">از ساعت:</label>
                <select
                  value={blockStartTime}
                  onChange={(e) => setBlockStartTime(e.target.value)}
                  className="w-full bg-[#1A1E1B] border border-[#242A27] rounded-xl px-3 py-2.5 text-[#F5F1E8] focus:outline-none focus:ring-1 focus:ring-[#C8A96B] min-h-[44px]"
                >
                  {["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#8C8477] block font-medium">تا ساعت:</label>
                <select
                  value={blockEndTime}
                  onChange={(e) => setBlockEndTime(e.target.value)}
                  className="w-full bg-[#1A1E1B] border border-[#242A27] rounded-xl px-3 py-2.5 text-[#F5F1E8] focus:outline-none focus:ring-1 focus:ring-[#C8A96B] min-h-[44px]"
                >
                  {["11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[#8C8477] block font-medium">علت مسدودی:</label>
              <input
                type="text"
                required
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="مثال: استراحت ناهار یا ضدعفونی ابزار"
                className="w-full bg-[#1A1E1B] border border-[#242A27] rounded-xl px-3 py-2.5 text-[#F5F1E8] focus:outline-none focus:ring-1 focus:ring-[#C8A96B] min-h-[44px]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold py-3.5 px-4 rounded-xl text-xs gap-2 min-h-[46px] cursor-pointer shadow-lg shadow-[#C8A96B]/15 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت مسدودی (با بررسی عدم تداخل با نوبت‌ها)</span>
            </Button>
          </form>
        </Card>

        {/* Form: Full-Day Holiday Override */}
        <Card className="bg-[#141715] border border-[#242A27] text-[#F5F1E8] p-4 sm:p-6 rounded-2xl space-y-4 overflow-visible">
          <div className="flex items-center gap-2 pb-3 border-b border-[#242A27]">
            <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
              <CalendarX className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F5F1E8]">تنظیم تعطیلی کامل تاریخ خاص (مناسبت‌ها / تعطیلات)</h3>
              <p className="text-[11px] text-[#8C8477]">غیرفعال‌سازی رزرو آنلاین برای کل یک روز مشخص</p>
            </div>
          </div>

          <form onSubmit={handleCreateOverride} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-[#8C8477] block font-medium">تاریخ مورد نظر (تقویم جلالی):</label>
              <JalaliDatePicker
                value={overrideDate}
                onChange={(d) => setOverrideDate(d)}
                placeholder="انتخاب تاریخ جلالی..."
                className="w-full text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#8C8477] block font-medium">علت تعطیلی سالن:</label>
              <input
                type="text"
                required
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="مثال: تعطیل رسمی تقویم یا تعمیرات داخلی"
                className="w-full bg-[#1A1E1B] border border-[#242A27] rounded-xl px-3 py-2.5 text-[#F5F1E8] focus:outline-none focus:ring-1 focus:ring-[#C8A96B] min-h-[44px]"
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer text-[#8C8477] hover:text-[#F5F1E8] transition-colors py-1">
              <input
                type="checkbox"
                checked={overrideClosed}
                onChange={(e) => setOverrideClosed(e.target.checked)}
                className="rounded w-4 h-4 bg-[#1A1E1B] border-[#242A27] text-[#C8A96B] focus:ring-0 cursor-pointer"
              />
              <span className="text-xs">سالن در این تاریخ کاملاً تعطیل باشد (رد خودکار رزروها)</span>
            </label>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold py-3.5 px-4 rounded-xl text-xs gap-2 min-h-[46px] cursor-pointer shadow-lg shadow-[#C8A96B]/15 transition-all"
            >
              <span>ثبت وضعیت تعطیلی تاریخ</span>
            </Button>
          </form>
        </Card>
      </div>

      {/* Active Full-Day Overrides / Holidays */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold font-heading text-[#F5F1E8] flex items-center gap-2">
            <CalendarX className="w-4 h-4 text-rose-400" />
            <span>روزهای تعطیل و مناسبت‌های ثبت‌شده ({toPersianDigits(overrides.length)})</span>
          </h3>
          <span className="text-[11px] text-[#8C8477]">غیرفعال در تقویم عمومی رزرو</span>
        </div>

        {overrides.length === 0 ? (
          <div className="p-5 text-center bg-[#141715] border border-[#242A27] rounded-2xl text-xs text-[#8C8477]">
            هیچ روز تعطیلی ثبت نشده است؛ تمامی روزها طبق برنامه کاری فعال هستند.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {overrides.map((ov) => (
              <div
                key={ov.id}
                className="bg-[#141715] border border-[#242A27] hover:border-rose-500/30 p-4 rounded-xl flex items-center justify-between text-xs transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#F5F1E8]">{formatJalaliDateOnly(ov.date)}</span>
                    <Badge variant="outline" className="bg-rose-950/40 border-rose-500/40 text-rose-400 text-[10px] px-1.5 py-0">
                      {ov.isClosed ? "تعطیل کامل سالن" : "ساعات ویژه"}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-[#8C8477] block">{ov.reason || "تعطیلی سالن"}</span>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleDeleteOverride(ov.id)}
                  className="h-8.5 px-3 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 hover:text-white text-xs gap-1.5 min-h-[36px] cursor-pointer transition-colors"
                  title="لغو تعطیلی و بازگشایی سالن"
                >
                  <Unlock className="w-3.5 h-3.5 text-red-400" />
                  <span>بازگشایی</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Blocked Intervals List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold font-heading text-[#F5F1E8] flex items-center gap-2">
            <Ban className="w-4 h-4 text-amber-400" />
            <span>بازه‌های مسدود شده فعال ({toPersianDigits(blockedIntervals.length)})</span>
          </h3>
          <span className="text-[11px] text-[#8C8477]">ساعات استراحت و خارج از دسترسی</span>
        </div>

        {blockedIntervals.length === 0 ? (
          <div className="p-5 text-center bg-[#141715] border border-[#242A27] rounded-2xl text-xs text-[#8C8477]">
            هیچ بازه مسدود شده‌ای ثبت نشده است؛ تمامی ساعات کاری طبق برنامه باز هستند.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {blockedIntervals.map((b) => (
              <div
                key={b.id}
                className="bg-[#141715] border border-[#242A27] hover:border-amber-500/30 p-4 rounded-xl flex items-center justify-between text-xs transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#F5F1E8]">{formatJalaliDateOnly(b.date)}</span>
                    <span className="font-mono text-[#C8A96B] text-[11px] dir-ltr font-bold" dir="ltr">
                      {toPersianDigits(b.startTime)} - {toPersianDigits(b.endTime)}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#8C8477] block">{b.reason}</span>
                </div>

                <Button
                  size="icon"
                  onClick={() => handleDeleteBlock(b.id)}
                  className="h-8.5 w-8.5 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 hover:text-white min-h-[36px] min-w-[36px] cursor-pointer transition-colors"
                  title="حذف مسدودی و آزادسازی بازه"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
