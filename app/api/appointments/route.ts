import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { authorizeAdmin } from "@/lib/admin-auth"

const appointmentSchema = z.object({
  serviceId: z.string().min(1, "خدمت الزامی است"),
  barberId: z.string().min(1, "آرایشگر الزامی است"),
  date: z.string().datetime(),
  customerName: z.string().min(1, "نام مشتری الزامی است").max(100),
  customerPhone: z.string().min(1, "شماره تماس الزامی است").max(20),
  customerEmail: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
})

export async function GET(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const barberId = searchParams.get('barberId')
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (barberId) where.barberId = barberId
    if (date) {
      const d = new Date(date)
      const nextDay = new Date(d)
      nextDay.setDate(nextDay.getDate() + 1)
      where.date = { gte: d, lt: nextDay }
    }
    if (startDate || endDate) {
      where.date = {}
      if (startDate) (where.date as Record<string, Date>).gte = new Date(startDate)
      if (endDate) (where.date as Record<string, Date>).lte = new Date(endDate)
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        service: true,
        barber: true,
      },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json(appointments)
  } catch (error) {
    console.error("Error fetching appointments:", error)
    return NextResponse.json({ error: "خطا در دریافت نوبت‌ها" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const validated = appointmentSchema.parse(body)

    const appointmentDate = new Date(validated.date)
    const service = await prisma.service.findUnique({ where: { id: validated.serviceId } })
    const barber = await prisma.barber.findUnique({ where: { id: validated.barberId } })

    if (!service || !barber) {
      return NextResponse.json({ error: "خدمت یا آرایشگر یافت نشد" }, { status: 404 })
    }

    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        barberId: validated.barberId,
        date: appointmentDate,
        status: { in: ["HELD", "AWAITING_PAYMENT", "CONFIRMED", "COMPLETED"] },
      },
    })

    if (existingAppointment) {
      return NextResponse.json({ error: "این زمان قبلاً رزرو شده است" }, { status: 409 })
    }

    const trackingCode = `KB-${Math.floor(10000 + Math.random() * 90000)}`
    const appointment = await prisma.appointment.create({
      data: {
        serviceId: validated.serviceId,
        barberId: validated.barberId,
        customerName: validated.customerName,
        customerPhone: validated.customerPhone,
        customerEmail: validated.customerEmail || null,
        notes: validated.notes || null,
        trackingCode,
        date: appointmentDate,
        endDate: new Date(appointmentDate.getTime() + service.duration * 60000),
        status: "HELD",
        totalPrice: service.price,
        depositPaid: 0,
        balanceDue: service.price,
      },
      include: {
        service: true,
        barber: true,
      },
    })

    return NextResponse.json(appointment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating appointment:", error)
    return NextResponse.json({ error: "خطا در ایجاد نوبت" }, { status: 500 })
  }
}