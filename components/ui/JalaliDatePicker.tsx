"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  CalendarCheck,
} from "lucide-react"
import {
  getJalaliDate,
  gregorianToJalali,
  jalaliToGregorian,
  PERSIAN_MONTHS,
  PERSIAN_WEEKDAYS_SHORT,
  toPersianDigits,
  getTehranDateString,
  getJalaliMonthLength,
  getJalaliFirstDayOfWeek,
  jalaliToGregorianDateString,
  formatJalaliDateOnly,
  getRelativeTehranDate,
} from "@/lib/jalali"

interface JalaliDatePickerProps {
  value: string // Gregorian YYYY-MM-DD
  onChange: (dateStr: string) => void
  label?: string
  className?: string
  showShortcuts?: boolean
  minDate?: string // Gregorian YYYY-MM-DD
  maxDate?: string // Gregorian YYYY-MM-DD
  placeholder?: string
}

export function JalaliDatePicker({
  value,
  onChange,
  label,
  className = "",
  showShortcuts = true,
  minDate,
  maxDate,
  placeholder = "انتخاب تاریخ جلالی...",
}: JalaliDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Mount detection for React Portals
  useEffect(() => {
    setMounted(true)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Determine current Jalali year & month for view navigation
  const initialDate = value ? new Date(value + "T12:00:00") : new Date()
  const initialJalali = getJalaliDate(initialDate)

  const [viewYear, setViewYear] = useState<number>(initialJalali.year)
  const [viewMonth, setViewMonth] = useState<number>(initialJalali.month)

  // Update view when value changes
  useEffect(() => {
    if (value && value.includes("-")) {
      const d = new Date(value + "T12:00:00")
      if (!isNaN(d.getTime())) {
        const j = getJalaliDate(d)
        setViewYear(j.year)
        setViewMonth(j.month)
      }
    }
  }, [value])

  // Calculate popover positioning on desktop
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const mobile = window.innerWidth < 640
    setIsMobile(mobile)

    if (mobile) {
      setPopoverPos(null)
      return
    }

    const popoverWidth = 330
    // RTL alignment: align right of popover with right of trigger button
    let left = rect.right - popoverWidth
    if (left < 16) left = 16
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16
    }

    // Position below trigger or above if not enough room
    let top = rect.bottom + 8
    const estimatedHeight = 390
    if (top + estimatedHeight > window.innerHeight && rect.top > estimatedHeight) {
      top = rect.top - estimatedHeight - 8
    }

    setPopoverPos({ top, left, width: popoverWidth })
  }, [])

  // Reposition on open, scroll, or resize
  useEffect(() => {
    if (!isOpen) return
    updatePosition()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }

    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, updatePosition])

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  // Calculate days for the month view
  const daysInMonth = getJalaliMonthLength(viewYear, viewMonth)
  const firstDayOfWeek = getJalaliFirstDayOfWeek(viewYear, viewMonth) // 0=شنبه, ..., 6=جمعه

  // Parse current selected value in Jalali
  let selectedJy = 0
  let selectedJm = 0
  let selectedJd = 0
  if (value && value.includes("-")) {
    const [gy, gm, gd] = value.split("-").map(Number)
    if (gy && gm && gd) {
      const [jy, jm, jd] = gregorianToJalali(gy, gm, gd)
      selectedJy = jy
      selectedJm = jm
      selectedJd = jd
    }
  }

  // Today in Jalali (Asia/Tehran)
  const todayTehran = getTehranDateString()
  const todayJalali = getJalaliDate(new Date())

  // Select day
  const handleSelectDay = (dayNum: number) => {
    const gregDateStr = jalaliToGregorianDateString(viewYear, viewMonth, dayNum)
    if (minDate && gregDateStr < minDate) return
    if (maxDate && gregDateStr > maxDate) return
    onChange(gregDateStr)
    setIsOpen(false)
  }

  // Shortcuts
  const setToday = () => {
    if (minDate && todayTehran < minDate) return
    onChange(todayTehran)
    setIsOpen(false)
  }

  const setTomorrow = () => {
    const tomorrow = getRelativeTehranDate(1)
    if (minDate && tomorrow.dateStr < minDate) return
    onChange(tomorrow.dateStr)
    setIsOpen(false)
  }

  const setNextDays = (days: number) => {
    const rel = getRelativeTehranDate(days)
    if (minDate && rel.dateStr < minDate) return
    onChange(rel.dateStr)
    setIsOpen(false)
  }

  // Formatted display text
  const displayText = value ? formatJalaliDateOnly(value) : placeholder

  // Weekday headers: شنبه (0) to جمعه (6)
  const persianWeekdays = ["ش", "ی", "د", "س", "چ", "پ", "ج"]

  // Calendar content renderer (shared across mobile bottom sheet & desktop portal)
  const renderCalendarContent = () => (
    <div className="space-y-3.5 select-none" dir="rtl">
      {/* Mobile Handle Bar & Header */}
      {isMobile && (
        <div className="flex flex-col items-center pb-2 border-b border-[#2D332F]">
          <div className="w-12 h-1.5 bg-[#3B423E] rounded-full mb-3" />
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#C8A96B]" />
              <span className="font-bold text-sm text-[#F5F1E8]">انتخاب تاریخ نوبت (جلالی)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-[#1F2321] text-[#A8A39A] hover:text-[#F5F1E8] flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
              aria-label="بستن تقویم"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Shortcuts Bar */}
      {showShortcuts && (
        <div className="grid grid-cols-3 gap-2 pb-2.5 border-b border-[#2D332F]">
          <button
            type="button"
            onClick={setToday}
            className="py-2 px-2 rounded-xl bg-[#1F2321] hover:bg-[#C8A96B] hover:text-[#0D0F0E] text-xs font-medium text-[#F5F1E8] transition-colors text-center cursor-pointer min-h-[44px] flex items-center justify-center border border-[#2D332F]"
          >
            امروز
          </button>
          <button
            type="button"
            onClick={setTomorrow}
            className="py-2 px-2 rounded-xl bg-[#1F2321] hover:bg-[#C8A96B] hover:text-[#0D0F0E] text-xs font-medium text-[#F5F1E8] transition-colors text-center cursor-pointer min-h-[44px] flex items-center justify-center border border-[#2D332F]"
          >
            فردا
          </button>
          <button
            type="button"
            onClick={() => setNextDays(2)}
            className="py-2 px-2 rounded-xl bg-[#1F2321] hover:bg-[#C8A96B] hover:text-[#0D0F0E] text-xs font-medium text-[#F5F1E8] transition-colors text-center cursor-pointer min-h-[44px] flex items-center justify-center border border-[#2D332F]"
          >
            پس‌فردا
          </button>
        </div>
      )}

      {/* Month / Year Header */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="w-10 h-10 rounded-xl bg-[#1F2321] hover:bg-[#2D332F] text-[#A8A39A] hover:text-[#F5F1E8] flex items-center justify-center transition-colors cursor-pointer min-h-[44px] min-w-[44px] border border-[#2D332F]"
          aria-label="ماه قبل"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="text-center font-bold text-sm sm:text-base text-[#F5F1E8]">
          <span>{PERSIAN_MONTHS[viewMonth - 1]}</span>{" "}
          <span className="font-mono text-[#C8A96B] font-extrabold">{toPersianDigits(viewYear)}</span>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="w-10 h-10 rounded-xl bg-[#1F2321] hover:bg-[#2D332F] text-[#A8A39A] hover:text-[#F5F1E8] flex items-center justify-center transition-colors cursor-pointer min-h-[44px] min-w-[44px] border border-[#2D332F]"
          aria-label="ماه بعد"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Weekday Labels (ش، ی، د، س، چ، پ، ج) */}
      <div className="grid grid-cols-7 gap-1 text-center py-1">
        {persianWeekdays.map((dayName, idx) => (
          <span
            key={dayName}
            className={`text-xs font-bold py-1 ${
              idx === 6 ? "text-rose-400" : "text-[#8C8477]"
            }`}
          >
            {dayName}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {/* Empty slots before day 1 */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-10 sm:h-9" />
        ))}

        {/* Days of current Jalali month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1
          const gregDateStr = jalaliToGregorianDateString(viewYear, viewMonth, dayNum)
          const isSelected =
            viewYear === selectedJy && viewMonth === selectedJm && dayNum === selectedJd
          const isToday =
            viewYear === todayJalali.year &&
            viewMonth === todayJalali.month &&
            dayNum === todayJalali.day

          const isPast = minDate ? gregDateStr < minDate : false
          const isFuture = maxDate ? gregDateStr > maxDate : false
          const isDisabled = isPast || isFuture

          return (
            <button
              key={`day-${dayNum}`}
              type="button"
              disabled={isDisabled}
              onClick={() => handleSelectDay(dayNum)}
              className={`h-10 sm:h-9 rounded-xl font-mono text-xs flex items-center justify-center transition-all cursor-pointer min-h-[44px] sm:min-h-[36px] ${
                isDisabled
                  ? "text-[#555E58] bg-transparent opacity-40 cursor-not-allowed"
                  : isSelected
                  ? "bg-[#C8A96B] text-[#0D0F0E] font-extrabold shadow-lg scale-105"
                  : isToday
                  ? "bg-[#1F2321] text-[#E4C88E] border border-[#C8A96B] font-bold"
                  : "text-[#F5F1E8] hover:bg-[#1F2321] hover:text-[#C8A96B]"
              }`}
            >
              {toPersianDigits(dayNum)}
            </button>
          )
        })}
      </div>

      {/* Footer date info */}
      <div className="pt-3 border-t border-[#2D332F] flex items-center justify-between text-xs text-[#8C8477]">
        <div className="truncate">
          امروز: <span className="text-[#F5F1E8]">{todayJalali.dayName}، {toPersianDigits(todayJalali.day)} {todayJalali.monthName}</span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-[#C8A96B] hover:text-[#E4C88E] font-medium transition-colors cursor-pointer px-2 py-1 min-h-[36px] flex items-center"
        >
          بستن
        </button>
      </div>
    </div>
  )

  return (
    <div className={`relative ${className}`} dir="rtl">
      {label && (
        <label className="text-xs font-semibold text-[#A8A39A] block mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#161917] border border-[#2D332F] hover:border-[#C8A96B] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#F5F1E8] flex items-center justify-between gap-2 transition-colors min-h-[44px] cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C8A96B]"
        aria-expanded={isOpen}
        aria-label="انتخاب تاریخ تقویم جلالی"
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-4 h-4 text-[#C8A96B] shrink-0" />
          <span className="truncate font-medium">{displayText}</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#1F2321] text-[#C8A96B] font-mono shrink-0 border border-[#2D332F]">
          جلالی
        </span>
      </button>

      {/* Render Portal Overlay when Open */}
      {isOpen && mounted && typeof document !== "undefined" && createPortal(
        isMobile ? (
          /* Mobile View: Bottom Sheet with Dimmed Backdrop */
          <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-xs flex items-end justify-center p-0 animate-in fade-in duration-200">
            <div
              className="fixed inset-0"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            <div
              ref={popoverRef}
              className="relative w-full max-w-md bg-[#141715] border-t sm:border border-[#2D332F] rounded-t-3xl shadow-2xl p-4 pb-8 z-10 animate-in slide-in-from-bottom duration-200"
            >
              {renderCalendarContent()}
            </div>
          </div>
        ) : (
          /* Desktop View: Anchored Portal Popover */
          <>
            <div
              className="fixed inset-0 z-[119]"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            <div
              ref={popoverRef}
              style={{
                position: "fixed",
                top: popoverPos ? `${popoverPos.top}px` : "50%",
                left: popoverPos ? `${popoverPos.left}px` : "50%",
                width: popoverPos ? `${popoverPos.width}px` : "330px",
                transform: popoverPos ? undefined : "translate(-50%, -50%)",
                zIndex: 120,
              }}
              className="bg-[#141715] border border-[#2D332F] rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-[#C8A96B]/20"
            >
              {renderCalendarContent()}
            </div>
          </>
        ),
        document.body
      )}
    </div>
  )
}
