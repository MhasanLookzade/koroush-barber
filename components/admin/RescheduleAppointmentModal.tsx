"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatToman, toPersianDigits, getTehranDateString, getJalaliDate } from "@/lib/jalali"
import { JalaliDatePicker } from "@/components/ui/JalaliDatePicker"
import {
  Calendar,
  Clock,
  Scissors,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react"

interface AppointmentSummary {
  id: string
  trackingCode: string
  customerName: string
  customerPhone: string
  serviceName: string
  dateUtc: string
  jalaliFull: string
  time: string
  totalPrice: number
  depositPaid: number
  balanceDue: number
}

interface RescheduleModalProps {
  appointment: AppointmentSummary | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (updated: any) => void
}

export function RescheduleAppointmentModal({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}: RescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [reason, setReason] = useState<string>("")
  const [availableSlots, setAvailableSlots] = useState<Array<{ time: string; isAvailable: boolean; status: string }>>([])
  const [isClosed, setIsClosed] = useState(false)
  const [closedReason, setClosedReason] = useState("")
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Initialize with tomorrow's date or current date on open
  useEffect(() => {
    if (appointment && isOpen) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const initDate = getTehranDateString(tomorrow)
      setSelectedDate(initDate)
      setSelectedTime("")
      setReason("")
      setError(null)
      setSuccessMsg(null)
    }
  }, [appointment, isOpen])

  // Fetch slots whenever selectedDate changes
  useEffect(() => {
    async function fetchDateAvailability() {
      if (!selectedDate || !isOpen) return
      try {
        setSlotsLoading(true)
        setError(null)
        setSelectedTime("")
        setIsClosed(false)
        setClosedReason("")

        const res = await fetch(`/api/booking/availability?date=${selectedDate}`)
        if (!res.ok) throw new Error("خطا در استعلام ظرفیت نوبت‌ها")
        const data = await res.json()

        if (data.isClosed) {
          setIsClosed(true)
          setClosedReason(data.closedReason || "سالن در این تاریخ تعطیل است")
          setAvailableSlots([])
        } else {
          setAvailableSlots(data.slots || [])
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "امکان استعلام ظرفیت وجود ندارد")
      } finally {
        setSlotsLoading(false)
      }
    }

    fetchDateAvailability()
  }, [selectedDate, isOpen])

  if (!isOpen || !appointment) return null

  const handleConfirmReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      setError("لطفاً تاریخ جدید و ساعت مدنظر را انتخاب فرمایید")
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const res = await fetch("/api/admin/appointments/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment.id,
          newDateStr: selectedDate,
          newTimeStr: selectedTime,
          reason: reason.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "خطا در تغییر زمان نوبت")
      }

      setSuccessMsg("زمان نوبت با موفقیت تغییر کرد.")
      setTimeout(() => {
        onSuccess(data.appointment)
        onClose()
      }, 1200)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در برقراری ارتباط با سرور")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#141715] border border-[#C8A96B]/40 rounded-3xl p-5 sm:p-7 shadow-2xl text-right space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#242A27]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C8A96B]/15 text-[#E4C88E] flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#C8A96B]" />
            </div>
            <div>
              <h3 id="reschedule-modal-title" className="text-base sm:text-lg font-bold font-heading text-[#F7F4EE]">
                تغییر تاریخ یا ساعت نوبت
              </h3>
              <p className="text-xs text-[#A89E90] mt-0.5">
                انتقال رزرو به زمان خالی جدید بدون تغییر بیعانه یا ایجاد نوبت تکراری
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1C221F] text-[#A89E90] hover:text-[#F7F4EE] hover:bg-[#252C28] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
            aria-label="بستن پنجره"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Feedback Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{successMsg}</span>
          </div>
        )}

        {/* Current Appointment Snapshot */}
        <div className="p-3.5 rounded-2xl bg-[#0D0F0E] border border-[#222825] space-y-2 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#1A1F1C]">
            <span className="text-[#8C8477]">نوبت فعلی مراجع:</span>
            <span className="font-mono text-[#E4C88E] font-bold">{appointment.trackingCode}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <span className="text-[#8C8477] block text-[11px]">مراجعه‌کننده:</span>
              <strong className="text-[#F7F4EE]">{appointment.customerName} ({appointment.customerPhone})</strong>
            </div>
            <div>
              <span className="text-[#8C8477] block text-[11px]">خدمت:</span>
              <strong className="text-[#F7F4EE]">{appointment.serviceName}</strong>
            </div>
            <div>
              <span className="text-[#8C8477] block text-[11px]">زمان فعلی:</span>
              <strong className="text-amber-400 font-mono">{toPersianDigits(appointment.time)} - {appointment.jalaliFull}</strong>
            </div>
          </div>
        </div>

        {/* New Date Selection (Jalali) */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#C5BDB2] block">
            انتخاب تاریخ جدید نوبت (تقویم شمسی):
          </label>
          <div className="max-w-xs">
            <JalaliDatePicker
              value={selectedDate}
              onChange={(d) => setSelectedDate(d)}
              placeholder="انتخاب تاریخ روز جدید..."
              className="w-full text-xs"
            />
          </div>
        </div>

        {/* New Time Slots Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#C5BDB2]">
              انتخاب ساعت جدید از میان زمان‌های خالی:
            </label>
            {slotsLoading && (
              <span className="flex items-center gap-1 text-[11px] text-[#E4C88E]">
                <RefreshCw className="w-3 h-3 animate-spin" />
                در حال استعلام نوبت‌های خالی...
              </span>
            )}
          </div>

          {isClosed ? (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-center text-xs text-red-300">
              {closedReason || "سالن در این تاریخ تعطیل است و امکان رزرو نوبت وجود ندارد."}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1">
              {availableSlots.map((slot) => {
                const isSelected = selectedTime === slot.time
                const isAvail = slot.isAvailable
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!isAvail}
                    onClick={() => setSelectedTime(slot.time)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 min-h-[44px] ${
                      isSelected
                        ? "bg-[#C8A96B] text-[#0D0F0E] border-[#E4C88E] shadow-md cursor-pointer"
                        : isAvail
                        ? "bg-[#101311] text-[#F7F4EE] border-[#2B332F] hover:border-[#C8A96B] cursor-pointer"
                        : "bg-[#171A18] text-[#555C57] border-[#222825] opacity-50 cursor-not-allowed line-through"
                    }`}
                  >
                    <span dir="ltr">{slot.time}</span>
                    <span className="text-[9px] font-normal opacity-80">
                      {isSelected ? "انتخاب" : isAvail ? "خالی" : "پر"}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Reason for Change (Optional) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#C5BDB2] block">
            علت یا توضیحات جابجایی نوبت (اختیاری):
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: درخواست تلفنی مشتری جهت تغییر ساعت"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#101311] border border-[#2B332F] text-xs text-[#F7F4EE] placeholder-[#5C5549] focus:outline-none focus:border-[#C8A96B]"
          />
        </div>

        {/* Comparison & Policy Summary Card */}
        {selectedTime && (
          <div className="p-3.5 rounded-2xl bg-[#18201C] border border-[#C8A96B]/30 space-y-2 text-xs">
            <span className="font-bold text-[#E4C88E] block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C8A96B]" />
              خلاصه جابجایی نوبت:
            </span>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[#C5BDB2]">
              <div>
                نوبت قبلی: <span className="line-through text-red-300 font-mono">{toPersianDigits(appointment.time)}</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-[#C8A96B] hidden sm:inline" />
              <div>
                نوبت جدید: <strong className="text-emerald-400 font-mono">{toPersianDigits(selectedTime)} ({selectedDate})</strong>
              </div>
            </div>
            <p className="text-[11px] text-[#A89E90] pt-1 border-t border-[#232D27]">
              ✓ بیعانه {formatToman(appointment.depositPaid)} به‌طور خودکار به زمان جدید منتقل شده و نیازی به پرداخت مجدد نیست.
            </p>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-3 border-t border-[#242A27] flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-[#2D332F] text-[#A89E90] hover:text-[#F7F4EE] text-xs px-5 py-2.5 rounded-xl min-h-[44px] cursor-pointer"
          >
            انصراف
          </Button>

          <Button
            type="button"
            disabled={submitting || !selectedTime || isClosed}
            onClick={handleConfirmReschedule}
            className="bg-[#C8A96B] hover:bg-[#E4C88E] text-[#0D0F0E] font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg min-h-[44px] cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin ml-1.5" />
                در حال ثبت جابجایی...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 ml-1.5" />
                تأیید و جابجایی نوبت
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  )
}
