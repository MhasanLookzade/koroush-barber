import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { normalizeIranianPhone, isValidIranianPhone, getSmsProvider } from "@/lib/providers/sms"
import { generateOtpCode, hashOtpCode } from "@/lib/auth"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const ipRate = checkRateLimit(`otp_ip_${ip}`, 5, 10 * 60 * 1000)
    if (!ipRate.allowed) {
      return NextResponse.json(
        { error: "تعداد درخواست‌های کد تایید از آدرس شما بیش از حد مجاز است. لطفاً ۱۰ دقیقه دیگر تلاش نمایید." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { phone } = body

    if (!phone || !isValidIranianPhone(phone)) {
      return NextResponse.json(
        { error: "شماره موبایل وارد شده معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)" },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizeIranianPhone(phone)

    // Burst rate limiting per phone number: max 3 requests per 15 minutes
    const phoneBurst = checkRateLimit(`otp_phone_burst_${normalizedPhone}`, 3, 15 * 60 * 1000)
    if (!phoneBurst.allowed) {
      return NextResponse.json(
        { error: "تعداد درخواست‌های کد تایید برای این شماره بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش نمایید." },
        { status: 429 }
      )
    }

    // Daily persistent limit per phone number: max 8 OTPs per 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const dailyCount = await prisma.otpChallenge.count({
      where: {
        phone: normalizedPhone,
        createdAt: { gte: oneDayAgo },
      },
    })
    if (dailyCount >= 8) {
      return NextResponse.json(
        { error: "سقف ارسال روزانه کد تایید برای این شماره به پایان رسیده است." },
        { status: 429 }
      )
    }

    // Rate limiting: check recent OTP requests in last 2 minutes (resend cooldown)
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
