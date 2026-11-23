import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const customerId = request.cookies.get("customer_auth")?.value

    if (!customerId) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 })
    }

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
    const customerId = request.cookies.get("customer_auth")?.value

    if (!customerId) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 })
    }

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

    // Only allow cancellation if not already completed/cancelled
    if (["COMPLETED", "CANCELLED", "NO_SHOW"].includes(appointment.status)) {
      return NextResponse.json({ error: "امکان لغو این نوبت وجود ندارد" }, { status: 400 })
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        service: { select: { id: true, name: true, price: true, duration: true } },
        barber: { select: { id: true, name: true } },
      },
    })

    // Create audit log
    await prisma.auditLog.create({
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

    // Create notification
    await prisma.notification.create({
      data: {
        customerId,
        type: "appointment_cancelled",
        title: "نوبت لغو شد",
        message: `نوبت ${updated.service.name} با ${updated.barber.name} لغو گردید`,
        data: JSON.stringify({ appointmentId: id }),
      },
    })

    return NextResponse.json({ appointment: updated, message: "نوبت با موفقیت لغو شد" })
  } catch (error) {
    console.error("Error cancelling appointment:", error)
    return NextResponse.json({ error: "خطا در لغو نوبت" }, { status: 500 })
  }
}