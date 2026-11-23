"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  ShieldCheck,
  Sparkles,
  Lock,
  User,
  Timer,
  RefreshCw,
  Info,
} from "lucide-react"
import { formatToman, toPersianDigits, getJalaliDate, getTehranDateString, PERSIAN_WEEKDAYS } from "@/lib/jalali"
import { HOMEPAGE_SERVICES, ServiceItem } from "./ServicesSection"
import { JalaliBirthDatePicker } from "@/components/booking/JalaliBirthDatePicker"

interface Slot {
  time: string
  endTime: string
  label: string
  isAvailable: boolean
  status: "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED"
}

interface BookingStudioProps {
  initialServiceId?: string
}

export function BookingStudio({ initialServiceId }: BookingStudioProps) {
  // Steps: 1: Service, 2: Date & Slot, 3: Phone & OTP, 4: Summary & Deposit
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)

  // Data states
  const [services] = useState<ServiceItem[]>(HOMEPAGE_SERVICES)
  const [selectedService, setSelectedService] = useState<ServiceItem>(
    HOMEPAGE_SERVICES.find((s) => s.id === initialServiceId) || HOMEPAGE_SERVICES[0]
  )

  // Sync if initialServiceId changes
  useEffect(() => {
    if (initialServiceId) {
      const match = HOMEPAGE_SERVICES.find((s) => s.id === initialServiceId)
      if (match) {
        setSelectedService(match)
        setCurrentStep(2) // Jump directly to date & slot selection
      }
    }
  }, [initialServiceId])

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
  const [agreedToTerms, setAgreedToTerms] = useState(true)

  // Loading & error feedback
  const [loading, setLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

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
        // If current selection is not available, reset it
        if (selectedTime) {
          const stillValid = data.slots?.some((s: Slot) => s.time === selectedTime && s.isAvailable)
          if (!stillValid) setSelectedTime(null)
        }
      } catch {
        setError("خطا در محاسبه ظرفیت نوبت‌ها. لطفاً دوباره تلاش کنید.")
      } finally {
        setSlotsLoading(false)
      }
    }
    loadSlots()
  }, [selectedDateStr])

  // OTP Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((t) => t - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [otpTimer])

  // 10-Minute Hold Expiry Timer (Active on Step 4)
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (currentStep === 4 && holdRemainingSeconds > 0) {
      interval = setInterval(() => {
        setHoldRemainingSeconds((sec) => {
          if (sec <= 1) {
            setError("مهلت پرداخت ۱۰ دقیقه‌ای به پایان رسید. نوبت آزاد شد.")
            setCurrentStep(2)
            return 0
          }
          return sec - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [currentStep, holdRemainingSeconds])

  // Send OTP
  const handleSendOtp = async () => {
    setError(null)
    setSuccessMsg(null)
    if (!customerPhone || customerPhone.trim().length < 10) {
      setError("لطفاً شماره موبایل معتبر ایران (مثال: ۰۹۱۲۳۴۵۶۷۸۹) را وارد کنید")
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
      if (!res.ok) throw new Error(data.error || "خطا در ارسال پیامک کد تایید")

      setIsOtpSent(true)
      setOtpTimer(120)
      if (data.devCode) {
        setDevCode(data.devCode)
        setOtpCode(data.devCode) // Quick convenience
      }
      setSuccessMsg("کد تایید ۶ رقمی به شماره همراه شما ارسال شد.")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته در ارسال پیامک")
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP
  const handleVerifyOtp = async () => {
    setError(null)
    setSuccessMsg(null)
    if (!customerName || customerName.trim().length < 3) {
      setError("لطفاً نام و نام خانوادگی خود را کامل وارد کنید")
      return
    }
    if (!otpCode || otpCode.trim().length !== 6) {
      setError("لطفاً کد تایید ۶ رقمی را وارد کنید")
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
      setSuccessMsg("شماره همراه شما با موفقیت تایید شد.")

      // Immediately reserve hold for Step 4
      await reserveHoldBeforeSummary()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در تایید کد")
    } finally {
      setLoading(false)
    }
  }

  // Reserve temporary 10-minute hold
  const reserveHoldBeforeSummary = async () => {
    if (!selectedService || !selectedTime || !customerPhone || !customerName) return
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
      throw new Error(holdData.error || "این بازه زمانی هم‌اکنون توسط فرد دیگری رزرو شد")
    }
    setHoldDetails(holdData)
    setHoldRemainingSeconds(600) // 10 min
    setCurrentStep(4)
  }

  // Initiate Gateway Payment
  const handleProceedToPayment = async () => {
    setError(null)
    if (!holdDetails?.appointmentId) {
      setError("نوبت شما منقضی شده است. لطفاً ساعت را دوباره انتخاب کنید.")
      setCurrentStep(2)
      return
    }

    try {
      setLoading(true)
      const payRes = await fetch("/api/booking/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: holdDetails.appointmentId }),
      })
      const payData = await payRes.json()
      if (!payRes.ok) throw new Error(payData.error || "خطا در اتصال به درگاه پرداخت")

      // Redirect to payment gateway / sandbox mock terminal
      window.location.href = payData.redirectUrl
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در هدایت به درگاه")
    } finally {
      setLoading(false)
    }
  }

  // Generate 7 days quick strip
  const upcomingDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const dateStr = getTehranDateString(d)
    const jalali = getJalaliDate(d)
    return {
      dateStr,
      dayName: jalali.dayName,
      dayNumber: toPersianDigits(jalali.day),
      monthName: jalali.monthName,
      isToday: i === 0,
    }
  })

  // Format seconds to mm:ss
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${toPersianDigits(m)}:${toPersianDigits(s < 10 ? "0" + s : s)}`
  }

  return (
    <section id="booking" className="py-24 bg-[#0F1210] relative overflow-hidden" dir="rtl">
      {/* Background radial accent - contained to prevent horizontal scroll */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] sm:w-[500px] sm:h-[500px] lg:w-[700px] lg:h-[700px] rounded-full bg-[#C8A96B]/5 blur-[100px] sm:blur-[160px] pointer-events-none max-w-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#181D1A] border border-[#C8A96B]/30 text-xs sm:text-sm font-semibold text-[#E4C88E]">
            <Clock className="w-4 h-4 text-[#C8A96B]" />
            <span>رزرو در کمتر از ۶۰ ثانیه</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-[#F7F4EE] tracking-tight">
            میز رزرواسیون آنلاین کوروش باربر
          </h2>

          <p className="text-base sm:text-lg text-[#C5BDB2]">
            یک فرایند ساده ۴ مرحله‌ای طراحی شده برای تمامی سنین، بدون فرم‌های پیچیده و با تایید آنی.
          </p>
        </div>

        {/* Stepper Navigation */}
        <nav aria-label="مراحل رزرو نوبت" className="mb-10 bg-[#141715] p-3 sm:p-6 rounded-3xl border border-[#242A27] shadow-xl">
          <ol className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-[#222825] -translate-y-1/2 z-0" />
            {[
              { num: 1, label: "انتخاب خدمت", shortLabel: "خدمت", icon: Scissors },
              { num: 2, label: "تاریخ و ساعت", shortLabel: "زمان", icon: Calendar },
              { num: 3, label: "تایید شماره موبایل", shortLabel: "مشخصات", icon: Phone },
              { num: 4, label: "پیش‌فاکتور و بیعانه", shortLabel: "پرداخت", icon: CreditCard },
            ].map((step) => {
              const isCompleted = currentStep > step.num
              const isCurrent = currentStep === step.num
              const Icon = step.icon
              return (
                <li key={step.num} className="relative z-10 flex flex-col items-center">
                  <button
                    type="button"
                    disabled={step.num > currentStep}
                    onClick={() => step.num < currentStep && setCurrentStep(step.num as 1 | 2 | 3 | 4)}
                    className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-sm sm:text-base transition-all duration-300 min-h-[44px] min-w-[44px] ${
                      isCurrent
                        ? "bg-gradient-to-br from-[#E4C88E] via-[#C8A96B] to-[#9A773F] text-[#0D0F0E] shadow-[0_0_20px_rgba(200,169,107,0.4)] scale-105"
                        : isCompleted
                        ? "bg-[#1E2420] text-[#E4C88E] border border-[#C8A96B]/60"
                        : "bg-[#141715] text-[#787063] border border-[#262D29]"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <Icon className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </button>
                  <span
                    className={`mt-2 text-[11px] sm:text-sm font-semibold transition-colors text-center ${
                      isCurrent ? "text-[#E4C88E] font-bold" : isCompleted ? "text-[#F7F4EE]" : "text-[#787063]"
                    }`}
                  >
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{step.shortLabel}</span>
                  </span>
                </li>
              )
            })}
          </ol>
        </nav>

        {/* Global Error & Success Alerts */}
        {error && (
          <div className="mb-8 p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 flex items-start gap-3 text-sm animate-shake">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-8 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex items-start gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Studio Content Container with Framer Motion Animation */}
        <div className="bg-[#141715] rounded-3xl p-6 sm:p-10 border border-[#262D29] shadow-2xl min-h-[480px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: SERVICE SELECTION */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#F7F4EE]">
                    مرحله ۱: خدمت مورد نظر خود را انتخاب نمایید
                  </h3>
                  <p className="text-sm text-[#A89E90] mt-1">
                    برای همه خدمات، نوبت اختصاصی ۶۰ دقیقه‌ای با پذیرایی ویژه سالن در نظر گرفته می‌شود.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services.map((srv) => {
                    const isSelected = selectedService.id === srv.id
                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedService(srv)}
                        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-[#1C221F] border-[#C8A96B] shadow-[0_0_20px_rgba(200,169,107,0.15)] scale-[1.01]"
                            : "bg-[#101311] border-[#222825] hover:border-[#38413C]"
                        }`}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#232A26] text-[#A89E90] font-medium">
                              {srv.category}
                            </span>
                            {isSelected && (
                              <span className="flex items-center gap-1 text-xs font-bold text-[#E4C88E]">
                                <CheckCircle2 className="w-4 h-4 text-[#E4C88E]" />
                                <span>انتخاب شده</span>
                              </span>
                            )}
                          </div>
                          <h4 className="text-lg font-bold text-[#F7F4EE]">{srv.name}</h4>
                          <p className="text-xs text-[#8C8477] line-clamp-2">{srv.description}</p>
                        </div>

                        <div className="pt-4 mt-4 border-t border-[#1F2522] flex items-center justify-between">
                          <span className="text-xs text-[#A89E90]">
                            بیعانه: <strong className="text-[#E4C88E]">{formatToman(srv.depositPrice)}</strong>
                          </span>
                          <span className="text-sm font-bold text-[#F7F4EE]">
                            {formatToman(srv.price)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold text-[#0D0F0E] bg-gradient-to-r from-[#E4C88E] to-[#C8A96B] hover:brightness-110 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>تایید خدمت و انتخاب زمان</span>
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: DATE & TIME SLOT SELECTION */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#F7F4EE]">
                    مرحله ۲: روز و ساعت خالی را لمس نمایید
                  </h3>
                  <p className="text-sm text-[#A89E90] mt-1">
                    ساعات کاری سالن از ۱۰:۰۰ الی ۲۳:۰۰ است. هر نوبت ۶۰ دقیقه بدون معطلی است.
                  </p>
                </div>

                {/* 7-Day Quick Strip - Fits completely across all mobile screens */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-[#C5BDB2]">روز مورد نظر خود را انتخاب کنید (تمام ۷ روز هفته):</span>
                  <div className="grid grid-cols-7 gap-1 sm:gap-2.5">
                    {upcomingDays.map((d) => {
                      const isSelected = selectedDateStr === d.dateStr
                      // Persian day abbreviations for mobile (< 640px)
                      const shortDay = d.dayName.replace("‌", "").slice(0, 3)
                      return (
                        <button
                          key={d.dateStr}
                          type="button"
                          onClick={() => setSelectedDateStr(d.dateStr)}
                          className={`p-1.5 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 text-center transition-all cursor-pointer min-h-[66px] sm:min-h-[88px] flex flex-col items-center justify-between ${
                            isSelected
                              ? "bg-[#1E2522] border-[#C8A96B] ring-2 ring-[#C8A96B]/50 ring-offset-1 sm:ring-offset-2 ring-offset-[#141715] shadow-md"
                              : "bg-[#101311] border-[#202522] hover:border-[#38413C]"
                          }`}
                        >
                          <div className={`text-[10px] sm:text-xs font-medium leading-tight ${isSelected ? "text-[#E4C88E]" : "text-[#8C8477]"}`}>
                            <span className="hidden sm:inline">{d.dayName}</span>
                            <span className="sm:hidden">{shortDay}</span>
                          </div>
                          <div className="text-base sm:text-2xl font-extrabold text-[#F7F4EE] my-0.5 sm:my-1 font-mono">
                            {d.dayNumber}
                          </div>
                          <div className="text-[9px] sm:text-[11px] text-[#A89E90] leading-none">{d.monthName}</div>
                          {d.isToday && (
                            <div className="mt-0.5 sm:mt-1 text-[8px] sm:text-[10px] px-1 py-0.5 rounded bg-[#C8A96B]/20 text-[#E4C88E] font-bold">
                              امروز
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Slot Capacity Status with Stable Dimensions (Zero Layout Shift) */}
                <div className="min-h-[260px] flex flex-col justify-start">
                  {isClosed ? (
                    <div className="p-8 rounded-2xl bg-[#1C1616] border border-red-500/30 text-center space-y-2 my-auto">
                      <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                      <h4 className="text-lg font-bold text-red-200">سالن در این تاریخ تعطیل است</h4>
                      <p className="text-sm text-red-300/80">{closedReason || "تعطیلی تقویمی یا استراحت سالن"}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#C5BDB2]">ساعت دلخواه خود را لمس کنید:</span>
                        {slotsLoading && (
                          <span className="flex items-center gap-1.5 text-xs text-[#E4C88E] animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>در حال بررسی ظرفیت نوبت‌ها...</span>
                          </span>
                        )}
                      </div>

                      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 transition-opacity duration-200 ${slotsLoading ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
                        {availableSlots.length === 0 && slotsLoading
                          ? Array.from({ length: 13 }).map((_, i) => (
                              <div
                                key={i}
                                className="min-h-[52px] sm:min-h-[56px] px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border-2 border-[#202522] bg-[#121513] animate-pulse flex flex-col items-center justify-center gap-1"
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
                                  onClick={() => setSelectedTime(slot.time)}
                                  className={`min-h-[52px] sm:min-h-[56px] px-2 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border-2 font-bold text-sm sm:text-base flex flex-col items-center justify-center gap-0.5 transition-all ${
                                    isSelected
                                      ? "bg-[#C8A96B] text-[#0D0F0E] border-[#E4C88E] ring-2 ring-[#E4C88E]/50 ring-offset-2 ring-offset-[#141715] shadow-[0_0_15px_rgba(200,169,107,0.4)] cursor-pointer"
                                      : isAvailable
                                      ? "bg-[#101311] text-[#F7F4EE] border-[#2A332E] hover:border-[#C8A96B] hover:bg-[#1A201D] cursor-pointer"
                                      : "bg-[#161817] text-[#555E59] border-[#222624] opacity-50 cursor-not-allowed line-through"
                                  }`}
                                >
                                  <span dir="ltr">{slot.time}</span>
                                  <span className="text-[10px] font-normal opacity-80">
                                    {isSelected ? "انتخاب شما" : isAvailable ? "خالی" : "پر شده"}
                                  </span>
                                </button>
                              )
                            })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation Buttons - Mobile-first stacked layout to prevent overflow */}
                <div className="pt-6 border-t border-[#222825] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="w-full sm:w-auto px-5 sm:px-6 py-3.5 rounded-xl text-sm font-semibold text-[#C5BDB2] bg-[#1A1F1C] hover:bg-[#252C28] border border-[#2B332F] flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>مرحله قبل</span>
                  </button>

                  <button
                    type="button"
                    disabled={!selectedTime || isClosed}
                    onClick={() => setCurrentStep(3)}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 rounded-xl text-base font-bold text-[#0D0F0E] bg-gradient-to-r from-[#E4C88E] to-[#C8A96B] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 shadow-lg flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <span>ثبت مشخصات و تایید شماره</span>
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: PHONE & OTP VERIFICATION */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 max-w-xl mx-auto w-full"
              >
                <div className="text-center space-y-1">
                  <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#F7F4EE]">
                    مرحله ۳: مشخصات و شماره همراه
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A89E90]">
                    کد تایید یکبار مصرف برای جلوگیری از نوبت‌های جعلی به شماره شما ارسال می‌شود.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Name Input */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-semibold text-[#C5BDB2]">نام و نام خانوادگی:</label>
                    <div className="relative">
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8C8477]" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="مثال: کوروش آریافر"
                        className="w-full pr-12 pl-4 py-3.5 rounded-xl bg-[#101311] border border-[#2B332F] text-[#F7F4EE] placeholder-[#5C5549] focus:outline-none focus:border-[#C8A96B] text-base"
                      />
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-semibold text-[#C5BDB2]">شماره تلفن همراه:</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8C8477]" />
                        <input
                          type="tel"
                          dir="ltr"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="09123456789"
                          className="w-full pr-12 pl-4 py-3.5 rounded-xl bg-[#101311] border border-[#2B332F] text-[#F7F4EE] placeholder-[#5C5549] focus:outline-none focus:border-[#C8A96B] text-base font-mono min-h-[44px]"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={loading || otpTimer > 0}
                        onClick={handleSendOtp}
                        className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-[#202723] hover:bg-[#2B3530] text-[#E4C88E] border border-[#C8A96B]/40 font-semibold text-xs sm:text-sm shrink-0 disabled:opacity-50 cursor-pointer min-h-[44px] flex items-center justify-center"
                      >
                        {otpTimer > 0 ? `${formatTimer(otpTimer)} تا ارسال مجدد` : isOtpSent ? "ارسال دوباره کد" : "ارسال پیامک کد"}
                      </button>
                    </div>
                  </div>

                  {/* Optional Date of Birth */}
                  <div className="pt-1">
                    <JalaliBirthDatePicker
                      value={customerBirthDate || ""}
                      onChange={setCustomerBirthDate}
                    />
                  </div>

                  {/* Dev Test Code Autofill Pill */}
                  {devCode && (
                    <div className="p-3 rounded-xl bg-[#1D2420] border border-[#C8A96B]/40 flex items-center justify-between text-xs text-[#E4C88E]">
                      <span>کد آزمایشی سندباکس: <strong className="font-mono text-sm">{devCode}</strong></span>
                      <button
                        type="button"
                        onClick={() => setOtpCode(devCode)}
                        className="px-2.5 py-1 rounded bg-[#C8A96B] text-[#0D0F0E] font-bold min-h-[36px]"
                      >
                        درج خودکار
                      </button>
                    </div>
                  )}

                  {/* OTP Code Input */}
                  {isOtpSent && (
                    <div className="space-y-1.5 text-right animate-fadeIn">
                      <label className="text-xs font-semibold text-[#C5BDB2]">کد تایید ۶ رقمی پیامک شده:</label>
                      <input
                        type="text"
                        dir="ltr"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="123456"
                        className="w-full px-4 py-3.5 rounded-xl bg-[#101311] border border-[#C8A96B] text-center text-[#F7F4EE] text-2xl tracking-[0.4em] font-mono focus:outline-none min-h-[44px]"
                      />
                    </div>
                  )}
                </div>

                {/* Actions - Mobile-first stacked layout */}
                <div className="pt-6 border-t border-[#222825] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="w-full sm:w-auto px-5 sm:px-6 py-3.5 rounded-xl text-sm font-semibold text-[#C5BDB2] bg-[#1A1F1C] hover:bg-[#252C28] border border-[#2B332F] flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>مرحله قبل</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading || !customerName || !otpCode}
                    onClick={handleVerifyOtp}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 rounded-xl text-base font-bold text-[#0D0F0E] bg-gradient-to-r from-[#E4C88E] to-[#C8A96B] disabled:opacity-40 hover:brightness-110 shadow-lg flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <span>{loading ? "در حال تایید..." : "تایید و مشاهده پیش‌فاکتور"}</span>
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: SUMMARY & DEPOSIT CHECKOUT */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 max-w-2xl mx-auto w-full"
              >
                {/* Hold Timer Alert */}
                <div className="p-4 rounded-2xl bg-[#1F2622] border border-[#C8A96B]/50 flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2.5 text-[#E4C88E]">
                    <Timer className="w-5 h-5 animate-pulse" />
                    <span>نوبت برای شما قفل شده است:</span>
                  </div>
                  <div className="font-mono text-base font-bold text-[#E4C88E]" dir="ltr">
                    {formatTimer(holdRemainingSeconds)}
                  </div>
                </div>

                {/* Invoice Breakdown Card */}
                <div className="bg-[#101311] rounded-3xl p-6 border border-[#262D29] space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-[#1E2420]">
                    <div>
                      <h4 className="text-xl font-heading font-bold text-[#F7F4EE]">{selectedService.name}</h4>
                      <p className="text-xs text-[#8C8477]">استاد کوروش (آرایشگر ارشد)</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#1C221F] text-xs font-semibold text-[#C8A96B] border border-[#C8A96B]/30">
                      ۶۰ دقیقه اختصاصی
                    </span>
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div className="p-3 rounded-xl bg-[#161A18] border border-[#222724]">
                      <span className="text-[#8C8477] block text-[11px]">روز نوبت:</span>
                      <strong className="text-[#F7F4EE]">{selectedDateStr}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-[#161A18] border border-[#222724]">
                      <span className="text-[#8C8477] block text-[11px]">ساعت دقیق:</span>
                      <strong className="text-[#E4C88E]" dir="ltr">{selectedTime}</strong>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="p-3 rounded-xl bg-[#161A18] border border-[#222724] text-xs space-y-1">
                    <div className="text-[#8C8477]">رزرو گیرنده: <strong className="text-[#F7F4EE]">{customerName}</strong></div>
                    <div className="text-[#8C8477]">شماره تماس: <strong className="text-[#F7F4EE] font-mono" dir="ltr">{customerPhone}</strong></div>
                    {customerBirthDate && (
                      <div className="text-[#8C8477]">تاریخ تولد: <strong className="text-[#E4C88E] font-mono">{toPersianDigits(customerBirthDate)}</strong></div>
                    )}
                  </div>

                  {/* Financial Breakdown */}
                  <div className="pt-3 border-t border-[#1E2420] space-y-2 text-sm">
                    <div className="flex items-center justify-between text-[#A89E90]">
                      <span>مبلغ کل خدمت:</span>
                      <strong className="text-base text-[#F7F4EE]">{formatToman(selectedService.price)}</strong>
                    </div>

                    <div className="flex items-center justify-between text-base font-bold text-[#E4C88E] p-3 rounded-xl bg-[#C8A96B]/10 border border-[#C8A96B]/30">
                      <span>بیعانه قابل پرداخت آنلاین (۲۰٪):</span>
                      <span className="text-lg">{formatToman(selectedService.depositPrice)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#8C8477] pt-1">
                      <span>مانده قابل پرداخت در سالن:</span>
                      <span>{formatToman(selectedService.price - selectedService.depositPrice)}</span>
                    </div>
                  </div>
                </div>

                {/* Terms Acceptance Checkbox */}
                <label className="flex items-center gap-3 text-xs text-[#C5BDB2] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-4 h-4 rounded text-[#C8A96B] focus:ring-[#C8A96B] border-border bg-[#101311]"
                  />
                  <span>
                    شرایط سالن و امکان لغو نوبت تا <strong className="text-[#E4C88E]">۱۲ ساعت قبل</strong> را مطالعه کرده و می‌پذیرم.
                  </span>
                </label>

                {/* Checkout CTA - Mobile-first stacked order */}
                <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="w-full sm:w-auto px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-sm font-semibold text-[#C5BDB2] bg-[#1A1F1C] hover:bg-[#252C28] border border-[#2B332F] cursor-pointer min-h-[44px] flex items-center justify-center"
                  >
                    تغییر زمان یا خدمت
                  </button>

                  <button
                    type="button"
                    disabled={loading || !agreedToTerms || holdRemainingSeconds === 0}
                    onClick={handleProceedToPayment}
                    className="w-full sm:flex-1 py-3.5 sm:py-4 px-6 sm:px-8 rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold text-[#0D0F0E] bg-gradient-to-r from-[#E4C88E] via-[#C8A96B] to-[#9A773F] disabled:opacity-40 hover:brightness-110 shadow-[0_4px_25px_rgba(200,169,107,0.35)] flex items-center justify-center gap-2 sm:gap-3 cursor-pointer min-h-[44px]"
                  >
                    <Lock className="w-5 h-5 text-[#0D0F0E] shrink-0" />
                    <span>
                      {loading ? "در حال اتصال به درگاه امن..." : `پرداخت بیعانه (${formatToman(selectedService.depositPrice)})`}
                    </span>
                  </button>
                </div>

                {/* Bank Security Badge */}
                <div className="text-center text-[11px] text-[#7A7368] flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#C8A96B]" />
                  <span>تراکنش امن شاپرک تحت پروتکل SSL ۲۵۶ بیتی بانکی</span>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </section>
  )
}
