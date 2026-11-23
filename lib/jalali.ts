/**
 * Koroush Barber — Jalali (Solar Hijri / Shamsi) Calendar & Formatting Engine
 * Complete self-contained algorithmic conversion between Gregorian and Jalali.
 * Authoritative timezone: Asia/Tehran
 */

export const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
]

export const PERSIAN_WEEKDAYS = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنج‌شنبه",
  "جمعه",
  "شنبه",
]

export const PERSIAN_WEEKDAYS_SHORT = [
  "یک",
  "دو",
  "سه",
  "چهار",
  "پنج",
  "جمعه",
  "شنبه",
]

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]

/**
 * Convert any string/number containing Latin digits to Persian digits
 */
export function toPersianDigits(input: string | number): string {
  if (input === null || input === undefined) return ""
  return input.toString().replace(/\d/g, (d) => PERSIAN_DIGITS[parseInt(d, 10)])
}

/**
 * Convert Persian/Arabic digits to Latin digits
 */
export function toLatinDigits(input: string): string {
  if (!input) return ""
  return input
    .replace(/[۰-۹]/g, (d) => (d.charCodeAt(0) - 1776).toString())
    .replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString())
}

/**
 * Format currency amount in Tomans with Persian digits and separator
 */
export function formatToman(amount: number, includeUnit: boolean = true): string {
  const formatted = new Intl.NumberFormat("en-US").format(Math.round(amount))
  const persianFormatted = toPersianDigits(formatted)
  return includeUnit ? `${persianFormatted} تومان` : persianFormatted
}

/**
 * Algorithmic conversion: Gregorian to Jalali
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  let gy2 = gm > 2 ? gy + 1 : gy
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1]
  let jy = -1595 + 33 * Math.floor(days / 12053)
  days %= 12053
  jy += 4 * Math.floor(days / 1461)
  days %= 1461
  if (days > 365) {
    jy += Math.floor((days - 1) / 365)
    days = (days - 1) % 365
  }
  let jm: number
  let jd: number
  if (days < 186) {
    jm = 1 + Math.floor(days / 31)
    jd = 1 + (days % 31)
  } else {
    jm = 7 + Math.floor((days - 186) / 30)
    jd = 1 + ((days - 186) % 30)
  }
  return [jy, jm, jd]
}

/**
 * Algorithmic conversion: Jalali to Gregorian
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  jy = jy - 979
  jm = jm - 1
  jd = jd - 1

  let j_day_no = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4)
  for (let i = 0; i < jm; ++i) {
    j_day_no += i < 6 ? 31 : 30
  }
  j_day_no += jd

  let g_day_no = j_day_no + 79

  let gy = 1600 + 400 * Math.floor(g_day_no / 146097) /* 146097 = 365*400 + 400/4 - 400/100 + 400/400 */
  g_day_no = g_day_no % 146097

  let leap = true
  if (g_day_no >= 36525) {
    /* 36525 = 365*100 + 100/4 */
    g_day_no--
    gy += 100 * Math.floor(g_day_no / 36524) /* 36524 = 365*100 + 100/4 - 100/100 */
    g_day_no = g_day_no % 36524

    if (g_day_no >= 365) {
      g_day_no++
    } else {
      leap = false
    }
  }

  gy += 4 * Math.floor(g_day_no / 1461) /* 1461 = 365*4 + 4/4 */
  g_day_no %= 1461

  if (g_day_no >= 366) {
    leap = false
    g_day_no--
    gy += Math.floor(g_day_no / 365)
    g_day_no = g_day_no % 365
  }

  const g_d_m = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let gm = 0
  while (gm < 12 && g_day_no >= g_d_m[gm + 1]) {
    g_day_no -= g_d_m[gm + 1]
    gm++
  }
  gm++
  let gd = g_day_no + 1

  return [gy, gm, gd]
}

/**
 * Get Jalali representation of a Date object (in Asia/Tehran time)
 */
export function getJalaliDate(date: Date = new Date()): {
  year: number
  month: number
  day: number
  monthName: string
  dayName: string
  formattedDate: string
} {
  // Convert date to Asia/Tehran time string
  const tehranParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "long",
  }).formatToParts(date)

  let gy = 0, gm = 0, gd = 0
  for (const part of tehranParts) {
    if (part.type === "year") gy = parseInt(part.value, 10)
    if (part.type === "month") gm = parseInt(part.value, 10)
    if (part.type === "day") gd = parseInt(part.value, 10)
  }

  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd)
  const dayName = PERSIAN_WEEKDAYS[date.getDay()]
  const monthName = PERSIAN_MONTHS[jm - 1]
  const formattedDate = `${toPersianDigits(jd)} ${monthName} ${toPersianDigits(jy)}`

  return {
    year: jy,
    month: jm,
    day: jd,
    monthName,
    dayName,
    formattedDate,
  }
}

/**
 * Format a Date or ISO string into full Persian date and time string
 * Example: "دوشنبه، ۳ آذر ۱۴۰۵ - ساعت ۱۶:۰۰"
 */
