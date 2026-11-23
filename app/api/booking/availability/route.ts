import { NextRequest, NextResponse } from "next/server"
import { getAvailabilityForDate } from "@/lib/booking-engine"
import { getTehranDateString } from "@/lib/jalali"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get("date") || getTehranDateString()
    const barberId = searchParams.get("barberId") || undefined

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { error: "فرمت تاریخ نامعتبر است (الگوی صحیح: YYYY-MM-DD)" },
        { status: 400 }
      )
    }

    const availability = await getAvailabilityForDate(dateParam, barberId)
    return NextResponse.json(availability)
  } catch (error) {
    console.error("Availability error:", error)
    return NextResponse.json(
      { error: "خطا در محاسبه ظرفیت و زمان‌های خالی" },
      { status: 500 }
    )
  }
}
