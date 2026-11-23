"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar, Sun } from "lucide-react"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isSameDay, isBefore } from "date-fns"
import { faIR } from "date-fns/locale"
import { getPersianDayName, formatDate, toPersianDigits } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  selectedDate: Date | null
  onDateChange: (date: Date) => void
  disabledDates?: Date[]
  minDate?: Date
  maxDate?: Date
}

// 2-3 character Persian weekday abbreviations
const persianWeekdayAbbr = ["ش", "ی", "د", "س", "چ", "پ", "ج"]
const persianWeekdayFull = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"]

export function DatePicker({
  selectedDate,
  onDateChange,
  disabledDates = [],
  minDate = new Date(),
  maxDate,
}: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [weeks, setWeeks] = useState<Date[][]>([])

  useEffect(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { locale: faIR })
    const calendarEnd = endOfWeek(monthEnd, { locale: faIR })

    const days: Date[] = []
    let day = calendarStart
    while (day <= calendarEnd) {
      days.push(day)
      day = new Date(day)
      day.setDate(day.getDate() + 1)
    }

    const weeksArray: Date[][] = []
    for (let i = 0; i < days.length; i += 7) {
      weeksArray.push(days.slice(i, i + 7))
    }
    setWeeks(weeksArray)
  }, [currentMonth])

  const isDisabled = (date: Date) => {
    if (isBefore(date, minDate)) return true
    if (maxDate && isBefore(maxDate, date)) return true
    return disabledDates.some(d => isSameDay(d, date))
  }

  const isSelected = (date: Date) => selectedDate && isSameDay(date, selectedDate)
  const isCurrentMonth = (date: Date) => isSameMonth(date, currentMonth)
  const isToday = (date: Date) => isSameDay(date, new Date())

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const handleToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    if (!isDisabled(today)) {
      onDateChange(today)
    }
  }

  const persianMonthYear = format(currentMonth, "MMMM yyyy", { locale: faIR })
  const today = new Date()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevMonth}
          className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary transition-colors"
          aria-label="ماه قبل"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-3" aria-live="polite" aria-atomic="true">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="text-right">
            <span className="font-heading font-semibold text-lg text-foreground">{persianMonthYear}</span>
            <div className="text-xs text-muted-foreground">
              {currentMonth.getFullYear() + 621} سال
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary transition-colors"
          aria-label="ماه بعد"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Today Button */}
      <Button
        variant="luxury-outline"
        size="sm"
        onClick={handleToday}
        className="w-full gap-2 justify-center text-muted-foreground hover:text-primary hover:border-primary/50"
        disabled={isDisabled(today) || isSameMonth(today, currentMonth)}
        aria-label={`برو به امروز، ${format(today, "d MMMM", { locale: faIR })}`}
      >
        <Sun className="h-4 w-4" aria-hidden="true" />
        <span>امروز</span>
      </Button>

      {/* Calendar Grid with ARIA roles */}
      <div role="grid" aria-label="تقویم شمسی" aria-readonly="true">
        {/* Weekday Headers - 2-3 character abbreviations */}
        <div role="row" className="grid grid-cols-7 gap-1">
          {persianWeekdayFull.map((day, index) => (
            <div
              key={day}
              role="columnheader"
              className={cn(
                "text-center py-2 text-xs font-medium",
                index === 6 ? "text-red-500" : "text-muted-foreground"
              )}
              aria-label={day}
              title={day} // Tooltip shows full name on hover
            >
              {persianWeekdayAbbr[index]}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div role="rowgroup" className="grid grid-cols-7 gap-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} role="row" className="contents">
              {week.map((day, dayIndex) => {
                const disabled = isDisabled(day)
                const currentMonthDay = isCurrentMonth(day)
                const selected = !!isSelected(day)
                const todayDay = isToday(day)

                return (
                  <button
                    key={dayIndex}
                    type="button"
                    role="gridcell"
                    className={cn(
                      "h-11 w-11 text-sm rounded-xl font-medium transition-all duration-200 flex items-center justify-center",
                      !currentMonthDay && "text-muted-foreground/40",
                      disabled && "opacity-20 cursor-not-allowed",
                      todayDay && !selected && "relative ring-2 ring-primary/50",
                      selected && "bg-primary text-primary-foreground shadow-lg scale-105",
                      "hover:scale-105 hover:shadow-md"
                    )}
                    disabled={disabled}
                    onClick={() => !disabled && onDateChange(day)}
                    aria-label={format(day, "EEEE d MMMM", { locale: faIR })}
                    aria-selected={selected}
                    aria-disabled={disabled}
                    aria-current={todayDay && !selected ? "date" : undefined}
                  >
                    <span className="relative z-10">
                      {toPersianDigits(format(day, "d", { locale: faIR }))}
                    </span>
                    {todayDay && !selected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Date Display */}
      {selectedDate && (
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 text-center animate-in slide-in-from-bottom-2" role="status" aria-live="polite">
          <div className="flex items-center justify-center gap-2 text-primary mb-1">
            <Calendar className="h-5 w-5" aria-hidden="true" />
            <span className="font-medium">تاریخ انتخاب شده:</span>
          </div>
          <p className="font-heading text-lg text-foreground">
            {getPersianDayName(selectedDate)}، {formatDate(selectedDate)}
          </p>
        </div>
      )}
    </div>
  )
}