export function formatJalaliFull(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const j = getJalaliDate(d)
  
  // Format Tehran time
  const timeStr = new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)

  return `${j.dayName}، ${toPersianDigits(j.day)} ${j.monthName} ${toPersianDigits(j.year)} - ساعت ${timeStr}`
}

/**
 * Format date for calendar pill / selector
 * Example: "۳ آذر"
 */
export function formatJalaliShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const j = getJalaliDate(d)
  return `${toPersianDigits(j.day)} ${j.monthName}`
}

/**
 * Get date string YYYY-MM-DD in Asia/Tehran local calendar
 */
export function getTehranDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
  return parts // returns YYYY-MM-DD
}

/**
 * Create a UTC Date for a given Tehran local date and hour
 * e.g., dateStr="2026-11-24", timeStr="14:00" -> UTC Date
 */
export function createUtcFromTehranTime(dateStr: string, timeStr: string): Date {
  // Asia/Tehran is currently UTC+3:30 standard time
  const [year, month, day] = dateStr.split("-").map(Number)
  const [hour, minute] = timeStr.split(":").map(Number)

  // Use Intl to construct an exact UTC timestamp for Asia/Tehran
  const isoLocal = `${dateStr}T${timeStr.padStart(5, "0")}:00`
  // We can construct via a target offset or local Date:
  // In Node.js / V8, we can determine the exact UTC instant:
  // Tehran standard time is +03:30 (note Iran abolished daylight saving in 2022)
  const tehranOffsetMinutes = 210 // 3 hours 30 minutes
  const localEpoch = Date.UTC(year, month - 1, day, hour, minute)
  return new Date(localEpoch - tehranOffsetMinutes * 60 * 1000)
}

/**
 * Convert UTC Date to local Tehran time "HH:MM"
 */
export function getTehranTimeString(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
}

/**
 * Check if Jalali year is leap year (سال کبیسه جلالی)
 */
export function isJalaliLeapYear(jy: number): boolean {
  const [gy, gm, gd] = jalaliToGregorian(jy, 12, 30)
  const [backJy, backJm, backJd] = gregorianToJalali(gy, gm, gd)
  return backJy === jy && backJm === 12 && backJd === 30
}

/**
 * Get number of days in a Jalali month (1-6: 31, 7-11: 30, 12: 29 or 30)
 */
export function getJalaliMonthLength(jy: number, jm: number): number {
  if (jm >= 1 && jm <= 6) return 31
  if (jm >= 7 && jm <= 11) return 30
  if (jm === 12) return isJalaliLeapYear(jy) ? 30 : 29
  return 30
}

/**
 * Get day of week for the 1st day of a Jalali month
 * 0 = شنبه, 1 = یکشنبه, ..., 6 = جمعه
 */
export function getJalaliFirstDayOfWeek(jy: number, jm: number): number {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, 1)
  const d = new Date(Date.UTC(gy, gm - 1, gd))
  return (d.getUTCDay() + 1) % 7
}

/**
 * Convert Jalali year, month, day to Gregorian YYYY-MM-DD string
 */
export function jalaliToGregorianDateString(jy: number, jm: number, jd: number): string {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd)
  const yStr = gy.toString()
  const mStr = gm < 10 ? `0${gm}` : gm.toString()
  const dStr = gd < 10 ? `0${gd}` : gd.toString()
  return `${yStr}-${mStr}-${dStr}`
}

/**
 * Convert Gregorian YYYY-MM-DD string to Jalali YYYY/MM/DD string
 */
export function gregorianToJalaliDateString(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return ""
  const [gy, gm, gd] = dateStr.split("-").map(Number)
  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd)
  const mStr = jm < 10 ? `0${jm}` : jm.toString()
  const dStr = jd < 10 ? `0${jd}` : jd.toString()
  return `${jy}/${mStr}/${dStr}`
}

/**
 * Format a Date or date string to readable Jalali date only
 * e.g. "دوشنبه، ۳ آذر ۱۴۰۵"
 */
export function formatJalaliDateOnly(date: Date | string): string {
  if (!date) return ""
  let d: Date
  if (typeof date === "string") {
    if (date.includes("T")) {
      d = new Date(date)
    } else {
      const parts = date.split("-").map(Number)
      if (parts.length === 3) {
        d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0))
      } else {
        d = new Date(date)
      }
    }
  } else {
    d = date
  }
  const j = getJalaliDate(d)
  return `${j.dayName}، ${toPersianDigits(j.day)} ${j.monthName} ${toPersianDigits(j.year)}`
}

/**
 * Get Tehran date offset from today by days (e.g., 0 = today, 1 = tomorrow)
 */
export function getRelativeTehranDate(daysOffset: number = 0): {
  dateStr: string
  jalaliFormatted: string
  dayName: string
} {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  const dateStr = getTehranDateString(d)
  const j = getJalaliDate(d)
  return {
    dateStr,
    jalaliFormatted: `${j.dayName}، ${toPersianDigits(j.day)} ${j.monthName} ${toPersianDigits(j.year)}`,
    dayName: j.dayName,
  }
}

