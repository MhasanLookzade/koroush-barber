"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatToman, toPersianDigits, getTehranDateString, getJalaliDate } from "@/lib/jalali"
import { JalaliDatePicker } from "@/components/ui/JalaliDatePicker"
import { RescheduleAppointmentModal } from "@/components/admin/RescheduleAppointmentModal"
import {
  Calendar,
  Clock,
  Scissors,
  Users,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Phone,
  UserCheck,
  CreditCard,
  Edit,
} from "lucide-react"

interface AppointmentItem {
  id: string
  trackingCode: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  serviceId: string
  serviceName: string
  barberName: string
  status: string
  dateUtc: string
  jalaliFull: string
  time: string
  endTime?: string
  slotTime?: string
  createdAtTime?: string
  createdAtJalali?: string
  totalPrice: number
  depositPaid: number
  balanceDue: number
  isRemainderPaid: boolean
  adminNotes?: string
  cancellationReason?: string
}

interface ServiceItem {
  id: string
  name: string
  price: number
  depositPrice: number
}

function AppointmentsContent() {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get("search") || ""
  const initialStatus = searchParams.get("status") || "ALL"

  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(getTehranDateString())
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus)
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [rescheduleAppointment, setRescheduleAppointment] = useState<AppointmentItem | null>(null)

  // Manual booking modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [manualServiceId, setManualServiceId] = useState("")
  const [manualTime, setManualTime] = useState("14:00")
  const [manualName, setManualName] = useState("")
  const [manualPhone, setManualPhone] = useState("")
  const [manualNotes, setManualNotes] = useState("")
  const [waiveDeposit, setWaiveDeposit] = useState(false)

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      const url = new URL("/api/admin/appointments", window.location.origin)
      if (selectedDate) url.searchParams.set("date", selectedDate)
      if (statusFilter && statusFilter !== "ALL") url.searchParams.set("status", statusFilter)
      if (searchQuery) url.searchParams.set("search", searchQuery)

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error("خطا در دریافت لیست نوبت‌ها")
      const data = await res.json()
      setAppointments(data)
    } catch {
      setError("خطا در ارتباط با سرور")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [selectedDate, statusFilter])

  // Load services for manual booking
  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch("/api/booking/services")
        if (res.ok) {
          const data = await res.json()
          setServices(data)
          if (data.length > 0) setManualServiceId(data[0].id)
        }
      } catch {
        // Ignored
      }
    }
    loadServices()
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchAppointments()
  }

  // Quick Status Actions
  const handleUpdateStatus = async (
    id: string,
    newStatus: string,
    isRemainderPaid?: boolean
  ) => {
    try {
      setActionLoading(id)
      setError(null)
      const body: Record<string, unknown> = { id, status: newStatus }
      if (isRemainderPaid !== undefined) body.isRemainderPaid = isRemainderPaid

      const res = await fetch("/api/admin/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "خطا در به‌روزرسانی نوبت")

      setSuccessMsg(data.message)
      fetchAppointments()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطای عملیات")
    } finally {
      setActionLoading(null)
    }
  }

  // Create Manual Booking
  const handleManualBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualServiceId || !manualName || !manualPhone) {
      setError("لطفاً اطلاعات الزامی نوبت را تکمیل فرمایید")
      return
    }

    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: manualServiceId,
          dateStr: selectedDate,
          timeStr: manualTime,
          customerName: manualName,
          customerPhone: manualPhone,
          notes: manualNotes,
          isDepositWaived: waiveDeposit,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "این بازه زمانی در دسترس نیست")

      setSuccessMsg("نوبت با موفقیت ثبت شد.")
      setIsModalOpen(false)
      setManualName("")
      setManualPhone("")
      setManualNotes("")
      fetchAppointments()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در ثبت نوبت دستی")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Title & Manual Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#2D332F]">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#F5F1E8]">
            مدیریت نوبت‌ها و تقویم سالن
          </h1>
          <p className="text-xs text-[#A8A39A] mt-1">
            مشاهده، ثبت دستی، تغییر وضعیت حضور و تسویه مانده نوبت‌های مشتریان
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs gap-1.5 px-4 py-5 rounded-xl shadow-lg"
        >
          <Plus className="w-4 h-4" />
          ثبت نوبت دستی (پذیرش)
        </Button>
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div role="status" className="p-3.5 rounded-xl bg-green-950/40 border border-green-500/40 text-green-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-[#161917] p-4 rounded-2xl border border-[#2D332F] flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Jalali Date Filter */}
        <div className="flex items-center gap-2 min-w-[220px]">
          <JalaliDatePicker
            value={selectedDate}
            onChange={(d) => setSelectedDate(d)}
            placeholder="انتخاب تاریخ روز..."
            className="w-full text-xs"
          />
        </div>

        {/* Status Tab buttons */}
        <div className="flex flex-wrap gap-1">
          {["ALL", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW", "PAYMENT_REVIEW"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                statusFilter === st
                  ? "bg-[#C8A96B] text-[#0D0F0E] font-bold"
                  : "bg-[#1F2321] text-[#A8A39A] hover:text-[#F5F1E8]"
              }`}
            >
              {st === "ALL"
                ? "همه"
                : st === "CONFIRMED"
                ? "تایید شده"
                : st === "COMPLETED"
                ? "تکمیل شده"
                : st === "CANCELLED"
                ? "لغو شده"
                : st === "NO_SHOW"
                ? "عدم حضور"
                : "مغایرت پرداخت"}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی نام، تلفن یا کد..."
            className="bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-1.5 text-xs text-[#F5F1E8] placeholder:text-[#555C57] focus:outline-none focus:border-[#C8A96B] w-48"
          />
          <Button type="submit" size="sm" variant="outline" className="border-[#2D332F] text-xs">
            <Search className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="p-12 text-center text-[#A8A39A] text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C8A96B] mb-2" />
          در حال بارگذاری نوبت‌ها...
        </div>
      ) : appointments.length === 0 ? (
        <div className="p-10 text-center bg-[#161917] border border-[#2D332F] rounded-2xl text-xs text-[#A8A39A] space-y-2">
          <Calendar className="w-8 h-8 mx-auto opacity-30" />
          <p>هیچ نوبتی مطابق با فیلترهای انتخابی یافت نشد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {appointments.map((a) => (
            <Card
              key={a.id}
              className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] p-5 rounded-2xl space-y-3"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-[#2D332F]">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <div className="text-lg font-mono font-bold text-[#C8A96B]">
                      {toPersianDigits(a.slotTime || a.time)}
                    </div>
                    {a.createdAtTime && (
                      <span className="text-[10px] text-[#A8A39A] font-mono mt-0.5">
                        زمان ثبت رزرو: {toPersianDigits(a.createdAtTime)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#F5F1E8]">{a.customerName}</h3>
                    <span className="text-xs text-[#A8A39A] font-mono dir-ltr" dir="ltr">
                      {a.customerPhone}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#A8A39A] dir-ltr" dir="ltr">
                    {a.trackingCode}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      a.status === "CONFIRMED"
                        ? "border-green-500/40 text-green-400 bg-green-500/10 text-[10px]"
                        : a.status === "COMPLETED"
                        ? "border-blue-500/40 text-blue-400 bg-blue-500/10 text-[10px]"
                        : a.status === "CANCELLED"
                        ? "border-red-500/40 text-red-400 bg-red-500/10 text-[10px]"
                        : "border-gray-500/40 text-gray-400 text-[10px]"
                    }
                  >
                    {a.status === "CONFIRMED"
                      ? "تایید شده"
                      : a.status === "COMPLETED"
                      ? "تکمیل شده"
                      : a.status === "CANCELLED"
                      ? "لغو شده"
                      : a.status === "NO_SHOW"
                      ? "عدم حضور"
                      : a.status}
                  </Badge>
                </div>
              </div>

              {/* Financial & Service row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-[#0D0F0E] p-3 rounded-xl border border-[#2D332F]">
                <div>
                  <span className="text-[#A8A39A] block">خدمت:</span>
                  <span className="font-bold text-[#F5F1E8]">{a.serviceName}</span>
                </div>
                <div>
                  <span className="text-[#A8A39A] block">مبلغ کل:</span>
                  <span className="font-bold text-[#F5F1E8]">{formatToman(a.totalPrice)}</span>
                </div>
                <div>
                  <span className="text-[#A8A39A] block">بیعانه واریزی:</span>
                  <span className="font-bold text-green-400">{formatToman(a.depositPaid)}</span>
                </div>
                <div>
                  <span className="text-[#A8A39A] block">مانده تسویه:</span>
                  {a.isRemainderPaid ? (
                    <span className="text-green-400 font-bold">تسویه شد (۰ تومان)</span>
                  ) : (
                    <span className="font-bold text-[#C8A96B]">{formatToman(a.balanceDue)}</span>
                  )}
                </div>
              </div>

              {a.adminNotes && (
                <p className="text-[11px] text-[#A8A39A] bg-[#1F2321] p-2 rounded-lg border border-[#2D332F]">
                  یادداشت: {a.adminNotes}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 justify-end pt-1">
                {a.status === "CONFIRMED" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRescheduleAppointment(a)}
                      className="border-[#C8A96B]/50 text-[#E4C88E] hover:bg-[#C8A96B]/15 text-xs gap-1.5 min-h-[36px] cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#C8A96B]" />
                      <span>تغییر تاریخ یا ساعت نوبت</span>
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(a.id, "COMPLETED", true)}
                      disabled={actionLoading === a.id}
                      className="bg-green-700 hover:bg-green-600 text-white text-xs gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      انجام شد + تسویه مانده
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(a.id, "NO_SHOW")}
                      disabled={actionLoading === a.id}
                      className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs"
                    >
                      عدم حضور (No-Show)
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(a.id, "CANCELLED")}
                      disabled={actionLoading === a.id}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
                    >
                      لغو نوبت
                    </Button>
                  </>
                )}

                {a.status === "COMPLETED" && !a.isRemainderPaid && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(a.id, "COMPLETED", true)}
                    className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs"
                  >
                    ثبت تسویه مانده نقدی
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Manual Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-[#161917] border-[#2D332F] text-[#F5F1E8] p-6 rounded-3xl shadow-2xl space-y-4">
            <CardHeader className="p-0 pb-3 border-b border-[#2D332F] flex justify-between items-center">
              <CardTitle className="text-lg font-bold">ثبت نوبت دستی توسط پذیرش</CardTitle>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#A8A39A] hover:text-[#F5F1E8] text-sm"
              >
                بستن &times;
              </button>
            </CardHeader>

            <form onSubmit={handleManualBooking} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[#A8A39A] block">انتخاب خدمت:</label>
                <select
                  value={manualServiceId}
                  onChange={(e) => setManualServiceId(e.target.value)}
                  className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] text-xs focus:outline-none"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatToman(s.price)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#A8A39A] block">تاریخ نوبت (جلالی):</label>
                  <JalaliDatePicker
                    value={selectedDate}
                    onChange={(d) => setSelectedDate(d)}
                    placeholder="انتخاب تاریخ جلالی..."
                    className="w-full text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#A8A39A] block">ساعت شروع:</label>
                  <select
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] text-xs focus:outline-none"
                  >
                    {[
                      "10:00",
                      "11:00",
                      "12:00",
                      "13:00",
                      "14:00",
                      "15:00",
                      "16:00",
                      "17:00",
                      "18:00",
                      "19:00",
                      "20:00",
                      "21:00",
                      "22:00",
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t} الی {parseInt(t) + 1}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#A8A39A] block">نام مشتری:</label>
                  <input
                    type="text"
                    required
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="مثال: کیان راد"
                    className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#A8A39A] block">شماره موبایل:</label>
                  <input
                    type="tel"
                    dir="ltr"
                    required
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="09123456789"
                    className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#A8A39A] block">یادداشت پذیرش:</label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="توضیحات اختیاری..."
                  className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] text-xs focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-[#A8A39A]">
                <input
                  type="checkbox"
                  checked={waiveDeposit}
                  onChange={(e) => setWaiveDeposit(e.target.checked)}
                  className="rounded bg-[#1F2321] border-[#2D332F]"
                />
                <span>معافیت از بیعانه آنلاین (تسویه ۱۰۰٪ در سالن)</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2D332F]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="border-[#2D332F] text-xs"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs px-5"
                >
                  ثبت قطعی نوبت
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Reschedule Modal */}
      <RescheduleAppointmentModal
        appointment={rescheduleAppointment}
        isOpen={Boolean(rescheduleAppointment)}
        onClose={() => setRescheduleAppointment(null)}
        onSuccess={() => {
          setSuccessMsg("زمان نوبت با موفقیت تغییر کرد.")
          fetchAppointments()
        }}
      />
    </div>
  )
}

export default function AdminAppointmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-[#A8A39A] text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C8A96B] mb-2" />
          در حال بارگذاری نوبت‌ها...
        </div>
      }
    >
      <AppointmentsContent />
    </Suspense>
  )
}
