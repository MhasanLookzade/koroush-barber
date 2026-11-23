"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatToman, toPersianDigits, formatJalaliFull } from "@/lib/jalali"
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Download,
  Share2,
  Copy,
  Scissors,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Check,
  Printer,
  CalendarCheck,
  XCircle,
  HelpCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react"

interface AppointmentData {
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

function BookingSuccessContent() {
  const searchParams = useSearchParams()
  const trackingCode = searchParams.get("trackingCode")
  const authority = searchParams.get("authority")
  const isFailedParam = searchParams.get("failed") === "true"
  const failureMessage = searchParams.get("message") || "تراکنش توسط درگاه پرداخت بانکی تایید نشد یا توسط کاربر لغو گردید."

  const [appointment, setAppointment] = useState<AppointmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function verifyAndLoadAppointment() {
      if (isFailedParam) {
        setLoading(false)
        return
      }

      if (!trackingCode) {
        setError("کد پیگیری معتبری برای اعتبارسنجی ارائه نشده است.")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/booking/status?trackingCode=${encodeURIComponent(trackingCode.trim().toUpperCase())}`)
        const data = await res.json()

        if (res.ok && Array.isArray(data) && data.length > 0) {
          const app = data[0]
          setAppointment(app)
        } else {
          setError("نوبت مورد نظر در سامانه رزرواسیون یافت نشد.")
        }
      } catch {
        setError("خطا در برقراری ارتباط با سرور و بررسی وضعیت پرداخت.")
      } finally {
        setLoading(false)
      }
    }

    verifyAndLoadAppointment()
  }, [trackingCode, isFailedParam])

  const handleCopyCode = () => {
    if (appointment?.trackingCode) {
      navigator.clipboard.writeText(appointment.trackingCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleShare = async () => {
    if (!appointment) return
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "تایید نوبت آرایشگاه کوروش",
          text: `نوبت من در آرایشگاه کوروش با موفقیت تایید شد.\nکد رهگیری: ${appointment.trackingCode}\nزمان: ${appointment.jalaliFull}`,
          url: window.location.href,
        })
      } catch {
        // Ignored share cancellation
      }
    } else {
      handleCopyCode()
    }
  }

  // 1. Loading State (Payment Verification in Progress)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0F0E] flex items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-3xl bg-[#C8A96B]/10 border border-[#C8A96B]/30 flex items-center justify-center mx-auto text-[#C8A96B]">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-lg font-bold font-heading text-[#F5F1E8]">در حال استعلام وضعیت تایید نوبت...</h2>
          <p className="text-xs text-[#A8A39A]">لطفاً چند لحظه شکیبا باشید تا تراکنش با پایگاه داده اعتبارسنجی شود.</p>
        </div>
      </div>
    )
  }

  // 2. Failed / Cancelled Payment State
  if (isFailedParam) {
    return (
      <div className="min-h-screen bg-[#0D0F0E] text-[#F7F4EE] flex items-center justify-center py-12 px-4" dir="rtl">
        <div className="max-w-md w-full bg-[#161917] border border-red-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-red-200">پرداخت بیعانه ناموفق بود</h1>
            <p className="text-xs text-red-300/80 leading-relaxed">{failureMessage}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#101311] border border-[#222825] text-xs text-[#A8A39A] text-right space-y-1">
            <p>• وجهی از حساب شما کسر نشده و نوبت قطعی ثبت نشده است.</p>
            <p>• در صورت کسر وجه از حساب، طبق قوانین شاپرک ظرف حداکثر ۷۲ ساعت به کارت شما عودت داده می‌شود.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/#booking" className="flex-1">
              <Button className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs gap-1.5 min-h-[44px]">
                <RotateCcw className="w-4 h-4" />
                تلاش مجدد برای رزرو
              </Button>
            </Link>

            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full border-[#2D332F] text-[#A8A39A] text-xs min-h-[44px]">
                بازگشت به خانه
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 3. Error or Not Found State
  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-[#0D0F0E] text-[#F7F4EE] flex items-center justify-center py-12 px-4" dir="rtl">
        <div className="max-w-md w-full bg-[#161917] border border-[#2D332F] rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#F5F1E8]">خطا در استعلام نوبت</h1>
            <p className="text-xs text-[#A8A39A] leading-relaxed">{error || "اطلاعات نوبت یافت نشد."}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/booking/status" className="flex-1">
              <Button className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs min-h-[44px]">
                پیگیری نوبت
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full border-[#2D332F] text-[#A8A39A] text-xs min-h-[44px]">
                صفحه اصلی
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 4. Delayed Payment / PAYMENT_REVIEW State
  if (appointment.status === "PAYMENT_REVIEW") {
    return (
      <div className="min-h-screen bg-[#0D0F0E] text-[#F7F4EE] flex items-center justify-center py-12 px-4" dir="rtl">
        <div className="max-w-lg w-full bg-[#161917] border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-amber-200">پرداخت نیازمند هماهنگی مدیر سالن</h1>
            <p className="text-xs text-[#A8A39A] leading-relaxed">
              پرداخت بیعانه شما با موفقیت ثبت شد، اما به دلیل انجام پرداخت پس از مهلت ۱۰ دقیقه‌ای، نوبت نیازمند تایید دستی مدیریت است.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#101311] border border-[#222825] text-right text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-[#8C8477]">کد رهگیری:</span>
              <strong className="font-mono text-[#E4C88E]">{appointment.trackingCode}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8C8477]">خدمت درخواستی:</span>
              <strong className="text-[#F5F1E8]">{appointment.serviceName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8C8477]">بیعانه واریزی:</span>
              <strong className="text-emerald-400">{formatToman(appointment.depositPaid)}</strong>
            </div>
          </div>

          <p className="text-xs text-[#C8A96B]">همکاران ما در پذیرش سالن تا دقایقی دیگر با شما تماس خواهند گرفت.</p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href={`/booking/status?trackingCode=${appointment.trackingCode}`} className="flex-1">
              <Button className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs min-h-[44px]">
                پیگیری نوبت
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full border-[#2D332F] text-[#A8A39A] text-xs min-h-[44px]">
                بازگشت به خانه
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 5. VERIFIED CONFIRMED BOOKING SUCCESS (Primary Premium Experience)
  return (
    <div className="min-h-screen bg-[#0D0F0E] text-[#F7F4EE] py-10 sm:py-16 px-4 sm:px-6 lg:px-8 selection:bg-[#C8A96B] selection:text-[#0D0F0E]" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Animated Success Seal */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.25)] animate-in zoom-in-75 duration-300">
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>پرداخت بیعانه و نوبت قطعی تایید شد</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-heading font-black text-[#F7F4EE] tracking-tight">
              رزرو نوبت شما با موفقیت تأیید شد!
            </h1>

            <p className="text-xs sm:text-sm text-[#A8A39A] max-w-md mx-auto leading-relaxed">
              پیامک تأیید نوبت حاوی کد پیگیری و زمان حضور به شماره همراه شما ارسال گردید.
            </p>
          </div>
        </div>

        {/* Premium Official Ticket Card */}
        <Card className="bg-[#161917] border border-[#C8A96B]/50 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
          {/* Top Ticket Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-[#242A27]">
            <div>
              <span className="text-[11px] text-[#8C8477] block mb-1">کد پیگیری رسمی رزرواسیون:</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-mono font-bold text-[#E4C88E] tracking-wider" dir="ltr">
                  {appointment.trackingCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1.5 rounded-lg bg-[#1F2321] hover:bg-[#C8A96B] hover:text-[#0D0F0E] text-[#C8A96B] transition-colors"
                  aria-label="کپی کد پیگیری"
                  title="کپی کد پیگیری"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                تأیید قطعی سیستم
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="p-3.5 rounded-2xl bg-[#101311] border border-[#222825] space-y-1">
              <span className="text-[#8C8477] block text-[11px]">خدمت رزرو شده:</span>
              <strong className="text-base text-[#F7F4EE] block">{appointment.serviceName}</strong>
              <span className="text-[11px] text-[#C8A96B] block">۶۰ دقیقه اختصاصی سالن</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#101311] border border-[#222825] space-y-1">
              <span className="text-[#8C8477] block text-[11px]">مراجعه‌کننده:</span>
              <strong className="text-base text-[#F7F4EE] block">{appointment.customerName}</strong>
              <span className="text-[11px] text-[#A8A39A] font-mono block" dir="ltr">{appointment.customerPhone}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#101311] border border-[#222825] space-y-1">
              <span className="text-[#8C8477] flex items-center gap-1.5 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-[#C8A96B]" />
                تاریخ نوبت (تقویم جلالی):
              </span>
              <strong className="text-sm sm:text-base text-[#F7F4EE] block">
                {appointment.jalaliFull ? appointment.jalaliFull.split("-")[0].trim() : formatJalaliFull(appointment.dateUtc)}
              </strong>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#101311] border border-[#222825] space-y-1">
              <span className="text-[#8C8477] flex items-center gap-1.5 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-[#C8A96B]" />
                ساعت شروع نوبت:
              </span>
              <strong className="text-base text-[#E4C88E] font-mono block" dir="ltr">
                {toPersianDigits(appointment.time)}
              </strong>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="p-4 rounded-2xl bg-[#101311] border border-[#222825] space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between items-center text-[#A8A39A]">
              <span>مبلغ کل خدمت:</span>
              <strong className="text-[#F7F4EE] text-sm sm:text-base">{formatToman(appointment.totalPrice)}</strong>
            </div>
            <div className="flex justify-between items-center text-emerald-400">
              <span>بیعانه واریزشده آنلاین (۲۰٪):</span>
              <strong className="text-sm sm:text-base">{formatToman(appointment.depositPaid)}</strong>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-[#1E2421]">
              <span className="text-[#A8A39A]">مانده قابل تسویه در محل سالن:</span>
              <strong className="text-[#E4C88E] text-base sm:text-lg">
                {appointment.isRemainderPaid ? "تسویه کامل شد" : formatToman(appointment.balanceDue)}
              </strong>
            </div>
          </div>

          {/* Salon Address & Map info */}
          <div className="p-4 rounded-2xl bg-[#121614] border border-[#222825] flex items-start gap-3 text-xs text-[#A8A39A]">
            <MapPin className="w-4 h-4 text-[#C8A96B] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="text-[#F7F4EE] block">آدرس سالن:</strong>
              <p>تهران، زعفرانیه، خیابان مقدس اردبیلی، مجتمع تجاری پیروز، طبقه ۲، واحد ۲۰۴</p>
              <p className="pt-1 text-[#8C8477]">تلفن پذیرش: ۰۲۱-۲۲۴۴۶۶۸۸</p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <a
              href={`/api/booking/calendar/${appointment.trackingCode}`}
              className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#1F2321] hover:bg-[#2A312D] text-xs sm:text-sm font-semibold text-[#F7F4EE] border border-[#2D332F] transition-colors min-h-[44px]"
            >
              <Download className="w-4 h-4 text-[#C8A96B]" />
              <span>افزودن به تقویم گوشی (.ics)</span>
            </a>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#1F2321] hover:bg-[#2A312D] text-xs sm:text-sm font-semibold text-[#F7F4EE] border border-[#2D332F] transition-colors min-h-[44px]"
            >
              <Printer className="w-4 h-4 text-[#C8A96B]" />
              <span>چاپ و ذخیره رسید نوبت</span>
            </button>
          </div>
        </Card>

        {/* Primary Navigation Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={`/booking/status?trackingCode=${appointment.trackingCode}`} className="flex-1">
            <Button className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold py-6 rounded-2xl text-sm sm:text-base gap-2 shadow-lg min-h-[48px] cursor-pointer">
              <span>پیگیری نوبت</span>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full border-[#2D332F] hover:bg-[#161917] text-[#A8A39A] hover:text-[#F7F4EE] py-6 rounded-2xl text-sm sm:text-base min-h-[48px]">
              بازگشت به صفحه اصلی
            </Button>
          </Link>
        </div>

      </div>
    </div>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0D0F0E] flex items-center justify-center text-[#A8A39A] text-sm">
          <RefreshCw className="w-6 h-6 animate-spin text-[#C8A96B] ml-2" />
          بارگذاری صفحه تایید نوبت...
        </div>
      }
    >
      <BookingSuccessContent />
    </Suspense>
  )
}
