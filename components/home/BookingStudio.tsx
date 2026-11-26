"use client"

import { useState, useEffect, useRef } from "react"
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
  Lock,
  User,
  Timer,
  RefreshCw,
  Printer,
  CalendarCheck,
  Check,
  Receipt,
  X,
  Edit3,
} from "lucide-react"
import { formatToman, toPersianDigits, getJalaliDate, getTehranDateString, formatJalaliDayString } from "@/lib/jalali"
import { normalizeIranianPhone, isValidIranianPhone } from "@/lib/providers/sms"
import { HOMEPAGE_SERVICES, ServiceItem } from "./ServicesSection"
import { JalaliBirthDatePicker } from "@/components/booking/JalaliBirthDatePicker"

interface Slot {
  time: string
  endTime: string
  label: string
  isAvailable: boolean
  status: "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED" | "PAST"
}

interface BookingStudioProps {
  initialServiceId?: string
}

export function BookingStudio({ initialServiceId }: BookingStudioProps) {
  const searchParams = useSearchParams()
  const bookingContainerRef = useRef<HTMLDivElement>(null)
  const stepContainerRef = useRef<HTMLDivElement>(null)
  const prevStepRef = useRef<number>(1)
  const [cancellationNotice, setCancellationNotice] = useState<string | null>(null)

  // 6 Sequential Steps:
  // 1: Service Selection
  // 2: Date Selection
  // 3: Time Slot Selection
  // 4: Customer Details (OTP-Free)
  // 5: Phone Confirmation & Invoice Summary (Deposit Checkout)
  // 6: Final Booking Confirmation (Verified by Server)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1)

  // Service State (Step 1)
  const [services, setServices] = useState<ServiceItem[]>(HOMEPAGE_SERVICES)
  const [selectedService, setSelectedService] = useState<ServiceItem>(() => {
    return HOMEPAGE_SERVICES.find((s) => s.id === initialServiceId) || HOMEPAGE_SERVICES[0]
  })
  const [showPricingModal, setShowPricingModal] = useState(false)

  // Date State (Step 2)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getTehranDateString())

  // Time Slot State (Step 3)
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([])
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [isClosed, setIsClosed] = useState<boolean>(false)
  const [closedReason, setClosedReason] = useState<string>("")
  const [slotsLoading, setSlotsLoading] = useState(false)

  // Customer State (Step 4 - OTP Removed)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerBirthDate, setCustomerBirthDate] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)

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

  // Global Status
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [closedDaysMap, setClosedDaysMap] = useState<Record<string, { isClosed: boolean; reason?: string }>>({})

  // 7 Days Quick Strip (Pre-calculated for Tehran timezone)
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

  // Load week-wide availability to identify disabled or blocked dates
  useEffect(() => {
    async function loadWeekAvailability() {
      try {
        const results = await Promise.all(
          upcomingDays.map(async (d) => {
            try {
              const res = await fetch(`/api/booking/availability?date=${d.dateStr}`)
              if (!res.ok) return { dateStr: d.dateStr, isClosed: false }
              const data = await res.json()
              return {
                dateStr: d.dateStr,
                isClosed: Boolean(data.isClosed),
                reason: data.closedReason,
              }
            } catch {
              return { dateStr: d.dateStr, isClosed: false }
            }
          })
        )
        const map: Record<string, { isClosed: boolean; reason?: string }> = {}
        for (const r of results) {
          map[r.dateStr] = { isClosed: r.isClosed, reason: r.reason }
        }
        setClosedDaysMap(map)
      } catch {
        // Silently preserve base availability
      }
    }
    loadWeekAvailability()
  }, [])

  // Check URL query for direct service pre-selection or payment cancellation restoration
  useEffect(() => {
    const sId = searchParams.get("service")
    if (sId) {
      const match = services.find((s) => s.id === sId)
      if (match) setSelectedService(match)
    }

    // Payment cancellation restoration
    let hashParams: URLSearchParams | null = null
    if (typeof window !== "undefined" && window.location.hash.includes("?")) {
      const qIdx = window.location.hash.indexOf("?")
      hashParams = new URLSearchParams(window.location.hash.slice(qIdx + 1))
    }

    const getParam = (key: string) => searchParams.get(key) || hashParams?.get(key) || null

    const isCancelled = getParam("cancelled") === "true"
    const cancelErr = getParam("error")
    const queryServiceId = getParam("serviceId")
    const queryDateStr = getParam("dateStr")
    const queryTimeStr = getParam("timeStr")
    const queryName = getParam("name")
    const queryPhone = getParam("phone")

    let draft: any = null
    try {
      const stored = typeof window !== "undefined" ? sessionStorage.getItem("koroush_booking_draft") : null
      if (stored) draft = JSON.parse(stored)
    } catch {
      // ignore
    }

    if (isCancelled || cancelErr?.includes("لغو")) {
      const targetServiceId = queryServiceId || draft?.serviceId
      if (targetServiceId) {
        const found = services.find((s) => s.id === targetServiceId) || HOMEPAGE_SERVICES.find((s) => s.id === targetServiceId)
        if (found) setSelectedService(found)
      }
      const targetDate = queryDateStr || draft?.dateStr
      if (targetDate) setSelectedDateStr(targetDate)
      const targetTime = queryTimeStr || draft?.timeStr
      if (targetTime) setSelectedTime(targetTime)
      const targetName = queryName || draft?.customerName
      if (targetName) setCustomerName(targetName)
      const targetPhone = queryPhone || draft?.customerPhone
      if (targetPhone) setCustomerPhone(targetPhone)
      if (draft?.customerEmail) setCustomerEmail(draft.customerEmail)
      if (draft?.customerBirthDate) setCustomerBirthDate(draft.customerBirthDate)

      setCurrentStep(5)
      setCancellationNotice("پرداخت لغو شد و نوبت قبلی آزاد گردید. در صورت تمایل میتوانید مجدداً اقدام کنید.")
      setHoldDetails(null)
    }
  }, [searchParams, services])

  // Try fetching live services from backend
  useEffect(() => {
    async function loadBackendServices() {
      try {
        const res = await fetch("/api/booking/services")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setServices(data)
          }
        }
      } catch {
        // Fallback to HOMEPAGE_SERVICES
      }
    }
    loadBackendServices()
  }, [])

  // Smooth scroll to the active step on step transition (never on initial mount)
  useEffect(() => {
    if (prevStepRef.current !== currentStep) {
      prevStepRef.current = currentStep

      // 300ms delay ensures previous step exit animation (250ms) finishes and new step mounts
      const timer = setTimeout(() => {
        const targetEl = stepContainerRef.current || bookingContainerRef.current
        if (targetEl) {
          let absTop = 0
          let curr: HTMLElement | null = targetEl
          while (curr) {
            absTop += curr.offsetTop
            curr = curr.offsetParent as HTMLElement | null
          }
          const targetY = Math.max(0, absTop - 84)
          window.scrollTo({
            top: targetY,
            behavior: "smooth",
          })
        }
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [currentStep])

  // Fetch Available Slots on Date Change (Step 3)
  useEffect(() => {
    async function loadSlots() {
      if (!selectedDateStr) return
      try {
        setSlotsLoading(true)
        setSelectedTime(null)
        setIsClosed(false)
        setClosedReason("")

        const res = await fetch(`/api/booking/availability?date=${selectedDateStr}`)
        if (!res.ok) throw new Error("خطا در استعلام نوبت‌های خالی")

        const data = await res.json()
        if (data.isClosed) {
          setIsClosed(true)
          setClosedReason(data.closedReason || "سالن در این تاریخ تعطیل است")
          setAvailableSlots([])
        } else {
          setAvailableSlots(data.slots || [])
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "امکان دریافت نوبت‌های این روز نیست")
      } finally {
        setSlotsLoading(false)
      }
    }
    loadSlots()
  }, [selectedDateStr])

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

  // Handle Step 4 validation (No OTP required)
  const handleProceedToInvoice = () => {
    setError(null)
    setPhoneError(null)

    if (!customerName || customerName.trim().length < 3) {
      setError("لطفاً نام و نام خانوادگی خود را کامل وارد کنید (حداقل ۳ حرف)")
      return
    }

    const normalizedPhone = normalizeIranianPhone(customerPhone)
    if (!isValidIranianPhone(normalizedPhone)) {
      setPhoneError("شماره همراه نامعتبر است. نمونه صحیح: ۰۹۱۲۳۴۵۶۷۸۹")
      setError("لطفاً یک شماره تلفن همراه معتبر ۱۱ رقمی وارد نمایید")
      return
    }

    // Save normalized phone and proceed directly to Step 5
    setCustomerPhone(normalizedPhone)
    setCurrentStep(5)
  }

  // Handle Confirmed Payment Initiation (Step 5)
  const handleProceedToPayment = async () => {
    setError(null)

    const normalizedPhone = normalizeIranianPhone(customerPhone)
    if (!isValidIranianPhone(normalizedPhone)) {
      setError("شماره همراه معتبر نیست. لطفاً شماره را ویرایش فرمایید.")
      setCurrentStep(4)
      return
    }

    if (!selectedTime || !selectedService) {
      setError("زمان یا خدمت نامعتبر است.")
      setCurrentStep(1)
      return
    }

    try {
      setLoading(true)

      // 1. Create or renew slot hold in database (atomic 10-minute hold)
      const holdRes = await fetch("/api/booking/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          dateStr: selectedDateStr,
          timeStr: selectedTime,
          customerName: customerName.trim(),
          customerPhone: normalizedPhone,
          customerEmail: customerEmail.trim() || undefined,
          customerBirthDate: customerBirthDate || undefined,
        }),
      })

      const holdData = await holdRes.json()
      if (!holdRes.ok) {
        throw new Error(holdData.error || "این بازه زمانی هم‌اکنون توسط فرد دیگری در حال رزرو است")
      }

      setHoldDetails(holdData)
      setHoldRemainingSeconds(600)

      // 2. Request payment gateway URL for this held appointment
      const payRes = await fetch("/api/booking/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: holdData.appointmentId }),
      })

      const payData = await payRes.json()
      if (!payRes.ok) {
        throw new Error(payData.error || "خطا در اتصال به درگاه پرداخت بانکی")
      }

      // Save draft in sessionStorage before navigating away to the gateway
      try {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            "koroush_booking_draft",
            JSON.stringify({
              serviceId: selectedService.id,
              dateStr: selectedDateStr,
              timeStr: selectedTime,
              customerName: customerName.trim(),
              customerPhone: normalizedPhone,
              customerEmail: customerEmail.trim() || undefined,
              customerBirthDate: customerBirthDate || undefined,
              appointmentId: holdData.appointmentId,
            })
          )
        }
      } catch {
        // Storage full or unavailable
      }

      // 3. Redirect customer to payment gateway
      window.location.href = payData.redirectUrl
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در برقراری ارتباط با درگاه پرداخت")
    } finally {
      setLoading(false)
    }
  }

  // Reset booking process
  const handleReset = () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("koroush_booking_draft")
      }
    } catch {
      // ignore
    }
    setCancellationNotice(null)
    setCurrentStep(1)
    setSelectedTime(null)
    setHoldDetails(null)
    setConfirmedBooking(null)
    setError(null)
    setSuccessMsg(null)
    setPhoneError(null)
  }

  // Format masked phone number for Step 5 confirmation (e.g. ۰۹۱۲•••۱۲۳۴)
  const getMaskedPhone = (phone: string) => {
    const norm = normalizeIranianPhone(phone)
    if (norm.length === 11) {
      const prefix = toPersianDigits(norm.slice(0, 4))
      const suffix = toPersianDigits(norm.slice(7))
      return `${prefix}•••${suffix}`
    }
    return toPersianDigits(phone)
  }

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${toPersianDigits(m)}:${toPersianDigits(s < 10 ? "0" + s : s)}`
  }

  const selectedDayObj = upcomingDays.find((d) => d.dateStr === selectedDateStr)

  return (
    <section
      id="booking"
      ref={bookingContainerRef}
      className="py-20 sm:py-24 bg-[#0F1210] relative overflow-hidden scroll-mt-24 sm:scroll-mt-28"
      dir="rtl"
    >
      {/* Background radial accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] sm:w-[500px] sm:h-[500px] lg:w-[700px] lg:h-[700px] rounded-full bg-[#C8A96B]/5 blur-[100px] sm:blur-[160px] pointer-events-none max-w-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#181D1A] border border-[#C8A96B]/30 text-xs sm:text-sm font-semibold text-[#E4C88E]">
            <Clock className="w-3.5 h-3.5 text-[#C8A96B]" />
            <span>رزرو آنلاین سریع و بدون پیچیدگی</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-[#F7F4EE] tracking-normal text-balance">
            میز نوبت‌دهی آنلاین آرایشگاه کوروش
          </h2>

          <p className="text-sm sm:text-base text-[#C5BDB2]">
            نوبت دلخواه خود را در چند مرحله کوتاه انتخاب کنید و با پرداخت بیعانه، رزرواسیون را نهایی فرمایید.
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
              { num: 4, label: "اطلاعات مراجع", shortLabel: "مشخصات", icon: User },
              { num: 5, label: "تأیید و بیعانه", shortLabel: "بیعانه", icon: CreditCard },
              { num: 6, label: "تأیید نهایی", shortLabel: "رسید", icon: CheckCircle2 },
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
        <div ref={stepContainerRef} className="bg-[#141715] rounded-3xl p-4 sm:p-7 lg:p-9 border border-[#262D29] shadow-2xl min-h-[480px] flex flex-col justify-between scroll-mt-24 sm:scroll-mt-28">
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#F7F4EE]">
                      مرحله ۱: انتخاب خدمت تخصصی
                    </h3>
                    <p className="text-xs sm:text-sm text-[#A89E90] mt-1">
                      خدمت مدنظر خود را انتخاب فرمایید. تمامی نوبت‌ها با تخصیص زمان اختصاصی ۶۰ دقیقه انجام می‌شود.
                    </p>
                  </div>

                  {/* Relocated Tariff Button */}
                  <button
                    type="button"
                    onClick={() => setShowPricingModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#E4C88E] bg-[#181D1A] hover:bg-[#222924] border border-[#C8A96B]/30 hover:border-[#C8A96B] transition-all self-start sm:self-auto min-h-[44px] cursor-pointer"
                  >
                    <Receipt className="w-4 h-4 text-[#C8A96B]" />
                    <span>مشاهده تعرفه کامل خدمات</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                  {services.map((srv) => {
                    const isSelected = selectedService.id === srv.id
                    const balanceDue = Math.max(0, srv.price - srv.depositPrice)
                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedService(srv)}
                        className={`p-2.5 sm:p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-[#1C221F] border-[#C8A96B] shadow-[0_0_15px_rgba(200,169,107,0.2)] ring-1 ring-[#C8A96B]/40 scale-[1.01]"
                            : "bg-[#101311] border-[#222825] hover:border-[#38413C]"
                        }`}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#232A26] text-[#A89E90] font-medium">
                                {srv.category}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#161B18] text-[#8C8477] border border-[#27302B]">
                                ۶۰ دقیقه
                              </span>
                            </div>
                            {isSelected && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-[#E4C88E]">
                                <CheckCircle2 className="w-3 h-3 text-[#E4C88E]" />
                                <span>انتخاب شده</span>
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-[#F7F4EE] leading-tight">{srv.name}</h4>
                          <p className="text-[11px] text-[#8C8477] line-clamp-1 leading-tight">{srv.description}</p>
                        </div>

                        {/* Standardized Pricing Hierarchy - Ultra Compact Strip */}
                        <div className="pt-2 mt-2 border-t border-[#1F2522] flex items-center justify-between text-xs">
                          <div className="flex items-baseline gap-1">
                            <span className="text-[10px] text-[#8C8477]">کل:</span>
                            <strong className="text-xs font-bold text-[#F7F4EE]">{formatToman(srv.price)}</strong>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-[10px] text-[#C8A96B]">بیعانه:</span>
                            <strong className="text-xs font-bold text-[#E4C88E]">{formatToman(srv.depositPrice)}</strong>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-4 sm:pt-6 border-t border-[#222825] flex justify-end">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="w-full sm:w-auto px-8 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base font-bold text-[#0D0F0E] bg-gradient-to-r from-[#E4C88E] to-[#C8A96B] hover:brightness-110 shadow-lg flex items-center justify-center gap-2 cursor-pointer min-h-[48px] active:scale-95 transition-all"
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
                      const dayClosed = Boolean(closedDaysMap[d.dateStr]?.isClosed)
                      const shortDay = d.dayName.replace("‌", "").slice(0, 3)
                      return (
                        <button
                          key={d.dateStr}
                          type="button"
                          onClick={() => {
                            setSelectedDateStr(d.dateStr)
                            if (dayClosed) {
                              setError("این روز برای رزرو نوبت در دسترس نیست. لطفاً روز دیگری انتخاب کنید.")
                            } else {
                              setError(null)
                            }
                          }}
                          className={`p-1.5 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 text-center transition-all min-h-[66px] sm:min-h-[88px] flex flex-col items-center justify-between ${
                            isSelected
                              ? dayClosed
                                ? "bg-[#221717] border-red-500/60 ring-2 ring-red-500/40 ring-offset-1 sm:ring-offset-2 ring-offset-[#141715] cursor-pointer"
                                : "bg-[#1E2522] border-[#C8A96B] ring-2 ring-[#C8A96B]/50 ring-offset-1 sm:ring-offset-2 ring-offset-[#141715] shadow-md cursor-pointer"
                              : dayClosed
                              ? "bg-[#171212] border-[#2E1E1E] opacity-60 hover:opacity-90 cursor-pointer"
                              : "bg-[#101311] border-[#202522] hover:border-[#38413C] cursor-pointer"
                          }`}
                        >
                          <div className={`text-[10px] sm:text-xs font-medium leading-tight ${isSelected ? (dayClosed ? "text-red-300" : "text-[#E4C88E]") : dayClosed ? "text-red-400/80" : "text-[#8C8477]"}`}>
                            <span className="hidden sm:inline">{d.dayName}</span>
                            <span className="sm:hidden">{shortDay}</span>
                          </div>
                          <div className={`text-base sm:text-2xl font-heading font-black my-0.5 sm:my-1 persian-nums ${dayClosed ? "text-red-300/80" : "text-[#F7F4EE]"}`}>
                            {d.dayNumber}
                          </div>
                          <div className="text-[9px] sm:text-[11px] text-[#A89E90] leading-none">{d.monthName}</div>
                          {dayClosed ? (
                            <div className="mt-0.5 sm:mt-1 text-[8px] sm:text-[10px] px-1 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-500/30 font-bold">
                              تعطیل
                            </div>
                          ) : d.isToday ? (
                            <div className="mt-0.5 sm:mt-1 text-[8px] sm:text-[10px] px-1 py-0.5 rounded bg-[#C8A96B]/20 text-[#E4C88E] font-bold">
                              امروز
                            </div>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Disabled Day Notice Banner */}
                {(isClosed || Boolean(closedDaysMap[selectedDateStr]?.isClosed)) && (
                  <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 flex items-start gap-3 text-xs sm:text-sm animate-shake">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold block text-red-200">
                        این روز برای رزرو نوبت در دسترس نیست. لطفاً روز دیگری انتخاب کنید.
                      </strong>
                      <span className="text-xs text-red-300/80 mt-0.5 block">
                        {closedReason || closedDaysMap[selectedDateStr]?.reason || "سالن در این تاریخ تعطیل بوده یا ظرفیت پذیرش غیرفعال شده است."}
                      </span>
                    </div>
                  </div>
                )}

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
                    disabled={isClosed || Boolean(closedDaysMap[selectedDateStr]?.isClosed)}
                    onClick={() => {
                      if (isClosed || closedDaysMap[selectedDateStr]?.isClosed) {
                        setError("این روز برای رزرو نوبت در دسترس نیست. لطفاً روز دیگری انتخاب کنید.")
                        return
                      }
                      setCurrentStep(3)
                    }}
                    className={`w-full sm:w-auto px-6 sm:px-8 py-3.5 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all min-h-[44px] ${
                      isClosed || closedDaysMap[selectedDateStr]?.isClosed
                        ? "bg-[#252826] text-[#636865] border border-[#303632] cursor-not-allowed opacity-60"
                        : "text-[#0D0F0E] bg-gradient-to-r from-[#E4C88E] to-[#C8A96B] hover:brightness-110 shadow-lg cursor-pointer"
                    }`}
                  >
                    <span>تایید روز و انتخاب ساعت</span>
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: TIME SLOT SELECTION */}
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
                    <div className="space-y-4">
                      {/* Interactive Slot Status Legend */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 text-xs text-[#A89E90] border-b border-[#222825]">
                        <span className="font-semibold text-[#F7F4EE]">ساعت مدنظر خود را انتخاب فرمایید:</span>
                        <div className="flex flex-wrap items-center gap-3 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>قابل رزرو</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#C8A96B]" />
                            <span>انتخاب شما</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#555E59]" />
                            <span>رزرو شده</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>در حال رزرو</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500/70" />
                            <span>غیرفعال / گذشته</span>
                          </div>
                        </div>
                      </div>

                      {slotsLoading && (
                        <div className="flex items-center gap-1.5 text-xs text-[#E4C88E] animate-pulse">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>در حال استعلام نوبت‌های آزاد...</span>
                        </div>
                      )}

                      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 transition-opacity duration-200 ${slotsLoading ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
                        {availableSlots.length === 0 && slotsLoading
                          ? Array.from({ length: 13 }).map((_, i) => (
                              <div
                                key={i}
                                className="min-h-[58px] sm:min-h-[62px] px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border-2 border-[#202522] bg-[#121513] animate-pulse flex flex-col items-center justify-center gap-1"
                              >
                                <div className="h-4 w-12 bg-[#202623] rounded" />
                                <div className="h-2.5 w-8 bg-[#1B201D] rounded" />
                              </div>
                            ))
                          : availableSlots.map((slot) => {
                              const isSelected = selectedTime === slot.time
                              const isAvailable = slot.isAvailable && slot.status === "AVAILABLE"
                              const status = slot.status

                              let statusLabel = "قابل رزرو"
                              let styleClass = "bg-[#101311] text-[#F7F4EE] border-[#2A332E] hover:border-[#C8A96B] hover:bg-[#1A201D] cursor-pointer shadow-sm"
                              let isDisabled = false

                              if (isSelected) {
                                statusLabel = "انتخاب شما"
                                styleClass = "bg-gradient-to-b from-[#E4C88E] to-[#C8A96B] text-[#0D0F0E] border-[#F5F1E8] ring-2 ring-[#C8A96B] ring-offset-2 ring-offset-[#141715] shadow-lg font-black cursor-pointer scale-105"
                                isDisabled = false
                              } else if (status === "BOOKED") {
                                statusLabel = "رزرو شده"
                                styleClass = "bg-[#141615] text-[#555E59] border-[#202422] opacity-50 cursor-not-allowed select-none line-through"
                                isDisabled = true
                              } else if (status === "HELD") {
                                statusLabel = "در حال رزرو"
                                styleClass = "bg-[#1A1813] text-[#A6884C]/80 border-[#2D271D] opacity-65 cursor-not-allowed select-none"
                                isDisabled = true
                              } else if (status === "BLOCKED") {
                                statusLabel = "غیرفعال"
                                styleClass = "bg-[#1A1414] text-[#A85858]/70 border-[#2C1D1D] opacity-55 cursor-not-allowed select-none"
                                isDisabled = true
                              } else if (status === "PAST") {
                                statusLabel = "گذشته"
                                styleClass = "bg-[#0F1110] text-[#444C47] border-[#181B19] opacity-40 cursor-not-allowed select-none"
                                isDisabled = true
                              }

                              return (
                                <button
                                  key={slot.time}
                                  type="button"
                                  disabled={isDisabled}
                                  onClick={() => setSelectedTime(slot.time)}
                                  aria-label={`نوبت ساعت ${toPersianDigits(slot.time)} - ${statusLabel}`}
                                  aria-disabled={isDisabled}
                                  className={`min-h-[58px] sm:min-h-[62px] px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border-2 font-bold text-sm sm:text-base flex flex-col items-center justify-center gap-0.5 transition-all ${styleClass}`}
                                >
                                  <span dir="ltr" className="font-mono tracking-wider">{toPersianDigits(slot.time)}</span>
                                  <span className={`text-[10px] font-medium ${isSelected ? "text-[#0D0F0E] font-bold" : isAvailable ? "text-emerald-400" : "opacity-80"}`}>
                                    {statusLabel}
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

            {/* STEP 4: CUSTOMER DETAILS (NO OTP REQUIRED) */}
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
                    مرحله ۴: مشخصات مراجع محترم
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A89E90]">
                    برای نهایی‌سازی رزرو، نام و شماره تلفن همراه خود را وارد فرمایید (بدون نیاز به کد پیامکی).
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Name Input */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-semibold text-[#C5BDB2] flex items-center gap-1">
                      <span>نام و نام خانوادگی</span>
                      <span className="text-[#C8A96B]">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8C8477]" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="مثال: کوروش آریافر"
                        className="w-full pr-12 pl-4 py-3.5 rounded-xl bg-[#101311] border border-[#2B332F] text-[#F7F4EE] placeholder-[#5C5549] focus:outline-none focus:border-[#C8A96B] text-base min-h-[48px]"
                      />
                    </div>
                  </div>

                  {/* Phone Input with immediate feedback */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-semibold text-[#C5BDB2] flex items-center gap-1">
                      <span>شماره تلفن همراه (جهت ارسال پیامک تایید و هماهنگی)</span>
                      <span className="text-[#C8A96B]">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8C8477]" />
                      <input
                        type="tel"
                        dir="ltr"
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value)
                          if (phoneError) setPhoneError(null)
                        }}
                        placeholder="09123456789"
                        className={`w-full pr-12 pl-4 py-3.5 rounded-xl bg-[#101311] border text-[#F7F4EE] placeholder-[#5C5549] focus:outline-none text-base font-mono min-h-[48px] ${
                          phoneError ? "border-red-500 focus:border-red-400" : "border-[#2B332F] focus:border-[#C8A96B]"
                        }`}
                      />
                    </div>
                    {phoneError ? (
                      <p className="text-xs text-red-400 mt-1">{phoneError}</p>
                    ) : (
                      <p className="text-[11px] text-[#7E776C] mt-1">شماره‌های ایرانی به صورت ۰۹۱۲۳۴۵۶۷۸۹ معتبر هستند.</p>
                    )}
                  </div>

                  {/* Optional Date of Birth */}
                  <div className="pt-1">
                    <JalaliBirthDatePicker
                      value={customerBirthDate || ""}
                      onChange={setCustomerBirthDate}
                    />
                  </div>
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
                    onClick={handleProceedToInvoice}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 rounded-xl text-base font-bold text-[#0D0F0E] bg-gradient-to-r from-[#E4C88E] to-[#C8A96B] hover:brightness-110 shadow-lg flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <span>ادامه به تایید پیش‌فاکتور</span>
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: PRE-PAYMENT PHONE CONFIRMATION & INVOICE */}
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
                    مرحله ۵: تایید مشخصات و پرداخت بیعانه
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A89E90] mt-1">
                    پیش از هدایت به درگاه پرداخت شاپرک، لطفاً صحت اطلاعات و شماره تماس خود را بررسی فرمایید.
                  </p>
                </div>

                {/* Cancellation Warning Notice */}
                {cancellationNotice && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-300 flex items-start gap-3 animate-in fade-in duration-200">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs sm:text-sm text-right">
                      <strong className="font-bold text-amber-200 block text-sm sm:text-base">وضعیت پرداخت: نوبت آزاد شد</strong>
                      <p className="leading-relaxed">{cancellationNotice}</p>
                    </div>
                  </div>
                )}

                {/* REQUIRED PHONE CONFIRMATION BLOCK */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#171D19] border-2 border-[#C8A96B]/50 shadow-lg space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#C8A96B]/20 text-[#E4C88E] flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-[#E4C88E]" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[#F7F4EE]">تأیید شماره تماس مراجع</h4>
                      <p className="text-xs text-[#C5BDB2] mt-0.5">
                        پیامک تأیید رزرو و جزئیات نوبت به شماره زیر ارسال خواهد شد:
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#101311] border border-[#262D29]">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#8C8477]">شماره ثبت شده:</span>
                      <strong className="text-xl sm:text-2xl font-black font-mono text-[#E4C88E] tracking-wider" dir="ltr">
                        {getMaskedPhone(customerPhone)}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#C5BDB2] bg-[#1E2420] hover:bg-[#2B352E] hover:text-[#F7F4EE] border border-[#2B332F] transition-all cursor-pointer min-h-[40px]"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#C8A96B]" />
                      <span>ویرایش شماره</span>
                    </button>
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
                      <strong className="text-[#F7F4EE]">{formatJalaliDayString(selectedDateStr)}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-[#161A18] border border-[#222724]">
                      <span className="text-[#8C8477] block text-[11px]">ساعت نوبت:</span>
                      <strong className="text-[#E4C88E]" dir="ltr">{selectedTime}</strong>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="p-3 rounded-xl bg-[#161A18] border border-[#222724] text-xs space-y-1">
                    <div className="text-[#8C8477]">مراجعه‌کننده: <strong className="text-[#F7F4EE]">{customerName}</strong></div>
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

                {/* Checkout CTA Buttons */}
                <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="w-full sm:w-auto px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-sm font-semibold text-[#C5BDB2] bg-[#1A1F1C] hover:bg-[#252C28] border border-[#2B332F] cursor-pointer min-h-[48px] flex items-center justify-center"
                  >
                    ویرایش مشخصات
                  </button>

                  <button
                    type="button"
                    disabled={loading || !agreedToTerms}
                    onClick={handleProceedToPayment}
                    className="w-full sm:flex-1 py-3.5 sm:py-4 px-6 sm:px-8 rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold text-[#0D0F0E] bg-gradient-to-r from-[#E4C88E] via-[#C8A96B] to-[#9A773F] disabled:opacity-40 hover:brightness-110 shadow-[0_4px_25px_rgba(200,169,107,0.35)] flex items-center justify-center gap-2 sm:gap-3 cursor-pointer min-h-[48px]"
                  >
                    <Lock className="w-5 h-5 text-[#0D0F0E] shrink-0" />
                    <span>
                      {loading ? "در حال اتصال به درگاه امن شاپرک..." : `تأیید شماره و پرداخت بیعانه (${formatToman(selectedService.depositPrice)})`}
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
                      <strong className="text-[#F7F4EE]">{formatJalaliDayString(confirmedBooking?.dateStr || selectedDateStr)}</strong>
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

      {/* TARIFF / PRICE LIST MODAL */}
      {showPricingModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pricing-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          dir="rtl"
        >
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#141715] border border-[#C8A96B]/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-right">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#242A27]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C8A96B]/15 text-[#E4C88E] flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-[#C8A96B]" />
                </div>
                <div>
                  <h3 id="pricing-modal-title" className="text-lg sm:text-xl font-bold font-heading text-[#F7F4EE]">
                    جدول رسمی تعرفه خدمات و بیعانه سالن
                  </h3>
                  <p className="text-xs text-[#A89E90] mt-0.5">
                    شفافیت کامل در هزینه‌ها؛ بدون هیچ‌گونه هزینه مازاد در سالن
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPricingModal(false)}
                className="p-2 rounded-xl bg-[#1C221F] text-[#A89E90] hover:text-[#F7F4EE] hover:bg-[#252C28] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="بستن پنجره تعرفه"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pricing List Table / Cards */}
            <div className="divide-y divide-[#202622] my-4">
              {services.map((srv) => {
                const isSelected = selectedService.id === srv.id
                return (
                  <div key={srv.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-bold text-[#F7F4EE]">{srv.name}</span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded bg-[#C8A96B]/20 text-[#E4C88E] text-[10px] font-bold">
                            انتخاب فعلی
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8C8477]">{srv.description}</p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="text-right sm:text-left bg-[#101311] sm:bg-transparent p-2.5 sm:p-0 rounded-xl sm:rounded-none border border-[#202522] sm:border-0 space-y-0.5 text-xs">
                        <div className="flex items-center justify-between sm:justify-end gap-2 text-[#C5BDB2]">
                          <span>قیمت کامل:</span>
                          <strong className="text-sm font-bold text-[#F7F4EE]">{formatToman(srv.price)}</strong>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 text-[#A89E90]">
                          <span>بیعانه:</span>
                          <strong className="text-xs font-bold text-[#E4C88E]">{formatToman(srv.depositPrice)}</strong>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 text-[11px] text-[#787063]">
                          <span>مانده در سالن:</span>
                          <span className="text-[#A89E90]">{formatToman(Math.max(0, srv.price - srv.depositPrice))}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedService(srv)
                          setShowPricingModal(false)
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] ${
                          isSelected
                            ? "bg-[#C8A96B] text-[#0D0F0E]"
                            : "bg-[#1C221F] text-[#E4C88E] hover:bg-[#C8A96B] hover:text-[#0D0F0E] border border-[#C8A96B]/30"
                        }`}
                      >
                        {isSelected ? "انتخاب شده" : "انتخاب خدمت"}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Modal Footer Note */}
            <div className="pt-4 border-t border-[#242A27] text-center text-xs text-[#8C8477]">
              <span>پذیرش در سالن صرفاً با تعیین وقت قبلی و پرداخت بیعانه از طریق رزرواسیون امکان‌پذیر است.</span>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
