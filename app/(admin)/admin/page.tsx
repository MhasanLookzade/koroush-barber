"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatToman, toPersianDigits, getTehranDateString } from "@/lib/jalali"
import { RescheduleAppointmentModal } from "@/components/admin/RescheduleAppointmentModal"
import { JalaliDatePicker } from "@/components/ui/JalaliDatePicker"
import {
  Calendar,
  Clock,
  Scissors,
  Users,
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Phone,
  Check,
  Plus,
  Ban,
  Lock,
  Edit3,
  Trash2,
  X,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  ShieldCheck,
  User,
  ExternalLink,
} from "lucide-react"

// Types
interface WeekDayItem {
  dateStr: string
  dayName: string
  dayShort: string
  jalaliDay: number
  jalaliMonthName: string
  jalaliFormatted: string
  isToday: boolean
  isClosed: boolean
  closedReason: string | null
  confirmedCount: number
  isSelected: boolean
}

interface AppointmentDetails {
  id: string
  trackingCode: string
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  serviceId: string
  serviceName: string
  barberId: string
  barberName: string
  status: string
  dateUtc: string
  jalaliFull: string
  time: string
  endTime: string
  slotTime: string
  createdAtTime: string
  createdAtJalali: string
  totalPrice: number
  depositPaid: number
  balanceDue: number
  isRemainderPaid: boolean
  notes?: string | null
  adminNotes?: string | null
  cancellationReason?: string | null
  paymentRefId?: string | null
}

interface TimelineSlotItem {
  time: string
  endTime: string
  slotTime: string
  label: string
  utcStartTime: string
  utcEndTime: string
  status: "BOOKED" | "AVAILABLE" | "HELD" | "BLOCKED" | "COMPLETED" | "CANCELLED" | "PAST"
  isAvailable: boolean
  appointment: AppointmentDetails | null
  previousCancelledAppointment?: AppointmentDetails | null
  blockedInfo: {
    id: string
    reason: string
    startTime: string
    endTime: string
  } | null
  holdInfo: {
    id: string
    customerPhone?: string
    expiresAt: string
  } | null
}

interface DashboardApiResponse {
  selectedDay: {
    dateStr: string
    dayName: string
    jalaliFormatted: string
    isToday: boolean
    isClosed: boolean
    closedReason: string | null
  }
  week: {
    weekDays: WeekDayItem[]
    weekTitle: string
    weekOffset: number
    startFormatted: string
    endFormatted: string
    saturdayDateStr: string
    fridayDateStr: string
  }
  dailySummary: {
    totalSlots: number
    occupiedSlots: number
    occupancyPercentage: number
    confirmedCount: number
    completedCount: number
    cancelledCount: number
    paymentReviewCount: number
    heldCount: number
    blockedCount: number
    freeSlotsCount: number
    totalDepositsCollected: number
    totalOutstandingBalance: number
    totalGrossValue: number
  }
  timelineSlots: TimelineSlotItem[]
  catalog: {
    services: Array<{
      id: string
      name: string
      price: number
      depositPrice: number
      duration: number
    }>
    barbers: Array<{
      id: string
      name: string
    }>
  }
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Navigation State
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [weekOffset, setWeekOffset] = useState<number>(0)

  // Interactive Modals State
  const [detailAppointment, setDetailAppointment] = useState<AppointmentDetails | null>(null)
  const [rescheduleAppointment, setRescheduleAppointment] = useState<AppointmentDetails | null>(null)
  const [manualSlot, setManualSlot] = useState<TimelineSlotItem | null>(null)
  const [blockSlot, setBlockSlot] = useState<TimelineSlotItem | null>(null)
  const [editCustomerAppointment, setEditCustomerAppointment] = useState<AppointmentDetails | null>(null)
  const [cancelTarget, setCancelTarget] = useState<AppointmentDetails | null>(null)

