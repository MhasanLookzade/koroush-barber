import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getPaymentGateway } from "@/lib/providers/payment"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { computeServiceDeposit } from "@/lib/booking-engine"
import { getCustomerFromRequest } from "@/lib/customer-auth"
import { normalizeIranianPhone } from "@/lib/providers/sms"

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
    const { appointmentId, customerPhone } = body

    if (!appointmentId || typeof appointmentId !== "string") {
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

    // Ownership checks when caller provides customerPhone or customer session cookie
    if (customerPhone && typeof customerPhone === "string") {
      const normalizedCallerPhone = normalizeIranianPhone(customerPhone)
      if (normalizedCallerPhone !== appointment.customerPhone) {
        return NextResponse.json(
          { error: "شما مجاز به پرداخت برای این نوبت نیستید" },
          { status: 403 }
        )
      }
    }

    const customerSession = getCustomerFromRequest(request)
    if (customerSession && appointment.customerId && customerSession.customerId !== appointment.customerId) {
      return NextResponse.json(
        { error: "این نوبت متعلق به حساب کاربری دیگری است" },
        { status: 403 }
      )
    }

    // Strict appointment state validation (BUG-005)
    if (appointment.status === "CONFIRMED" || appointment.status === "COMPLETED") {
      return NextResponse.json(
        { error: "این نوبت قبلاً تایید و پرداخت شده است" },
        { status: 400 }
      )
    }

    if (!["HELD", "AWAITING_PAYMENT"].includes(appointment.status)) {
      return NextResponse.json(
        { error: "امکان پرداخت برای نوبت در وضعیت فعلی وجود ندارد" },
        { status: 409 }
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

    // Verify hold exists, is unexpired, and belongs to this appointment's customerPhone (BUG-005)
    const now = new Date()
    const activeSlotHold = await prisma.slotHold.findFirst({
      where: {
        barberId: appointment.barberId,
        slotTime: appointment.date,
        status: "ACTIVE",
        expiresAt: { gt: now },
      },
    })

    if (!activeSlotHold) {
      // Mark stale appointment EXPIRED
      await prisma.appointment.updateMany({
        where: { id: appointment.id, status: { in: ["HELD", "AWAITING_PAYMENT"] } },
        data: { status: "EXPIRED" },
      })
      return NextResponse.json(
        { error: "زمان هلد موقت ۱۰ دقیقه‌ای این نوبت منقضی شده است. لطفاً مجدداً نوبت بگیرید." },
        { status: 410 }
      )
    }

    if (activeSlotHold.customerPhone !== appointment.customerPhone) {
      return NextResponse.json(
        { error: "مالکیت هلد این بازه زمانی متعلق به کاربر دیگری است" },
        { status: 403 }
      )
    }

    // Server-authoritative deposit amount in integer Tomans (BUG-001)
    // Use the exact deposit locked at hold creation (totalPrice - balanceDue)
    const lockedDeposit = Math.max(0, Math.round(appointment.totalPrice - appointment.balanceDue))
    const depositAmount = lockedDeposit > 0 ? lockedDeposit : computeServiceDeposit(appointment.service)

    if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
      return NextResponse.json(
        { error: "مبلغ بیعانه برای پرداخت آنلاین معتبر نیست" },
        { status: 400 }
      )
    }

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

    // Persist payment ledger record and update status atomically
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          appointmentId: appointment.id,
          authority: initResult.authority,
          amountToman: depositAmount,
          amountRial: depositAmount * 10,
          gateway: gateway.name,
          status: "PENDING",
        },
      }),
      prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: "AWAITING_PAYMENT" },
      }),
    ])

    return NextResponse.json({
      success: true,
      redirectUrl: initResult.redirectUrl,
      authority: initResult.authority,
      amountToman: depositAmount,
    })
  } catch (error: unknown) {
    console.error("Payment initiation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا در برقراری ارتباط با درگاه پرداخت" },
      { status: 500 }
    )
  }
}
