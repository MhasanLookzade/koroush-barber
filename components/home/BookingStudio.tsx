"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
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
  Printer,
  CalendarCheck,
  Check,
} from "lucide-react"
import { formatToman, toPersianDigits, getJalaliDate, getTehranDateString } from "@/lib/jalali"
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
  const searchParams = useSearchParams()

  // 6 Sequential Steps:
  // 1: Service Selection
  // 2: Date Selection
  // 3: Time Slot Selection
  // 4: Customer Details & OTP Verification
  // 5: Invoice Summary & 20% Deposit Payment
  // 6: Final Booking Confirmation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1)

  // Service State (Step 1)
  const [services] = useState<ServiceItem[]>(HOMEPAGE_SERVICES)
  const [selectedService, setSelectedService] = useState<ServiceItem>(() => {
    return HOMEPAGE_SERVICES.find((s) => s.id === initialServiceId) || HOMEPAGE_SERVICES[0]
  })

  // Date State (Step 2)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getTehranDateString())

  // Time Slot State (Step 3)
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([])
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [isClosed, setIsClosed] = useState<boolean>(false)
  const [closedReason, setClosedReason] = useState<string>("")
  const [slotsLoading, setSlotsLoading] = useState(false)

  // Customer & OTP State (Step 4)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerBirthDate, setCustomerBirthDate] = useState<string | null>(null)
  const [otpCode, setOtpCode] = useState("")
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [isPhoneVerified, setIsPhoneVerified] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)
  const [devCode, setDevCode] = useState<string | null>(null)

  // Hold & Invoice State (Step 5)
  const [holdDetails, setHoldDetails] = useState<{
    holdId: string
    appointmentId: string
    trackingCode: string
    expiresAt: string
    depositAmount: number
    totalPrice: number
    balanceDue: number
  } | null>(null)
  const [holdRemainingSeconds, setHoldRemainingSeconds] = useState<number>(600)
  const [agreedToTerms, setAgreedToTerms] = useState(true)

  // Confirmation State (Step 6)
  const [confirmedBooking, setConfirmedBooking] = useState<{
    trackingCode: string
    serviceName: string
    dateStr: string
    timeStr: string
    customerName: string
    depositAmount: number
    balanceDue: number
  } | null>(null)

  // Status & Feedback
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Check URL parameters for confirmed booking on mount
  useEffect(() => {
    const trackingCode = searchParams?.get("trackingCode")
    const confirmed = searchParams?.get("confirmed")
    if (trackingCode && confirmed) {
      setConfirmedBooking({
        trackingCode,
        serviceName: selectedService.name,
        dateStr: selectedDateStr,
        timeStr: selectedTime || "14:00",
        customerName: customerName || "مشتری محترم",
        depositAmount: selectedService.depositPrice,
        balanceDue: selectedService.price - selectedService.depositPrice,
      })
      setCurrentStep(6)
    }
  }, [searchParams])

  // Fetch Slots when Date changes (Step 2 -> Step 3)
  useEffect(() => {
    async function loadSlots() {
      if (!selectedDateStr) return
      try {
        setSlotsLoading(true)
        setError(null)
        const res = await fetch(`/api/booking/availability?date=${selectedDateStr}`)
        if (!res.ok) throw new Error("خطا در دریافت زمان‌های خالی سالن")
        const data = await res.json()
        setIsClosed(data.isClosed)
        setClosedReason(data.closedReason || "")
        setAvailableSlots(data.slots || [])

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

  // Hold Timer (Step 5)
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (currentStep === 5 && holdRemainingSeconds > 0) {
      interval = setInterval(() => {
        setHoldRemainingSeconds((sec) => {
          if (sec <= 1) {
            setError("مهلت پرداخت ۱۰ دقیقه‌ای به پایان رسید. نوبت آزاد شد.")
            setCurrentStep(3)
            return 0
          }
          return sec - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [currentStep, holdRemainingSeconds])

  // 1. Send OTP
  const handleSendOtp = async () => {
    setError(null)
    setSuccessMsg(null)
    if (!customerPhone || customerPhone.trim().length < 10) {
      setError("لطفاً شماره تلفن همراه معتبر (مثال: ۰۹۱۲۳۴۵۶۷۸۹) را وارد کنید")
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
        setOtpCode(data.devCode)
      }
      setSuccessMsg("کد تایید ۶ رقمی به شماره شما ارسال شد.")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته در ارسال پیامک")
    } finally {
      setLoading(false)
    }
  }

  // 2. Verify OTP & Reserve Hold for Step 5
  const handleVerifyOtpAndProceed = async () => {
    setError(null)
    setSuccessMsg(null)
    if (!customerName || customerName.trim().length < 3) {
      setError("لطفاً نام و نام خانوادگی خود را کامل وارد کنید")
      return
    }
    if (!otpCode || otpCode.trim().length !== 6) {
      setError("لطفاً کد تایید ۶ رقمی پیامک شده را وارد کنید")
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

      // Hold reservation for 10 minutes
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
      setHoldRemainingSeconds(600)
      setCurrentStep(5)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در تایید کد و قفل نوبت")
    } finally {
      setLoading(false)
    }
  }

  // 3. Initiate Gateway Payment
  const handleProceedToPayment = async () => {
    setError(null)
    if (!holdDetails?.appointmentId) {
      setError("نوبت شما منقضی شده است. لطفاً زمان را دوباره انتخاب کنید.")
      setCurrentStep(3)
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
      if (!payRes.ok) throw new Error(payData.error || "خطا در اتصال به درگاه بانکی")

      window.location.href = payData.redirectUrl
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در هدایت به درگاه پرداخت")
    } finally {
      setLoading(false)
    }
  }

  // Reset to book new appointment
  const handleReset = () => {
    setCurrentStep(1)
    setSelectedTime(null)
    setOtpCode("")
    setIsOtpSent(false)
    setIsPhoneVerified(false)
    setHoldDetails(null)
    setConfirmedBooking(null)
    setError(null)
    setSuccessMsg(null)
  }

  // 7 Days Quick Strip
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
      year: jalali.year,
      isToday: i === 0,
    }
  })

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${toPersianDigits(m)}:${toPersianDigits(s < 10 ? "0" + s : s)}`
  }

  const selectedDayObj = upcomingDays.find((d) => d.dateStr === selectedDateStr)

  return (
    <section id="booking" className="py-20 sm:py-24 bg-[#0F1210] relative overflow-hidden" dir="rtl">
      {/* Background radial accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] sm:w-[500px] sm:h-[500px] lg:w-[700px] lg:h-[700px] rounded-full bg-[#C8A96B]/5 blur-[100px] sm:blur-[160px] pointer-events-none max-w-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#181D1A] border border-[#C8A96B]/30 text-xs sm:text-sm font-semibold text-[#E4C88E]">
            <Clock className="w-3.5 h-3.5 text-[#C8A96B]" />
            <span>رزرو آنلاین نوبت در ۶۰ ثانیه</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-[#F7F4EE] tracking-tight">
            میز نوبت‌دهی آنلاین آرایشگاه کوروش
          </h2>

          <p className="text-sm sm:text-base text-[#C5BDB2]">
            فرایند منظم ۶ مرحله‌ای برای انتخاب دقیق خدمت، روز، ساعت و پرداخت امن بیعانه با تایید پیامکی آنی.
          </p>
        </div>

        {/* 6-Step Stepper Indicator */}
        <nav aria-label="مراحل رزرو نوبت" className="mb-10 bg-[#141715] p-3 sm:p-5 rounded-3xl border border-[#242A27] shadow-xl overflow-x-auto">
          <ol className="flex items-center justify-between min-w-[310px] sm:min-w-0 relative">
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-[#222825] -translate-y-1/2 z-0" />
            {[
              { num: 1, label: "انتخاب خدمت", shortLabel: "خدمت", icon: Scissors },
              { num: 2, label: "انتخاب روز", shortLabel: "روز", icon: Calendar },
              { num: 3, label: "انتخاب ساعت", shortLabel: "ساعت", icon: Clock },
              { num: 4, label: "اطلاعات مراجع", shortLabel: "مشخصات", icon: Phone },
              { num: 5, label: "پیش‌فاکتور", shortLabel: "بیعانه", icon: CreditCard },
              { num: 6, label: "تأیید نهایی", shortLabel: "تأیید", icon: CheckCircle2 },
            ].map((step) => {
              const isCompleted = currentStep > step.num
              const isCurrent = currentStep === step.num
              const Icon = step.icon
              const canClick = step.num < currentStep && currentStep < 6
              return (
                <li key={step.num} className="relative z-10 flex flex-col items-center">
                  <button
                    type="button"
                    disabled={!canClick}
                    onClick={() => canClick && setCurrentStep(step.num as any)}
                    className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-xs sm:text-base transition-all duration-300 min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] ${
                      isCurrent
                        ? "bg-gradient-to-br from-[#E4C88E] via-[#C8A96B] to-[#9A773F] text-[#0D0F0E] shadow-[0_0_20px_rgba(200,169,107,0.4)] scale-105"
                        : isCompleted
                        ? "bg-[#1E2420] text-[#E4C88E] border border-[#C8A96B]/60"
                        : "bg-[#141715] text-[#787063] border border-[#262D29]"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#E4C88E]" />
                    ) : (
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                  <span
                    className={`mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-semibold transition-colors text-center ${
                      isCurrent ? "text-[#E4C88E] font-bold" : isCompleted ? "text-[#F7F4EE]" : "text-[#787063]"
                    }`}
                  >
                    <span className="hidden md:inline">{step.label}</span>
                    <span className="md:hidden">{step.shortLabel}</span>
                  </span>
                </li>
              )
            })}
          </ol>
        </nav>

        {/* Global Error & Success Alerts */}
        {error && (
          <div className="mb-8 p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 flex items-start gap-3 text-xs sm:text-sm animate-shake">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-8 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex items-start gap-3 text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Dynamic Step Content Card */}
        <div className="bg-[#141715] rounded-3xl p-5 sm:p-8 lg:p-10 border border-[#262D29] shadow-2xl min-h-[480px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: SERVICE SELECTION (All 8 Services) */}
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
                    مرحله ۱: انتخاب خدمت تخصصی
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A89E90] mt-1">
                    خدمت مدنظر خود را انتخاب فرمایید. تمامی نوبت‌ها با تخصیص زمان اختصاصی ۶۰ دقیقه و پذیرایی انجام می‌شود.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                  {services.map((srv) => {
                    const isSelected = selectedService.id === srv.id
                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedService(srv)}
                        className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-[#1C221F] border-[#C8A96B] shadow-[0_0_20px_rgba(200,169,107,0.18)] scale-[1.01]"
                            : "bg-[#101311] border-[#222825] hover:border-[#38413C]"
                        }`}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-[#232A26] text-[#A89E90] font-medium">
                              {srv.category}
                            </span>
                            {isSelected && (
                              <span className="flex items-center gap-1 text-xs font-bold text-[#E4C88E]">
                                <CheckCircle2 className="w-4 h-4 text-[#E4C88E]" />
                                <span>انتخاب شده</span>
                              </span>
                            )}
                          </div>
                          <h4 className="text-base sm:text-lg font-bold text-[#F7F4EE]">{srv.name}</h4>
                          <p className="text-xs text-[#8C8477] line-clamp-2 leading-relaxed">{srv.description}</p>
                        </div>

                        <div className="pt-3.5 mt-3.5 border-t border-[#1F2522] flex items-center justify-between">
                          <span className="text-xs text-[#A89E90]">
                            بیعانه: <strong className="text-[#E4C88E]">{formatToman(srv.depositPrice)}</strong>
                          </span>
                          <span className="text-sm sm:text-base font-bold text-[#F7F4EE]">
                            {formatToman(srv.price)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-6 border-t border-[#222825] flex justify-end">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold text-[#0D0F0E] bg-gradient-to-r from-[#E4C88E] to-[#C8A96B] hover:brightness-110 shadow-lg flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
                  >
                    <span>ادامه به انتخاب روز</span>
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: DATE SELECTION (Jalali Calendar) */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#F7F4EE]">
                    مرحله ۲: انتخاب روز نوبت (تقویم جلالی تهران)
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A89E90] mt-1">
                    خدمت انتخابی شما: <strong className="text-[#E4C88E]">{selectedService.name}</strong> ({formatToman(selectedService.price)})
                  </p>
                </div>

                {/* 7-Day Horizontal Strip */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-[#C5BDB2]">روز مورد نظر خود را از میان ۷ روز هفته انتخاب کنید:</span>
                  <div className="grid grid-cols-7 gap-1 sm:gap-2.5">
                    {upcomingDays.map((d) => {
                      const isSelected = selectedDateStr === d.dateStr
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

                {/* Date Summary Card */}
                {selectedDayObj && (
                  <div className="p-4 rounded-2xl bg-[#101311] border border-[#222724] flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2 text-[#A89E90]">
                      <Calendar className="w-4 h-4 text-[#C8A96B]" />
                      <span>تاریخ انتخابی:</span>
                      <strong className="text-[#F7F4EE]">{selectedDayObj.dayName}، {selectedDayObj.dayNumber} {selectedDayObj.monthName} {selectedDayObj.year}</strong>
                    </div>
                    <span className="text-[#C8A96B] font-mono text-xs">{selectedDateStr}</span>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="pt-6 border-t border-[#222825] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="w-full sm:w-auto px-5 sm:px-6 py-3.5 rounded-xl text-sm font-semibold text-[#C5BDB2] bg-[#1A1F1C] hover:bg-[#252C28] border border-[#2B332F] flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>مرحله قبل (خدمات)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 rounded-xl text-base font-bold text-[#0D0F0E] bg-gradient-to-r from-[#E4C88E] to-[#C8A96B] hover:brightness-110 shadow-lg flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <span>تایید روز و انتخاب ساعت</span>
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: TIME SLOT SELECTION (10:00 to 23:00) */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#F7F4EE]">
                    مرحله ۳: انتخاب ساعت نوبت
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A89E90] mt-1">
                    ساعات کاری سالن ۱۰:۰۰ الی ۲۳:۰۰ است. آخرین نوبت کاری ساعت ۲۲:۰۰ شروع می‌شود.
                  </p>
                </div>

                {/* Slots Grid */}
                <div className="min-h-[240px] flex flex-col justify-start">
                  {isClosed ? (
                    <div className="p-8 rounded-2xl bg-[#1C1616] border border-red-500/30 text-center space-y-2 my-auto">
                      <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                      <h4 className="text-lg font-bold text-red-200">سالن در این تاریخ تعطیل است</h4>
                      <p className="text-sm text-red-300/80">{closedReason || "تعطیلی تقویمی یا استراحت سالن"}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#C5BDB2]">ساعت مدنظر خود را لمس نمایید:</span>
                        {slotsLoading && (
                          <span className="flex items-center gap-1.5 text-xs text-[#E4C88E] animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>بررسی نوبت‌ها...</span>
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

                {/* Navigation Buttons */}
                <div className="pt-6 border-t border-[#222825] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="w-full sm:w-auto px-5 sm:px-6 py-3.5 rounded-xl text-sm font-semibold text-[#C5BDB2] bg-[#1A1F1C] hover:bg-[#252C28] border border-[#2B332F] flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>مرحله قبل (انتخاب روز)</span>
                  </button>

                  <button
                    type="button"
                    disabled={!selectedTime || isClosed}
                    onClick={() => setCurrentStep(4)}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 rounded-xl text-base font-bold text-[#0D0F0E] bg-gradient-to-r from-[#E4C88E] to-[#C8A96B] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 shadow-lg flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <span>تایید ساعت و ثبت مشخصات</span>
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: CUSTOMER DETAILS & OTP VERIFICATION */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 max-w-xl mx-auto w-full"
              >
                <div className="text-center space-y-1">
                  <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#F7F4EE]">
                    مرحله ۴: مشخصات مراجع و تایید شماره
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A89E90]">
                    کد تایید پیامکی برای اعتبارسنجی نوبت و ارسال جزئیات به شماره شما ارسال می‌شود.
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

                  {/* Dev Sandbox Code Pill */}
                  {devCode && (
                    <div className="p-3 rounded-xl bg-[#1D2420] border border-[#C8A96B]/40 flex items-center justify-between text-xs text-[#E4C88E]">
                      <span>کد آزمایشی سیستم: <strong className="font-mono text-sm">{devCode}</strong></span>
                      <button
                        type="button"
                        onClick={() => setOtpCode(devCode)}
                        className="px-2.5 py-1 rounded bg-[#C8A96B] text-[#0D0F0E] font-bold min-h-[32px]"
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

                {/* Actions */}
                <div className="pt-6 border-t border-[#222825] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="w-full sm:w-auto px-5 sm:px-6 py-3.5 rounded-xl text-sm font-semibold text-[#C5BDB2] bg-[#1A1F1C] hover:bg-[#252C28] border border-[#2B332F] flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>مرحله قبل (انتخاب ساعت)</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading || !customerName || !otpCode}
                    onClick={handleVerifyOtpAndProceed}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 rounded-xl text-base font-bold text-[#0D0F0E] bg-gradient-to-r from-[#E4C88E] to-[#C8A96B] disabled:opacity-40 hover:brightness-110 shadow-lg flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <span>{loading ? "در حال بررسی..." : "تایید و مشاهده پیش‌فاکتور"}</span>
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: INVOICE & 20% DEPOSIT CHECKOUT */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 max-w-2xl mx-auto w-full"
              >
                <div>
                  <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#F7F4EE]">
                    مرحله ۵: پیش‌فاکتور رسمی و پرداخت بیعانه
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A89E90] mt-1">
                    نوبت برای ۱۰ دقیقه برای شما رزرو موقت شده است تا پرداخت بیعانه را تکمیل نمایید.
                  </p>
                </div>

                {/* Hold Timer Alert */}
                <div className="p-4 rounded-2xl bg-[#1F2622] border border-[#C8A96B]/50 flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2.5 text-[#E4C88E]">
                    <Timer className="w-5 h-5 animate-pulse" />
                    <span>مهلت تکمیل پرداخت بیعانه:</span>
                  </div>
                  <div className="font-mono text-base font-bold text-[#E4C88E]" dir="ltr">
                    {formatTimer(holdRemainingSeconds)}
                  </div>
                </div>

                {/* Invoice Breakdown Card */}
                <div className="bg-[#101311] rounded-3xl p-5 sm:p-6 border border-[#262D29] space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-[#1E2420]">
                    <div>
                      <h4 className="text-lg sm:text-xl font-heading font-bold text-[#F7F4EE]">{selectedService.name}</h4>
                      <p className="text-xs text-[#8C8477]">استاد کوروش (مدیر و آرایشگر ارشد)</p>
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
                      <span className="text-[#8C8477] block text-[11px]">ساعت نوبت:</span>
                      <strong className="text-[#E4C88E]" dir="ltr">{selectedTime}</strong>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="p-3 rounded-xl bg-[#161A18] border border-[#222724] text-xs space-y-1">
                    <div className="text-[#8C8477]">مراجعه‌کننده: <strong className="text-[#F7F4EE]">{customerName}</strong></div>
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
                    className="w-4 h-4 rounded text-[#C8A96B] focus:ring-[#C8A96B] border-[#2D332F] bg-[#101311]"
                  />
                  <span>
                    شرایط سالن و امکان لغو یا جابجایی تا <strong className="text-[#E4C88E]">۱۲ ساعت قبل</strong> را می‌پذیرم.
                  </span>
                </label>

                {/* Checkout CTA */}
                <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
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

                <div className="text-center text-[11px] text-[#7A7368] flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#C8A96B]" />
                  <span>تراکنش امن تحت پروتکل شاپرک و درگاه بانکی معتبر</span>
                </div>
              </motion.div>
            )}

            {/* STEP 6: BOOKING CONFIRMATION & RECEIPT */}
            {currentStep === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 max-w-xl mx-auto w-full text-center"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <CheckCircle2 className="w-9 h-9 sm:w-12 sm:h-12" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl sm:text-3xl font-heading font-black text-[#F7F4EE]">
                    نوبت شما با موفقیت ثبت و تایید شد!
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A89E90]">
                    پیامک تایید حاوی اطلاعات رزرو به شماره همراه شما ارسال شد.
                  </p>
                </div>

                {/* Official Ticket Card */}
                <div className="p-6 rounded-3xl bg-[#101311] border border-[#C8A96B]/40 text-right space-y-4 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between pb-4 border-b border-[#1F2522]">
                    <div>
                      <span className="text-[11px] text-[#8C8477] block">کد رهگیری رزرو:</span>
                      <strong className="text-xl sm:text-2xl font-mono text-[#E4C88E] tracking-wider">
                        {confirmedBooking?.trackingCode || holdDetails?.trackingCode || "KB-84920"}
                      </strong>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                      تأیید قطعی
                    </span>
                  </div>

                  <div className="space-y-2 text-xs sm:text-sm text-[#C5BDB2]">
                    <div className="flex justify-between">
                      <span className="text-[#8C8477]">خدمت رزرو شده:</span>
                      <strong className="text-[#F7F4EE]">{confirmedBooking?.serviceName || selectedService.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8C8477]">تاریخ حضور:</span>
                      <strong className="text-[#F7F4EE]">{confirmedBooking?.dateStr || selectedDateStr}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8C8477]">ساعت حضور:</span>
                      <strong className="text-[#E4C88E] font-mono" dir="ltr">{confirmedBooking?.timeStr || selectedTime}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8C8477]">مراجعه‌کننده:</span>
                      <strong className="text-[#F7F4EE]">{confirmedBooking?.customerName || customerName}</strong>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#1E2522]">
                      <span className="text-[#8C8477]">بیعانه پرداخت شده:</span>
                      <strong className="text-emerald-400">{formatToman(confirmedBooking?.depositAmount || selectedService.depositPrice)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8C8477]">مانده در سالن:</span>
                      <strong className="text-[#F7F4EE]">{formatToman(confirmedBooking?.balanceDue || (selectedService.price - selectedService.depositPrice))}</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#161A18] text-[11px] text-[#A89E90] text-center border border-[#222724]">
                    آدرس: تهران، زعفرانیه، خیابان مقدس اردبیلی، مجتمع پیروز، طبقه ۲، واحد ۲۰۴
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-3.5 px-6 rounded-xl bg-[#1A1F1C] hover:bg-[#252C28] text-[#F7F4EE] border border-[#2B332F] text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <Printer className="w-4 h-4" />
                    <span>چاپ و ذخیره رسید نوبت</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#E4C88E] to-[#C8A96B] text-[#0D0F0E] font-bold text-sm flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <CalendarCheck className="w-4 h-4" />
                    <span>رزرو نوبت جدید</span>
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </section>
  )
}
