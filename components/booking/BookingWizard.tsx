"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { formatToman, toPersianDigits, getJalaliDate, getTehranDateString, PERSIAN_WEEKDAYS } from "@/lib/jalali"
import {
  Scissors,
  Calendar,
  Clock,
  Phone,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Shield,
  Sparkles,
  Lock,
  User,
  Timer,
  RefreshCw,
} from "lucide-react"
import { JalaliBirthDatePicker } from "./JalaliBirthDatePicker"

interface Service {
  id: string
  name: string
  description?: string
  price: number
  depositPrice: number
  duration: number
  category: string
}

interface Slot {
  time: string
  endTime: string
  label: string
  isAvailable: boolean
  status: "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED"
}

export function BookingWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Steps: 1: Service, 2: Date & Time, 3: Customer & OTP, 4: Summary & Deposit
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)

  // Data states
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  // Date & Time states
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getTehranDateString())
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([])
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [isClosed, setIsClosed] = useState<boolean>(false)
  const [closedReason, setClosedReason] = useState<string>("")

  // Customer & OTP states
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerBirthDate, setCustomerBirthDate] = useState<string | null>(null)
  const [otpCode, setOtpCode] = useState("")
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [isPhoneVerified, setIsPhoneVerified] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)
  const [devCode, setDevCode] = useState<string | null>(null)

  // Hold & Payment states
  const [holdDetails, setHoldDetails] = useState<{
    holdId: string
    appointmentId: string
    trackingCode: string
    expiresAt: string
    depositAmount: number
    totalPrice: number
    balanceDue: number
  } | null>(null)
  const [holdRemainingSeconds, setHoldRemainingSeconds] = useState<number>(600) // 10 minutes
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Loading & error feedback
  const [loading, setLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Check URL error on mount
  useEffect(() => {
    const urlErr = searchParams.get("error")
    if (urlErr) {
      setError(decodeURIComponent(urlErr))
    }
  }, [searchParams])

  // Fetch services on mount
  useEffect(() => {
    async function loadServices() {
      try {
        setLoading(true)
        const res = await fetch("/api/booking/services")
        if (!res.ok) throw new Error("خطا در بارگذاری خدمات")
        const data = await res.json()
        setServices(data)
        if (data.length > 0) setSelectedService(data[0])
      } catch {
        setError("امکان بارگذاری لیست خدمات فراهم نشد")
      } finally {
        setLoading(false)
      }
    }
    loadServices()
  }, [])

  // Fetch slots whenever selectedDateStr changes
  useEffect(() => {
    async function loadSlots() {
      if (!selectedDateStr) return
      try {
        setSlotsLoading(true)
        setError(null)
        const res = await fetch(`/api/booking/availability?date=${selectedDateStr}`)
        if (!res.ok) throw new Error("خطا در دریافت زمان‌های خالی")
        const data = await res.json()
        setIsClosed(data.isClosed)
        setClosedReason(data.closedReason || "")
        setAvailableSlots(data.slots || [])
        // Reset selected time if not available
        if (selectedTime) {
          const slotStillAvailable = data.slots?.some(
            (s: Slot) => s.time === selectedTime && s.isAvailable
          )
          if (!slotStillAvailable) setSelectedTime(null)
        }
      } catch {
        setError("خطا در محاسبه ظرفیت زمان‌های خالی")
      } finally {
        setSlotsLoading(false)
      }
    }
    loadSlots()
  }, [selectedDateStr, selectedTime])

  // OTP Countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return
    const interval = setInterval(() => {
      setOtpTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [otpTimer])

  // Hold countdown timer
  useEffect(() => {
    if (!holdDetails) return
    const interval = setInterval(() => {
      const expTime = new Date(holdDetails.expiresAt).getTime()
      const now = new Date().getTime()
      const remaining = Math.max(0, Math.floor((expTime - now) / 1000))
      setHoldRemainingSeconds(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        setError("مهلت پرداخت ۱۰ دقیقه‌ای این هلد موقت منقضی شد. لطفاً دوباره تلاش کنید.")
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [holdDetails])

  // Send OTP handler
  const handleSendOtp = async () => {
    setError(null)
    setSuccessMsg(null)
    if (!customerPhone || customerPhone.length < 10) {
      setError("لطفاً شماره موبایل معتبر (۱۱ رقم با ۰۹) وارد نمایید")
      return
    }

    try {
      setLoading(true)
      const res = await fetch("/api/booking/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customerPhone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "خطا در ارسال کد تایید")

      setIsOtpSent(true)
      setOtpTimer(120)
      if (data.devCode) setDevCode(data.devCode)
      setSuccessMsg("کد تایید ۶ رقمی به شماره شما پیامک شد.")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در ارسال کد تایید")
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP handler
  const handleVerifyOtp = async () => {
    setError(null)
    setSuccessMsg(null)
    if (!otpCode || otpCode.trim().length !== 6) {
      setError("لطفاً کد تایید ۶ رقمی را به صورت کامل وارد کنید")
      return
    }

    try {
      setLoading(true)
      const res = await fetch("/api/booking/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customerPhone, code: otpCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "کد تایید اشتباه است")

      setIsPhoneVerified(true)
      setSuccessMsg("شماره موبایل با موفقیت تایید شد.")
      setCurrentStep(4) // Proceed to summary & deposit step
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در تایید کد")
    } finally {
      setLoading(false)
    }
  }

  // Acquire Hold and Proceed to Gateway Payment
  const handleProceedToPayment = async () => {
    setError(null)
    if (!selectedService || !selectedTime || !customerPhone || !customerName) {
      setError("اطلاعات نوبت ناقص است")
      return
    }

    if (!agreedToTerms) {
      setError("لطفاً با شرایط و قوانین سالن موافقت فرمایید")
      return
    }

    try {
      setLoading(true)
      // 1. Reserve atomic hold
      const holdRes = await fetch("/api/booking/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          dateStr: selectedDateStr,
          timeStr: selectedTime,
          customerName,
          customerPhone,
          customerEmail,
          customerBirthDate,
        }),
      })

      const holdData = await holdRes.json()
      if (!holdRes.ok) {
        throw new Error(holdData.error || "این بازه زمانی دیگر در دسترس نیست")
      }

      setHoldDetails(holdData)

      // 2. Initiate Payment
      const payRes = await fetch("/api/booking/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: holdData.appointmentId }),
      })

      const payData = await payRes.json()
      if (!payRes.ok) {
        throw new Error(payData.error || "خطا در اتصال به درگاه پرداخت")
      }

      // Redirect to payment gateway
      window.location.href = payData.redirectUrl
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطای ارتباط با درگاه پرداخت")
    } finally {
      setLoading(false)
    }
  }

  // Generate 7 upcoming days for the quick date picker
  const generateUpcomingDays = () => {
    const days = []
    const base = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      const dateStr = getTehranDateString(d)
      const jalali = getJalaliDate(d)
      days.push({
        dateStr,
        dayName: jalali.dayName,
        dayNumber: toPersianDigits(jalali.day),
        monthName: jalali.monthName,
        isToday: i === 0,
      })
    }
    return days
  }

  const upcomingDays = generateUpcomingDays()

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8" dir="rtl">
      {/* Progress Stepper */}
      <nav aria-label="مراحل رزرو نوبت" className="bg-[#161917] p-4 sm:p-6 rounded-2xl border border-[#2D332F] shadow-lg">
        <ol className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#2D332F] -translate-y-1/2 z-0" />
          {[
            { num: 1, label: "انتخاب خدمت", icon: Scissors },
            { num: 2, label: "تاریخ و ساعت", icon: Calendar },
            { num: 3, label: "تایید شماره", icon: Phone },
            { num: 4, label: "پیش‌فاکتور و بیعانه", icon: CreditCard },
          ].map((s) => {
            const isCompleted = currentStep > s.num
            const isCurrent = currentStep === s.num
            const Icon = s.icon
            return (
              <li key={s.num} className="relative z-10 flex flex-col items-center">
                <button
                  type="button"
                  disabled={s.num > currentStep}
                  onClick={() => s.num < currentStep && setCurrentStep(s.num as 1 | 2 | 3 | 4)}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all focus-visible:ring-2 focus-visible:ring-[#C8A96B] focus-visible:ring-offset-2 ${
                    isCurrent
                      ? "bg-[#C8A96B] text-[#0D0F0E] shadow-[0_0_15px_rgba(200,169,107,0.4)]"
                      : isCompleted
                      ? "bg-[#1F2321] text-[#C8A96B] border border-[#C8A96B]"
                      : "bg-[#1F2321] text-[#A8A39A] border border-[#2D332F]"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                </button>
                <span
                  className={`mt-2 text-xs sm:text-sm font-medium transition-colors ${
                    isCurrent ? "text-[#C8A96B] font-bold" : isCompleted ? "text-[#F5F1E8]" : "text-[#A8A39A]"
                  }`}
                >
                  {s.label}
                </span>
              </li>
            )
          })}
        </ol>
      </nav>

      {/* Accessible Error / Alert Banner */}
      {error && (
        <div
          role="alert"
          tabIndex={-1}
          className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 flex items-start gap-3 animate-fade-in"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">خطایی رخ داده است</h4>
            <p className="text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="p-4 rounded-xl bg-green-950/40 border border-green-500/40 text-green-200 flex items-start gap-3 animate-fade-in"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 text-green-400 mt-0.5" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* STEP 1: SERVICE SELECTION */}
      {currentStep === 1 && (
        <section aria-labelledby="step1-heading" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 id="step1-heading" className="text-2xl font-bold font-heading text-[#F5F1E8]">
                انتخاب خدمت مورد نظر
              </h2>
              <p className="text-sm text-[#A8A39A] mt-1">
                تمامی نوبت‌ها در فاز اول ۶۰ دقیقه اختصاصی به همراه مشاوره اولیه هستند.
              </p>
            </div>
            <Badge variant="outline" className="border-[#C8A96B] text-[#C8A96B] px-3 py-1 text-xs">
              مدت زمان هر نوبت: ۶۰ دقیقه
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((srv) => {
              const isSelected = selectedService?.id === srv.id
              return (
                <div
                  key={srv.id}
                  onClick={() => setSelectedService(srv)}
                  className={`cursor-pointer p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? "bg-[#1F2321] border-[#C8A96B] shadow-[0_0_20px_rgba(200,169,107,0.15)] ring-1 ring-[#C8A96B]"
                      : "bg-[#161917] border-[#2D332F] hover:border-[#C8A96B]/50 hover:bg-[#1A1D1B]"
                  }`}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") setSelectedService(srv)
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg text-[#F5F1E8]">{srv.name}</h3>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[#0D0F0E] text-[#A8A39A] border border-[#2D332F]">
                        {srv.category}
                      </span>
                    </div>
                    {srv.description && (
                      <p className="text-xs text-[#A8A39A] leading-relaxed line-clamp-2">
                        {srv.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#2D332F] flex justify-between items-end">
                    <div>
                      <span className="text-xs text-[#A8A39A] block">مبلغ کل خدمت:</span>
                      <span className="text-base font-bold text-[#F5F1E8]">
                        {formatToman(srv.price)}
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="text-xs text-[#A8A39A] block">بیعانه رزرو آنلاین:</span>
                      <span className="text-sm font-bold text-[#C8A96B]">
                        {formatToman(srv.depositPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              size="lg"
              onClick={() => setCurrentStep(2)}
              disabled={!selectedService}
              className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold px-8 py-6 rounded-xl gap-2 text-base"
            >
              مرحله بعد: انتخاب تاریخ و ساعت
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
        </section>
      )}

      {/* STEP 2: DATE & TIME SELECTION */}
      {currentStep === 2 && (
        <section aria-labelledby="step2-heading" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 id="step2-heading" className="text-2xl font-bold font-heading text-[#F5F1E8]">
                روز و ساعت نوبت
              </h2>
              <p className="text-sm text-[#A8A39A] mt-1">
                ساعات کاری سالن از ۱۰:۰۰ الی ۲۳:۰۰ است (۱۳ بازه یک ساعته).
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep(1)}
              className="text-[#A8A39A] hover:text-[#F5F1E8] gap-1"
            >
              <ArrowRight className="w-4 h-4" />
              تغییر خدمت
            </Button>
          </div>

          {/* Quick Date Selector (7 upcoming days) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#F5F1E8] block">روز مورد نظر:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {upcomingDays.map((d) => {
                const isSelected = selectedDateStr === d.dateStr
                return (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => setSelectedDateStr(d.dateStr)}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center min-h-[72px] focus-visible:ring-2 focus-visible:ring-[#C8A96B] ${
                      isSelected
                        ? "bg-[#C8A96B] text-[#0D0F0E] border-[#C8A96B] font-bold shadow-md"
                        : "bg-[#161917] border-[#2D332F] text-[#F5F1E8] hover:border-[#C8A96B]/40 hover:bg-[#1A1D1B]"
                    }`}
                  >
                    <span className="text-xs block opacity-80">{d.dayName}</span>
                    <span className="text-lg font-bold block my-0.5">{d.dayNumber}</span>
                    <span className="text-[10px] block opacity-80">{d.monthName}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Slots View */}
          <div className="space-y-3 pt-2 min-h-[260px]">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-[#F5F1E8] block">
                ساعت‌های خالی این روز:
              </label>
              {slotsLoading && (
                <span className="text-xs text-[#C8A96B] flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  در حال بروزرسانی ظرفیت...
                </span>
              )}
            </div>

            {isClosed ? (
              <div className="p-8 text-center rounded-2xl bg-[#161917] border border-[#2D332F] space-y-2">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                <h3 className="font-bold text-[#F5F1E8] text-lg">سالن در این تاریخ تعطیل است</h3>
                <p className="text-sm text-[#A8A39A]">{closedReason || "نوبتی برای این روز قابل ارائه نیست."}</p>
              </div>
            ) : (
              <div
                className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 transition-opacity duration-200 ${slotsLoading ? "opacity-60 pointer-events-none" : "opacity-100"}`}
                role="radiogroup"
                aria-label="ساعت‌های خالی"
              >
                {availableSlots.length === 0 && slotsLoading
                  ? Array.from({ length: 13 }).map((_, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl border border-[#202422] bg-[#121413] animate-pulse flex flex-col items-center justify-center min-h-[56px] gap-1"
                      >
                        <div className="h-4 w-12 bg-[#202623] rounded" />
                        <div className="h-2.5 w-8 bg-[#1B201D] rounded" />
                      </div>
                    ))
                  : availableSlots.map((slot) => {
                  const isSelected = selectedTime === slot.time
                  const isAvailable = slot.isAvailable

                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => isAvailable && setSelectedTime(slot.time)}
                      className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center min-h-[56px] focus-visible:ring-2 focus-visible:ring-[#C8A96B] ${
                        isSelected
                          ? "bg-[#C8A96B] text-[#0D0F0E] border-[#C8A96B] font-bold shadow-md"
                          : isAvailable
                          ? "bg-[#161917] border-[#2D332F] text-[#F5F1E8] hover:border-[#C8A96B] hover:bg-[#1F2321]"
                          : "bg-[#121413] border-[#202422] text-[#555C57] cursor-not-allowed opacity-60"
                      }`}
                      role="radio"
                      aria-checked={isSelected}
                    >
                      <span className="font-mono text-sm tracking-wide dir-ltr" dir="ltr">
                        {toPersianDigits(slot.time)} - {toPersianDigits(slot.endTime)}
                      </span>
                      <span className="text-[10px] mt-1">
                        {slot.status === "AVAILABLE"
                          ? "آزاد"
                          : slot.status === "HELD"
                          ? "در حال پرداخت"
                          : slot.status === "BLOCKED"
                          ? "غیرفعال"
                          : "رزرو شده"}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="border-[#2D332F] text-[#A8A39A] hover:text-[#F5F1E8] gap-2 px-6"
            >
              <ArrowRight className="w-4 h-4" />
              مرحله قبل
            </Button>
            <Button
              size="lg"
              onClick={() => setCurrentStep(3)}
              disabled={!selectedTime || isClosed}
              className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold px-8 py-6 rounded-xl gap-2 text-base"
            >
              مرحله بعد: تایید شماره موبایل
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
        </section>
      )}

      {/* STEP 3: CUSTOMER INFO & OTP VERIFICATION */}
      {currentStep === 3 && (
        <section aria-labelledby="step3-heading" className="space-y-6">
          <div>
            <h2 id="step3-heading" className="text-2xl font-bold font-heading text-[#F5F1E8]">
              مشخصات و تایید شماره تماس
            </h2>
            <p className="text-sm text-[#A8A39A] mt-1">
              جهت ارسال پیامک پیگیری و تایید نوبت، شماره موبایل خود را تایید نمایید.
            </p>
          </div>

          <div className="bg-[#161917] p-6 rounded-2xl border border-[#2D332F] space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="customer-name" className="text-sm font-medium text-[#F5F1E8] block">
                  نام و نام خانوادگی <span className="text-red-400">*</span>
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مثال: کیان راد"
                  disabled={isPhoneVerified}
                  className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-4 py-3 text-sm text-[#F5F1E8] placeholder:text-[#555C57] focus:outline-none focus:border-[#C8A96B]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="customer-phone" className="text-sm font-medium text-[#F5F1E8] block">
                  شماره موبایل (جهت ارسال پیامک) <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="customer-phone"
                    type="tel"
                    dir="ltr"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="09123456789"
                    disabled={isPhoneVerified || isOtpSent}
                    className="flex-1 bg-[#1F2321] border border-[#2D332F] rounded-xl px-4 py-3 text-sm text-[#F5F1E8] font-mono placeholder:text-[#555C57] focus:outline-none focus:border-[#C8A96B]"
                  />
                  {!isPhoneVerified && (
                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading || otpTimer > 0 || !customerPhone}
                      className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold px-4 shrink-0"
                    >
                      {otpTimer > 0 ? `${toPersianDigits(otpTimer)} ثانیه` : isOtpSent ? "ارسال مجدد" : "ارسال کد"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Optional Date of Birth */}
              <div className="pt-2">
                <JalaliBirthDatePicker
                  value={customerBirthDate || ""}
                  onChange={setCustomerBirthDate}
                />
              </div>
            </div>

            {/* OTP Verification Input */}
            {isOtpSent && !isPhoneVerified && (
              <div className="pt-4 border-t border-[#2D332F] space-y-4">
                <div className="space-y-2">
                  <label htmlFor="otp-input" className="text-sm font-medium text-[#C8A96B] block">
                    کد تایید ۶ رقمی پیامک شده را وارد فرمایید:
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      id="otp-input"
                      type="text"
                      dir="ltr"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="------"
                      className="w-48 bg-[#1F2321] border border-[#C8A96B] rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest text-[#F5F1E8] focus:outline-none focus:ring-2 focus:ring-[#C8A96B]"
                    />
                    <Button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={loading || otpCode.length !== 6}
                      className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold px-6 py-3"
                    >
                      تایید کد و ادامه
                    </Button>
                  </div>
                </div>

                {devCode && (
                  <div className="p-2.5 rounded-lg bg-[#1F2321] border border-[#2D332F] text-xs text-[#A8A39A] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#C8A96B]" />
                    <span>کد تایید محیط تستی: </span>
                    <code className="text-[#C8A96B] font-mono font-bold">{devCode}</code>
                  </div>
                )}
              </div>
            )}

            {isPhoneVerified && (
              <div className="p-3 rounded-xl bg-green-950/40 border border-green-500/30 text-green-300 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span>شماره موبایل شما با موفقیت تایید شد.</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(2)}
              className="border-[#2D332F] text-[#A8A39A] hover:text-[#F5F1E8] gap-2 px-6"
            >
              <ArrowRight className="w-4 h-4" />
              مرحله قبل
            </Button>
            {isPhoneVerified && (
              <Button
                size="lg"
                onClick={() => setCurrentStep(4)}
                className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold px-8 py-6 rounded-xl gap-2 text-base"
              >
                مرحله بعد: پیش‌فاکتور و بیعانه
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
          </div>
        </section>
      )}

      {/* STEP 4: SUMMARY & DEPOSIT PAYMENT */}
      {currentStep === 4 && selectedService && (
        <section aria-labelledby="step4-heading" className="space-y-6">
          <div>
            <h2 id="step4-heading" className="text-2xl font-bold font-heading text-[#F5F1E8]">
              پیش‌فاکتور و پرداخت بیعانه
            </h2>
            <p className="text-sm text-[#A8A39A] mt-1">
              جهت نهایی‌سازی نوبت، مبلغ بیعانه را از طریق درگاه امن شاپرک پرداخت نمایید.
            </p>
          </div>

          <div className="bg-[#161917] p-6 rounded-2xl border border-[#2D332F] space-y-6">
            {/* Booking Details Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pb-6 border-b border-[#2D332F]">
              <div className="space-y-1">
                <span className="text-[#A8A39A] block text-xs">خدمت انتخاب شده:</span>
                <span className="font-bold text-[#F5F1E8] text-base">{selectedService.name}</span>
                <span className="text-xs text-[#A8A39A] block">مدت نوبت: ۶۰ دقیقه اختصاصی</span>
                <div className="text-xs text-[#A8A39A] pt-1">
                  مشتری: <strong className="text-[#F5F1E8]">{customerName}</strong> ({toPersianDigits(customerPhone)})
                  {customerBirthDate && (
                    <span className="block text-[#C8A96B] mt-0.5">تاریخ تولد: {toPersianDigits(customerBirthDate)}</span>
                  )}
                </div>
              </div>
              <div className="space-y-1 sm:text-left">
                <span className="text-[#A8A39A] block text-xs">زمان مراجعه:</span>
                <span className="font-bold text-[#C8A96B] text-base">
                  ساعت {toPersianDigits(selectedTime || "")} - تاریخ {toPersianDigits(selectedDateStr)}
                </span>
                <span className="text-xs text-[#A8A39A] block">آرایشگاه کوروش (شعبه زعفرانیه)</span>
              </div>
            </div>

            {/* Financial Ledger */}
            <div className="space-y-3 bg-[#1F2321] p-5 rounded-xl border border-[#2D332F]">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#A8A39A]">مبلغ کل خدمت:</span>
                <span className="font-bold text-[#F5F1E8]">{formatToman(selectedService.price)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-[#C8A96B]">
                <span className="font-medium">بیعانه قابل پرداخت آنلاین (تایید رزرو):</span>
                <span className="font-bold text-lg">{formatToman(selectedService.depositPrice)}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-[#2D332F]/80">
                <span className="text-[#A8A39A]">مانده پرداخت در آرایشگاه (تسویه در محل):</span>
                <span className="font-bold text-[#F5F1E8]">
                  {formatToman(Math.max(0, selectedService.price - selectedService.depositPrice))}
                </span>
              </div>
            </div>

            {/* Hold Guarantee Banner */}
            <div className="p-4 rounded-xl bg-[#C8A96B]/10 border border-[#C8A96B]/20 text-sm space-y-1.5">
              <div className="flex items-center gap-2 text-[#C8A96B] font-bold">
                <Timer className="w-5 h-5 shrink-0" />
                <span>هلد موقت ۱۰ دقیقه‌ای اختصاصی</span>
              </div>
              <p className="text-xs text-[#A8A39A] leading-relaxed">
                با کلیک بر روی دکمه پرداخت، این بازه زمانی به مدت ۱۰ دقیقه به صورت اختصاصی برای شما قفل
                می‌شود تا پرداخت خود را با آسودگی خاطر تکمیل نمایید و نوبت به دیگری واگذار نشود.
              </p>
            </div>

            {/* Terms Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer text-xs text-[#A8A39A] select-none pt-2">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 rounded border-[#2D332F] bg-[#1F2321] text-[#C8A96B] focus:ring-[#C8A96B]"
              />
              <span>
                با قوانین سالن موافقم: امکان لغو نوبت تا ۱۲ ساعت قبل از موعد بدون جریمه وجود دارد؛ در صورت
                عدم حضور (No-Show)، بیعانه مسترد نخواهد شد.
              </span>
            </label>
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(3)}
              className="border-[#2D332F] text-[#A8A39A] hover:text-[#F5F1E8] gap-2 px-6"
            >
              <ArrowRight className="w-4 h-4" />
              مرحله قبل
            </Button>
            <Button
              size="lg"
              onClick={handleProceedToPayment}
              disabled={loading || !agreedToTerms}
              className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold px-10 py-7 rounded-xl gap-2 text-lg shadow-xl"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  در حال ایجاد هلد و اتصال به درگاه...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  تأیید و پرداخت بیعانه ({formatToman(selectedService.depositPrice)})
                </>
              )}
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
