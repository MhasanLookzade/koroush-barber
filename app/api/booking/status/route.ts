import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { normalizeIranianPhone, isValidIranianPhone } from "@/lib/providers/sms"
import { formatJalaliFull, getTehranTimeString } from "@/lib/jalali"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { maskPhone, maskCustomerName } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const isLocalhost = ip === "127.0.0.1" || ip === "::1" || ip === "localhost"
    const maxReqs = isLocalhost && process.env.NODE_ENV !== "production" ? 200 : 30
    const rate = checkRateLimit(`tracking_${ip}`, maxReqs, 60000)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "تعداد درخواست‌های استعلام بیش از حد مجاز است. لطفاً یک دقیقه بعد تلاش نمایید." },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const phone = searchParams.get("phone")
    const trackingCode = searchParams.get("trackingCode")

    if (!phone && !trackingCode) {
      return NextResponse.json(
        { error: "کد پیگیری معتبر نوبت را وارد نمایید" },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = {}
    let isOtpAuthenticated = false

    if (trackingCode) {
      const cleanCode = trackingCode.trim().toUpperCase()
      // Enforce strict tracking code pattern (e.g. KB-12345 or KB-CUTOFF-TEST)
      if (!/^KB-[A-Z0-9_-]{3,20}$/.test(cleanCode)) {
        return NextResponse.json(
          { error: "الگوی کد رهگیری نامعتبر است" },
          { status: 400 }
        )
      }
      where.trackingCode = cleanCode
    } else if (phone) {
      if (!isValidIranianPhone(phone)) {
        return NextResponse.json(
          { error: "شماره تلفن همراه نامعتبر است" },
          { status: 400 }
        )
      }
      const normalizedPhone = normalizeIranianPhone(phone)

      // Anti-enumeration protection: require verified OTP challenge within the last 20 minutes
      const verifiedChallenge = await prisma.otpChallenge.findFirst({
        where: {
          phone: normalizedPhone,
          verified: true,
          createdAt: { gte: new Date(Date.now() - 20 * 60 * 1000) },
        },
      })

      if (!verifiedChallenge) {
        return NextResponse.json(
          { error: "جهت مشاهده سوابق با شماره همراه، احراز هویت پیامکی (کد یک‌بار مصرف) الزامی است." },
          { status: 401 }
        )
      }

      isOtpAuthenticated = true
      where.customerPhone = normalizedPhone
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        service: true,
        barber: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { date: "desc" },
    })

    const formatted = appointments.map((a) => ({
      id: a.id,
      trackingCode: a.trackingCode,
      // Mask customer name if accessed purely by public tracking code (privacy protection)
      customerName: isOtpAuthenticated ? a.customerName : maskCustomerName(a.customerName),
      // Always mask phone number in responses to prevent scraping
      customerPhone: maskPhone(a.customerPhone),
      serviceName: a.service.name,
      barberName: a.barber.name,
      status: a.status,
      dateUtc: a.date.toISOString(),
      jalaliFull: formatJalaliFull(a.date),
      time: getTehranTimeString(a.date),
      totalPrice: a.totalPrice,
      depositPaid: a.depositPaid,
      balanceDue: a.balanceDue,
      isRemainderPaid: a.isRemainderPaid,
      paymentRefId: a.payments[0]?.refId || null,
      paymentAuthority: a.payments[0]?.authority || null,
      createdAt: a.createdAt.toISOString(),
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Status lookup error:", error)
    return NextResponse.json(
      { error: "خطا در استعلام وضعیت نوبت" },
      { status: 500 }
    )
  }
}
