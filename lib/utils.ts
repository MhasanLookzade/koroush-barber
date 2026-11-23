import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { toPersianDigits, formatToman, formatJalaliFull, formatJalaliShort, getJalaliDate } from "./jalali"
import { normalizeIranianPhone } from "./providers/sms"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export { toPersianDigits, formatToman, formatJalaliFull, formatJalaliShort, getJalaliDate }

export function normalizePhoneNumber(phone: string): string {
  return normalizeIranianPhone(phone)
}

/**
 * Format price in Tomans with Persian digits
 */
export function formatPrice(price: number): string {
  return formatToman(price, true)
}

/**
 * Format Date to Persian Jalali string
 */
export function formatDate(date: Date | string): string {
  return formatJalaliShort(date)
}

/**
 * Format time to Tehran time string "HH:MM" with Persian digits
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const timeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
  return toPersianDigits(timeStr)
}

export function formatDateTime(date: Date | string): string {
  return formatJalaliFull(date)
}

export function formatTimeRange(start: string, end: string): string {
  return `${toPersianDigits(start)} تا ${toPersianDigits(end)}`
}

export function getPersianDayName(date: Date): string {
  const days = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"]
  return days[date.getDay()]
}

export function generateTimeSlotRanges(
  startHour: number = 10,
  endHour: number = 23,
  intervalMinutes: number = 60
): { start: string; end: string; label: string }[] {
  const slots: { start: string; end: string; label: string }[] = []
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const start = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      const endH = hour + Math.floor((minute + intervalMinutes) / 60)
      const endM = (minute + intervalMinutes) % 60
      const end = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`
      const label = formatTimeRange(start, end)
      slots.push({ start, end, label })
    }
  }
  return slots
}

export function isTimeSlotAvailable(
  bookedSlots: string[],
  _selectedDate: Date,
  slot: string
): boolean {
  return !bookedSlots.includes(slot)
}
