import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateAppointmentIcs } from "@/lib/ics"

export async function GET(
  _request: NextRequest,
  { params }: { params: { trackingCode: string } }
) {
  try {
    const { trackingCode } = params
    const appointment = await prisma.appointment.findUnique({
      where: { trackingCode: trackingCode.toUpperCase() },
      include: { service: true, barber: true },
    })

    if (!appointment) {
      return new NextResponse("نوبت یافت نشد", { status: 404 })
    }

    const icsContent = generateAppointmentIcs({
      trackingCode: appointment.trackingCode,
      serviceName: appointment.service.name,
      barberName: appointment.barber.name,
      startDate: appointment.date,
      endDate: appointment.endDate,
    })

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="kourosh-barber-${appointment.trackingCode}.ics"`,
      },
    })
  } catch (error) {
    console.error("Calendar ics error:", error)
    return new NextResponse("خطا در ایجاد فایل تقویم", { status: 500 })
  }
}
