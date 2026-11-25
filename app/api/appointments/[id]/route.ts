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

    const body = await request.json()
    const validated = updateAppointmentSchema.parse(body)

    const isPostgres =
      (process.env.DATABASE_URL || "").startsWith("postgres://") ||
      (process.env.DATABASE_URL || "").startsWith("postgresql://")
    const txOptions = isPostgres ? { isolationLevel: "Serializable" as const } : undefined

    const outcome = await prisma.$transaction(async (tx) => {
      const existing = await tx.appointment.findUnique({ where: { id } })
      if (!existing) {
        return { kind: "NOT_FOUND" as const }
      }

      const now = new Date()

      // Clean up any stale expired ACTIVE holds on this slot
      await tx.slotHold.updateMany({
        where: {
          barberId: existing.barberId,
          slotTime: existing.date,
          status: "ACTIVE",
          expiresAt: { lte: now },
        },
        data: { status: "EXPIRED" },
      })

      // If promoting to CONFIRMED/COMPLETED, guard against slot collision
      if (validated.status && ["CONFIRMED", "COMPLETED"].includes(validated.status)) {
        const conflict = await tx.appointment.findFirst({
          where: {
            id: { not: existing.id },
            barberId: existing.barberId,
            date: existing.date,
            status: { in: ["CONFIRMED", "COMPLETED"] },
          },
        })
        if (conflict) {
          return { kind: "CONFLICT" as const }
        }
      }

      const updated = await tx.appointment.update({
        where: { id },
        data: {
          ...(validated.status !== undefined ? { status: validated.status } : {}),
          ...(validated.status === "CANCELLED" ? { cancelledAt: existing.cancelledAt ?? now } : {}),
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

      // Release ONLY this appointment owner's active hold on cancellation
      if (validated.status === "CANCELLED") {
        await tx.slotHold.updateMany({
          where: {
            barberId: existing.barberId,
            slotTime: existing.date,
            customerPhone: existing.customerPhone,
            status: "ACTIVE",
          },
          data: { status: "RELEASED" },
        })
      }

      await tx.auditLog.create({
        data: {
          action: "LEGACY_UPDATE_APPOINTMENT",
          entity: "Appointment",
          entityId: id,
          userId: auth.session.userId,
          userRole: auth.session.role,
          oldData: JSON.stringify({ status: existing.status }),
          newData: JSON.stringify({ status: updated.status }),
        },
      })

      return { kind: "OK" as const, appointment: updated }
    }, txOptions)

    if (outcome.kind === "NOT_FOUND") {
      return NextResponse.json({ error: "نوبت یافت نشد" }, { status: 404 })
    }
    if (outcome.kind === "CONFLICT") {
      return NextResponse.json({ error: "این زمان قبلاً توسط نوبت دیگری تایید شده است" }, { status: 409 })
    }

    return NextResponse.json(outcome.appointment)
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    const code = (error as { code?: string } | null)?.code
    if (code === "P2002" || code === "P2034") {
      return NextResponse.json({ error: "این زمان قبلاً توسط نوبت دیگری تایید شده است" }, { status: 409 })
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

    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.appointment.findUnique({ where: { id } })
      if (!existing) {
        return null
      }

      const now = new Date()

      // Expire stale holds on this slot and release ONLY this appointment owner's active hold
      await tx.slotHold.updateMany({
        where: {
          barberId: existing.barberId,
          slotTime: existing.date,
          status: "ACTIVE",
          expiresAt: { lte: now },
        },
        data: { status: "EXPIRED" },
      })

      await tx.slotHold.updateMany({
        where: {
          barberId: existing.barberId,
          slotTime: existing.date,
          customerPhone: existing.customerPhone,
          status: "ACTIVE",
        },
        data: { status: "RELEASED" },
      })

      await tx.appointment.delete({ where: { id } })

      await tx.auditLog.create({
        data: {
          action: "LEGACY_DELETE_APPOINTMENT",
          entity: "Appointment",
          entityId: id,
          userId: auth.session.userId,
          userRole: auth.session.role,
          oldData: JSON.stringify({
            barberId: existing.barberId,
            date: existing.date,
            status: existing.status,
            customerPhone: existing.customerPhone,
          }),
        },
      })

      return existing
    })

    if (!deleted) {
      return NextResponse.json({ error: "نوبت یافت نشد" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting appointment:", error)
    return NextResponse.json({ error: "خطا در حذف نوبت" }, { status: 500 })
  }
}