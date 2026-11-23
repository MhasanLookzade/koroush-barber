"use client"

import { useState, useEffect } from "react"
import { Calendar, Check, X, ChevronDown } from "lucide-react"
import { toPersianDigits } from "@/lib/jalali"

interface JalaliBirthDatePickerProps {
  value?: string // e.g. "1370/05/20"
  onChange: (value: string | null) => void
  label?: string
}

const PERSIAN_MONTHS = [
  { value: "01", name: "فروردین" },
  { value: "02", name: "اردیبهشت" },
  { value: "03", name: "خرداد" },
  { value: "04", name: "تیر" },
  { value: "05", name: "مرداد" },
  { value: "06", name: "شهریور" },
  { value: "07", name: "مهر" },
  { value: "08", name: "آبان" },
  { value: "09", name: "آذر" },
  { value: "10", name: "دی" },
  { value: "11", name: "بهمن" },
  { value: "12", name: "اسفند" },
]

export function JalaliBirthDatePicker({
  value,
  onChange,
  label = "تاریخ تولد (اختیاری)",
}: JalaliBirthDatePickerProps) {
  const [year, setYear] = useState<string>("")
  const [month, setMonth] = useState<string>("")
  const [day, setDay] = useState<string>("")

  // Generate years from 1320 to 1395 (realistic range: 10 to 85 years old)
  const currentJalaliYear = 1405
  const years = Array.from({ length: 80 }, (_, i) => String(currentJalaliYear - 10 - i))

  // Days dynamically based on month: 1-6: 31 days, 7-11: 30 days, 12: 29 days
  const getDaysCount = (m: string) => {
    const monthNum = parseInt(m, 10)
    if (!monthNum) return 31
    if (monthNum <= 6) return 31
    if (monthNum <= 11) return 30
    return 29
  }

  const daysCount = getDaysCount(month)
  const days = Array.from({ length: daysCount }, (_, i) => {
    const d = i + 1
    return d < 10 ? `0${d}` : String(d)
  })

  // Initialize from value if present
  useEffect(() => {
    if (value && value.includes("/")) {
      const parts = value.split("/")
      if (parts.length === 3) {
        setYear(parts[0])
        setMonth(parts[1])
        setDay(parts[2])
      }
    }
  }, [value])

  // Propagate change
  useEffect(() => {
    if (year && month && day) {
      onChange(`${year}/${month}/${day}`)
    } else {
      onChange(null)
    }
  }, [year, month, day, onChange])

  const handleClear = () => {
    setYear("")
    setMonth("")
    setDay("")
    onChange(null)
  }

  return (
    <div className="space-y-2 text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#C5BDB2] flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#C8A96B]" />
          <span>{label}</span>
          <span className="text-[10px] text-[#8C8477] font-normal">(برای دریافت تخفیف روز تولد)</span>
        </label>
        {(year || month || day) && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] text-[#A89E90] hover:text-[#E4C88E] flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            <span>پاک کردن</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* Year Select */}
        <div className="relative">
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full pr-2.5 pl-6 py-2.5 rounded-xl bg-[#101311] border border-[#2B332F] text-xs sm:text-sm text-[#F7F4EE] focus:outline-none focus:border-[#C8A96B] appearance-none cursor-pointer min-h-[44px]"
            aria-label="سال تولد"
          >
            <option value="" className="bg-[#141715] text-[#8C8477]">
              سال
            </option>
            {years.map((y) => (
              <option key={y} value={y} className="bg-[#141715] text-[#F7F4EE]">
                {toPersianDigits(y)}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C8477] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Month Select */}
        <div className="relative">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full pr-2.5 pl-6 py-2.5 rounded-xl bg-[#101311] border border-[#2B332F] text-xs sm:text-sm text-[#F7F4EE] focus:outline-none focus:border-[#C8A96B] appearance-none cursor-pointer min-h-[44px]"
            aria-label="ماه تولد"
          >
            <option value="" className="bg-[#141715] text-[#8C8477]">
              ماه
            </option>
            {PERSIAN_MONTHS.map((m) => (
              <option key={m.value} value={m.value} className="bg-[#141715] text-[#F7F4EE]">
                {m.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C8477] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Day Select */}
        <div className="relative">
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-full pr-2.5 pl-6 py-2.5 rounded-xl bg-[#101311] border border-[#2B332F] text-xs sm:text-sm text-[#F7F4EE] focus:outline-none focus:border-[#C8A96B] appearance-none cursor-pointer min-h-[44px]"
            aria-label="روز تولد"
          >
            <option value="" className="bg-[#141715] text-[#8C8477]">
              روز
            </option>
            {days.map((d) => (
              <option key={d} value={d} className="bg-[#141715] text-[#F7F4EE]">
                {toPersianDigits(d)}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C8477] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>
  )
}
