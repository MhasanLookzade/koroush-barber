"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatToman, toPersianDigits } from "@/lib/jalali"
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
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from "lucide-react"

interface AppointmentData {
  id: string
  trackingCode: string
  customerName: string
  customerPhone: string
  serviceName: string
  barberName: string
  status: string
  jalaliFull: string
  time: string
  totalPrice: number
  depositPaid: number
  balanceDue: number
}

function BookingSuccessContent() {
  const searchParams = useSearchParams()
  const trackingCode = searchParams.get("trackingCode")
  const authority = searchParams.get("authority")

  const [appointment, setAppointment] = useState<AppointmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadAppointment() {
      if (!trackingCode) {
        setError("کد پیگیری معتبری ارائه نشده است")
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/booking/status?trackingCode=${trackingCode}`)
        const data = await res.json()
        if (data && data.length > 0) {
          setAppointment(data[0])
        } else {
          setError("نوبت مورد نظر یافت نشد")
        }
      } catch {
        setError("خطا در بارگذاری مشخصات نوبت")
      } finally {
        setLoading(false)
      }
    }
    loadAppointment()
  }, [trackingCode])

  const handleCopyCode = () => {
    if (appointment?.trackingCode) {
      navigator.clipboard.writeText(appointment.trackingCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleShare = async () => {
    if (!appointment) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: "نوبت کوروش باربر",
          text: `نوبت من در آرایشگاه کوروش تایید شد.\nکد پیگیری: ${appointment.trackingCode}\nزمان: ${appointment.jalaliFull}`,
          url: window.location.href,
        })
      } catch {
        // Share cancelled
      }
    } else {
      handleCopyCode()
    }
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-[#F5F1E8]" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#C8A96B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#A8A39A]">در حال تایید و دریافت رسید نوبت...</p>
        </div>
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 text-[#F5F1E8]" dir="rtl">
        <Card className="max-w-md w-full bg-[#161917] border-red-500/30 text-center p-6 space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold font-heading">اطلاعات نوبت در دسترس نیست</h2>
          <p className="text-sm text-[#A8A39A]">{error || "مشکلی در دریافت نوبت رخ داده است."}</p>
          <Link href="/booking">
            <Button className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold w-full">
              بازگشت به صفحه رزرو
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-12 px-4" dir="rtl">
      <Card className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] shadow-2xl rounded-3xl overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#1F2321] via-[#2A302D] to-[#1F2321] p-8 text-center border-b border-[#2D332F] space-y-3">
          <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto ring-8 ring-green-500/10">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-[#F5F1E8]">
            رزرو نوبت شما با موفقیت تایید شد!
          </h1>
          <p className="text-sm text-[#A8A39A]">
            پیامک تایید حاوی اطلاعات رزرو به شماره تماس شما ارسال گردید.
          </p>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Tracking Code Badge */}
          <div className="bg-[#1F2321] p-4 rounded-2xl border border-[#2D332F] flex items-center justify-between">
            <div>
              <span className="text-xs text-[#A8A39A] block">کد رهگیری اختصاصی:</span>
              <span className="text-2xl font-mono font-bold text-[#C8A96B] tracking-wider dir-ltr" dir="ltr">
                {appointment.trackingCode}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="border-[#2D332F] text-[#A8A39A] hover:text-[#F5F1E8] gap-1.5 text-xs"
            >
              <Copy className="w-4 h-4" />
              {copied ? "کپی شد" : "کپی کد"}
            </Button>
          </div>

          {/* Appointment Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-[#0D0F0E] p-5 rounded-2xl border border-[#2D332F]">
            <div className="space-y-1">
              <span className="text-xs text-[#A8A39A] flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-[#C8A96B]" />
                خدمت انتخابی:
              </span>
              <span className="font-bold text-[#F5F1E8] block">{appointment.serviceName}</span>
              <span className="text-xs text-[#A8A39A]">مدت زمان: ۶۰ دقیقه</span>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-[#A8A39A] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#C8A96B]" />
                زمان مراجعه:
              </span>
              <span className="font-bold text-[#C8A96B] block">
                {appointment.jalaliFull}
              </span>
              <span className="text-xs text-[#A8A39A]">ساعت شروع: {toPersianDigits(appointment.time)}</span>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-2.5 bg-[#1F2321] p-5 rounded-2xl border border-[#2D332F] text-sm">
            <div className="flex justify-between items-center text-[#A8A39A]">
              <span>مبلغ کل خدمت:</span>
              <span className="text-[#F5F1E8] font-bold">{formatToman(appointment.totalPrice)}</span>
            </div>
            <div className="flex justify-between items-center text-green-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                بیعانه پرداخت‌شده آنلاین:
              </span>
              <span className="font-bold">{formatToman(appointment.depositPaid)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-[#2D332F] text-[#F5F1E8]">
              <span className="text-xs text-[#A8A39A]">مانده قابل پرداخت در سالن:</span>
              <span className="font-bold text-base text-[#C8A96B]">
                {formatToman(appointment.balanceDue)}
              </span>
            </div>
          </div>

          {/* Salon Address & Cancellation Policy */}
          <div className="space-y-3 text-xs text-[#A8A39A] bg-[#161917] p-4 rounded-xl border border-[#2D332F]">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#C8A96B] shrink-0 mt-0.5" />
              <span>
                <strong>نشانی سالن:</strong> تهران، زعفرانیه، خیابان مقدس اردبیلی، مجتمع تجاری پیروز، طبقه ۲، واحد ۲۰۴
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-[#C8A96B] shrink-0 mt-0.5" />
              <span>
                <strong>قوانین کنسلی:</strong> تا ۱۲ ساعت قبل از زمان نوبت می‌توانید از طریق پنل پیگیری، نوبت خود را لغو نمایید.
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <a
              href={`/api/booking/calendar/${appointment.trackingCode}`}
              download
              className="flex-1"
            >
              <Button
                variant="outline"
                className="w-full border-[#C8A96B] text-[#C8A96B] hover:bg-[#C8A96B]/10 font-bold py-6 gap-2 rounded-xl"
              >
                <Download className="w-4 h-4" />
                افزودن به تقویم گوشی (.ics)
              </Button>
            </a>

            <Button
              onClick={handleShare}
              variant="outline"
              className="flex-1 border-[#2D332F] text-[#F5F1E8] hover:bg-[#1F2321] py-6 gap-2 rounded-xl"
            >
              <Share2 className="w-4 h-4" />
              اشتراک‌گذاری نوبت
            </Button>
          </div>

          <div className="text-center pt-2">
            <Link
              href="/booking/status"
              className="text-xs text-[#C8A96B] hover:underline"
            >
              مشاهده یا مدیریت سایر نوبت‌های من
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center text-[#F5F1E8]" dir="rtl">
          <div className="text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-[#C8A96B] animate-spin mx-auto" />
            <p className="text-sm text-[#A8A39A]">در حال دریافت رسید نوبت...</p>
          </div>
        </div>
      }
    >
      <BookingSuccessContent />
    </Suspense>
  )
}
