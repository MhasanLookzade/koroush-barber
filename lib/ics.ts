/**
 * Koroush Barber — Standard iCalendar (.ics) Generator
 * Allows customer to easily add appointment to Google Calendar, Apple Calendar, Outlook
 */

export function generateAppointmentIcs(params: {
  trackingCode: string
  serviceName: string
  barberName: string
  startDate: Date
  endDate: Date
  salonAddress?: string
  salonPhone?: string
}): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  const formatIcsDate = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`

  const now = new Date()
  const uid = `${params.trackingCode}@kouroshbarber.ir`
  const dtstamp = formatIcsDate(now)
  const dtstart = formatIcsDate(params.startDate)
  const dtend = formatIcsDate(params.endDate)

  const address = params.salonAddress || "تهران، زعفرانیه، خیابان مقدس اردبیلی، پلاک ۲۴"
  const phone = params.salonPhone || "02122334455"
  const summary = `نوبت آرایشگاه کوروش - ${params.serviceName}`
  const description = `نوبت رزرو شده شما در آرایشگاه کوروش باربر\\nخدمت: ${params.serviceName}\\nآرایشگر: ${params.barberName}\\nکد پیگیری: ${params.trackingCode}\\nتلفن: ${phone}`

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Koroush Barber//Booking App//FA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${address}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:یادآوری نوبت کوروش باربر`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
}
