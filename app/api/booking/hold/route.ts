import { NextRequest, NextResponse } from "next/server"
import { reserveSlotHold } from "@/lib/booking-engine"
import { isValidIranianPhone } from "@/lib/providers/sms"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rate = checkRateLimit(`hold_${ip}`, 15, 5 * 60 * 1000)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "تعداد درخواست‌های رزرو موقت بیش از حد مجاز است. لطفاً ۵ دقیقه دیگر مجدداً تلاش فرمایید." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { barberId, serviceId, dateStr, timeStr, customerName, customerPhone, customerEmail, customerBirthDate } = body

    if (!serviceId || !dateStr || !timeStr || !customerName || !customerPhone) {
      return NextResponse.json(
        { error: "تمامی فیلدهای الزامی (خدمت، تاریخ، ساعت، نام و شماره تماس) را وارد فرمایید" },
        { status: 400 }
      )
    }

    if (!isValidIranianPhone(customerPhone)) {
      return NextResponse.json(
        { error: "شماره موبایل وارد شده معتبر نیست" },
        { status: 400 }
      )
    }

    const result = await reserveSlotHold({
      barberId: barberId || "barber-kourosh",
      serviceId,
      dateStr,
      timeStr,
      customerName,
      customerPhone,
      customerEmail,
      customerBirthDate,
    })

    return NextResponse.json({
      success: true,
      ...result,
      expiresAt: result.expiresAt.toISOString(),
      message: "هلد موقت ۱۰ دقیقه‌ای با موفقیت ثبت شد",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "خطای هلد موقت"
    // Return 409 for conflict (slot already booked or held)
    const isConflict = message.includes("قبلاً رزرو") || message.includes("در حال پرداخت")
    return NextResponse.json(
      { error: message },
      { status: isConflict ? 409 : 400 }
    )
  }
}
