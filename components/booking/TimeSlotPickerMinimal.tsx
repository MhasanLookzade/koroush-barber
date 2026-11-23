"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle, XCircle, Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { generateTimeSlotRanges, isTimeSlotAvailable, toPersianDigits } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface TimeSlotPickerProps {
  selectedTime: string | null
  onTimeSelect: (time: string) => void
  bookedSlots: string[]
  selectedDate: Date
  barberWorkingHours?: { startTime: string; endTime: string } | null
}

export function TimeSlotPickerMinimal({
  selectedTime,
  onTimeSelect,
  bookedSlots,
  selectedDate,
  barberWorkingHours,
}: TimeSlotPickerProps) {
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null)

  const timeSlotRanges = barberWorkingHours
    ? generateTimeSlotRanges(
        parseInt(barberWorkingHours.startTime.split(':')[0]),
        parseInt(barberWorkingHours.endTime.split(':')[0]),
        60
      )
    : generateTimeSlotRanges(9, 21, 60)

  // Check if a 1-hour slot is booked (either the start time is booked OR the slot overlaps with a booked appointment)
  const isSlotBooked = (slotStart: string) => {
    // Check if this exact start time is booked
    if (bookedSlots.includes(slotStart)) return true
    // Also check if any booked slot falls within this 1-hour range
    const slotStartHour = parseInt(slotStart.split(':')[0])
    const slotEndHour = slotStartHour + 1
    return bookedSlots.some(booked => {
      const bookedHour = parseInt(booked.split(':')[0])
      return bookedHour >= slotStartHour && bookedHour < slotEndHour
    })
  }

  const availableSlots = timeSlotRanges.filter((slot: { start: string; end: string; label: string }) =>
    isTimeSlotAvailable(bookedSlots, selectedDate, slot.start)
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) return
      if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return

      const currentIndex = buttonRefs.current.findIndex(ref => ref === document.activeElement)
      if (currentIndex === -1) return

      e.preventDefault()
      let nextIndex = currentIndex

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          nextIndex = (currentIndex + 1) % availableSlots.length
          break
        case "ArrowLeft":
        case "ArrowUp":
          nextIndex = (currentIndex - 1 + availableSlots.length) % availableSlots.length
          break
        case "Home":
          nextIndex = 0
          break
        case "End":
          nextIndex = availableSlots.length - 1
          break
      }

      buttonRefs.current[nextIndex]?.focus()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [availableSlots.length])

  if (availableSlots.length === 0) {
    return (
      <Card className="border-dashed border-muted/50">
        <CardContent className="py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mx-auto mb-4">
            <Clock className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-medium text-foreground mb-1">هیچ بازه زمانی در دسترس نیست</p>
          <p className="text-sm text-muted-foreground">لطفاً روز دیگری را انتخاب کنید</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4" ref={containerRef} role="radiogroup" aria-label="انتخاب ساعت نوبت" aria-required="true">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" aria-hidden="true" />
          <span>{availableSlots.length} بازه یک‌ساعته در دسترس</span>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" aria-hidden="true" />
          ۶۰ دقیقه هر نوبت
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2" role="presentation">
        {timeSlotRanges.map((slotRange: { start: string; end: string; label: string }, index: number) => {
          const isBooked = isSlotBooked(slotRange.start)
          const isAvailable = !isBooked
          const isSelected = selectedTime === slotRange.start

          return (
            <Button
              key={slotRange.start}
              ref={(el) => { if (isAvailable) buttonRefs.current[index] = el }}
              type="button"
              role={isAvailable ? "radio" : "button"}
              variant={isSelected ? "default" : isBooked ? "outline" : "outline"}
              size="sm"
              className={cn(
                "h-12 font-medium transition-all duration-200 relative overflow-hidden min-w-[120px]",
                isSelected && "shadow-luxury hover:shadow-luxury-hover bg-primary text-primary-foreground border-primary",
                isBooked && "opacity-50 cursor-not-allowed border-destructive/30 text-destructive/50 hover:border-destructive/50",
                isAvailable && !isSelected && "hover:scale-105 hover:border-primary/50 hover:bg-primary/5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              )}
              onClick={() => isAvailable && onTimeSelect(slotRange.start)}
              disabled={isBooked}
              aria-label={slotRange.label}
              aria-checked={isSelected}
              aria-disabled={isBooked}
              tabIndex={isSelected ? 0 : isAvailable ? -1 : undefined}
              onMouseEnter={() => setHoveredSlot(slotRange.start)}
              onMouseLeave={() => setHoveredSlot(null)}
            >
              {isSelected ? (
                <>
                  <span className="absolute inset-0 bg-gradient-to-r from-primary to-[hsl(var(--color-gold-bright))] opacity-20" aria-hidden="true" />
                  <span className="relative flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    <span>{toPersianDigits(slotRange.label)}</span>
                  </span>
                </>
              ) : isBooked ? (
                <span className="relative flex items-center justify-center gap-1">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{toPersianDigits(slotRange.label)}</span>
                  <span className="text-[10px] bg-destructive/10 text-destructive px-1 rounded">رزرو شده</span>
                </span>
              ) : (
                <span className="relative flex items-center justify-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{toPersianDigits(slotRange.label)}</span>
                </span>
              )}
            </Button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-primary/20 border border-primary" />
          <span>انتخاب شده</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-transparent border border-destructive/30" />
          <span className="text-destructive/60">رزرو شده</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-transparent border border-border" />
          <span>در دسترس</span>
        </div>
      </div>
    </div>
  )
}