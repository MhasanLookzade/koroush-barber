"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatToman, toPersianDigits } from "@/lib/jalali"
import {
  Phone,
  Calendar,
  Clock,
  Scissors,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Download,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from "lucide-react"

interface AppointmentItem {
  id: string
  trackingCode: string
  customerName: string
  customerPhone: string
  serviceName: string
  barberName: string
  status: string
  dateUtc: string
  jalaliFull: string
  time: string
  totalPrice: number
  depositPaid: number
  balanceDue: number
  isRemainderPaid: boolean
}

export default function BookingStatusPage() {
  const [phone, setPhone] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)
  const [devCode, setDevCode] = useState<string | null>(null)

  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Send OTP
  const handleSendOtp = async () => {
    setError(null)
    setSuccessMsg(null)
    if (!phone || phone.length < 10) {
      setError("شماره موبایل معتبر (۱۱ رقم با ۰۹) وارد نمایید")
      return
    }

    try {
      setLoading(true)
      const res = await fetch("/api/booking/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "خطا در ارسال کد تایید")

      setIsOtpSent(true)
      setOtpTimer(120)
      if (data.devCode) setDevCode(data.devCode)
      setSuccessMsg("کد تایید با پیامک ارسال شد.")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطای ارسال کد")
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP and Load Appointments
  const handleVerifyOtp = async () => {
    setError(null)
    setSuccessMsg(null)
    if (!otpCode || otpCode.trim().length !== 6) {
      setError("لطفاً کد تایید ۶ رقمی را به صورت کامل وارد کنید")
      return
    }

    try {
      setLoading(true)
      const verifyRes = await fetch("/api/booking/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otpCode }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) throw new Error(verifyData.error || "کد تایید اشتباه است")

      setIsAuthenticated(true)

      // Fetch appointments
      const appRes = await fetch(`/api/booking/status?phone=${phone}`)
      const appData = await appRes.json()
      setAppointments(appData || [])
      setSuccessMsg("ورود موفقیت‌آمیز بود.")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در ورود")
    } finally {
      setLoading(false)
    }
  }

  // Cancel Appointment
  const handleCancelAppointment = async (trackingCode: string) => {
    const confirmCancel = window.confirm(
      `آیا از لغو نوبت با کد رهگیری ${trackingCode} اطمینان دارید؟`
    )
    if (!confirmCancel) return

    try {
      setActionLoading(trackingCode)
      setError(null)
      const res = await fetch("/api/booking/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingCode,
          phone,
          reason: "لغو توسط مشتری از پنل پیگیری",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "امکان لغو نوبت وجود ندارد")

      setSuccessMsg(data.message)
      // Refresh list
      const appRes = await fetch(`/api/booking/status?phone=${phone}`)
      const appData = await appRes.json()
      setAppointments(appData || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در لغو نوبت")
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge className="bg-green-600/20 text-green-400 border border-green-500/30">تایید شده</Badge>
      case "COMPLETED":
        return <Badge className="bg-blue-600/20 text-blue-400 border border-blue-500/30">انجام شده</Badge>
      case "CANCELLED":
        return <Badge className="bg-red-600/20 text-red-400 border border-red-500/30">لغو شده</Badge>
      case "NO_SHOW":
        return <Badge className="bg-amber-600/20 text-amber-400 border border-amber-500/30">عدم حضور</Badge>
      case "PAYMENT_REVIEW":
        return <Badge className="bg-yellow-600/20 text-yellow-400 border border-yellow-500/30">در حال بررسی مدیر</Badge>
      default:
        return <Badge className="bg-gray-600/20 text-gray-400 border border-gray-500/30">{status}</Badge>
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-12 px-4 space-y-8" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold font-heading text-[#F5F1E8]">پیگیری و مدیریت نوبت‌های من</h1>
        <p className="text-sm text-[#A8A39A] mt-1">
          مشاهده سوابق رزرو، دانلود تقویم (.ics) و لغو نوبت طبق قوانین سالن
        </p>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {successMsg && (
        <div role="status" className="p-4 rounded-xl bg-green-950/40 border border-green-500/40 text-green-200 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-green-400 mt-0.5" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* Auth Screen */}
      {!isAuthenticated ? (
        <Card className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] p-6 rounded-2xl shadow-xl">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg font-bold">ورود امن با رمز یکبار مصرف (OTP)</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <div className="space-y-2">
              <label htmlFor="auth-phone" className="text-sm text-[#A8A39A] block">
                شماره موبایل ثبت‌شده در هنگام رزرو:
              </label>
              <div className="flex gap-2">
                <input
                  id="auth-phone"
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09123456789"
                  disabled={isOtpSent}
                  className="flex-1 bg-[#1F2321] border border-[#2D332F] rounded-xl px-4 py-3 text-sm font-mono text-[#F5F1E8] focus:outline-none focus:border-[#C8A96B]"
                />
                <Button
                  onClick={handleSendOtp}
                  disabled={loading || !phone}
                  className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold px-5"
                >
                  {isOtpSent ? "ارسال مجدد" : "دریافت کد تایید"}
                </Button>
              </div>
            </div>

            {isOtpSent && (
              <div className="space-y-3 pt-3 border-t border-[#2D332F]">
                <label htmlFor="auth-otp" className="text-sm text-[#C8A96B] block">
                  کد تایید ۶ رقمی را وارد کنید:
                </label>
                <div className="flex gap-2">
                  <input
                    id="auth-otp"
                    type="text"
                    dir="ltr"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="------"
                    className="w-48 bg-[#1F2321] border border-[#C8A96B] rounded-xl px-4 py-3 text-center font-mono text-xl text-[#F5F1E8] focus:outline-none"
                  />
                  <Button
                    onClick={handleVerifyOtp}
                    disabled={loading || otpCode.length !== 6}
                    className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold px-6"
                  >
                    تایید و ورود
                  </Button>
                </div>

                {devCode && (
                  <div className="p-2 rounded bg-[#1F2321] border border-[#2D332F] text-xs text-[#A8A39A] flex gap-2 items-center">
                    <Sparkles className="w-3.5 h-3.5 text-[#C8A96B]" />
                    <span>کد محیط آزمایشی:</span>
                    <code className="text-[#C8A96B] font-mono font-bold">{devCode}</code>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Authenticated Appointments List */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#A8A39A]">
              نوبت‌های ثبت‌شده برای شماره <span className="font-mono text-[#F5F1E8]">{phone}</span>:
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAuthenticated(false)
                setIsOtpSent(false)
                setOtpCode("")
                setAppointments([])
              }}
              className="text-xs text-[#A8A39A] hover:text-[#F5F1E8]"
            >
              خروج از حساب
            </Button>
          </div>

          {appointments.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-[#161917] border border-[#2D332F] space-y-3">
              <Calendar className="w-10 h-10 text-[#A8A39A] mx-auto opacity-40" />
              <h3 className="font-bold text-[#F5F1E8]">هیچ نوبتی برای این شماره ثبت نشده است</h3>
              <p className="text-xs text-[#A8A39A]">می‌توانید اولین نوبت خود را آنلاین رزرو کنید.</p>
              <Link href="/booking">
                <Button className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold mt-2">
                  رزرو نوبت جدید
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((app) => (
                <Card
                  key={app.id}
                  className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] p-5 rounded-2xl shadow-md space-y-4"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-[#2D332F]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#C8A96B] dir-ltr" dir="ltr">
                          {app.trackingCode}
                        </span>
                        {getStatusBadge(app.status)}
                      </div>
                      <h3 className="font-bold text-base text-[#F5F1E8] mt-1">{app.serviceName}</h3>
                    </div>
                    <div className="text-sm text-left sm:text-right">
                      <span className="text-xs text-[#A8A39A] block">تاریخ و ساعت:</span>
                      <span className="text-[#F5F1E8] font-medium">{app.jalaliFull}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-[#0D0F0E] p-3 rounded-xl border border-[#2D332F]">
                    <div>
                      <span className="text-[#A8A39A] block">مبلغ کل:</span>
                      <span className="font-bold text-[#F5F1E8]">{formatToman(app.totalPrice)}</span>
                    </div>
                    <div>
                      <span className="text-[#A8A39A] block">بیعانه پرداخت‌شده:</span>
                      <span className="font-bold text-green-400">{formatToman(app.depositPaid)}</span>
                    </div>
                    <div>
                      <span className="text-[#A8A39A] block">مانده در سالن:</span>
                      <span className="font-bold text-[#C8A96B]">{formatToman(app.balanceDue)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end pt-1">
                    {app.status === "CONFIRMED" && (
                      <>
                        <a href={`/api/booking/calendar/${app.trackingCode}`} download>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#2D332F] text-[#A8A39A] hover:text-[#F5F1E8] text-xs gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            تقویم گوشی
                          </Button>
                        </a>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelAppointment(app.trackingCode)}
                          disabled={actionLoading === app.trackingCode}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {actionLoading === app.trackingCode ? "در حال لغو..." : "لغو نوبت"}
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
