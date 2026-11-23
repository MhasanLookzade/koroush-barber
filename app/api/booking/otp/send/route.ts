import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { normalizeIranianPhone, isValidIranianPhone, getSmsProvider } from "@/lib/providers/sms"
import { generateOtpCode, hashOtpCode } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone } = body

    if (!phone || !isValidIranianPhone(phone)) {
      return NextResponse.json(
        { error: "شماره موبایل وارد شده معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)" },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizeIranianPhone(phone)

    // Rate limiting: check recent OTP requests in last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
    const recentChallenge = await prisma.otpChallenge.findFirst({
      where: {
        phone: normalizedPhone,
        createdAt: { gt: twoMinutesAgo },
      },
      orderBy: { createdAt: "desc" },
    })

    if (recentChallenge && !recentChallenge.verified) {
      return NextResponse.json(
        { error: "لطفاً تا انقضای کد قبلی (۲ دقیقه) شکیبا باشید" },
        { status: 429 }
      )
    }

    // Generate 6-digit OTP
    const code = generateOtpCode()
    const codeHash = hashOtpCode(code, normalizedPhone)
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000) // 2 minutes expiry

    // Save hashed challenge
    await prisma.otpChallenge.create({
      data: {
        phone: normalizedPhone,
        codeHash,
        expiresAt,
      },
    })

    // Send SMS
    const sms = getSmsProvider()
    await sms.sendOtp(normalizedPhone, code)

    const isDev = process.env.NODE_ENV !== "production"
    return NextResponse.json({
      success: true,
      message: "کد تایید با پیامک ارسال شد",
      expiresInSeconds: 120,
      // Provide devCode strictly in non-production environments when using MOCK provider
      ...(isDev && sms.name === "MOCK" ? { devCode: code } : {}),
    })
  } catch (error) {
    console.error("OTP send error:", error)
    return NextResponse.json(
      { error: "خطا در ارسال کد تایید. لطفاً مجدداً تلاش نمایید." },
      { status: 500 }
    )
  }
}
