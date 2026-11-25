import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authorizeCustomer } from "@/lib/customer-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authorizeCustomer(request)
    if ("errorResponse" in auth) {
      return auth.errorResponse
    }
    const customerId = auth.session.customerId

    const { id } = await params

    const appointment = await prisma.appointment.findFirst({
      where: { id, customerId },
      include: {
        service: { select: { id: true, name: true, price: true, duration: true, description: true } },
        barber: { select: { id: true, name: true, avatar: true, phone: true, bio: true } },
      },
    })

    if (!appointment) {
      return NextResponse.json({ error: "نوبت یافت نشد" }, { status: 404 })
    }

    return NextResponse.json({ appointment })
  } catch (error) {
    console.error("Error fetching appointment:", error)
    return NextResponse.json({ error: "خطا در دریافت نوبت" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authorizeCustomer(request)
    if ("errorResponse" in auth) {
      return auth.errorResponse
    }
    const customerId = auth.session.customerId

    const { id } = await params
    const body = await request.json()
    const { status } = body

    // Only allow cancellation by customer
    if (status !== "CANCELLED") {
      return NextResponse.json({ error: "عملیات مجاز نیست" }, { status: 400 })
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id, customerId },
    })

    if (!appointment) {
      return NextResponse.json({ error: "نوبت یافت نشد" }, { status: 404 })
    }

    // Only allow cancellation if not already completed/cancelled/expired
    if (["COMPLETED", "CANCELLED", "NO_SHOW", "EXPIRED"].includes(appointment.status)) {
      return NextResponse.json({ error: "امکان لغو این نوبت وجود ندارد" }, { status: 400 })
    }

    // Enforce salon cutoff horizon setting for confirmed appointments (BUG-007)
    if (appointment.status === "CONFIRMED") {
      const cutoffSetting = await prisma.siteSetting.findUnique({
        where: { key: "cancellation_cutoff_hours" },
      })
      const cutoffHours = cutoffSetting ? parseInt(cutoffSetting.value, 10) : 12
      const cutoffMs = (Number.isFinite(cutoffHours) ? cutoffHours : 12) * 60 * 60 * 1000
      if (new Date(appointment.date).getTime() - Date.now() < cutoffMs) {
        return NextResponse.json(
          { error: `امکان لغو نوبت کمتر از ${Number.isFinite(cutoffHours) ? cutoffHours : 12} ساعت مانده به زمان رزرو وجود ندارد.` },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.appointment.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason: "لغو توسط مشتری از پنل کاربری",
        },
        include: {
          service: { select: { id: true, name: true, price: true, duration: true } },
          barber: { select: { id: true, name: true } },
        },
      })

      // Release any active slot hold for this slot
      await tx.slotHold.updateMany({
        where: {
          barberId: appointment.barberId,
          slotTime: appointment.date,
          customerPhone: appointment.customerPhone,
          status: "ACTIVE",
        },
        data: { status: "RELEASED" },
      })

      await tx.auditLog.create({
        data: {
          action: "CUSTOMER_CANCEL_APPOINTMENT",
          entity: "Appointment",
          entityId: id,
          userId: customerId,
          userType: "customer",
          oldData: JSON.stringify({ status: appointment.status }),
          newData: JSON.stringify({ status: "CANCELLED" }),
        },
      })

      await tx.notification.create({
        data: {
          customerId,
          type: "appointment_cancelled",
          title: "نوبت لغو شد",
          message: `نوبت ${cancelled.service.name} با ${cancelled.barber.name} لغو گردید`,
          data: JSON.stringify({ appointmentId: id }),
        },
      })

      return cancelled
    })

    return NextResponse.json({ appointment: updated, message: "نوبت با موفقیت لغو شد" })
  } catch (error) {
    console.error("Error cancelling appointment:", error)
    return NextResponse.json({ error: "خطا در لغو نوبت" }, { status: 500 })
  }
}