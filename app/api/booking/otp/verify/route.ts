import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { normalizeIranianPhone, isValidIranianPhone } from "@/lib/providers/sms"
import { hashOtpCode } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, code } = body

    if (!phone || !isValidIranianPhone(phone)) {
      return NextResponse.json(
        { error: "شماره موبایل نامعتبر است" },
        { status: 400 }
      )
    }

    if (!code || typeof code !== "string" || code.trim().length !== 6) {
      return NextResponse.json(
        { error: "کد تایید باید ۶ رقم باشد" },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizeIranianPhone(phone)
    const cleanCode = code.trim()

    // Find active unexpired challenge
    const challenge = await prisma.otpChallenge.findFirst({
      where: {
        phone: normalizedPhone,
        expiresAt: { gt: new Date() },
        verified: false,
      },
      orderBy: { createdAt: "desc" },
    })

    if (!challenge) {
      return NextResponse.json(
        { error: "کد تایید منقضی شده یا درخواست نشده است. لطفاً کد جدید دریافت کنید." },
        { status: 400 }
      )
    }

    if (challenge.attempts >= 5) {
      return NextResponse.json(
        { error: "تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً کد جدید دریافت کنید." },
        { status: 429 }
      )
    }

    const computedHash = hashOtpCode(cleanCode, normalizedPhone)
    if (computedHash !== challenge.codeHash) {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      })
      return NextResponse.json(
        { error: "کد تایید وارد شده نادرست است" },
        { status: 400 }
      )
    }

    // Mark challenge verified
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { verified: true },
    })

    // Upsert or fetch customer
    let customer = await prisma.customer.findUnique({
      where: { phone: normalizedPhone },
    })

    if (!customer) {
      // Find latest appointment name if exists for this phone
      const latestAppt = await prisma.appointment.findFirst({
        where: { customerPhone: normalizedPhone },
        orderBy: { createdAt: "desc" },
        select: { customerName: true, customerBirthDate: true },
      })

      customer = await prisma.customer.create({
        data: {
          phone: normalizedPhone,
          name: latestAppt?.customerName || "کاربر جدید",
          birthDate: latestAppt?.customerBirthDate || null,
          isVerified: true,
        },
      })
    } else {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { isVerified: true },
      })
    }

    return NextResponse.json({
      success: true,
      verified: true,
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
      },
    })
  } catch (error) {
    console.error("OTP verify error:", error)
    return NextResponse.json(
      { error: "خطا در بررسی کد تایید" },
      { status: 500 }
    )
  }
}
