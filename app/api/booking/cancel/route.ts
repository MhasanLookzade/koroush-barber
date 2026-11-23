import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { normalizeIranianPhone } from "@/lib/providers/sms"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trackingCode, phone, reason } = body

    if (!trackingCode || !phone) {
      return NextResponse.json(
        { error: "کد پیگیری و شماره موبایل الزامی است" },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizeIranianPhone(phone)
    const appointment = await prisma.appointment.findFirst({
      where: {
        trackingCode: trackingCode.trim().toUpperCase(),
        customerPhone: normalizedPhone,
      },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: "نوبتی با این مشخصات یافت نشد" },
        { status: 404 }
      )
    }

    if (appointment.status === "CANCELLED") {
      return NextResponse.json(
        { error: "این نوبت قبلاً لغو شده است" },
        { status: 400 }
      )
    }

    if (appointment.status === "COMPLETED") {
      return NextResponse.json(
        { error: "امکان لغو نوبت تکمیل‌شده وجود ندارد" },
        { status: 400 }
      )
    }

    // Check salon cutoff horizon setting (default 12 hours)
    const cutoffSetting = await prisma.siteSetting.findUnique({
      where: { key: "cancellation_cutoff_hours" },
    })
    const cutoffHours = cutoffSetting ? parseInt(cutoffSetting.value, 10) : 12
    const cutoffMs = cutoffHours * 60 * 60 * 1000

    const now = new Date().getTime()
    const appointmentTime = new Date(appointment.date).getTime()

    if (appointmentTime - now < cutoffMs) {
      return NextResponse.json(
        {
          error: `طبق قوانین سالن، امکان لغو نوبت کمتر از ${cutoffHours} ساعت مانده به زمان مراجعه وجود ندارد. لطفاً با پذیرش تماس بگیرید.`,
        },
        { status: 400 }
      )
    }

    await prisma.$transaction([
      prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: "CANCELLED",
          cancellationReason: reason || "لغو توسط مشتری",
          cancelledAt: new Date(),
        },
      }),
      prisma.slotHold.updateMany({
        where: {
          barberId: appointment.barberId,
          slotTime: appointment.date,
          status: "ACTIVE",
        },
        data: { status: "RELEASED" },
      }),
      prisma.auditLog.create({
        data: {
          action: "CUSTOMER_CANCELLED_BOOKING",
          entity: "Appointment",
          entityId: appointment.id,
          details: JSON.stringify({ trackingCode, phone: normalizedPhone, reason }),
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: "نوبت شما با موفقیت لغو شد و بازه زمانی آزاد گردید.",
    })
  } catch (error) {
    console.error("Cancellation error:", error)
    return NextResponse.json(
      { error: "خطا در لغو نوبت" },
      { status: 500 }
    )
  }
}
