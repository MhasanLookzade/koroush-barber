"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatToman, toPersianDigits, formatJalaliFull } from "@/lib/jalali"
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Download,
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
  Sparkles,
  ExternalLink,
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
  paymentRefId?: string | null
  paymentAuthority?: string | null
  createdAt?: string
}

function BookingSuccessContent() {
  const searchParams = useSearchParams()
  const trackingCode = searchParams.get("trackingCode")
  const authority = searchParams.get("authority")
  const isFailedParam = searchParams.get("failed") === "true"
  const failureMessage =
    searchParams.get("message") || "تراکنش توسط درگاه پرداخت بانکی تایید نشد یا توسط کاربر لغو گردید."

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
        const res = await fetch(
          `/api/booking/status?trackingCode=${encodeURIComponent(trackingCode.trim().toUpperCase())}`
        )
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

  // 1. LOADING STATE
  if (loading) {
    return (
      <div className="pt-28 sm:pt-36 pb-20 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto text-center" dir="rtl">
        <div className="bg-[#141715] border border-[#242A27] rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#C8A96B]/10 border border-[#C8A96B]/30 flex items-center justify-center mx-auto text-[#C8A96B]">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-[#F7F4EE]">
              در حال استعلام و راستی‌آزمایی نوبت...
            </h2>
            <p className="text-xs sm:text-sm text-[#A8A39A] leading-relaxed">
              لطفاً چند لحظه شکیبا باشید؛ سیستم در حال بررسی وضعیت تراکنش بانکی و صدور رسید قطعی است.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 2. PAYMENT FAILED / CANCELLED STATE
  if (isFailedParam) {
    return (
      <div className="pt-28 sm:pt-36 pb-20 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto text-center" dir="rtl">
        <div className="bg-[#141715] border border-red-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border-2 border-red-500/30 text-red-400 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(239,68,68,0.2)]">
            <XCircle className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>پرداخت ناموفق</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-[#F7F4EE]">
              تراکنش پرداخت تکمیل نشد
            </h1>
            <p className="text-xs sm:text-sm text-[#A8A39A] leading-relaxed max-w-md mx-auto">
              {failureMessage}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0D0F0E] border border-[#242A27] text-right space-y-2 text-xs text-[#A8A39A]">
            <span className="font-bold text-[#E4C88E] block text-sm">نکات مهم:</span>
            <ul className="list-disc list-inside space-y-1 pr-1 text-[#8C8477]">
              <li>در صورت کسر وجه از حساب شما، حداکثر تا ۷۲ ساعت آینده توسط شبکه شاپرک بازگردانده می‌شود.</li>
              <li>نوبت انتخابی شما به مدت ۱۰ دقیقه قفل بوده و پس از آن مجدداً برای عموم آزاد می‌گردد.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/#booking" className="flex-1">
              <Button className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold py-6 rounded-2xl text-sm gap-2 min-h-[48px] cursor-pointer">
                <RotateCcw className="w-4 h-4" />
                <span>تلاش مجدد برای رزرو نوبت</span>
              </Button>
            </Link>

            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full border-[#2D332F] text-[#A8A39A] hover:text-[#F7F4EE] hover:bg-[#1C221F] py-6 rounded-2xl text-sm min-h-[48px]">
                بازگشت به صفحه اصلی
              </Button>
            </Link>
          </div>

          <p className="text-xs text-[#7E776C] pt-2">
            نیاز به راهنمایی دارید؟ با پذیرش سالن تماس بگیرید:{" "}
            <a href="tel:02122446688" className="text-[#C8A96B] font-mono dir-ltr underline" dir="ltr">
              ۰۲۱-۲۲۴۴۶۶۸۸
            </a>
          </p>
        </div>
      </div>
    )
  }

  // 3. ERROR / NOT FOUND STATE
  if (error || !appointment) {
    return (
      <div className="pt-28 sm:pt-36 pb-20 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto text-center" dir="rtl">
        <div className="bg-[#141715] border border-amber-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-[#F7F4EE]">
              نوبت مورد نظر یافت نشد
            </h2>
            <p className="text-xs sm:text-sm text-[#A8A39A] leading-relaxed">
              {error || "اطلاعاتی متناظر با کد پیگیری وارد شده در سامانه وجود ندارد."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/booking/status" className="flex-1">
              <Button className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold py-5 rounded-2xl text-sm min-h-[44px]">
                ورود به بخش پیگیری نوبت
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full border-[#2D332F] text-[#A8A39A] py-5 rounded-2xl text-sm min-h-[44px]">
                صفحه اصلی
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 4. LATE CALLBACK REVIEW STATE (PAYMENT_REVIEW)
  if (appointment.status === "PAYMENT_REVIEW") {
    return (
      <div className="pt-28 sm:pt-36 pb-20 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto" dir="rtl">
        <div className="bg-[#141715] border border-amber-500/50 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold inline-block">
              نیازمند تایید دستی پذیرش سالن
            </span>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-[#F7F4EE]">
              بیعانه شما واریز شد (در انتظار هماهنگی نهایی)
            </h1>
            <p className="text-xs sm:text-sm text-[#A8A39A] leading-relaxed max-w-md mx-auto">
              پرداخت بیعانه شما با موفقیت ثبت شد، اما به دلیل انجام پرداخت پس از مهلت ۱۰ دقیقه‌ای، نوبت نیازمند تایید دستی مدیریت است تا از عدم تداخل با نوبت دیگر اطمینان حاصل شود.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0D0F0E] border border-[#242A27] text-right space-y-2 text-xs">
            <div className="flex justify-between items-center text-[#A8A39A]">
              <span>کد پیگیری رسمی:</span>
              <strong className="font-mono text-[#E4C88E] text-sm">{appointment.trackingCode}</strong>
            </div>
            <div className="flex justify-between items-center text-[#A8A39A]">
              <span>خدمت:</span>
              <strong className="text-[#F7F4EE]">{appointment.serviceName}</strong>
            </div>
            <div className="flex justify-between items-center text-[#A8A39A]">
              <span>بیعانه واریزشده:</span>
              <strong className="text-emerald-400 font-bold">{formatToman(appointment.depositPaid)}</strong>
            </div>
          </div>

          <p className="text-xs text-[#C8A96B] font-medium">
            همکاران ما در پذیرش سالن کوروش تا دقایقی دیگر با شماره {appointment.customerPhone} تماس خواهند گرفت.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href={`/booking/status?trackingCode=${appointment.trackingCode}`} className="flex-1">
              <Button className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold py-5 rounded-2xl text-xs sm:text-sm min-h-[44px]">
                پیگیری این نوبت
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full border-[#2D332F] text-[#A8A39A] py-5 rounded-2xl text-xs sm:text-sm min-h-[44px]">
                بازگشت به خانه
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 5. VERIFIED CONFIRMED BOOKING SUCCESS (Primary Luxury Digital Receipt Experience)
  return (
    <div className="pt-24 sm:pt-28 pb-20 px-4 sm:px-6 lg:px-8 selection:bg-[#C8A96B] selection:text-[#0D0F0E]" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Breadcrumb & Status Notification */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#242A27]">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-[#A8A39A]">
            <Link href="/" className="hover:text-[#C8A96B] transition-colors">
              صفحه اصلی
            </Link>
            <span className="text-[#4E5651]">/</span>
            <span className="text-[#E4C88E] font-semibold">رسید دیجیتال و تایید نوبت</span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>نوبت قطعی با پرداخت بیعانه ثبت شد</span>
          </div>
        </div>

        {/* Hero Success Heading */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.25)] animate-in zoom-in-75 duration-300">
            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <h1 className="text-2xl sm:text-4xl font-heading font-black text-[#F7F4EE] tracking-normal text-balance">
            رزرو نوبت شما با موفقیت تأیید شد!
          </h1>
          <p className="text-xs sm:text-sm text-[#A8A39A] leading-relaxed">
            پیامک رسمی تایید نوبت شامل کد پیگیری، زمان حضور و اطلاعات سالن به شماره همراه شما ارسال گردید.
          </p>
        </div>

        {/* 2-Column Responsive Layout: Right Ticket (7 Cols), Left Info (5 Cols) on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          
          {/* Main Column: Digital Receipt Ticket (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="bg-[#141715] border border-[#C8A96B]/50 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden print:border-black print:text-black">
              
              {/* Gold decorative gradient line */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#C8A96B] via-[#E4C88E] to-[#C8A96B]" />

              {/* Ticket Top Header: Tracking Code & Verified Stamp */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-[#242A27]">
                <div>
                  <span className="text-[11px] text-[#8C8477] block mb-1">کد پیگیری رسمی رزرواسیون:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl sm:text-3xl font-mono font-black text-[#E4C88E] tracking-wider" dir="ltr">
                      {appointment.trackingCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="p-2 rounded-xl bg-[#1C221F] hover:bg-[#C8A96B] hover:text-[#0D0F0E] text-[#C8A96B] transition-colors cursor-pointer border border-[#2D332F]"
                      aria-label="کپی کد پیگیری نوبت"
                      title="کپی کد پیگیری نوبت"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="text-left sm:text-left">
                  <span className="px-3 py-1.5 rounded-xl bg-[#1A221E] border border-emerald-500/40 text-emerald-400 text-xs font-bold inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تأیید سیستمی قطعی</span>
                  </span>
                  {appointment.paymentRefId && (
                    <span className="block text-[10px] text-[#7E776C] font-mono mt-1" dir="ltr">
                      RefId: {appointment.paymentRefId}
                    </span>
                  )}
                </div>
              </div>

              {/* Service & Appointment Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
                <div className="p-4 rounded-2xl bg-[#0D0F0E] border border-[#222825] space-y-1">
                  <span className="text-[#8C8477] text-[11px] block">خدمت انتخاب‌شده:</span>
                  <strong className="text-sm sm:text-base text-[#F7F4EE] block font-heading">
                    {appointment.serviceName}
                  </strong>
                  <span className="text-[11px] text-[#C8A96B] block">۶۰ دقیقه زمان اختصاصی در سالن</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#0D0F0E] border border-[#222825] space-y-1">
                  <span className="text-[#8C8477] text-[11px] block">آرایشگر و مسئول اجرا:</span>
                  <strong className="text-sm sm:text-base text-[#F7F4EE] block font-heading">
                    {appointment.barberName || "استاد کوروش (مستر باربر)"}
                  </strong>
                  <span className="text-[11px] text-[#A8A39A] block">جایگاه اختصاصی VIP</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#0D0F0E] border border-[#222825] space-y-1">
                  <span className="text-[#8C8477] text-[11px] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#C8A96B]" />
                    <span>تاریخ نوبت (تقویم شمسی):</span>
                  </span>
                  <strong className="text-sm sm:text-base text-[#F7F4EE] block font-mono">
                    {appointment.jalaliFull ? appointment.jalaliFull.split("-")[0].trim() : formatJalaliFull(appointment.dateUtc)}
                  </strong>
                </div>

                <div className="p-4 rounded-2xl bg-[#0D0F0E] border border-[#222825] space-y-1">
                  <span className="text-[#8C8477] text-[11px] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#C8A96B]" />
                    <span>ساعت آغاز نوبت:</span>
                  </span>
                  <strong className="text-base sm:text-lg text-[#E4C88E] font-mono block" dir="ltr">
                    {toPersianDigits(appointment.time)}
                  </strong>
                </div>
              </div>

              {/* Financial Calculation Breakdown Table */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D0F0E] border border-[#242A27] space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-center text-[#A8A39A]">
                  <span>مبلغ کل تعرفه خدمت:</span>
                  <strong className="text-[#F7F4EE] text-sm sm:text-base">
                    {formatToman(appointment.totalPrice)}
                  </strong>
                </div>

                <div className="flex justify-between items-center text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>بیعانه پرداختی آنلاین (۲۰٪):</span>
                  </span>
                  <strong className="text-sm sm:text-base font-bold">
                    {formatToman(appointment.depositPaid)}
                  </strong>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#222825]">
                  <div>
                    <span className="text-[#F7F4EE] font-bold block text-sm">مانده قابل پرداخت در سالن:</span>
                    <span className="text-[11px] text-[#8C8477]">تسویه در روز نوبت (کارتخوان یا نقد)</span>
                  </div>
                  <strong className="text-[#E4C88E] text-lg sm:text-xl font-black font-mono">
                    {appointment.isRemainderPaid ? "تسویه کامل شد" : formatToman(appointment.balanceDue)}
                  </strong>
                </div>
              </div>

              {/* Action Buttons: Calendar + Print */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <a
                  href={`/api/booking/calendar/${appointment.trackingCode}`}
                  className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#1C221F] hover:bg-[#252C28] text-xs sm:text-sm font-semibold text-[#F7F4EE] border border-[#2D332F] hover:border-[#C8A96B] transition-colors min-h-[46px]"
                >
                  <Download className="w-4 h-4 text-[#C8A96B]" />
                  <span>افزودن به تقویم (.ics)</span>
                </a>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#1C221F] hover:bg-[#252C28] text-xs sm:text-sm font-semibold text-[#F7F4EE] border border-[#2D332F] hover:border-[#C8A96B] transition-colors min-h-[46px] cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-[#C8A96B]" />
                  <span>چاپ / ذخیره PDF رسید</span>
                </button>
              </div>

            </Card>

            {/* Quick Navigation Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href={`/booking/status?trackingCode=${appointment.trackingCode}`} className="flex-1">
                <Button className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold py-6 rounded-2xl text-sm sm:text-base gap-2 shadow-lg min-h-[48px] cursor-pointer">
                  <span>پیگیری و مدیریت این نوبت</span>
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

          {/* Side Column: Salon Guidance, Location & Policies (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Salon Location & Reception Card */}
            <Card className="bg-[#141715] border border-[#242A27] rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#242A27]">
                <MapPin className="w-5 h-5 text-[#C8A96B]" />
                <h3 className="font-heading font-bold text-base text-[#F7F4EE]">نشانی و اطلاعات حضور</h3>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-[#A8A39A] leading-relaxed">
                <div>
                  <span className="text-[#8C8477] text-xs block mb-0.5">آدرس سالن اختصاصی:</span>
                  <p className="text-[#F7F4EE] font-medium">
                    تهران، زعفرانیه، خیابان مقدس اردبیلی، مجتمع تجاری پیروز، طبقه ۲، واحد ۲۰۴
                  </p>
                </div>

                <div className="pt-2 border-t border-[#1F2522]">
                  <span className="text-[#8C8477] text-xs block mb-0.5">تلفن هماهنگی پذیرش:</span>
                  <a href="tel:02122446688" className="text-[#E4C88E] font-mono text-base font-bold dir-ltr inline-block" dir="ltr">
                    ۰۲۱-۲۲۴۴۶۶۸۸
                  </a>
                </div>

                <div className="pt-2 border-t border-[#1F2522]">
                  <span className="text-[#8C8477] text-xs block mb-0.5">ساعات فعالیت روزانه:</span>
                  <p className="text-[#F7F4EE]">۱۰:۰۰ الی ۲۳:۰۰ — همه روزه شنبه تا جمعه بدون تعطیلی</p>
                </div>
              </div>
            </Card>

            {/* VIP Perks & Recommendations */}
            <Card className="bg-[#141715] border border-[#242A27] rounded-3xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#E4C88E]">
                <Sparkles className="w-4 h-4 text-[#C8A96B]" />
                <span>پذیرایی و تشریفات سالن کوروش</span>
              </div>
              <ul className="space-y-2 text-xs text-[#A8A39A] leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-[#C8A96B] font-bold">•</span>
                  <span>پیشنهاد می‌شود ۱۰ دقیقه پیش از ساعت مقرر جهت مشاوره اختصاصی فرم چهره در سالن حضور یابید.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#C8A96B] font-bold">•</span>
                  <span>پارکینگ اختصاصی مجموعه تجاری برای مراجعان محترم سالن در دسترس است.</span>
                </li>
              </ul>
            </Card>

            {/* Cancellation Policy Guarantee */}
            <Card className="bg-[#141715] border border-[#242A27] rounded-3xl p-6 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#A8A39A]">
                <ShieldCheck className="w-4 h-4 text-[#C8A96B]" />
                <span className="text-[#F7F4EE]">قوانین لغو و تغییر نوبت</span>
              </div>
              <p className="text-xs text-[#8C8477] leading-relaxed">
                در صورت تغییر برنامه، امکان لغو نوبت با بازگشت کامل ۱۰۰٪ مبلغ بیعانه تا ۱۲ ساعت پیش از آغاز نوبت از طریق بخش «پیگیری نوبت» سامانه امکان‌پذیر است.
              </p>
            </Card>

          </div>

        </div>

      </div>
    </div>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-32 pb-20 flex items-center justify-center text-[#A8A39A] text-sm" dir="rtl">
          <RefreshCw className="w-6 h-6 animate-spin text-[#C8A96B] ml-2" />
          در حال بارگذاری صفحه تایید نوبت...
        </div>
      }
    >
      <BookingSuccessContent />
    </Suspense>
  )
}
