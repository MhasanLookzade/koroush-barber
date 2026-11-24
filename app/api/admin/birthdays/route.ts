import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authorizeAdmin } from "@/lib/admin-auth"
import { getJalaliDate, getTehranDateString, isJalaliLeapYear, PERSIAN_MONTHS, toPersianDigits } from "@/lib/jalali"
import { getSmsProvider } from "@/lib/providers/sms"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)
    const todayJalali = getJalaliDate(new Date())
    const selectedMonth = parseInt(searchParams.get("month") || String(todayJalali.month), 10)
    const currentYear = todayJalali.year
    const isLeap = isJalaliLeapYear(currentYear)

    // Fetch all customers
    const allCustomers = await prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
        birthDate: true,
        smsConsent: true,
        createdAt: true,
      },
    })

    const withoutBirthdateCount = allCustomers.filter((c) => !c.birthDate).length

    // Check sent birthday messages this Jalali year to prevent duplicates
    const sentBirthdayJobs = await prisma.notificationJob.findMany({
      where: {
        type: "BIRTHDAY",
        createdAt: {
          gte: new Date(new Date().getFullYear(), 0, 1),
        },
      },
      select: { phone: true, status: true, sentAt: true },
    })
    const sentPhonesSet = new Set(sentBirthdayJobs.map((j) => j.phone))

    const monthCustomers: Array<{
      id: string
      name: string
      phone: string
      birthDate: string
      birthYear: number
      birthMonth: number
      birthDay: number
      effectiveDay: number
      daysUntil: number
      isToday: boolean
      isPassed: boolean
      smsConsent: boolean
      alreadySentThisYear: boolean
    }> = []

    for (const c of allCustomers) {
      if (!c.birthDate) continue

      // Parse Jalali format: YYYY/MM/DD or YYYY-MM-DD
      const parts = c.birthDate.replace(/-/g, "/").split("/")
      if (parts.length !== 3) continue

      const bYear = parseInt(parts[0], 10)
      const bMonth = parseInt(parts[1], 10)
      const bDay = parseInt(parts[2], 10)

      if (bMonth !== selectedMonth) continue

      // Esfand 30 rule: If non-leap year and customer born on Esfand 30, celebrate on Esfand 29
      let effectiveDay = bDay
      if (bMonth === 12 && bDay === 30 && !isLeap) {
        effectiveDay = 29
      }

      let daysUntil = 0
      let isToday = false
      let isPassed = false

      if (selectedMonth === todayJalali.month) {
        if (effectiveDay === todayJalali.day) {
          isToday = true
          daysUntil = 0
        } else if (effectiveDay > todayJalali.day) {
          daysUntil = effectiveDay - todayJalali.day
        } else {
          isPassed = true
          daysUntil = -1
        }
      } else if (selectedMonth > todayJalali.month) {
        // Future month this year
        daysUntil = (selectedMonth - todayJalali.month) * 30 + effectiveDay - todayJalali.day
      } else {
        // Passed month this year
        isPassed = true
        daysUntil = -1
      }

      monthCustomers.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        birthDate: c.birthDate,
        birthYear: bYear,
        birthMonth: bMonth,
        birthDay: bDay,
        effectiveDay,
        daysUntil,
        isToday,
        isPassed,
        smsConsent: c.smsConsent ?? true,
        alreadySentThisYear: sentPhonesSet.has(c.phone),
      })
    }

    // Sort: today's birthdays first, then upcoming by daysUntil, then passed
    monthCustomers.sort((a, b) => {
      if (a.isToday && !b.isToday) return -1
      if (!a.isToday && b.isToday) return 1
      if (!a.isPassed && b.isPassed) return -1
      if (a.isPassed && !b.isPassed) return 1
      return a.effectiveDay - b.effectiveDay
    })

    const todayCount = monthCustomers.filter((c) => c.isToday).length
    const upcomingCount = monthCustomers.filter((c) => !c.isPassed && !c.isToday).length
    const passedCount = monthCustomers.filter((c) => c.isPassed).length

    return NextResponse.json({
      currentJalali: {
        year: todayJalali.year,
        month: todayJalali.month,
        day: todayJalali.day,
        monthName: todayJalali.monthName,
        isLeap,
      },
      selectedMonth,
      selectedMonthName: PERSIAN_MONTHS[selectedMonth - 1],
      stats: {
        totalThisMonth: monthCustomers.length,
        todayCount,
        upcomingCount,
        passedCount,
        withoutBirthdateCount,
      },
      customers: monthCustomers,
    })
  } catch (error) {
    console.error("Birthdays API error:", error)
    return NextResponse.json({ error: "خطا در دریافت اطلاعات تولد مراجعین" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const { customerId, customerIds, customTemplate } = body

    const targetIds: string[] = customerIds || (customerId ? [customerId] : [])
    if (targetIds.length === 0) {
      return NextResponse.json({ error: "حداقل یک مشتری باید انتخاب شود" }, { status: 400 })
    }

    const customers = await prisma.customer.findMany({
      where: { id: { in: targetIds } },
    })

    const sms = getSmsProvider()
    const results = []

    for (const customer of customers) {
      if (!customer.smsConsent) {
        results.push({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          status: "SKIPPED_NO_CONSENT",
          message: "مشتری دریافت پیامک تبلیغاتی/مناسبتی را غیرفعال کرده است",
        })
        continue
      }

      // Check duplicate within the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const existingSent = await prisma.notificationJob.findFirst({
        where: {
          phone: customer.phone,
          type: "BIRTHDAY",
          createdAt: { gte: thirtyDaysAgo },
        },
      })

      if (existingSent) {
        results.push({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          status: "SKIPPED_DUPLICATE",
          message: "پیامک تبریک تولد در ۳۰ روز گذشته برای این شماره ارسال شده است",
        })
        continue
      }

      const greetingText =
        customTemplate ||
        `کوروش باربر\n${customer.name ? `${customer.name} عزیز، ` : ""}تولدت مبارک! 🎉\nامیدواریم سال جدید زندگیت پر از اتفاق‌های خوب، سلامتی و موفقیت باشه.\nخوشحالیم که همراه کوروش باربر هستی.`

      const sendRes = await sms.sendBirthdayGreeting(customer.phone, customer.name)

      await prisma.notificationJob.create({
        data: {
          phone: customer.phone,
          recipientName: customer.name,
          type: "BIRTHDAY",
          message: greetingText,
          status: sendRes.success ? "SENT" : "FAILED",
          error: sendRes.error || null,
          provider: sms.name,
          sentAt: sendRes.success ? new Date() : null,
        },
      })

      results.push({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        status: sendRes.success ? "SENT" : "FAILED",
        error: sendRes.error,
      })
    }

    return NextResponse.json({
      success: true,
      totalRequested: targetIds.length,
      results,
    })
  } catch (error) {
    console.error("Birthday send SMS error:", error)
    return NextResponse.json({ error: "خطا در ارسال پیامک تبریک تولد" }, { status: 500 })
  }
}
