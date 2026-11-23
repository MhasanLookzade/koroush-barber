import { NextRequest, NextResponse } from "next/server"
import { reserveSlotHold } from "@/lib/booking-engine"
import { isValidIranianPhone } from "@/lib/providers/sms"

export async function POST(request: NextRequest) {
  try {
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
