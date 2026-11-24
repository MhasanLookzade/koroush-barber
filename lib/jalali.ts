/**
 * Koroush Barber — Jalali (Solar Hijri / Shamsi) Calendar & Formatting Engine
 * Complete self-contained algorithmic conversion between Gregorian and Jalali.
 * Authoritative timezone: Asia/Tehran
 */

export const APP_TIMEZONE = process.env.APP_TIMEZONE || process.env.NEXT_PUBLIC_APP_TIMEZONE || "Asia/Tehran"

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
  
  // Format local business time
  const timeStr = new Intl.DateTimeFormat("fa-IR", {
    timeZone: APP_TIMEZONE,
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
 * Calculate the timezone offset in minutes for a given date in a specific timezone.
 * Returns minutes ahead of UTC (e.g. +210 for Asia/Tehran UTC+03:30).
 */
export function getTimezoneOffsetMinutes(date: Date = new Date(), timeZone: string = APP_TIMEZONE): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    })
    const parts = formatter.formatToParts(date)
    let year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0
    for (const part of parts) {
      if (part.type === "year") year = parseInt(part.value, 10)
      if (part.type === "month") month = parseInt(part.value, 10)
      if (part.type === "day") day = parseInt(part.value, 10)
      if (part.type === "hour") hour = parseInt(part.value, 10)
      if (part.type === "minute") minute = parseInt(part.value, 10)
      if (part.type === "second") second = parseInt(part.value, 10)
    }
    const tzDateAsUtc = Date.UTC(year, month - 1, day, hour === 24 ? 0 : hour, minute, second)
    const utcDateAsUtc = date.getTime()
    return Math.round((tzDateAsUtc - utcDateAsUtc) / (60 * 1000))
  } catch {
    return 210 // Default fallback for Asia/Tehran UTC+3:30
  }
}

/**
 * Get date string YYYY-MM-DD in the business timezone (default Asia/Tehran)
 */
export function getAppDateString(date: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}
export const getTehranDateString = getAppDateString

/**
 * Convert UTC Date to local business time "HH:MM"
 */
export function getAppTimeString(date: Date, timeZone: string = APP_TIMEZONE): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date)
  } catch {
    return `${date.getUTCHours().toString().padStart(2, "0")}:${date.getUTCMinutes().toString().padStart(2, "0")}`
  }
}
export const getTehranTimeString = getAppTimeString

/**
 * Create a UTC Date for a given local date and hour in the business timezone
 * e.g., dateStr="2026-11-24", timeStr="14:00" -> UTC Date
 */
export function createUtcFromAppTime(dateStr: string, timeStr: string, timeZone: string = APP_TIMEZONE): Date {
  const [year, month, day] = dateStr.split("-").map(Number)
  const [hour, minute] = timeStr.split(":").map(Number)
  const localEpoch = Date.UTC(year, month - 1, day, hour, minute)
  // Calculate dynamic offset for the approximate instant
  const approxDate = new Date(localEpoch - 210 * 60 * 1000)
  const offsetMinutes = getTimezoneOffsetMinutes(approxDate, timeZone)
  return new Date(localEpoch - offsetMinutes * 60 * 1000)
}
export const createUtcFromTehranTime = createUtcFromAppTime

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

export interface JalaliWeekDay {
  dateStr: string // "YYYY-MM-DD"
  dayName: string // "شنبه", "یکشنبه", ...
  dayNumber: number // Jalali day, e.g. 7
  monthName: string // "آذر", ...
  year: number // 1405
  formattedShort: string // "۷ آذر"
  formattedFull: string // "شنبه، ۷ آذر ۱۴۰۵"
  isToday: boolean
  dayIndex: number // 0 to 6 (0 = شنبه, 6 = جمعه)
}

export interface JalaliWeekInfo {
  weekDays: JalaliWeekDay[]
  startFormatted: string
  endFormatted: string
  weekTitle: string
  saturdayDateStr: string
  fridayDateStr: string
}

/**
 * Calculate the authoritative 7 days of the Jalali week (Saturday through Friday)
 * for any given date and week offset.
 */
export function getJalaliWeekDays(baseDateStr?: string, weekOffset: number = 0): JalaliWeekInfo {
  const todayTehran = getTehranDateString()
  const referenceDateStr = baseDateStr && /^\d{4}-\d{2}-\d{2}$/.test(baseDateStr)
    ? baseDateStr
    : todayTehran

  const [y, m, d] = referenceDateStr.split("-").map(Number)
  const baseDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))

  // In JavaScript: 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  const dayOfWeek = baseDate.getUTCDay()
  // In Iran, week starts on Saturday.
  const daysSinceSaturday = (dayOfWeek + 1) % 7

  const saturdayDate = new Date(baseDate)
  saturdayDate.setUTCDate(saturdayDate.getUTCDate() - daysSinceSaturday + weekOffset * 7)

  const persianDayNames = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"]
  const weekDays: JalaliWeekDay[] = []

  for (let i = 0; i < 7; i++) {
    const current = new Date(saturdayDate)
    current.setUTCDate(current.getUTCDate() + i)
    const iso = current.toISOString().slice(0, 10)
    const [cy, cm, cd] = iso.split("-").map(Number)
    const [jy, jm, jd] = gregorianToJalali(cy, cm, cd)
    const monthName = PERSIAN_MONTHS[jm - 1]
    const dayName = persianDayNames[i]

    weekDays.push({
      dateStr: iso,
      dayName,
      dayNumber: jd,
      monthName,
      year: jy,
      formattedShort: `${toPersianDigits(jd)} ${monthName}`,
      formattedFull: `${dayName}، ${toPersianDigits(jd)} ${monthName} ${toPersianDigits(jy)}`,
      isToday: iso === todayTehran,
      dayIndex: i,
    })
  }

  const firstDay = weekDays[0]
  const lastDay = weekDays[6]
  const startFormatted = `${toPersianDigits(firstDay.dayNumber)} ${firstDay.monthName}`
  const endFormatted = `${toPersianDigits(lastDay.dayNumber)} ${lastDay.monthName}`
  const weekTitle = `هفته ${startFormatted} الی ${endFormatted} ${toPersianDigits(lastDay.year)}`

  return {
    weekDays,
    startFormatted,
    endFormatted,
    weekTitle,
    saturdayDateStr: firstDay.dateStr,
    fridayDateStr: lastDay.dateStr,
  }
}


