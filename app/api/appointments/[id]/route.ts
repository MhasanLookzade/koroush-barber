import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateAppointmentSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).optional(),
  notes: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        service: true,
        barber: true,
      },
    })

    if (!appointment) {
      return NextResponse.json({ error: "نوبت یافت نشد" }, { status: 404 })
    }

    return NextResponse.json(appointment)
  } catch (error) {
    console.error("Error fetching appointment:", error)
    return NextResponse.json({ error: "خطا در دریافت نوبت" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validated = updateAppointmentSchema.parse(body)

    const appointment = await prisma.appointment.update({
      where: { id },
      data: validated,
      include: {
        service: true,
        barber: true,
      },
    })

    return NextResponse.json(appointment)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating appointment:", error)
    return NextResponse.json({ error: "خطا در به‌روزرسانی نوبت" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.appointment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting appointment:", error)
    return NextResponse.json({ error: "خطا در حذف نوبت" }, { status: 500 })
  }
}