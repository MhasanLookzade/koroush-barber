"use client"

import { useState, useEffect, useRef } from "react"
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Clock,
  Sparkles,
  Check,
  X,
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
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
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

  // Today in Jalali
  const todayTehran = getTehranDateString()
  const todayJalali = getJalaliDate(new Date())

  // Select day
  const handleSelectDay = (dayNum: number) => {
    const gregDateStr = jalaliToGregorianDateString(viewYear, viewMonth, dayNum)
    onChange(gregDateStr)
    setIsOpen(false)
  }

  // Shortcuts
  const setToday = () => {
    onChange(todayTehran)
    setIsOpen(false)
  }

  const setTomorrow = () => {
    const tomorrow = getRelativeTehranDate(1)
    onChange(tomorrow.dateStr)
    setIsOpen(false)
  }

  const setNextDays = (days: number) => {
    const rel = getRelativeTehranDate(days)
    onChange(rel.dateStr)
    setIsOpen(false)
  }

  // Formatted display text
  const displayText = value ? formatJalaliDateOnly(value) : placeholder

  // Generate weekday headers in order: شنبه (0) to جمعه (6)
  const persianWeekdays = ["ش", "ی", "د", "س", "چ", "پ", "ج"]

  return (
    <div className={`relative ${className}`} dir="rtl" ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-[#A8A39A] block mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
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
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#1F2321] text-[#C8A96B] font-mono shrink-0">
          جلالی
        </span>
      </button>

      {/* Calendar Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-50 w-72 sm:w-80 bg-[#161917] border border-[#2D332F] rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Shortcuts Bar */}
          {showShortcuts && (
            <div className="grid grid-cols-3 gap-1.5 pb-3 mb-3 border-b border-[#2D332F]">
              <button
                type="button"
                onClick={setToday}
                className="py-1 px-2 rounded-lg bg-[#1F2321] hover:bg-[#C8A96B] hover:text-[#0D0F0E] text-[11px] font-medium text-[#F5F1E8] transition-colors text-center cursor-pointer min-h-[32px]"
              >
                امروز
              </button>
              <button
                type="button"
                onClick={setTomorrow}
                className="py-1 px-2 rounded-lg bg-[#1F2321] hover:bg-[#C8A96B] hover:text-[#0D0F0E] text-[11px] font-medium text-[#F5F1E8] transition-colors text-center cursor-pointer min-h-[32px]"
              >
                فردا
              </button>
              <button
                type="button"
                onClick={() => setNextDays(2)}
                className="py-1 px-2 rounded-lg bg-[#1F2321] hover:bg-[#C8A96B] hover:text-[#0D0F0E] text-[11px] font-medium text-[#F5F1E8] transition-colors text-center cursor-pointer min-h-[32px]"
              >
                پس‌فردا
              </button>
            </div>
          )}

          {/* Month / Year Header */}
          <div className="flex items-center justify-between pb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-lg bg-[#1F2321] hover:bg-[#2D332F] text-[#A8A39A] hover:text-[#F5F1E8] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="ماه قبل"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="text-center font-bold text-sm text-[#F5F1E8]">
              <span>{PERSIAN_MONTHS[viewMonth - 1]}</span>{" "}
              <span className="font-mono text-[#C8A96B]">{toPersianDigits(viewYear)}</span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-lg bg-[#1F2321] hover:bg-[#2D332F] text-[#A8A39A] hover:text-[#F5F1E8] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="ماه بعد"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels (ش، ی، د، س، چ، پ، ج) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {persianWeekdays.map((dayName, idx) => (
              <span
                key={dayName}
                className={`text-[11px] font-bold py-1 ${
                  idx === 6 ? "text-red-400" : "text-[#7D766A]"
                }`}
              >
                {dayName}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots before day 1 */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8 sm:h-9" />
            ))}

            {/* Days of current Jalali month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1
              const isSelected =
                viewYear === selectedJy && viewMonth === selectedJm && dayNum === selectedJd
              const isToday =
                viewYear === todayJalali.year &&
                viewMonth === todayJalali.month &&
                dayNum === todayJalali.day

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-8 sm:h-9 rounded-xl font-mono text-xs flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#C8A96B] text-[#0D0F0E] font-bold shadow-md scale-105"
                      : isToday
                      ? "bg-[#1F2321] text-[#E4C88E] border border-[#C8A96B]/50 font-bold"
                      : "text-[#F5F1E8] hover:bg-[#1F2321] hover:text-[#C8A96B]"
                  }`}
                >
                  {toPersianDigits(dayNum)}
                </button>
              )
            })}
          </div>

          {/* Footer date info */}
          <div className="pt-3 mt-3 border-t border-[#2D332F] flex items-center justify-between text-[11px] text-[#A8A39A]">
            <span>امروز: {todayJalali.dayName}، {toPersianDigits(todayJalali.day)} {todayJalali.monthName}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[#C8A96B] hover:underline cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
