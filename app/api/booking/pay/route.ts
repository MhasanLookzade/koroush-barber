import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getPaymentGateway } from "@/lib/providers/payment"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rate = checkRateLimit(`pay_${ip}`, 10, 60000)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "تعداد درخواست‌های پرداخت بیش از حد مجاز است. لطفاً کمی صبر فرمایید." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { appointmentId } = body

    if (!appointmentId) {
      return NextResponse.json(
        { error: "شناسه نوبت الزامی است" },
        { status: 400 }
      )
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { service: true, barber: true },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: "نوبت مورد نظر یافت نشد" },
        { status: 404 }
      )
    }

    if (appointment.status === "CONFIRMED") {
      return NextResponse.json(
        { error: "این نوبت قبلاً تایید و پرداخت شده است" },
        { status: 400 }
      )
    }

    // Revalidate: Check if another appointment has confirmed this slot
    const collision = await prisma.appointment.findFirst({
      where: {
        barberId: appointment.barberId,
        date: appointment.date,
        status: { in: ["CONFIRMED", "COMPLETED"] },
        id: { not: appointment.id },
      },
    })
    if (collision) {
      return NextResponse.json(
        { error: "این بازه زمانی هم‌اکنون توسط کاربر دیگری رزرو قطعی شده است." },
        { status: 409 }
      )
    }

    // Check if hold is still active
    const hold = await prisma.slotHold.findFirst({
      where: {
        barberId: appointment.barberId,
        slotTime: appointment.date,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
    })

    if (!hold) {
      return NextResponse.json(
        { error: "زمان هلد موقت ۱۰ دقیقه‌ای این نوبت منقضی شده است. لطفاً مجدداً نوبت بگیرید." },
        { status: 410 }
      )
    }

    // Deposit amount in Tomans
    const depositAmount = appointment.service.depositPrice || 50000
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const callbackUrl = `${appUrl}/api/booking/callback`

    const gateway = getPaymentGateway()
    const initResult = await gateway.initiatePayment({
      amountToman: depositAmount,
      callbackUrl,
      description: `بیعانه نوبت ${appointment.service.name} - آرایشگاه کوروش`,
      customerPhone: appointment.customerPhone,
      bookingReference: appointment.trackingCode,
    })

    // Create payment ledger record
    await prisma.payment.create({
      data: {
        appointmentId: appointment.id,
        authority: initResult.authority,
        amountToman: depositAmount,
        amountRial: depositAmount * 10,
        gateway: gateway.name,
        status: "PENDING",
      },
    })

    // Update appointment status to AWAITING_PAYMENT
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "AWAITING_PAYMENT" },
    })

    return NextResponse.json({
      success: true,
      redirectUrl: initResult.redirectUrl,
      authority: initResult.authority,
    })
  } catch (error: unknown) {
    console.error("Payment initiation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا در برقراری ارتباط با درگاه پرداخت" },
      { status: 500 }
    )
  }
}
