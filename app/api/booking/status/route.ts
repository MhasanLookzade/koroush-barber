import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { normalizeIranianPhone, isValidIranianPhone } from "@/lib/providers/sms"
import { formatJalaliFull, getTehranTimeString } from "@/lib/jalali"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get("phone")
    const trackingCode = searchParams.get("trackingCode")

    if (!phone && !trackingCode) {
      return NextResponse.json(
        { error: "شماره موبایل یا کد پیگیری نوبت را وارد نمایید" },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = {}
    if (trackingCode) {
      where.trackingCode = trackingCode.trim().toUpperCase()
    } else if (phone && isValidIranianPhone(phone)) {
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