  // Manual Booking Form State
  const [manualServiceId, setManualServiceId] = useState("")
  const [manualCustomerName, setManualCustomerName] = useState("")
  const [manualCustomerPhone, setManualCustomerPhone] = useState("")
  const [manualNotes, setManualNotes] = useState("")
  const [manualWaiveDeposit, setManualWaiveDeposit] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Edit Customer Form State
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editNotes, setEditNotes] = useState("")

  // Block Reason Form State
  const [blockReason, setBlockReason] = useState("استراحت و ناهار")
  const [customReason, setCustomReason] = useState("")

  // Cancellation Reason Form State
  const [cancelReasonText, setCancelReasonText] = useState("")

  // Fetch Dashboard Function
  const fetchDashboard = useCallback(
    async (silent = false, targetDate = selectedDate, targetOffset = weekOffset) => {
      try {
        if (!silent) setLoading(true)
        const url = new URL("/api/admin/dashboard", window.location.origin)
        if (targetDate) url.searchParams.set("date", targetDate)
        if (targetOffset !== 0) url.searchParams.set("weekOffset", String(targetOffset))

        const res = await fetch(url.toString())
        if (!res.ok) throw new Error("خطا در بارگذاری برنامه هفتگی و نوبت‌ها")
        const result: DashboardApiResponse = await res.json()
        setData(result)
        setSelectedDate(result.selectedDay.dateStr)
        setWeekOffset(result.week.weekOffset)
        setLastUpdated(new Date())
        setError(null)
      } catch (err: unknown) {
        if (!silent) {
          setError(err instanceof Error ? err.message : "امکان دریافت اطلاعات وجود ندارد")
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [selectedDate, weekOffset]
  )

  // Synchronize URL with active date
  const updateUrlDate = useCallback((dateStr: string) => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      if (dateStr) {
        url.searchParams.set("date", dateStr)
      } else {
        url.searchParams.delete("date")
      }
      window.history.replaceState(null, "", url.toString())
    }
  }, [])

  // Initial fetch: prioritize ?date= from URL query params, otherwise today in APP_TIMEZONE
  useEffect(() => {
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
    const initialDate = urlParams?.get("date") || ""
    fetchDashboard(false, initialDate, 0)
    const interval = setInterval(() => {
      fetchDashboard(true)
    }, 20000)
    return () => clearInterval(interval)
  }, [fetchDashboard])

  // Change selected day in the 7-day strip
  const handleSelectDay = (dateStr: string) => {
    setSelectedDate(dateStr)
    updateUrlDate(dateStr)
    fetchDashboard(false, dateStr)
  }

  // Previous Day Navigation (RTL: right arrow / previous)
  const handlePrevDay = () => {
    const cur = selectedDate || (data?.selectedDay.dateStr ?? getTehranDateString())
    const [y, m, d] = cur.split("-").map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
    dt.setUTCDate(dt.getUTCDate() - 1)
    const newDateStr = dt.toISOString().slice(0, 10)
    setSelectedDate(newDateStr)
    updateUrlDate(newDateStr)
    fetchDashboard(false, newDateStr)
  }

  // Next Day Navigation (RTL: left arrow / next)
  const handleNextDay = () => {
    const cur = selectedDate || (data?.selectedDay.dateStr ?? getTehranDateString())
    const [y, m, d] = cur.split("-").map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
    dt.setUTCDate(dt.getUTCDate() + 1)
    const newDateStr = dt.toISOString().slice(0, 10)
    setSelectedDate(newDateStr)
    updateUrlDate(newDateStr)
    fetchDashboard(false, newDateStr)
  }

  // Go to Today (Tehran / APP_TIMEZONE)
  const handleGoToToday = () => {
    const today = getTehranDateString()
    setSelectedDate(today)
    setWeekOffset(0)
    updateUrlDate(today)
    fetchDashboard(false, today, 0)
  }

  // Jalali Date Picker Selection
  const handlePickerDateChange = (dateStr: string) => {
    if (!dateStr) return
    setSelectedDate(dateStr)
    updateUrlDate(dateStr)
    fetchDashboard(false, dateStr)
  }

  // Week Navigation handlers
  const handlePrevWeek = () => {
    const nextOffset = weekOffset - 1
    setWeekOffset(nextOffset)
    fetchDashboard(false, "", nextOffset)
  }

  const handleNextWeek = () => {
    const nextOffset = weekOffset + 1
    setWeekOffset(nextOffset)
    fetchDashboard(false, "", nextOffset)
  }

  const handleCurrentWeek = () => {
    const today = getTehranDateString()
    setWeekOffset(0)
    setSelectedDate(today)
    updateUrlDate(today)
    fetchDashboard(false, today, 0)
  }

  // Quick Status Actions (Complete, Cancel, Remainder Paid)
  const handleQuickStatus = async (
    id: string,
    newStatus: string,
    remainderPaid = false,
    reason?: string
  ) => {
    try {
      setActionLoading(id)
      setError(null)

      const res = await fetch("/api/admin/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: newStatus,
          isRemainderPaid: remainderPaid,
          cancellationReason: reason || (newStatus === "CANCELLED" ? "لغو توسط مدیریت سالن" : undefined),
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "خطا در تغییر وضعیت نوبت")
      }

      setSuccessMsg(
        newStatus === "COMPLETED"
          ? "نوبت با موفقیت تسویه و تکمیل گردید."
          : newStatus === "CANCELLED"
          ? "نوبت با موفقیت لغو شد و ساعت مربوطه آزاد گردید."
          : "وضعیت نوبت به‌روزرسانی شد."
      )
      setTimeout(() => setSuccessMsg(null), 4000)

      // Close open modals
      setDetailAppointment(null)
      setCancelTarget(null)
      fetchDashboard(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در اعمال تغییرات")
    } finally {
      setActionLoading(null)
    }
  }

  // Save Edited Customer Info
  const handleSaveCustomerInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editCustomerAppointment) return
    try {
      setFormSubmitting(true)
      setError(null)

      const res = await fetch("/api/admin/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editCustomerAppointment.id,
          customerName: editName.trim(),
          customerPhone: editPhone.trim(),
          notes: editNotes.trim(),
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "خطا در ویرایش اطلاعات مراجع")
      }

      setSuccessMsg("اطلاعات مراجع با موفقیت به‌روزرسانی شد.")
      setTimeout(() => setSuccessMsg(null), 4000)
      setEditCustomerAppointment(null)
      setDetailAppointment(null)
      fetchDashboard(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در ویرایش")
    } finally {
      setFormSubmitting(false)
    }
  }

  // Submit Manual Booking
  const handleManualBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualSlot || !data) return

    if (!manualServiceId) {
      setError("لطفاً خدمت مورد نظر را انتخاب فرمایید")
      return
    }
    if (!manualCustomerName.trim() || !manualCustomerPhone.trim()) {
      setError("نام و شماره تماس مراجع الزامی است")
      return
    }

    try {
      setFormSubmitting(true)
      setError(null)

      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: manualServiceId,
          dateStr: data.selectedDay.dateStr,
          timeStr: manualSlot.time,
          customerName: manualCustomerName.trim(),
          customerPhone: manualCustomerPhone.trim(),
          notes: manualNotes.trim(),
          isDepositWaived: manualWaiveDeposit,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "خطا در ثبت نوبت دستی")
      }

      setSuccessMsg(`نوبت ساعت ${manualSlot.time} برای ${manualCustomerName} با موفقیت ثبت شد.`)
      setTimeout(() => setSuccessMsg(null), 4000)
      setManualSlot(null)
      setManualCustomerName("")
      setManualCustomerPhone("")
      setManualNotes("")
      setManualWaiveDeposit(false)
      fetchDashboard(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در ثبت نوبت")
    } finally {
      setFormSubmitting(false)
    }
  }

  // Block Slot Handler
  const handleBlockSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!blockSlot || !data) return

    const reasonToUse = blockReason === "سایر" ? customReason : blockReason
    if (!reasonToUse.trim()) {
      setError("لطفاً دلیل مسدودسازی را مشخص فرمایید")
      return
    }

    try {
      setFormSubmitting(true)
      setError(null)

      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: data.selectedDay.dateStr,
          startTime: blockSlot.time,
          endTime: blockSlot.endTime,
          reason: reasonToUse,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "خطا در مسدودسازی ساعت")
      }

      setSuccessMsg(`ساعت ${blockSlot.slotTime} با موفقیت مسدود شد.`)
      setTimeout(() => setSuccessMsg(null), 4000)
      setBlockSlot(null)
      setCustomReason("")
      fetchDashboard(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در مسدودسازی")
    } finally {
      setFormSubmitting(false)
    }
  }

  // Unblock Slot Handler
  const handleUnblock = async (blockedId: string, slotTime: string) => {
    try {
      setActionLoading(blockedId)
      setError(null)

      const res = await fetch(`/api/admin/availability?id=${blockedId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "خطا در رفع مسدودی")
      }

      setSuccessMsg(`ساعت ${slotTime} رفع مسدودی شد و به حالت آزاد بازگشت.`)
      setTimeout(() => setSuccessMsg(null), 4000)
      fetchDashboard(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در رفع مسدودی")
    } finally {
      setActionLoading(null)
    }
  }

  // Open Edit Customer Modal
  const openEditModal = (app: AppointmentDetails) => {
    setEditCustomerAppointment(app)
    setEditName(app.customerName)
    setEditPhone(app.customerPhone)
    setEditNotes(app.notes || "")
  }

  // Loading Screen
  if (loading && !data) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#A8A39A]" dir="rtl">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#C8A96B] mx-auto" />
          <p className="text-sm font-medium">در حال بارگذاری زمان‌بندی هفتگی و نوبت‌های سالن...</p>
        </div>
      </div>
    )
  }

  // Error Screen
  if (error && !data) {
    return (
      <div className="p-6 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-200 text-center space-y-3" dir="rtl">
        <AlertCircle className="w-8 h-8 mx-auto text-red-400" />
        <p className="font-medium">{error || "خطا در پردازش اطلاعات داشبورد"}</p>
        <Button onClick={() => fetchDashboard(false)} variant="outline" className="mt-2 text-xs border-red-500/40">
          تلاش مجدد
        </Button>
      </div>
    )
  }

  if (!data) return null

  const { selectedDay, week, dailySummary, timelineSlots, catalog } = data

  return (
    <div className="space-y-6 sm:space-y-8" dir="rtl">
      {/* ========================================================================= */}
      {/* TOP HEADER: BRAND, LIVE SYNC & ARCHIVE LINK */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#2D332F]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181D1A] border border-[#C8A96B]/30 text-xs font-semibold text-[#E4C88E] mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>همگام‌سازی زنده فعال (هر ۲۰ ثانیه)</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-heading text-[#F5F1E8]">
            زمان‌بندی و مدیریت نوبت‌های سالن
          </h1>
          <p className="text-xs sm:text-sm text-[#A89E90] mt-1">
            مرکز کنترل و تقویم عملیاتی کوروش باربر ({selectedDay.dayName}، {selectedDay.jalaliFormatted})
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={() => fetchDashboard(false)}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-initial border-[#2D332F] text-[#A8A39A] hover:text-[#F5F1E8] hover:bg-[#161917] text-xs gap-1.5 h-10 cursor-pointer"
            title="بروزرسانی زنده اطلاعات"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>بروزرسانی</span>
          </Button>

          <Link href="/admin/appointments" className="flex-1 sm:flex-initial">
            <Button
              variant="outline"
              className="w-full border-[#C8A96B]/40 text-[#E4C88E] hover:bg-[#1C221F] text-xs gap-1.5 h-10 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-[#C8A96B]" />
              <span>سوابق و جستجو</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Global Toast Alerts */}
      {error && (
        <div role="alert" className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div role="status" className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. WEEKLY SCHEDULE STRIP (شنبه الی جمعه - PERSIAN CALENDAR WEEK) */}
      {/* ========================================================================= */}
      <section className="bg-[#141715] border border-[#242A27] rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
        {/* Week Header & Navigation Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#202522]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#C8A96B]/15 text-[#C8A96B] flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-heading text-[#F7F4EE]">
                {week.weekTitle}
              </h2>
              <span className="text-[11px] text-[#8C8477]">
                تقویم هفتگی سالن (شنبه الی جمعه) — برای مشاهده تایم‌لاین روی هر روز کلیک فرمایید
              </span>
            </div>
          </div>

          {/* Week Nav Buttons */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <Button
              onClick={handlePrevWeek}
              variant="outline"
              size="sm"
              className="border-[#2D332F] text-[#C5BDB2] hover:text-[#F7F4EE] hover:bg-[#1E2320] text-xs h-9 px-3 gap-1 cursor-pointer"
              title="هفته قبل"
            >
              <ChevronRight className="w-4 h-4" />
              <span>هفته قبل</span>
            </Button>

            {week.weekOffset !== 0 && (
              <Button
                onClick={handleCurrentWeek}
                size="sm"
                className="bg-[#C8A96B]/20 hover:bg-[#C8A96B]/30 text-[#E4C88E] border border-[#C8A96B]/40 text-xs h-9 px-3 cursor-pointer"
              >
                <span>این هفته</span>
              </Button>
            )}

            <Button
              onClick={handleNextWeek}
              variant="outline"
              size="sm"
              className="border-[#2D332F] text-[#C5BDB2] hover:text-[#F7F4EE] hover:bg-[#1E2320] text-xs h-9 px-3 gap-1 cursor-pointer"
              title="هفته بعد"
            >
              <span>هفته بعد</span>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Day Navigation & Calendar Quick Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-[#0D0F0E] border border-[#202522]">
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrevDay}
              variant="outline"
              size="sm"
              className="border-[#2D332F] text-[#C5BDB2] hover:text-[#F7F4EE] hover:bg-[#1E2320] text-xs h-9 px-3 gap-1 cursor-pointer min-h-[44px] sm:min-h-0"
              title="روز قبل"
            >
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
              <span>روز قبل</span>
            </Button>

            {!selectedDay.isToday ? (
              <Button
                onClick={handleGoToToday}
                size="sm"
                className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs h-9 px-3.5 gap-1.5 cursor-pointer shadow-md shadow-[#C8A96B]/10 min-h-[44px] sm:min-h-0"
                title="بازگشت به تاریخ امروز"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>بازگشت به امروز</span>
              </Button>
            ) : (
              <span className="px-3 py-1.5 rounded-lg bg-[#C8A96B]/20 border border-[#C8A96B]/40 text-[#E4C88E] text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C8A96B]" />
                <span>امروز</span>
              </span>
            )}

            <Button
              onClick={handleNextDay}
              variant="outline"
              size="sm"
              className="border-[#2D332F] text-[#C5BDB2] hover:text-[#F7F4EE] hover:bg-[#1E2320] text-xs h-9 px-3 gap-1 cursor-pointer min-h-[44px] sm:min-h-0"
              title="روز بعد"
            >
              <span>روز بعد</span>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-[#8C8477] hidden md:inline">انتخاب مستقیم از تقویم جلالی:</span>
            <div className="w-full sm:w-auto min-w-[200px]">
              <JalaliDatePicker
                value={selectedDate || selectedDay.dateStr}
                onChange={handlePickerDateChange}
                placeholder="انتخاب تاریخ شمسی..."
                className="w-full sm:w-56 text-xs"
              />
            </div>
          </div>
        </div>

        {/* 7-Day Interactive Selector Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {week.weekDays.map((day) => {
            const isSelected = day.isSelected
            const isToday = day.isToday
            const isClosed = day.isClosed

            return (
              <button
                key={day.dateStr}
                onClick={() => handleSelectDay(day.dateStr)}
                type="button"
                className={`flex flex-col items-center justify-between p-3 rounded-2xl border transition-all text-right min-h-[96px] cursor-pointer relative group ${
                  isSelected
                    ? "bg-[#1E2420] border-[#C8A96B] shadow-lg shadow-[#C8A96B]/10 ring-1 ring-[#C8A96B]"
                    : "bg-[#101311] border-[#222825] hover:border-[#C8A96B]/40 hover:bg-[#161B18]"
                }`}
              >
                {/* Top Badges (Today / Closed) */}
                <div className="w-full flex items-center justify-between gap-1 text-[10px]">
                  {isToday ? (
                    <span className="px-1.5 py-0.5 rounded-md bg-[#C8A96B] text-[#0D0F0E] font-bold">
                      امروز
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#716A5E] font-medium">
                      {day.dayShort}
                    </span>
                  )}

                  {isClosed && (
                    <span className="px-1.5 py-0.5 rounded-md bg-red-950/80 border border-red-500/40 text-red-300 font-medium text-[9px]">
                      تعطیل
                    </span>
                  )}
                </div>

                {/* Day Name & Jalali Date */}
                <div className="my-1.5 text-center">
                  <div
                    className={`text-xs font-bold ${
                      isSelected ? "text-[#E4C88E]" : "text-[#F5F1E8]"
                    }`}
                  >
                    {day.dayName}
                  </div>
                  <div className="text-sm font-black font-mono text-[#F7F4EE] mt-0.5">
                    {toPersianDigits(day.jalaliDay)} {day.jalaliMonthName}
                  </div>
                </div>

                {/* Appointment Count Badge */}
                <div className="w-full pt-1 border-t border-[#1C221F] text-center">
                  {day.confirmedCount > 0 ? (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold">
                      {toPersianDigits(day.confirmedCount)} نوبت
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#716A5E]">
                      {isClosed ? "تعطیل رسمی" : "همه ساعات آزاد"}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. DAILY SUMMARY KPI STRIP (RIGHT ABOVE TIMELINE FOR SELECTED DAY) */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-[#F7F4EE]">
              خلاصه وضعیت {selectedDay.dayName} ({selectedDay.jalaliFormatted})
            </h3>
            {selectedDay.isToday && (
              <span className="px-2 py-0.5 rounded-full bg-[#C8A96B]/20 text-[#E4C88E] text-[11px] font-bold">
                روز جاری سالن
              </span>
            )}
            {selectedDay.isClosed && (
              <span className="px-2 py-0.5 rounded-full bg-red-950/70 text-red-300 border border-red-500/30 text-[11px] font-bold">
                سالن تعطیل اعلام شده است
              </span>
            )}
          </div>

          <div className="text-[11px] text-[#716A5E] font-mono">
            آخرین به‌روزرسانی زنده: {toPersianDigits(lastUpdated.toLocaleTimeString("fa-IR"))}
          </div>
        </div>

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {/* Card 1: Total Appointments Booked */}
          <Card className="bg-[#141715] border border-[#242A27] p-3.5 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-[#8C8477]">
              <span className="text-[11px] font-medium">نوبت‌های ثبت‌شده</span>
              <Calendar className="w-3.5 h-3.5 text-[#C8A96B]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-[#F7F4EE]">
                {toPersianDigits(dailySummary.occupiedSlots)}
              </span>
              <span className="text-[10px] text-[#716A5E]">
                از {toPersianDigits(dailySummary.totalSlots)} ساعت ({toPersianDigits(dailySummary.occupancyPercentage)}٪)
              </span>
            </div>
            <div className="w-full bg-[#101311] h-1 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#C8A96B] to-[#E4C88E] h-full rounded-full"
                style={{ width: `${Math.min(100, dailySummary.occupancyPercentage)}%` }}
              />
            </div>
          </Card>

          {/* Card 2: Completed Appointments */}
          <Card className="bg-[#141715] border border-[#242A27] p-3.5 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-[#8C8477]">
              <span className="text-[11px] font-medium">تکمیل و تسویه‌شده</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-blue-400">
              {toPersianDigits(dailySummary.completedCount)}
            </div>
            <span className="text-[10px] text-[#716A5E] block">نوبت انجام‌شده</span>
          </Card>

          {/* Card 3: Free Slots Remaining */}
          <Card className="bg-[#141715] border border-[#242A27] p-3.5 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-[#8C8477]">
              <span className="text-[11px] font-medium">ساعت‌های آزاد</span>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
              {toPersianDigits(dailySummary.freeSlotsCount)}
            </div>
            <span className="text-[10px] text-[#716A5E] block">آماده پذیرش مراجع</span>
          </Card>

          {/* Card 4: Deposits Collected */}
          <Card className="bg-[#141715] border border-[#242A27] p-3.5 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-[#8C8477]">
              <span className="text-[11px] font-medium">بیعانه وصول‌شده</span>
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-emerald-400 truncate">
              {formatToman(dailySummary.totalDepositsCollected)}
            </div>
            <span className="text-[10px] text-[#716A5E] block">درگاه پرداخت آنلاین</span>
          </Card>

          {/* Card 5: Balance Due in Salon */}
          <Card className="bg-[#141715] border border-[#242A27] p-3.5 rounded-2xl space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-[#8C8477]">
              <span className="text-[11px] font-medium">مانده قابل تسویه</span>
              <Clock className="w-3.5 h-3.5 text-[#E4C88E]" />
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-[#E4C88E] truncate">
              {formatToman(dailySummary.totalOutstandingBalance)}
            </div>
            <span className="text-[10px] text-[#716A5E] block">تسویه حضوری در سالن</span>
          </Card>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE DAILY TIMELINE (13 HOURLY SLOTS: 10:00 TO 23:00) */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-heading text-[#F7F4EE] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#C8A96B]" />
              <span>تایم‌لاین ساعتی سالن</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1C221F] border border-[#2D332F] text-[#E4C88E] font-mono">
                ۱۳ بازه زمانی (۱۰:۰۰ الی ۲۳:۰۰)
              </span>
            </h2>
            <p className="text-xs text-[#8C8477] mt-0.5">
              مدیریت زنده هر ساعت: برای ثبت نوبت یا مسدودسازی روی ساعت‌های آزاد، و برای مدیریت و تسویه روی نوبت‌ها کلیک فرمایید.
            </p>
          </div>
        </div>

        {/* Closed Salon Warning */}
        {selectedDay.isClosed && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold">سالن در این تاریخ تعطیل اعلام شده است.</p>
              <p className="text-[#D4AF37] mt-0.5">
                دلیل: {selectedDay.closedReason || "تعطیلی عمومی یا برنامه شخصی سالن"}
              </p>
            </div>
          </div>
        )}

        {/* 13 Timeline Slots Stack - Compact & Professional */}
        <div className="space-y-2 sm:space-y-2.5">
          {timelineSlots.map((slot) => {
            const isBooked = slot.status === "BOOKED"
            const isCompleted = slot.status === "COMPLETED"
            const isHeld = slot.status === "HELD"
            const isBlocked = slot.status === "BLOCKED"
            const isAvailable = slot.status === "AVAILABLE"
            const isPast = slot.status === "PAST"
            const isCancelled = slot.status === "CANCELLED"
            const app = slot.appointment

            return (
              <div
                key={slot.time}
                data-slot-item={slot.time}
                className={`rounded-xl border transition-all p-2.5 sm:p-3 sm:px-4 ${
                  isBooked
                    ? "bg-[#151A17] border-[#C8A96B]/40 hover:border-[#C8A96B] shadow-sm"
                    : isCompleted
                    ? "bg-[#101613] border-blue-500/30 hover:border-blue-500/50"
                    : isBlocked
                    ? "bg-[#171212] border-red-900/40"
                    : isHeld
                    ? "bg-[#1A1710] border-amber-500/40"
                    : isCancelled
                    ? "bg-[#141212] border-zinc-800"
                    : isPast
                    ? "bg-[#0E100F] border-[#1C201E] opacity-60"
                    : "bg-[#111513] border-[#222A26] hover:border-emerald-500/40 hover:bg-[#141916]"
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
                  {/* Left: Time and Status Indicator */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Time Pill */}
                    <div className="px-2.5 py-1 sm:py-1.5 rounded-lg bg-[#0A0C0B] border border-[#222825] shrink-0 text-center">
                      <span className="text-xs sm:text-sm font-black font-mono text-[#E4C88E] tracking-tight">
                        {toPersianDigits(slot.slotTime)}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isBooked && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#C8A96B]/15 border border-[#C8A96B]/30 text-[#E4C88E] text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C8A96B]" />
                          <span>رزرو شده</span>
                        </span>
                      )}

                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[11px] font-bold">
                          <Check className="w-3 h-3" />
                          <span>تکمیل و تسویه</span>
                        </span>
                      )}

                      {isAvailable && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>آزاد</span>
                        </span>
                      )}

                      {isBlocked && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/70 border border-red-500/30 text-red-300 text-[11px] font-bold">
                          <Ban className="w-3 h-3" />
                          <span>مسدود</span>
                        </span>
                      )}

                      {isHeld && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-bold">
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>در حال پرداخت</span>
                        </span>
                      )}

                      {isCancelled && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/50 border border-red-700/30 text-red-400 text-[11px] font-medium">
                          <XCircle className="w-3 h-3" />
                          <span>لغو شده</span>
                        </span>
                      )}

                      {isPast && !isBooked && !isCompleted && !isBlocked && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-900 border border-gray-700 text-gray-400 text-[11px] font-medium">
                          <span>سپری شده</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle: Appointment / Slot Details */}
                  <div className="w-full sm:flex-1 sm:px-2 min-w-0">
                    {app ? (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="font-bold text-[#F7F4EE] truncate max-w-[140px]">
                          {app.customerName}
                        </span>
                        <a
                          href={`tel:${app.customerPhone}`}
                          className="font-mono text-[#C8A96B] hover:underline dir-ltr flex items-center gap-1 text-[11px]"
                          dir="ltr"
                          title="تماس مستقیم با مشتری"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{app.customerPhone}</span>
                        </a>
                        <span className="px-2 py-0.5 rounded bg-[#1C221F] border border-[#2D332F] text-[10px] text-[#E4C88E]">
                          {app.serviceName}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-[#8C8477]">
                          <span>
                            بیعانه:{" "}
                            <strong className="text-emerald-400 font-mono font-medium">
                              {formatToman(app.depositPaid)}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            مانده:{" "}
                            {app.isRemainderPaid ? (
                              <span className="text-emerald-400 font-bold">تسویه شد</span>
                            ) : (
                              <strong className="text-[#E4C88E] font-mono font-medium">
                                {formatToman(app.balanceDue)}
                              </strong>
                            )}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#716A5E] font-mono hidden md:inline">
                          کد: {app.trackingCode}
                        </span>
                      </div>
                    ) : isBlocked ? (
                      <div className="text-xs text-[#A89E90] flex items-center gap-1.5">
                        <span className="text-[#716A5E]">دلیل مسدودی:</span>
                        <strong className="text-red-300 font-medium">{slot.blockedInfo?.reason}</strong>
                      </div>
                    ) : isHeld ? (
                      <div className="text-xs text-amber-300/80">
                        مشتری در درگاه پرداخت بانکی در حال تکمیل رزرو است (مهلت ۱۰ دقیقه).
                        {slot.holdInfo?.customerPhone && (
                          <span className="font-mono ml-2 dir-ltr">
                            شماره: {slot.holdInfo.customerPhone}
                          </span>
                        )}
                      </div>
                    ) : isAvailable ? (
                      <div className="text-xs text-[#716A5E] italic">
                        ساعت آزاد جهت رزرو آنلاین یا پذیرش حضوری
                      </div>
                    ) : (
                      <div className="text-xs text-[#716A5E]">بازه کاری سپری شده</div>
                    )}
                  </div>

                  {/* Right: Direct Actions (Compact, responsive, min 44px on mobile) */}
                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end pt-1.5 sm:pt-0 border-t sm:border-t-0 border-[#1C221F]">
                    {/* BOOKED SLOT ACTIONS */}
                    {isBooked && app && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setDetailAppointment(app)}
                          className="flex-1 sm:flex-initial bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs h-9 sm:h-8 px-2.5 cursor-pointer min-h-[44px] sm:min-h-0"
                        >
                          <User className="w-3.5 h-3.5 ml-1" />
                          <span>مدیریت</span>
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleQuickStatus(app.id, "COMPLETED", true)}
                          disabled={actionLoading === app.id}
                          className="flex-1 sm:flex-initial bg-emerald-700 hover:bg-emerald-600 text-white text-xs h-9 sm:h-8 px-2.5 cursor-pointer min-h-[44px] sm:min-h-0"
                          title="تسویه مانده و ثبت تکمیل خدمت"
                        >
                          <Check className="w-3.5 h-3.5 ml-1" />
                          <span>تسویه و تکمیل</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRescheduleAppointment(app)}
                          className="border-[#2D332F] text-[#A8A39A] hover:text-[#F7F4EE] text-xs h-9 sm:h-8 px-2 cursor-pointer min-h-[44px] sm:min-h-0"
                          title="تغییر تاریخ یا ساعت نوبت"
                        >
                          <Clock className="w-3.5 h-3.5 ml-1 text-[#C8A96B]" />
                          <span>جابجایی</span>
                        </Button>
                      </>
                    )}

                    {/* COMPLETED SLOT ACTIONS */}
                    {isCompleted && app && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDetailAppointment(app)}
                        className="w-full sm:w-auto border-[#2D332F] text-[#C5BDB2] hover:text-[#F7F4EE] text-xs h-9 sm:h-8 px-2.5 cursor-pointer min-h-[44px] sm:min-h-0"
                      >
                        <User className="w-3.5 h-3.5 ml-1 text-blue-400" />
                        <span>مشاهده پرونده</span>
                      </Button>
                    )}

                    {/* AVAILABLE SLOT ACTIONS */}
                    {isAvailable && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            setManualSlot(slot)
                            if (catalog.services.length > 0) {
                              setManualServiceId(catalog.services[0].id)
                            }
                          }}
                          className="flex-1 sm:flex-initial bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs h-9 sm:h-8 px-3 cursor-pointer gap-1 min-h-[44px] sm:min-h-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>ثبت دستی</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setBlockSlot(slot)
                            setBlockReason("استراحت و ناهار")
                            setCustomReason("")
                          }}
                          className="flex-1 sm:flex-initial border-[#2D332F] text-[#A8A39A] hover:text-red-300 hover:bg-[#1F1717] text-xs h-9 sm:h-8 px-2.5 cursor-pointer gap-1 min-h-[44px] sm:min-h-0"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>مسدودسازی</span>
                        </Button>
                      </>
                    )}

                    {/* BLOCKED SLOT ACTIONS */}
                    {isBlocked && slot.blockedInfo && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnblock(slot.blockedInfo!.id, slot.slotTime)}
                        disabled={actionLoading === slot.blockedInfo.id}
                        className="w-full sm:w-auto border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40 text-xs h-9 sm:h-8 px-3 cursor-pointer gap-1 min-h-[44px] sm:min-h-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>آزاد کردن ساعت</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODAL 1: APPOINTMENT DETAILS & DIRECT MANAGEMENT MODAL */}
      {/* ========================================================================= */}
      {detailAppointment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          dir="rtl"
        >
          <div className="bg-[#161917] border border-[#2D332F] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#242A27]">
              <div>
                <span className="text-xs text-[#8C8477] font-mono">
                  کد رهگیری: {detailAppointment.trackingCode}
                </span>
                <h3 className="text-lg font-bold font-heading text-[#F7F4EE] mt-0.5">
                  پرونده نوبت {detailAppointment.customerName}
                </h3>
              </div>
              <button
                onClick={() => setDetailAppointment(null)}
                className="w-9 h-9 rounded-xl bg-[#222825] hover:bg-[#2C3330] text-[#A8A39A] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              {/* Date & Time Highlight */}
              <div className="bg-[#101311] p-3.5 rounded-2xl border border-[#222825] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#8C8477]">زمان رزرو شده نوبت:</span>
                  <span className="font-bold text-[#E4C88E] font-mono text-sm">
                    {detailAppointment.slotTime}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8C8477]">تاریخ شمسی:</span>
                  <span className="text-[#F7F4EE] font-bold">
                    {detailAppointment.jalaliFull}
                  </span>
                </div>
                {detailAppointment.createdAtTime && (
                  <div className="flex items-center justify-between pt-1 border-t border-[#1C221F] text-[11px] text-[#716A5E]">
                    <span>زمان ثبت رزرو در سیستم:</span>
                    <span className="font-mono">
                      {toPersianDigits(detailAppointment.createdAtTime)} (تاریخ {detailAppointment.createdAtJalali})
                    </span>
                  </div>
                )}
              </div>

              {/* Customer & Service Info */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[#101311] p-3 rounded-xl border border-[#222825]">
                  <span className="text-[#716A5E] block text-[10px]">نام مراجع:</span>
                  <strong className="text-sm text-[#F7F4EE] mt-0.5 block">
                    {detailAppointment.customerName}
                  </strong>
                </div>

                <div className="bg-[#101311] p-3 rounded-xl border border-[#222825]">
                  <span className="text-[#716A5E] block text-[10px]">شماره تماس:</span>
                  <a
                    href={`tel:${detailAppointment.customerPhone}`}
                    className="text-sm font-mono text-[#C8A96B] font-bold mt-0.5 block dir-ltr"
                    dir="ltr"
                  >
                    {detailAppointment.customerPhone}
                  </a>
                </div>

                <div className="bg-[#101311] p-3 rounded-xl border border-[#222825]">
                  <span className="text-[#716A5E] block text-[10px]">خدمت انتخابی:</span>
                  <strong className="text-[#F7F4EE] mt-0.5 block">
                    {detailAppointment.serviceName}
                  </strong>
                </div>

                <div className="bg-[#101311] p-3 rounded-xl border border-[#222825]">
                  <span className="text-[#716A5E] block text-[10px]">آرایشگر:</span>
                  <strong className="text-[#F7F4EE] mt-0.5 block">
                    {detailAppointment.barberName}
                  </strong>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-[#0D0F0E] p-3.5 rounded-2xl border border-[#222825] space-y-2">
                <div className="flex justify-between items-center text-[#8C8477]">
                  <span>مبلغ کل خدمت:</span>
                  <strong className="text-[#F7F4EE] font-mono">
                    {formatToman(detailAppointment.totalPrice)}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-[#8C8477]">
                  <span>بیعانه پرداختی آنلاین:</span>
                  <strong className="text-emerald-400 font-mono">
                    {formatToman(detailAppointment.depositPaid)}
                  </strong>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[#1C221F]">
                  <span className="font-bold text-[#F7F4EE]">مانده قابل تسویه در سالن:</span>
                  <strong className="text-[#E4C88E] font-mono text-sm">
                    {detailAppointment.isRemainderPaid ? (
                      <span className="text-emerald-400 font-bold">تسویه شده است</span>
                    ) : (
                      formatToman(detailAppointment.balanceDue)
                    )}
                  </strong>
                </div>
              </div>

              {/* Notes if any */}
              {detailAppointment.notes && (
                <div className="bg-[#101311] p-3 rounded-xl border border-[#222825]">
                  <span className="text-[#716A5E] block text-[10px]">توضیحات مشتری:</span>
                  <p className="text-xs text-[#C5BDB2] mt-0.5">{detailAppointment.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-5 border-t border-[#242A27] bg-[#121513] flex flex-wrap gap-2">
              {detailAppointment.status === "CONFIRMED" && (
                <Button
                  onClick={() => handleQuickStatus(detailAppointment.id, "COMPLETED", true)}
                  disabled={actionLoading === detailAppointment.id}
                  className="flex-1 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs h-11 cursor-pointer"
                >
                  <Check className="w-4 h-4 ml-1" />
                  <span>تکمیل و تسویه نوبت</span>
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  const appToReschedule = detailAppointment
                  setDetailAppointment(null)
                  setRescheduleAppointment(appToReschedule)
                }}
                className="flex-1 border-[#C8A96B]/50 text-[#E4C88E] hover:bg-[#C8A96B]/15 text-xs h-11 cursor-pointer"
              >
                <Clock className="w-4 h-4 ml-1 text-[#C8A96B]" />
                <span>تغییر زمان یا تاریخ</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => openEditModal(detailAppointment)}
                className="border-[#2D332F] text-[#A8A39A] hover:text-[#F7F4EE] text-xs h-11 px-3 cursor-pointer"
                title="ویرایش نام و شماره تماس"
              >
                <Edit3 className="w-4 h-4" />
                <span className="sr-only">ویرایش</span>
              </Button>

              {detailAppointment.status === "CONFIRMED" && (
                <Button
                  variant="outline"
                  onClick={() => setCancelTarget(detailAppointment)}
                  className="border-red-950/70 text-red-400 hover:bg-red-950/40 text-xs h-11 px-3 cursor-pointer"
                  title="لغو این نوبت"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="sr-only">لغو</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: STREAMLINED MANUAL BOOKING MODAL (FOR AVAILABLE SLOTS) */}
      {/* ========================================================================= */}
      {manualSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          dir="rtl"
        >
          <div className="bg-[#161917] border border-[#2D332F] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#242A27]">
              <div>
                <span className="text-xs text-emerald-400 font-bold">پذیرش حضوری / تلفنی</span>
                <h3 className="text-lg font-bold font-heading text-[#F7F4EE] mt-0.5">
                  ثبت نوبت برای ساعت {manualSlot.time}
                </h3>
              </div>
              <button
                onClick={() => setManualSlot(null)}
                className="w-9 h-9 rounded-xl bg-[#222825] hover:bg-[#2C3330] text-[#A8A39A] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualBookingSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
              {/* Date & Slot Pre-filled Banner */}
              <div className="p-3 rounded-xl bg-[#101311] border border-[#222825] flex items-center justify-between">
                <div>
                  <span className="text-[#716A5E] block text-[10px]">تاریخ نوبت:</span>
                  <strong className="text-[#F7F4EE]">
                    {selectedDay.dayName}، {selectedDay.jalaliFormatted}
                  </strong>
                </div>
                <div className="text-left">
                  <span className="text-[#716A5E] block text-[10px]">بازه ساعتی:</span>
                  <strong className="text-[#E4C88E] font-mono text-sm">
                    {manualSlot.slotTime}
                  </strong>
                </div>
              </div>

              {/* Service Selection */}
              <div>
                <label className="block text-[#C5BDB2] font-medium mb-1.5">
                  خدمت انتخابی سالن <span className="text-red-400">*</span>
                </label>
                <select
                  value={manualServiceId}
                  onChange={(e) => setManualServiceId(e.target.value)}
                  className="w-full bg-[#101311] border border-[#2D332F] rounded-xl px-3 py-2.5 text-xs text-[#F5F1E8] focus:border-[#C8A96B] outline-none"
                  required
                >
                  {catalog.services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {formatToman(s.price)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-[#C5BDB2] font-medium mb-1.5">
                  نام و نام خانوادگی مراجع <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={manualCustomerName}
                  onChange={(e) => setManualCustomerName(e.target.value)}
                  placeholder="مثال: کوروش رستمی"
                  className="w-full bg-[#101311] border border-[#2D332F] rounded-xl px-3 py-2.5 text-xs text-[#F5F1E8] focus:border-[#C8A96B] outline-none"
                  required
                />
              </div>

              {/* Customer Phone */}
              <div>
                <label className="block text-[#C5BDB2] font-medium mb-1.5">
                  شماره موبایل مشتری <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={manualCustomerPhone}
                  onChange={(e) => setManualCustomerPhone(e.target.value)}
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  dir="ltr"
                  className="w-full bg-[#101311] border border-[#2D332F] rounded-xl px-3 py-2.5 text-xs text-[#F5F1E8] focus:border-[#C8A96B] outline-none text-right font-mono"
                  required
                />
              </div>

              {/* Waive Deposit Checkbox */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#101311] border border-[#222825]">
                <input
                  type="checkbox"
                  id="waiveDeposit"
                  checked={manualWaiveDeposit}
                  onChange={(e) => setManualWaiveDeposit(e.target.checked)}
                  className="w-4 h-4 rounded text-[#C8A96B] focus:ring-[#C8A96B]"
                />
                <label htmlFor="waiveDeposit" className="text-xs text-[#C5BDB2] cursor-pointer">
                  معاف از بیعانه آنلاین (کل مبلغ در سالن تسویه می‌شود)
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[#C5BDB2] font-medium mb-1.5">
                  یادداشت یا توضیحات مدیر سالن (اختیاری)
                </label>
                <textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="مثلاً: هماهنگ شده به صورت تلفنی..."
                  rows={2}
                  className="w-full bg-[#101311] border border-[#2D332F] rounded-xl p-2.5 text-xs text-[#F5F1E8] focus:border-[#C8A96B] outline-none resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setManualSlot(null)}
                  className="flex-1 border-[#2D332F] text-[#A8A39A] text-xs h-11"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs h-11 cursor-pointer"
                >
                  {formSubmitting ? "در حال ثبت نوبت..." : "ثبت قطعی نوبت"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: BLOCK SLOT MODAL */}
      {/* ========================================================================= */}
      {blockSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          dir="rtl"
        >
          <div className="bg-[#161917] border border-[#2D332F] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#242A27]">
              <div>
                <span className="text-xs text-red-400 font-bold">بستن ساعت سالن</span>
                <h3 className="text-base font-bold font-heading text-[#F7F4EE] mt-0.5">
                  مسدودسازی ساعت {blockSlot.slotTime}
                </h3>
              </div>
              <button
                onClick={() => setBlockSlot(null)}
                className="w-9 h-9 rounded-xl bg-[#222825] hover:bg-[#2C3330] text-[#A8A39A] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBlockSlotSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
              <p className="text-[#A89E90]">
                با مسدود کردن این بازه، ساعت مربوطه از سایت مشتریان حذف شده و امکان رزرو آنلاین وجود نخواهد داشت.
              </p>

              <div>
                <label className="block text-[#C5BDB2] font-medium mb-1.5">
                  انتخاب دلیل مسدودسازی:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {["استراحت و ناهار", "کار شخصی آرایشگر", "نظافت و تعمیرات سالن", "سایر"].map((r) => (
                    <label
                      key={r}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        blockReason === r
                          ? "bg-[#C8A96B]/15 border-[#C8A96B] text-[#E4C88E] font-bold"
                          : "bg-[#101311] border-[#222825] text-[#C5BDB2]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="blockReasonRadio"
                        value={r}
                        checked={blockReason === r}
                        onChange={() => setBlockReason(r)}
                        className="text-[#C8A96B]"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              {blockReason === "سایر" && (
                <div>
                  <label className="block text-[#C5BDB2] font-medium mb-1.5">
                    توضیح دلیل اختصاصی:
                  </label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="علت مسدودسازی..."
                    className="w-full bg-[#101311] border border-[#2D332F] rounded-xl px-3 py-2 text-xs text-[#F5F1E8] focus:border-[#C8A96B] outline-none"
                    required
                  />
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBlockSlot(null)}
                  className="flex-1 border-[#2D332F] text-[#A8A39A] text-xs h-11"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 bg-red-800 hover:bg-red-700 text-white font-bold text-xs h-11 cursor-pointer"
                >
                  {formSubmitting ? "در حال ثبت..." : "مسدودسازی ساعت"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT CUSTOMER INFO MODAL */}
      {/* ========================================================================= */}
      {editCustomerAppointment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          dir="rtl"
        >
          <div className="bg-[#161917] border border-[#2D332F] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#242A27]">
              <div>
                <span className="text-xs text-[#C8A96B] font-bold">ویرایش پرونده مراجع</span>
                <h3 className="text-base font-bold font-heading text-[#F7F4EE] mt-0.5">
                  کد رهگیری: {editCustomerAppointment.trackingCode}
                </h3>
              </div>
              <button
                onClick={() => setEditCustomerAppointment(null)}
                className="w-9 h-9 rounded-xl bg-[#222825] hover:bg-[#2C3330] text-[#A8A39A] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerInfo} className="p-4 sm:p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[#C5BDB2] font-medium mb-1.5">نام مراجع:</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#101311] border border-[#2D332F] rounded-xl px-3 py-2 text-xs text-[#F5F1E8] focus:border-[#C8A96B] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[#C5BDB2] font-medium mb-1.5">شماره تماس:</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  dir="ltr"
                  className="w-full bg-[#101311] border border-[#2D332F] rounded-xl px-3 py-2 text-xs text-[#F5F1E8] focus:border-[#C8A96B] outline-none text-right font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[#C5BDB2] font-medium mb-1.5">یادداشت مدیر:</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-[#101311] border border-[#2D332F] rounded-xl p-2.5 text-xs text-[#F5F1E8] focus:border-[#C8A96B] outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditCustomerAppointment(null)}
                  className="flex-1 border-[#2D332F] text-[#A8A39A] text-xs h-11"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs h-11 cursor-pointer"
                >
                  {formSubmitting ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CANCEL APPOINTMENT CONFIRMATION */}
      {/* ========================================================================= */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          dir="rtl"
        >
          <div className="bg-[#161917] border border-red-500/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 sm:p-5 border-b border-[#242A27]">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-bold font-heading text-[#F7F4EE]">
                  تأیید لغو نوبت
                </h3>
              </div>
              <p className="text-xs text-[#A89E90] mt-1">
                آیا از لغو نوبت {cancelTarget.customerName} در ساعت {cancelTarget.slotTime} اطمینان دارید؟ با لغو نوبت، این ساعت مجدداً برای دیگران آزاد خواهد شد.
              </p>
            </div>

            <div className="p-4 sm:p-5 space-y-3 text-xs">
              <div>
                <label className="block text-[#C5BDB2] font-medium mb-1">
                  علت لغو نوبت (اختیاری):
                </label>
                <input
                  type="text"
                  value={cancelReasonText}
                  onChange={(e) => setCancelReasonText(e.target.value)}
                  placeholder="مثال: درخواست تلفنی مشتری جهت لغو..."
                  className="w-full bg-[#101311] border border-[#2D332F] rounded-xl px-3 py-2 text-xs text-[#F5F1E8] focus:border-[#C8A96B] outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCancelTarget(null)}
                  className="flex-1 border-[#2D332F] text-[#A8A39A] text-xs h-11"
                >
                  انصراف
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    handleQuickStatus(
                      cancelTarget.id,
                      "CANCELLED",
                      false,
                      cancelReasonText.trim() || "لغو توسط مدیریت سالن"
                    )
                  }
                  disabled={actionLoading === cancelTarget.id}
                  className="flex-1 bg-red-800 hover:bg-red-700 text-white font-bold text-xs h-11 cursor-pointer"
                >
                  {actionLoading === cancelTarget.id ? "در حال لغو..." : "بله، نوبت لغو شود"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: EXISTING RESCHEDULE APPOINTMENT MODAL */}
      {/* ========================================================================= */}
      <RescheduleAppointmentModal
        appointment={rescheduleAppointment}
        isOpen={Boolean(rescheduleAppointment)}
        onClose={() => setRescheduleAppointment(null)}
        onSuccess={() => {
          setSuccessMsg("زمان نوبت با موفقیت تغییر کرد و جدول به‌روزرسانی شد.")
          setTimeout(() => setSuccessMsg(null), 4000)
          fetchDashboard(true)
        }}
      />
    </div>
  )
}
