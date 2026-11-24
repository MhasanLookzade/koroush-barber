"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatToman, toPersianDigits, formatJalaliFull } from "@/lib/jalali"
import {
  Calendar,
  Clock,
  Scissors,
  User,
  KeyRound,
  Phone,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Copy,
  Check,
  CalendarCheck,
  ArrowRight,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  HelpCircle,
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
  createdAt: string
}

function BookingStatusContent() {
  const searchParams = useSearchParams()
  const queryTracking = searchParams.get("trackingCode") || ""

  const [activeTab, setActiveTab] = useState<"code" | "phone">("code")
  const [trackingInput, setTrackingInput] = useState(queryTracking)
  const [phone, setPhone] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [otpTimer, setOtpTimer] = useState(0)

  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Cancellation modal state
  const [cancelModalAppointment, setCancelModalAppointment] = useState<AppointmentItem | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Auto-search if trackingCode query param is present
  useEffect(() => {
    if (queryTracking) {
      setTrackingInput(queryTracking)
      performCodeSearch(queryTracking)
    }
  }, [queryTracking])

  // OTP Countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return
    const interval = setInterval(() => {
      setOtpTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [otpTimer])

  // Search by tracking code
  const performCodeSearch = async (code: string) => {
    const cleanCode = code.trim().toUpperCase()
    if (!cleanCode) {
      setError("لطفاً کد پیگیری معتبر (مانند KB-84920) را وارد نمایید.")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccessMsg(null)
      setHasSearched(true)

      const res = await fetch(`/api/booking/status?trackingCode=${encodeURIComponent(cleanCode)}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "خطا در استعلام نوبت.")
      }

      setAppointments(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "خطا در برقراری ارتباط با سرور."
      setError(msg)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performCodeSearch(trackingInput)
  }

  // Send OTP
  const handleSendOtp = async () => {
    const cleanPhone = phone.trim()
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("لطفاً شماره تلفن همراه ۱۱ رقمی معتبر وارد نمایید.")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccessMsg(null)

      const res = await fetch("/api/booking/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "خطا در ارسال کد تایید پیامکی.")
      }

      setIsOtpSent(true)
      setOtpTimer(60)
      if (data.devCode) {
        setDevCode(data.devCode)
      }
      setSuccessMsg(`کد تایید پیامکی ۶ رقمی به شماره ${cleanPhone} ارسال گردید.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "خطا در ارسال پیامک."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP & fetch history
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError("لطفاً کد ۶ رقمی تایید را وارد کنید.")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccessMsg(null)
      setHasSearched(true)

      const verifyRes = await fetch("/api/booking/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), code: otpCode.trim() }),
      })
      const verifyData = await verifyRes.json()

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "کد تایید نامعتبر است.")
      }

      const listRes = await fetch(`/api/booking/status?phone=${encodeURIComponent(phone.trim())}`)
      const listData = await listRes.json()

      if (!listRes.ok) {
        throw new Error(listData.error || "خطا در دریافت سوابق نوبت‌ها.")
      }

      setAppointments(Array.isArray(listData) ? listData : [])
      setSuccessMsg("احراز هویت موفقیت‌آمیز بود؛ کلیه سوابق نوبت‌های شما نمایش داده شد.")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "خطای احراز هویت."
      setError(msg)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  // Copy tracking code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2500)
  }

  // Execute cancellation
  const handleExecuteCancel = async () => {
    if (!cancelModalAppointment) return

    try {
      setActionLoading(cancelModalAppointment.trackingCode)
      setError(null)

      const res = await fetch("/api/booking/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingCode: cancelModalAppointment.trackingCode,
          reason: cancelReason.trim() || "انصراف توسط مشتری از طریق پنل پیگیری",
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "خطا در لغو نوبت.")
      }

      setSuccessMsg(
        `نوبت ${cancelModalAppointment.trackingCode} با موفقیت لغو شد. در صورت تعلق بیعانه، وجه ظرف ۴۸ ساعت به حساب شما واریز خواهد شد.`
      )
      setCancelModalAppointment(null)
      setCancelReason("")

      // Refresh list
      if (activeTab === "code") {
        performCodeSearch(cancelModalAppointment.trackingCode)
      } else {
        const listRes = await fetch(`/api/booking/status?phone=${encodeURIComponent(phone.trim())}`)
        const listData = await listRes.json()
        if (listRes.ok && Array.isArray(listData)) setAppointments(listData)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "خطا در فرآیند لغو نوبت."
      setError(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>تأیید شده قطعی</span>
          </span>
        )
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold">
            <Check className="w-3.5 h-3.5" />
            <span>انجام‌شده</span>
          </span>
        )
      case "PAYMENT_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>نیازمند هماهنگی پذیرش</span>
          </span>
        )
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
            <XCircle className="w-3.5 h-3.5" />
            <span>لغو شده</span>
          </span>
        )
      case "NO_SHOW":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2A312D] text-[#A8A39A] text-xs font-bold">
            <span>عدم حضور</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold">
            <span>در حال بررسی</span>
          </span>
        )
    }
  }

  return (
    <div className="pt-24 sm:pt-28 pb-20 px-4 sm:px-6 lg:px-8 selection:bg-[#C8A96B] selection:text-[#0D0F0E]" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-2 border-b border-[#242A27]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-[#A8A39A] hover:text-[#C8A96B] transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به صفحه اصلی</span>
          </Link>

          <Link href="/#booking">
            <Button
              variant="outline"
              size="sm"
              className="border-[#2D332F] text-[#C8A96B] hover:bg-[#1F2321] text-xs gap-1.5 min-h-[38px] cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>رزرو نوبت جدید</span>
            </Button>
          </Link>
        </div>

        {/* Page Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181D1A] border border-[#C8A96B]/30 text-xs font-semibold text-[#E4C88E]">
            <KeyRound className="w-3.5 h-3.5 text-[#C8A96B]" />
            <span>سامانه استعلام و مدیریت نوبت</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-heading font-black text-[#F7F4EE] tracking-normal text-balance">
            پیگیری و مدیریت نوبت‌های من
          </h1>

          <p className="text-xs sm:text-sm text-[#A8A39A] leading-relaxed">
            مشاهده وضعیت رزرو، زمان دقیق حضور در سالن، فایل تقویم هوشمند و امکان لغو نوبت طبق قوانین سالن
          </p>
        </div>

        {/* Global Feedback Alerts */}
        {error && (
          <div role="alert" className="p-4 rounded-2xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs sm:text-sm flex items-start gap-3 animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div role="status" className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            <span className="leading-relaxed font-medium">{successMsg}</span>
          </div>
        )}

        {/* Dual Search Card (Visible only before search) */}
        {!hasSearched ? (
        <Card className="bg-[#141715] border border-[#242A27] text-[#F5F1E8] rounded-3xl shadow-2xl overflow-hidden">
          {/* Method Selector Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-[#0D0F0E] border-b border-[#242A27] gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("code")}
              className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
                activeTab === "code"
                  ? "bg-[#C8A96B] text-[#0D0F0E] shadow-md font-bold"
                  : "text-[#A8A39A] hover:text-[#F5F1E8] hover:bg-[#1A1F1C]"
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>جستجو با کد پیگیری</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("phone")}
              className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
                activeTab === "phone"
                  ? "bg-[#C8A96B] text-[#0D0F0E] shadow-md font-bold"
                  : "text-[#A8A39A] hover:text-[#F5F1E8] hover:bg-[#1A1F1C]"
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>ورود با شماره همراه</span>
            </button>
          </div>

          <CardContent className="p-6 sm:p-8">
            {/* TAB 1: CODE LOOKUP */}
            {activeTab === "code" && (
              <form onSubmit={handleCodeSubmit} action="#" method="POST" className="space-y-4">
                <div className="space-y-2 text-right">
                  <label htmlFor="track-code-input" className="text-xs sm:text-sm font-semibold text-[#A8A39A] block">
                    کد پیگیری اختصاصی نوبت را وارد فرمایید:
                  </label>
                  <div className="relative">
                    <input
                      id="track-code-input"
                      type="text"
                      dir="ltr"
                      value={trackingInput}
                      onChange={(e) => setTrackingInput(e.target.value)}
                      placeholder="مثال: KB-84920"
                      className="w-full bg-[#0D0F0E] border border-[#2D332F] rounded-2xl px-4 py-3.5 pl-12 text-sm sm:text-base font-mono font-bold text-[#F5F1E8] placeholder-[#555C57] focus:outline-none focus:border-[#C8A96B] focus:ring-1 focus:ring-[#C8A96B] transition-colors"
                    />
                    <KeyRound className="w-5 h-5 text-[#C8A96B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !trackingInput.trim()}
                  className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold py-6 rounded-2xl text-sm sm:text-base gap-2 shadow-lg min-h-[48px] cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      در حال استعلام نوبت...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      استعلام فوری نوبت
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* TAB 2: PHONE & OTP LOOKUP */}
            {activeTab === "phone" && (
              <div className="space-y-5 text-right">
                <div className="space-y-2">
                  <label htmlFor="track-phone-input" className="text-xs sm:text-sm font-semibold text-[#A8A39A] block">
                    شماره تلفن همراه ثبت‌شده هنگام رزرو:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <input
                        id="track-phone-input"
                        type="tel"
                        dir="ltr"
                        inputMode="numeric"
                        disabled={isOtpSent}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="09123456789"
                        className="w-full bg-[#0D0F0E] border border-[#2D332F] rounded-2xl px-4 py-3.5 pl-12 text-sm sm:text-base font-mono text-[#F5F1E8] placeholder-[#555C57] focus:outline-none focus:border-[#C8A96B]"
                      />
                      <Phone className="w-4 h-4 text-[#A8A39A] absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>

                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading || otpTimer > 0 || !phone.trim()}
                      className="bg-[#1C221F] hover:bg-[#28302C] text-[#E4C88E] border border-[#C8A96B]/30 font-bold px-6 py-3.5 rounded-2xl text-xs sm:text-sm min-h-[48px] cursor-pointer"
                    >
                      {otpTimer > 0
                        ? `${toPersianDigits(otpTimer)} ثانیه تا ارسال مجدد`
                        : isOtpSent
                        ? "ارسال مجدد پیامک"
                        : "دریافت کد تایید"}
                    </Button>
                  </div>
                </div>

                {/* Dev Code Autofill for Local Verification */}
                {devCode && (
                  <div className="p-3 rounded-2xl bg-[#1A221E] border border-[#C8A96B]/40 flex items-center justify-between text-xs text-[#E4C88E]">
                    <span>کد تایید محیط آزمایشی: <strong className="font-mono text-sm">{devCode}</strong></span>
                    <button
                      type="button"
                      onClick={() => setOtpCode(devCode)}
                      className="px-3 py-1 rounded-xl bg-[#C8A96B] text-[#0D0F0E] font-bold cursor-pointer"
                    >
                      درج خودکار
                    </button>
                  </div>
                )}

                {/* OTP Input Form */}
                {isOtpSent && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4 pt-3 border-t border-[#242A27]">
                    <div className="space-y-2">
                      <label htmlFor="track-otp-input" className="text-xs sm:text-sm font-semibold text-[#E4C88E] block">
                        کد تایید ۶ رقمی پیامک شده را وارد فرمایید:
                      </label>
                      <input
                        id="track-otp-input"
                        type="text"
                        dir="ltr"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="123456"
                        className="w-full bg-[#0D0F0E] border border-[#C8A96B] rounded-2xl px-4 py-3.5 text-center font-mono text-2xl tracking-[0.4em] text-[#F5F1E8] focus:outline-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading || otpCode.trim().length !== 6}
                      className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold py-6 rounded-2xl text-sm sm:text-base gap-2 shadow-lg min-h-[48px] cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          در حال بررسی کد...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          تایید و مشاهده سوابق نوبت‌ها
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        ) : (
          /* Appointment Results Section (Completely replaces search form) */
          <div className="space-y-6 pt-2 animate-in fade-in duration-300">
            {/* Top Back Action & Results Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#242A27]">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181D1A] border border-[#C8A96B]/30 text-xs font-semibold text-[#E4C88E]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C8A96B]" />
                  <span>استعلام انجام شد</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-[#F7F4EE]">
                  نتایج استعلام رزرواسیون ({toPersianDigits(appointments.length)})
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setHasSearched(false)
                  setError(null)
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1C221F] hover:bg-[#252C28] text-xs sm:text-sm font-bold text-[#E4C88E] border border-[#C8A96B]/40 hover:border-[#C8A96B] transition-all cursor-pointer min-h-[44px]"
              >
                <ArrowRight className="w-4 h-4 text-[#C8A96B]" />
                <span>بازگشت به پیگیری نوبت</span>
              </button>
            </div>

            {appointments.length === 0 ? (
              <Card className="bg-[#141715] border border-[#242A27] rounded-3xl p-8 sm:p-10 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#1C221F] text-[#A8A39A] flex items-center justify-center mx-auto">
                  <Calendar className="w-8 h-8 opacity-60 text-[#C8A96B]" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-[#F7F4EE]">نوبتی با این مشخصات یافت نشد</h3>
                  <p className="text-xs sm:text-sm text-[#A8A39A] max-w-md mx-auto leading-relaxed">
                    هیچ سابقه رزرواسیونی با اطلاعات واردشده تطابق ندارد. لطفاً صحت کد رهگیری پیامک‌شده را بررسی فرمایید.
                  </p>
                </div>
                <div className="pt-2">
                  <Link href="/#booking" className="inline-block">
                    <Button className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs sm:text-sm gap-2 px-6 py-5 rounded-2xl min-h-[44px] cursor-pointer">
                      <CalendarCheck className="w-4 h-4" />
                      رزرو نوبت جدید در سالن کوروش
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                {appointments.map((a) => (
                  <Card
                    key={a.id}
                    className="bg-[#141715] border border-[#242A27] hover:border-[#C8A96B]/50 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 transition-all"
                  >
                    {/* Header Row: Service + Status Badge */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-5 border-b border-[#242A27]">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Scissors className="w-4 h-4 text-[#C8A96B]" />
                          <h3 className="text-lg sm:text-xl font-heading font-black text-[#F7F4EE]">
                            {a.serviceName}
                          </h3>
                        </div>
                        <p className="text-xs text-[#8C8477]">
                          پیرایشگر اختصاصی: <strong className="text-[#A8A39A]">{a.barberName}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(a.status)}
                      </div>
                    </div>

                    {/* Tracking Code Banner with Copy Action */}
                    <div className="p-4 rounded-2xl bg-[#0D0F0E] border border-[#222825] flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[11px] text-[#8C8477] block">کد رهگیری رسمی رزرواسیون:</span>
                        <strong className="text-base sm:text-xl font-mono text-[#E4C88E] tracking-wider" dir="ltr">
                          {a.trackingCode}
                        </strong>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyCode(a.trackingCode)}
                        className="px-3.5 py-2 rounded-xl bg-[#1C221F] hover:bg-[#C8A96B] hover:text-[#0D0F0E] text-xs text-[#C8A96B] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer min-h-[38px] border border-[#2D332F]"
                        aria-label="کپی کد رهگیری"
                      >
                        {copiedCode === a.trackingCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>کپی شد!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>کپی کد</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Date, Time & Customer Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                      <div className="p-3.5 rounded-2xl bg-[#0D0F0E] border border-[#222724] space-y-1">
                        <span className="text-[#8C8477] text-xs flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#C8A96B]" />
                          تاریخ حضور (تقویم شمسی):
                        </span>
                        <strong className="text-[#F7F4EE] text-sm block font-mono">
                          {a.jalaliFull ? a.jalaliFull.split("-")[0].trim() : formatJalaliFull(a.dateUtc)}
                        </strong>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#0D0F0E] border border-[#222724] space-y-1">
                        <span className="text-[#8C8477] text-xs flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#C8A96B]" />
                          ساعت آغاز نوبت:
                        </span>
                        <strong className="text-[#E4C88E] text-base font-mono block" dir="ltr">
                          {toPersianDigits(a.time)}
                        </strong>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#0D0F0E] border border-[#222724] space-y-1">
                        <span className="text-[#8C8477] text-xs flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#C8A96B]" />
                          نام مراجعه‌کننده:
                        </span>
                        <strong className="text-[#F7F4EE] text-sm block truncate">
                          {a.customerName}
                        </strong>
                      </div>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#0D0F0E] border border-[#222724] space-y-2.5 text-xs sm:text-sm">
                      <div className="flex justify-between items-center text-[#A8A39A]">
                        <span>تعرفه کل خدمت:</span>
                        <span className="font-bold text-[#F7F4EE]">{formatToman(a.totalPrice)}</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-400">
                        <span>بیعانه پرداخت‌شده آنلاین (۲۰٪):</span>
                        <span className="font-bold">{formatToman(a.depositPaid)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2.5 border-t border-[#1E2421]">
                        <span className="text-[#A8A39A]">مانده قابل تسویه در محل سالن:</span>
                        {a.isRemainderPaid ? (
                          <span className="font-bold text-emerald-400">تسویه کامل شد</span>
                        ) : (
                          <span className="font-bold text-[#E4C88E] text-sm sm:text-base">{formatToman(a.balanceDue)}</span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons: Calendar .ics + Cancel */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                      <a
                        href={`/api/booking/calendar/${a.trackingCode}`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#1C221F] hover:bg-[#252C28] text-xs sm:text-sm text-[#F5F1E8] border border-[#2D332F] hover:border-[#C8A96B] transition-colors min-h-[44px]"
                      >
                        <Download className="w-4 h-4 text-[#C8A96B]" />
                        <span>افزودن به تقویم گوشی (.ics)</span>
                      </a>

                      {/* Cancel Action if CONFIRMED */}
                      {a.status === "CONFIRMED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCancelModalAppointment(a)}
                          disabled={actionLoading === a.trackingCode}
                          className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 min-h-[44px] cursor-pointer"
                        >
                          <XCircle className="w-4 h-4 ml-1.5" />
                          <span>درخواست لغو این نوبت</span>
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
                {/* Bottom Back Action */}
                <div className="pt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setHasSearched(false)
                      setError(null)
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#1C221F] hover:bg-[#252C28] text-xs sm:text-sm font-bold text-[#E4C88E] border border-[#C8A96B]/40 transition-all cursor-pointer min-h-[44px]"
                  >
                    <ArrowRight className="w-4 h-4 text-[#C8A96B]" />
                    <span>بازگشت به پیگیری نوبت دیگر</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Salon Location & Support Footer */}
        <div className="p-6 rounded-3xl bg-[#141715] border border-[#242A27] text-center space-y-2 text-xs text-[#8C8477]">
          <p>آدرس سالن: تهران، زعفرانیه، خیابان مقدس اردبیلی، مجتمع تجاری پیروز، طبقه ۲، واحد ۲۰۴</p>
          <p>
            تلفن هماهنگی و پشتیبانی نوبت‌ها:{" "}
            <a href="tel:02122446688" className="font-mono text-[#C8A96B] hover:underline dir-ltr" dir="ltr">
              ۰۲۱-۲۲۴۴۶۶۸۸
            </a>
          </p>
        </div>

      </div>

      {/* Cancellation Confirmation Dialog */}
      {cancelModalAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#141715] border border-[#242A27] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-right">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold font-heading text-[#F7F4EE]">تأیید لغو نوبت رزرواسیون</h3>
            </div>

            <p className="text-xs sm:text-sm text-[#A8A39A] leading-relaxed">
              آیا از لغو نوبت برای خدمت <strong className="text-[#F7F4EE]">{cancelModalAppointment.serviceName}</strong> با کد پیگیری <strong className="text-[#E4C88E] font-mono">{cancelModalAppointment.trackingCode}</strong> اطمینان دارید؟
            </p>

            <div className="p-3.5 rounded-2xl bg-[#0D0F0E] border border-[#222825] text-xs text-[#C8A96B] space-y-1">
              <strong className="block font-bold">قانون لغو سالن:</strong>
              <p className="text-[#A8A39A]">امکان لغو نوبت با بازگشت کامل بیعانه تا حداقل ۱۲ ساعت مانده به زمان مراجعه فراهم است.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cancel-reason-input" className="text-xs text-[#A8A39A] block">
                علت لغو نوبت (اختیاری):
              </label>
              <textarea
                id="cancel-reason-input"
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="تغییر برنامه کاری، بیماری، مسافرت و..."
                className="w-full bg-[#0D0F0E] border border-[#2D332F] rounded-xl px-3 py-2 text-xs text-[#F5F1E8] placeholder-[#555C57] focus:outline-none focus:border-[#C8A96B] resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCancelModalAppointment(null)}
                className="flex-1 border-[#2D332F] text-[#A8A39A] hover:text-[#F7F4EE] hover:bg-[#1F2321] min-h-[44px]"
              >
                انصراف
              </Button>

              <Button
                type="button"
                onClick={handleExecuteCancel}
                disabled={actionLoading === cancelModalAppointment.trackingCode}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold min-h-[44px] cursor-pointer"
              >
                {actionLoading === cancelModalAppointment.trackingCode ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin ml-1" />
                    در حال لغو...
                  </>
                ) : (
                  "تأیید و لغو نوبت"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BookingStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-32 pb-20 flex items-center justify-center text-[#A8A39A] text-sm" dir="rtl">
          <RefreshCw className="w-6 h-6 animate-spin text-[#C8A96B] ml-2" />
          بارگذاری سامانه پیگیری نوبت‌های من...
        </div>
      }
    >
      <BookingStatusContent />
    </Suspense>
  )
}
