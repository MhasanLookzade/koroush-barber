import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authorizeAdmin } from "@/lib/admin-auth"
import { formatJalaliShort, getTehranTimeString } from "@/lib/jalali"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        appointments: {
          include: {
            service: { select: { name: true } },
            payments: {
              select: {
                id: true,
                amountToman: true,
                status: true,
                refId: true,
                createdAt: true,
              },
            },
          },
          orderBy: { date: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const formatted = customers.map((c) => {
      const confirmedApps = c.appointments.filter(
        (a) => a.status === "CONFIRMED" || a.status === "COMPLETED"
      )
      const cancelledApps = c.appointments.filter((a) => a.status === "CANCELLED")
      const lifetimeSpend = confirmedApps.reduce((sum, a) => sum + a.totalPrice, 0)
      const lastAppointment = confirmedApps[0] || c.appointments[0]

      const servicesUsed = Array.from(
        new Set(c.appointments.map((a) => a.service?.name).filter(Boolean) as string[])
      )

      const bookingHistory = c.appointments.map((a) => {
        const jalaliDate = formatJalaliShort(a.date)
        const timeStr = getTehranTimeString(a.date)
        return {
          id: a.id,
          trackingCode: a.trackingCode,
          serviceName: a.service?.name || "خدمت پیرایش",
          date: jalaliDate,
          time: timeStr,
          status: a.status,
          totalPrice: a.totalPrice,
          depositPaid: a.depositPaid,
          balanceDue: a.balanceDue,
          createdAt: a.createdAt.toISOString(),
        }
      })

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email || null,
        birthDate: c.birthDate || null,
        notes: c.adminNotes || c.notes || "",
        smsConsent: c.smsConsent ?? true,
        totalVisits: confirmedApps.length,
        cancelledVisits: cancelledApps.length,
        lifetimeSpend,
        lastVisit: lastAppointment ? formatJalaliShort(lastAppointment.date) : "—",
        servicesUsed,
        bookingHistory,
        createdAt: c.createdAt.toISOString(),
      }
    })

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Admin customers error:", error)
    return NextResponse.json({ error: "خطا در دریافت لیست مشتریان" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const { id, name, notes, smsConsent, birthDate } = body

    if (!id) {
      return NextResponse.json({ error: "شناسه مشتری الزامی است" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "نام مشتری نمی‌تواند خالی باشد" }, { status: 400 })
      }
      updateData.name = name.trim()
    }
    if (notes !== undefined) {
      updateData.adminNotes = typeof notes === "string" ? notes.trim() : ""
      updateData.notes = typeof notes === "string" ? notes.trim() : ""
    }
    if (smsConsent !== undefined) updateData.smsConsent = Boolean(smsConsent)
    if (birthDate !== undefined) {
      if (birthDate === null || birthDate === "") {
        updateData.birthDate = null
      } else if (typeof birthDate === "string") {
        const trimmedBirth = birthDate.trim()
        if (trimmedBirth === "") {
          updateData.birthDate = null
        } else {
          const jalaliRegex = /^[1-4]\d{3}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/
          if (!jalaliRegex.test(trimmedBirth)) {
            return NextResponse.json({ error: "قالب تاریخ تولد باید به صورت YYYY/MM/DD باشد" }, { status: 400 })
          }
          updateData.birthDate = trimmedBirth
        }
      } else {
        return NextResponse.json({ error: "قالب تاریخ تولد نامعتبر است" }, { status: 400 })
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, customer: updated })
  } catch (error) {
    console.error("Update customer error:", error)
    return NextResponse.json({ error: "خطا در به‌روزرسانی پرونده مشتری" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "شناسه مشتری الزامی است" }, { status: 400 })
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        appointments: {
          select: { id: true, status: true, date: true },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: "مشتری مورد نظر یافت نشد" }, { status: 404 })
    }

    // Release any active slot holds for this customer's phone
    await prisma.slotHold.updateMany({
      where: {
        customerPhone: customer.phone,
        status: "ACTIVE",
      },
      data: {
        status: "CANCELLED",
      },
    })

    // Delete customer record: Prisma onDelete: SetNull on Appointment preserves financial/historical integrity,
    // and onDelete: Cascade on Notification cleans up notifications.
    await prisma.customer.delete({
      where: { id },
    })

    // Log the administrative deletion action
    await prisma.auditLog.create({
      data: {
        action: "ADMIN_DELETE_CUSTOMER",
        entity: "Customer",
        entityId: id,
        userId: auth.session.userId,
        userRole: auth.session.role,
        details: JSON.stringify({
          deletedCustomerName: customer.name,
          deletedCustomerPhone: customer.phone,
          associatedAppointmentsCount: customer.appointments.length,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: `پرونده مشتری ${customer.name} با موفقیت حذف گردید`,
    })
  } catch (error) {
    console.error("Delete customer error:", error)
    return NextResponse.json({ error: "خطا در حذف پرونده مشتری" }, { status: 500 })
  }
}
