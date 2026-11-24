import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { normalizeIranianPhone, isValidIranianPhone } from "@/lib/providers/sms"
import { formatJalaliFull, getTehranTimeString } from "@/lib/jalali"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rate = checkRateLimit(`tracking_${ip}`, 30, 60000)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "تعداد درخواست‌های استعلام بیش از حد مجاز است. لطفاً یک دقیقه بعد تلاش نمایید." },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const phone = searchParams.get("phone")
    const trackingCode = searchParams.get("trackingCode")
    const otpToken = searchParams.get("otpToken")

    if (!phone && !trackingCode) {
      return NextResponse.json(
        { error: "کد پیگیری معتبر نوبت را وارد نمایید" },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = {}
    if (trackingCode) {
      where.trackingCode = trackingCode.trim().toUpperCase()
    } else if (phone && isValidIranianPhone(phone)) {
      // Prevent unauthenticated phone enumeration
      where.customerPhone = normalizeIranianPhone(phone)
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
      customerName: a.customerName,
      customerPhone: a.customerPhone,
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
