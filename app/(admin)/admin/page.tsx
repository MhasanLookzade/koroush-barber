"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatToman, toPersianDigits } from "@/lib/jalali"
import { RescheduleAppointmentModal } from "@/components/admin/RescheduleAppointmentModal"
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
  Sparkles,
  Phone,
  ArrowUpRight,
  ShieldAlert,
  UserCheck,
  Check,
} from "lucide-react"

interface AppointmentItem {
  id: string
  trackingCode: string
  customerName: string
  customerPhone: string
  serviceName: string
  dateUtc: string
  jalaliFull: string
  time: string
  endTime?: string
  slotTime?: string
  createdAtTime?: string
  createdAtJalali?: string
  status: string
  totalPrice: number
  depositPaid: number
  balanceDue: number
  isRemainderPaid: boolean
  adminNotes?: string
}

interface DashboardData {
  today: {
    tehranDate: string
    jalaliFormatted: string
    dayName: string
  }
  metrics: {
    totalSlots: number
    occupiedSlots: number
    occupancyPercentage: number
    confirmedCount: number
    completedCount: number
    cancelledCount: number
    noShowCount: number
    paymentReviewCount: number
    totalDepositsCollected: number
    totalOutstandingBalance: number
    totalGrossValue: number
  }
  nextAppointment: {
    id: string
    trackingCode: string
    customerName: string
    customerPhone: string
    serviceName: string
    time: string
    balanceDue: number
  } | null
  appointments: AppointmentItem[]
  recentLogs: Array<{
    id: string
    action: string
    details: string
    createdAt: string
  }>
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rescheduleAppointment, setRescheduleAppointment] = useState<AppointmentItem | null>(null)

  const fetchDashboard = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await fetch("/api/admin/dashboard")
      if (!res.ok) throw new Error("خطا در بارگذاری داشبورد")
      const result = await res.json()
      setData(result)
      setLastUpdated(new Date())
      setError(null)
    } catch {
      if (!silent) setError("امکان دریافت آمار داشبورد وجود ندارد")
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Initial fetch and 20-second live polling synchronization
  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(() => {
      fetchDashboard(true)
    }, 20000)
    return () => clearInterval(interval)
  }, [])

  const handleQuickStatus = async (id: string, newStatus: string, remainderPaid = false) => {
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
          cancellationReason: newStatus === "CANCELLED" ? "لغو از جدول داشبورد امروز" : undefined,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "خطا در تغییر وضعیت نوبت")
      }

      setSuccessMsg(newStatus === "COMPLETED" ? "نوبت با موفقیت تسویه و تکمیل گردید." : "نوبت با موفقیت لغو شد.")
      setTimeout(() => setSuccessMsg(null), 3000)
      fetchDashboard(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در اعمال تغییرات")
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#A8A39A]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#C8A96B] mx-auto" />
          <p className="text-sm">در حال بارگذاری آمار و جدول نوبت‌های امروز سالن...</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-6 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-200 text-center space-y-3">
        <AlertCircle className="w-8 h-8 mx-auto text-red-400" />
        <p>{error || "خطا در پردازش اطلاعات"}</p>
        <Button onClick={() => fetchDashboard()} variant="outline" className="mt-2 text-xs">
          تلاش مجدد
        </Button>
      </div>
    )
  }

  if (!data) return null

  const { metrics, today, nextAppointment, appointments } = data

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3" />
            <span>تأیید شده</span>
          </span>
        )
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold">
            <Check className="w-3 h-3" />
            <span>انجام‌شده</span>
          </span>
        )
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold">
            <XCircle className="w-3 h-3" />
            <span>لغو شده</span>
          </span>
        )
      case "NO_SHOW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-500/10 border border-gray-500/30 text-gray-400 text-[10px] font-bold">
            <span>عدم حضور</span>
          </span>
        )
      case "PAYMENT_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
            <Clock className="w-3 h-3" />
            <span>مغایرت پرداخت</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold">
            <span>{status}</span>
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8" dir="rtl">
      
      {/* Top Banner with Live Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#2D332F]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181D1A] border border-[#C8A96B]/30 text-xs font-semibold text-[#E4C88E] mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>همگام‌سازی زنده فعال (هر ۲۰ ثانیه)</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-heading text-[#F5F1E8]">
            داشبورد مدیریت کوروش باربر
          </h1>
          <p className="text-xs sm:text-sm text-[#A89E90] mt-1">
            وضعیت نوبت‌ها و عملیات روزانه ({today.dayName}، {today.jalaliFormatted})
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={() => fetchDashboard()}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-initial border-[#2D332F] text-[#A8A39A] hover:text-[#F5F1E8] hover:bg-[#161917] text-xs gap-1.5 h-9 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>بروزرسانی دستی</span>
          </Button>

          <Link href="/admin/appointments" className="flex-1 sm:flex-initial">
            <Button className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs gap-1.5 h-9 cursor-pointer">
              <span>تقویم جامع هفتگی</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 animate-shake">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HIGHEST PROMINENCE: جدول نوبت‌های امروز (Daily Appointment Management) */}
      {/* ========================================================================= */}
      <section className="space-y-4 pt-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-heading text-[#F7F4EE] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#C8A96B]" />
              <span>جدول نوبت‌های امروز</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#C8A96B]/20 text-[#E4C88E] font-mono">
                {toPersianDigits(appointments.length)} نوبت
              </span>
            </h2>
            <p className="text-xs text-[#8C8477] mt-0.5">
              ترتیب زمانی کلیه نوبت‌های رزروشده امروز همراه با عملیات سریع تغییر زمان، تسویه و لغو
            </p>
          </div>

          <div className="text-[11px] text-[#716A5E] font-mono">
            آخرین به‌روزرسانی: {toPersianDigits(lastUpdated.toLocaleTimeString("fa-IR"))}
          </div>
        </div>

        {appointments.length === 0 ? (
          <Card className="p-10 text-center bg-[#141715] border border-[#242A27] rounded-3xl space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#1C221F] text-[#C8A96B] flex items-center justify-center mx-auto">
              <Calendar className="w-7 h-7 opacity-50" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#F7F4EE]">
                برای امروز هنوز نوبتی ثبت نشده است.
              </h3>
              <p className="text-xs text-[#8C8477]">
                تمامی ۱۳ بازه کاری سالن (۱۰:۰۰ الی ۲۳:۰۰) برای رزرو آنلاین مراجعان در دسترس است.
              </p>
            </div>
            <Link href="/admin/appointments" className="inline-block pt-1">
              <Button size="sm" variant="outline" className="border-[#2D332F] text-xs text-[#C8A96B] hover:bg-[#1C221F]">
                ثبت دستی نوبت برای مشتری
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            {/* MOBILE DEDICATED CARDS (< md) */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {appointments.map((a) => (
                <Card
                  key={a.id}
                  className="bg-[#141715] border border-[#242A27] hover:border-[#C8A96B]/50 p-4 rounded-2xl space-y-3 text-right"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#202522]">
                    <div className="flex items-center gap-2.5">
                      <div className="flex flex-col">
                        <span className="text-base font-mono font-black text-[#E4C88E] tracking-tight">
                          {toPersianDigits(a.slotTime || a.time)}
                        </span>
                        {a.createdAtTime && (
                          <span className="text-[10px] text-[#8C8477] font-mono mt-0.5">
                            زمان ثبت رزرو: {toPersianDigits(a.createdAtTime)}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#F7F4EE]">{a.customerName}</h4>
                        <span className="text-xs font-mono text-[#8C8477] dir-ltr block" dir="ltr">
                          {a.customerPhone}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(a.status)}
                  </div>

                  <div className="text-xs text-[#C5BDB2]">
                    خدمت: <strong className="text-[#F7F4EE]">{a.serviceName}</strong>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#0D0F0E] p-2.5 rounded-xl border border-[#202522]">
                    <div>
                      <span className="text-[#8C8477] block text-[10px]">بیعانه آنلاین:</span>
                      <strong className="text-emerald-400">{formatToman(a.depositPaid)}</strong>
                    </div>
                    <div>
                      <span className="text-[#8C8477] block text-[10px]">مانده در سالن:</span>
                      <strong className="text-[#E4C88E]">
                        {a.isRemainderPaid ? "تسویه شد" : formatToman(a.balanceDue)}
                      </strong>
                    </div>
                  </div>

                  {/* Mobile Quick Action Buttons */}
                  <div className="pt-1 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRescheduleAppointment(a)}
                      className="flex-1 border-[#C8A96B]/50 text-[#E4C88E] hover:bg-[#C8A96B]/15 text-xs h-9 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 ml-1 text-[#C8A96B]" />
                      <span>تغییر زمان</span>
                    </Button>

                    {a.status === "CONFIRMED" && (
                      <Button
                        size="sm"
                        onClick={() => handleQuickStatus(a.id, "COMPLETED", true)}
                        disabled={actionLoading === a.id}
                        className="flex-1 bg-emerald-800 hover:bg-emerald-700 text-white text-xs h-9 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 ml-1" />
                        <span>تسویه و تکمیل</span>
                      </Button>
                    )}

                    <Link href={`/admin/appointments?search=${a.trackingCode}`} className="w-full">
                      <Button size="sm" variant="ghost" className="w-full border border-[#242A27] text-xs text-[#A89E90] h-9">
                        <span>مشاهده پرونده کامل ({a.trackingCode})</span>
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>

            {/* DESKTOP ELEGANT TABLE (>= md) */}
            <div className="hidden md:block bg-[#141715] border border-[#242A27] rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#101311] text-[#A89E90] border-b border-[#242A27]">
                    <tr>
                      <th className="p-3.5 font-bold">ساعت نوبت</th>
                      <th className="p-3.5 font-bold">نام مراجع</th>
                      <th className="p-3.5 font-bold">شماره تماس</th>
                      <th className="p-3.5 font-bold">خدمت انتخابی</th>
                      <th className="p-3.5 font-bold">وضعیت رزرو</th>
                      <th className="p-3.5 font-bold">بیعانه (۲۰٪)</th>
                      <th className="p-3.5 font-bold">مانده در سالن</th>
                      <th className="p-3.5 font-bold text-center">عملیات سریع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2522]">
                    {appointments.map((a) => (
                      <tr key={a.id} className="hover:bg-[#1A201D]/60 transition-colors">
                        <td className="p-3.5">
                          <div className="font-mono font-black text-sm text-[#E4C88E]">
                            {toPersianDigits(a.slotTime || a.time)}
                          </div>
                          {a.createdAtTime && (
                            <div className="text-[10px] text-[#8C8477] font-mono mt-0.5">
                              زمان ثبت رزرو: {toPersianDigits(a.createdAtTime)}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 font-bold text-[#F7F4EE]">
                          {a.customerName}
                        </td>
                        <td className="p-3.5 font-mono text-[#8C8477] dir-ltr" dir="ltr">
                          {a.customerPhone}
                        </td>
                        <td className="p-3.5 text-[#C5BDB2]">
                          {a.serviceName}
                        </td>
                        <td className="p-3.5">
                          {getStatusBadge(a.status)}
                        </td>
                        <td className="p-3.5 font-mono text-emerald-400 font-bold">
                          {formatToman(a.depositPaid)}
                        </td>
                        <td className="p-3.5 font-mono text-[#F7F4EE]">
                          {a.isRemainderPaid ? (
                            <span className="text-xs text-emerald-400 font-bold">تسویه شد</span>
                          ) : (
                            formatToman(a.balanceDue)
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRescheduleAppointment(a)}
                              className="border-[#C8A96B]/40 text-[#E4C88E] hover:bg-[#C8A96B]/15 text-[11px] h-8 px-2.5 cursor-pointer"
                              title="تغییر تاریخ یا ساعت این نوبت"
                            >
                              <Clock className="w-3 h-3 ml-1 text-[#C8A96B]" />
                              <span>تغییر زمان</span>
                            </Button>

                            {a.status === "CONFIRMED" && (
                              <Button
                                size="sm"
                                onClick={() => handleQuickStatus(a.id, "COMPLETED", true)}
                                disabled={actionLoading === a.id}
                                className="bg-emerald-800 hover:bg-emerald-700 text-white text-[11px] h-8 px-2.5 cursor-pointer"
                                title="ثبت انجام کار و تسویه مانده"
                              >
                                <Check className="w-3 h-3 ml-1" />
                                <span>تکمیل</span>
                              </Button>
                            )}

                            <Link href={`/admin/appointments?search=${a.trackingCode}`}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-[11px] text-[#A89E90] hover:text-[#F7F4EE] h-8 px-2"
                                title="مشاهده جزئیات کامل"
                              >
                                پرونده
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Next Upcoming Appointment Highlight */}
      {nextAppointment && (
        <Card className="bg-[#161B18] border border-[#C8A96B]/40 text-[#F5F1E8] p-5 sm:p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 bg-gradient-to-r from-[#C8A96B] to-[#E4C88E] text-[#0D0F0E] px-4 py-1 text-xs font-bold rounded-br-2xl">
            نوبت بعدی سالن
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <span className="text-xs text-[#8C8477]">ساعت آغاز نوبت بعدی:</span>
              <div className="text-2xl sm:text-3xl font-black text-[#E4C88E] font-mono">
                {toPersianDigits(nextAppointment.time)}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#F7F4EE] pt-1">
                {nextAppointment.customerName} — {nextAppointment.serviceName}
              </h3>
            </div>

            <div className="flex flex-col sm:items-end gap-2 text-xs w-full sm:w-auto">
              <div className="flex items-center gap-2 text-[#8C8477]">
                <Phone className="w-3.5 h-3.5 text-[#C8A96B]" />
                <span className="font-mono text-[#F7F4EE] dir-ltr" dir="ltr">
                  {nextAppointment.customerPhone}
                </span>
              </div>
              <div className="text-[#8C8477]">
                مانده تسویه در سالن:{" "}
                <strong className="text-[#E4C88E]">
                  {formatToman(nextAppointment.balanceDue)}
                </strong>
              </div>
              <Link href={`/admin/appointments?search=${nextAppointment.trackingCode}`} className="w-full sm:w-auto">
                <Button size="sm" variant="outline" className="w-full sm:w-auto border-[#2D332F] text-xs mt-1">
                  مشاهده جزئیات نوبت
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Key Metric KPI Cards (1 col mobile, 2 col tablet, 4 col desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Occupancy Card */}
        <Card className="bg-[#141715] border border-[#242A27] text-[#F5F1E8] p-4 sm:p-5 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-[#8C8477]">
            <span className="text-xs font-medium">ضریب اشغال سالن:</span>
            <TrendingUp className="w-4 h-4 text-[#C8A96B]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#F5F1E8]">
              {toPersianDigits(metrics.occupancyPercentage)}٪
            </span>
            <span className="text-xs text-[#8C8477]">
              ({toPersianDigits(metrics.occupiedSlots)} از {toPersianDigits(metrics.totalSlots)} ساعت)
            </span>
          </div>
          <div className="w-full bg-[#101311] h-1.5 rounded-full overflow-hidden border border-[#242A27]">
            <div
              className="bg-gradient-to-r from-[#C8A96B] to-[#E4C88E] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, metrics.occupancyPercentage)}%` }}
            />
          </div>
        </Card>

        {/* Deposit Collected */}
        <Card className="bg-[#141715] border border-[#242A27] text-[#F5F1E8] p-4 sm:p-5 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-[#8C8477]">
            <span className="text-xs font-medium">بیعانه وصول‌شده آنلاین:</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">
            {formatToman(metrics.totalDepositsCollected)}
          </div>
          <span className="text-[11px] text-[#8C8477] block">وصول قطعی از طریق درگاه بانکی</span>
        </Card>

        {/* In-Salon Balance Remaining */}
        <Card className="bg-[#141715] border border-[#242A27] text-[#F5F1E8] p-4 sm:p-5 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-[#8C8477]">
            <span className="text-xs font-medium">مانده قابل تسویه در سالن:</span>
            <Clock className="w-4 h-4 text-[#C8A96B]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#E4C88E] font-mono">
            {formatToman(metrics.totalOutstandingBalance)}
          </div>
          <span className="text-[11px] text-[#8C8477] block">دریافت حضوری حین خدمت</span>
        </Card>

        {/* Gross Revenue Target */}
        <Card className="bg-[#141715] border border-[#242A27] text-[#F5F1E8] p-4 sm:p-5 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-[#8C8477]">
            <span className="text-xs font-medium">ارزش ناخالص روز:</span>
            <Sparkles className="w-4 h-4 text-[#C8A96B]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#F5F1E8] font-mono">
            {formatToman(metrics.totalGrossValue)}
          </div>
          <span className="text-[11px] text-[#8C8477] block">مجموع ارزش ریالی نوبت‌ها</span>
        </Card>
      </div>

      {/* Reschedule Modal */}
      <RescheduleAppointmentModal
        appointment={rescheduleAppointment}
        isOpen={Boolean(rescheduleAppointment)}
        onClose={() => setRescheduleAppointment(null)}
        onSuccess={() => {
          setSuccessMsg("زمان نوبت با موفقیت تغییر کرد.")
          fetchDashboard(true)
        }}
      />
    </div>
  )
}
