"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatToman, toPersianDigits } from "@/lib/jalali"
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
} from "lucide-react"

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
  appointments: Array<{
    id: string
    trackingCode: string
    customerName: string
    customerPhone: string
    serviceName: string
    time: string
    status: string
    totalPrice: number
    depositPaid: number
    balanceDue: number
    isRemainderPaid: boolean
  }>
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

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/dashboard")
      if (!res.ok) throw new Error("خطا در بارگذاری داشبورد")
      const result = await res.json()
      setData(result)
    } catch {
      setError("امکان دریافت آمار داشبورد وجود ندارد")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#A8A39A]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#C8A96B] mx-auto" />
          <p className="text-sm">در حال بارگذاری آمار لحظه‌ای سالن...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-200">
        <AlertCircle className="w-6 h-6 mb-2" />
        <p>{error || "خطا در پردازش اطلاعات"}</p>
        <Button onClick={fetchDashboard} variant="outline" className="mt-4 text-xs">
          تلاش مجدد
        </Button>
      </div>
    )
  }

  const { metrics, today, nextAppointment, appointments, recentLogs } = data

  return (
    <div className="space-y-6 sm:space-y-8" dir="rtl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#2D332F]">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-heading text-[#F5F1E8]">
            داشبورد مدیریت کوروش باربر
          </h1>
          <p className="text-xs sm:text-sm text-[#A8A39A] mt-1">
            وضعیت نوبت‌ها، ضریب اشغال و وصولی‌های مالی امروز ({today.dayName}، {today.jalaliFormatted})
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={fetchDashboard}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-initial border-[#2D332F] text-[#A8A39A] hover:text-[#F5F1E8] hover:bg-[#161917] text-xs gap-1.5 h-9"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            بروزرسانی
          </Button>
          <Link href="/admin/appointments" className="flex-1 sm:flex-initial">
            <Button className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs gap-1.5 h-9 cursor-pointer">
              مدیریت نوبت‌ها
              <ArrowLeft className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Actionable Alert: Payment Review */}
      {metrics.paymentReviewCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-xs sm:text-sm">
              توجه: تعداد {toPersianDigits(metrics.paymentReviewCount)} نوبت در وضعیت «نیازمند بررسی مدیر»
              قرار دارد (پرداخت دیرهنگام پس از انقضای هلد).
            </span>
          </div>
          <Link href="/admin/appointments?status=PAYMENT_REVIEW">
            <Button size="sm" variant="outline" className="border-amber-400 text-amber-300 text-xs shrink-0">
              بررسی مغایرت
            </Button>
          </Link>
        </div>
      )}

      {/* Key Metric KPI Cards (1 col mobile, 2 col tablet, 4 col desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Occupancy Card */}
        <Card className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] p-4 sm:p-5 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-[#A8A39A]">
            <span className="text-xs">ضریب اشغال امروز:</span>
            <TrendingUp className="w-4 h-4 text-[#C8A96B]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-[#F5F1E8]">
              {toPersianDigits(metrics.occupancyPercentage)}٪
            </span>
            <span className="text-xs text-[#A8A39A]">
              ({toPersianDigits(metrics.occupiedSlots)} از {toPersianDigits(metrics.totalSlots)} بازه)
            </span>
          </div>
          <div className="w-full bg-[#1F2321] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#C8A96B] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, metrics.occupancyPercentage)}%` }}
            />
          </div>
        </Card>

        {/* Deposit Collected */}
        <Card className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] p-4 sm:p-5 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-[#A8A39A]">
            <span className="text-xs">بیعانه وصول‌شده آنلاین:</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">
            {formatToman(metrics.totalDepositsCollected)}
          </div>
          <span className="text-[11px] text-[#A8A39A] block">قطعی و واریز شده به حساب</span>
        </Card>

        {/* In-Salon Balance Remaining */}
        <Card className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] p-4 sm:p-5 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-[#A8A39A]">
            <span className="text-xs">مانده قابل تسویه در سالن:</span>
            <Clock className="w-4 h-4 text-[#C8A96B]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#C8A96B] font-mono">
            {formatToman(metrics.totalOutstandingBalance)}
          </div>
          <span className="text-[11px] text-[#A8A39A] block">دریافت حضوری هنگام مراجعه</span>
        </Card>

        {/* Gross Services Value */}
        <Card className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] p-4 sm:p-5 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-[#A8A39A]">
            <span className="text-xs">مجموع ارزش خدمات امروز:</span>
            <Scissors className="w-4 h-4 text-[#A8A39A]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#F5F1E8] font-mono">
            {formatToman(metrics.totalGrossValue)}
          </div>
          <span className="text-[11px] text-[#A8A39A] block">
            {toPersianDigits(metrics.confirmedCount + metrics.completedCount)} نوبت تایید شده
          </span>
        </Card>
      </div>

      {/* Next Appointment Hero Card */}
      {nextAppointment ? (
        <Card className="bg-[#161917] border-[#C8A96B]/30 text-[#F5F1E8] p-5 sm:p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 bg-[#C8A96B] text-[#0D0F0E] px-3 sm:px-4 py-1 text-[11px] sm:text-xs font-bold rounded-br-xl">
            نوبت بعدی سالن
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <span className="text-xs text-[#A8A39A]">ساعت شروع:</span>
              <div className="text-2xl sm:text-3xl font-bold text-[#C8A96B] font-mono">
                {toPersianDigits(nextAppointment.time)}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#F5F1E8] pt-1">
                {nextAppointment.customerName} — {nextAppointment.serviceName}
              </h3>
            </div>

            <div className="flex flex-col sm:items-end gap-2 text-xs w-full sm:w-auto">
              <div className="flex items-center gap-2 text-[#A8A39A]">
                <Phone className="w-3.5 h-3.5 text-[#C8A96B]" />
                <span className="font-mono text-[#F5F1E8] dir-ltr" dir="ltr">
                  {nextAppointment.customerPhone}
                </span>
              </div>
              <div className="text-[#A8A39A]">
                مانده تسویه در سالن:{" "}
                <span className="font-bold text-[#C8A96B]">
                  {formatToman(nextAppointment.balanceDue)}
                </span>
              </div>
              <Link href={`/admin/appointments?search=${nextAppointment.trackingCode}`} className="w-full sm:w-auto">
                <Button size="sm" variant="outline" className="w-full sm:w-auto border-[#2D332F] text-xs mt-1">
                  مشاهده جزئیات پرونده
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="p-5 rounded-2xl bg-[#161917] border border-[#2D332F] text-center text-xs text-[#A8A39A]">
          نوبت فعال بعدی برای ساعات باقی‌مانده امروز ثبت نشده است.
        </div>
      )}

      {/* Today's Schedule (Cards on mobile, Table on desktop) */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base sm:text-lg font-bold font-heading text-[#F5F1E8]">
            لیست نوبت‌های امروز سالن ({toPersianDigits(appointments.length)})
          </h2>
          <Link href="/admin/appointments" className="text-xs text-[#C8A96B] hover:underline">
            مشاهده کامل تقویم هفتگی &larr;
          </Link>
        </div>

        {appointments.length === 0 ? (
          <div className="p-8 text-center bg-[#161917] border border-[#2D332F] rounded-2xl text-xs text-[#A8A39A]">
            امروز هیچ نوبتی ثبت نشده است. ظرفیت سالن برای رزرو باز است.
          </div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {appointments.map((a) => (
                <Card
                  key={a.id}
                  className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] p-4 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#2D332F]">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono font-bold text-[#C8A96B]">
                        {toPersianDigits(a.time)}
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-[#F5F1E8]">{a.customerName}</h4>
                        <span className="text-[11px] text-[#A8A39A]">{a.serviceName}</span>
                      </div>
                    </div>
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

                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#0D0F0E] p-2.5 rounded-xl border border-[#222825]">
                    <div>
                      <span className="text-[#8C8477] block text-[10px]">بیعانه آنلاین:</span>
                      <span className="font-bold text-emerald-400">{formatToman(a.depositPaid)}</span>
                    </div>
                    <div>
                      <span className="text-[#8C8477] block text-[10px]">مانده در سالن:</span>
                      <span className="font-bold text-[#C8A96B]">
                        {a.isRemainderPaid ? "تسویه شد" : formatToman(a.balanceDue)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-mono text-[#A8A39A]" dir="ltr">
                      {a.trackingCode}
                    </span>
                    <Link href={`/admin/appointments?search=${a.trackingCode}`}>
                      <Button size="sm" variant="ghost" className="text-xs text-[#C8A96B] hover:text-[#F5F1E8] h-8 px-2.5">
                        مدیریت نوبت &larr;
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block bg-[#161917] border border-[#2D332F] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#1F2321] text-[#A8A39A] border-b border-[#2D332F]">
                    <tr>
                      <th className="p-3.5 font-medium">ساعت</th>
                      <th className="p-3.5 font-medium">کد رهگیری</th>
                      <th className="p-3.5 font-medium">مشتری</th>
                      <th className="p-3.5 font-medium">خدمت</th>
                      <th className="p-3.5 font-medium">وضعیت</th>
                      <th className="p-3.5 font-medium">بیعانه واریزی</th>
                      <th className="p-3.5 font-medium">مانده سالن</th>
                      <th className="p-3.5 font-medium text-left">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D332F]">
                    {appointments.map((a) => (
                      <tr key={a.id} className="hover:bg-[#1F2321]/50 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-[#C8A96B]">
                          {toPersianDigits(a.time)}
                        </td>
                        <td className="p-3.5 font-mono text-[#A8A39A] dir-ltr" dir="ltr">
                          {a.trackingCode}
                        </td>
                        <td className="p-3.5 font-bold text-[#F5F1E8]">{a.customerName}</td>
                        <td className="p-3.5 text-[#A8A39A]">{a.serviceName}</td>
                        <td className="p-3.5">
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
                        </td>
                        <td className="p-3.5 font-mono text-green-400">{formatToman(a.depositPaid)}</td>
                        <td className="p-3.5 font-mono text-[#F5F1E8]">
                          {a.isRemainderPaid ? (
                            <span className="text-xs text-green-400 font-bold">تسویه شد</span>
                          ) : (
                            formatToman(a.balanceDue)
                          )}
                        </td>
                        <td className="p-3.5 text-left">
                          <Link href={`/admin/appointments?search=${a.trackingCode}`}>
                            <Button size="sm" variant="ghost" className="text-xs text-[#C8A96B] hover:text-[#F5F1E8]">
                              مدیریت &larr;
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
