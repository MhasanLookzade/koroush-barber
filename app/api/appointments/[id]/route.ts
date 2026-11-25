import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { authorizeAdmin } from "@/lib/admin-auth"

const updateAppointmentSchema = z.object({
  status: z.enum(["HELD", "AWAITING_PAYMENT", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]).optional(),
  notes: z.string().max(500).optional(),
  customerName: z.string().min(1).max(100).optional(),
  customerPhone: z.string().min(1).max(20).optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 })
    }
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
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 })
    }
    const existing = await prisma.appointment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "نوبت یافت نشد" }, { status: 404 })
    }

    const body = await request.json()
    const validated = updateAppointmentSchema.parse(body)

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(validated.status !== undefined ? { status: validated.status } : {}),
        ...(validated.notes !== undefined ? { notes: validated.notes } : {}),
        ...(validated.customerName !== undefined ? { customerName: validated.customerName } : {}),
        ...(validated.customerPhone !== undefined ? { customerPhone: validated.customerPhone } : {}),
        ...(validated.customerEmail !== undefined ? { customerEmail: validated.customerEmail || null } : {}),
      },
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
  const auth = authorizeAdmin(request, "OWNER")
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 })
    }
    const existing = await prisma.appointment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "نوبت یافت نشد" }, { status: 404 })
    }
    await prisma.appointment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting appointment:", error)
    return NextResponse.json({ error: "خطا در حذف نوبت" }, { status: 500 })
  }
}