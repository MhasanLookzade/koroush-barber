import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authorizeAdmin } from "@/lib/admin-auth"
import { createUtcFromTehranTime, getTehranTimeString, formatJalaliFull } from "@/lib/jalali"
import { generateTrackingCode } from "@/lib/auth"
import { normalizeIranianPhone } from "@/lib/providers/sms"
import { isValidSlotTime, computeServiceDeposit } from "@/lib/booking-engine"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") // YYYY-MM-DD
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    const where: Record<string, unknown> = {}

    if (status && status !== "ALL") {
      where.status = status
    }

    if (date) {
      const dayStart = createUtcFromTehranTime(date, "00:00")
      const dayEnd = createUtcFromTehranTime(date, "23:59")
      where.date = { gte: dayStart, lte: dayEnd }
    }

    if (search) {
      const cleanSearch = search.trim()
      where.OR = [
        { customerName: { contains: cleanSearch } },
        { customerPhone: { contains: cleanSearch } },
        { trackingCode: { contains: cleanSearch.toUpperCase() } },
      ]
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        service: true,
        barber: true,
        payments: true,
      },
      orderBy: { date: "asc" },
    })

    const formatted = appointments.map((a) => {
      const startTime = getTehranTimeString(a.date)
      const endTime = getTehranTimeString(a.endDate)
      return {
        id: a.id,
        trackingCode: a.trackingCode,
        customerName: a.customerName,
        customerPhone: a.customerPhone,
        customerEmail: a.customerEmail,
        serviceId: a.serviceId,
        serviceName: a.service.name,
        barberName: a.barber.name,
        status: a.status,
        dateUtc: a.date.toISOString(),
        jalaliFull: formatJalaliFull(a.date),
        time: startTime,
        endTime,
        slotTime: `${startTime} الی ${endTime}`,
        createdAtTime: getTehranTimeString(a.createdAt),
        createdAtJalali: formatJalaliFull(a.createdAt),
        totalPrice: a.totalPrice,
        depositPaid: a.depositPaid,
        balanceDue: a.balanceDue,
        isRemainderPaid: a.isRemainderPaid,
        adminNotes: a.adminNotes,
        cancellationReason: a.cancellationReason,
        createdAt: a.createdAt.toISOString(),
      }
    })

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Admin appointments list error:", error)
    return NextResponse.json({ error: "خطا در دریافت لیست نوبت‌ها" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const {
      serviceId,
      barberId,
      dateStr,
      timeStr,
      customerName,
      customerPhone,
      customerEmail,
      notes,
      isDepositWaived,
    } = body

    if (!serviceId || !dateStr || !timeStr || !customerName || !customerPhone) {
      return NextResponse.json(
        { error: "اطلاعات الزامی نوبت ناقص است" },
        { status: 400 }
      )
    }

    if (!isValidSlotTime(timeStr)) {
      return NextResponse.json(
        { error: "ساعت شروع نوبت نامعتبر است. ساعات معتبر ۱۰:۰۰ الی ۲۲:۰۰ و رأس ساعت هستند." },
        { status: 400 }
      )
    }

    const slotUtc = createUtcFromTehranTime(dateStr, timeStr)
    const slotEndUtc = new Date(slotUtc.getTime() + 60 * 60 * 1000)
    const normalizedPhone = normalizeIranianPhone(customerPhone)

    const service = await prisma.service.findUnique({ where: { id: serviceId } })
    if (!service || !service.isActive) {
      return NextResponse.json({ error: "خدمت یافت نشد یا غیرفعال است" }, { status: 404 })
    }

    // Authoritative integer-Toman deposit & balance computation (PAY-31-04)
    const totalPrice = Math.round(service.price)
    let depositPaid = 0
    if (!isDepositWaived) {
      try {
        depositPaid = computeServiceDeposit(service)
      } catch (calcErr: unknown) {
        return NextResponse.json(
          { error: calcErr instanceof Error ? calcErr.message : "تنظیمات بیعانه خدمت نامعتبر است" },
          { status: 400 }
        )
      }
    }
    const balanceDue = Math.max(0, totalPrice - depositPaid)
    const targetBarberId = barberId || "barber-kourosh"

    const isPostgres =
      (process.env.DATABASE_URL || "").startsWith("postgres://") ||
      (process.env.DATABASE_URL || "").startsWith("postgresql://")
    const txOptions = isPostgres ? { isolationLevel: "Serializable" as const } : undefined

    try {
      const newAppointment = await prisma.$transaction(async (tx) => {
        const now = new Date()

        // Expire overdue ACTIVE holds for this slot before checking
        await tx.slotHold.updateMany({
          where: {
            barberId: targetBarberId,
            slotTime: slotUtc,
            status: "ACTIVE",
            expiresAt: { lte: now },
          },
          data: { status: "EXPIRED" },
        })

        // Check active appointment & hold collisions atomically
        const existing = await tx.appointment.findFirst({
          where: {
            barberId: targetBarberId,
            date: slotUtc,
            status: { in: ["CONFIRMED", "COMPLETED", "HELD", "AWAITING_PAYMENT"] },
          },
        })

        const activeHold = await tx.slotHold.findFirst({
          where: {
            barberId: targetBarberId,
            slotTime: slotUtc,
            status: "ACTIVE",
            expiresAt: { gt: now },
          },
        })

        if (existing || activeHold) {
          throw new Error("SLOT_CONFLICT")
        }

        // Upsert customer
        let customer = await tx.customer.findUnique({ where: { phone: normalizedPhone } })
        if (!customer) {
          customer = await tx.customer.create({
            data: { phone: normalizedPhone, name: customerName, email: customerEmail || null },
          })
        }

        const trackingCode = generateTrackingCode()
        const created = await tx.appointment.create({
          data: {
            trackingCode,
            barberId: targetBarberId,
            serviceId: service.id,
            customerId: customer.id,
            customerName,
            customerPhone: normalizedPhone,
            customerEmail: customerEmail || null,
            date: slotUtc,
            endDate: slotEndUtc,
            status: "CONFIRMED", // Admin manual booking is directly confirmed
            totalPrice,
            depositPaid,
            balanceDue,
            adminNotes: notes ? `ثبت دستی مدیریت: ${notes}` : "ثبت دستی توسط مدیریت",
          },
          include: { service: true, barber: true },
        })

        await tx.auditLog.create({
          data: {
            action: "ADMIN_MANUAL_BOOKING",
            entity: "Appointment",
            entityId: created.id,
            userId: auth.session.userId,
            userRole: auth.session.role,
            details: JSON.stringify({ trackingCode, customerPhone: normalizedPhone, slotUtc, totalPrice, depositPaid, balanceDue }),
          },
        })

        return created
      }, txOptions)

      return NextResponse.json({
        success: true,
        appointment: newAppointment,
        message: "نوبت با موفقیت توسط مدیریت ثبت گردید",
      })
    } catch (txErr: unknown) {
      const code = (txErr as { code?: string } | null)?.code
      if (
        (txErr instanceof Error && txErr.message === "SLOT_CONFLICT") ||
        code === "P2002" ||
        code === "P2034"
      ) {
        return NextResponse.json(
          { error: "این بازه زمانی هم‌اکنون رزرو یا در حال پرداخت است" },
          { status: 409 }
        )
      }
      throw txErr
    }
  } catch (error) {
    console.error("Admin create appointment error:", error)
    return NextResponse.json({ error: "خطا در ثبت نوبت توسط مدیریت" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const {
      id,
      status,
      isRemainderPaid,
      adminNotes,
      cancellationReason,
      customerName,
      customerPhone,
      notes,
    } = body

    if (!id) {
      return NextResponse.json({ error: "شناسه نوبت الزامی است" }, { status: 400 })
    }

    const existing = await prisma.appointment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "نوبت یافت نشد" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (typeof isRemainderPaid === "boolean") updateData.isRemainderPaid = isRemainderPaid
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes
    if (notes !== undefined) updateData.notes = notes
    if (customerName && typeof customerName === "string") updateData.customerName = customerName.trim()
    if (customerPhone && typeof customerPhone === "string") {
      updateData.customerPhone = normalizeIranianPhone(customerPhone)
    }
    if (cancellationReason !== undefined) {
      updateData.cancellationReason = cancellationReason
      if (status === "CANCELLED") updateData.cancelledAt = new Date()
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: { service: true, barber: true },
    })

    // If cancelled, release any hold
    if (status === "CANCELLED") {
      await prisma.slotHold.updateMany({
        where: {
          barberId: updated.barberId,
          slotTime: updated.date,
          status: "ACTIVE",
        },
        data: { status: "RELEASED" },
      })
    }

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_UPDATE_APPOINTMENT",
        entity: "Appointment",
        entityId: id,
        userId: auth.session.userId,
        userRole: auth.session.role,
        details: JSON.stringify({ oldStatus: existing.status, newStatus: status, updateData }),
      },
    })

    return NextResponse.json({
      success: true,
      appointment: updated,
      message: "وضعیت نوبت به‌روزرسانی شد",
    })
  } catch (error) {
    console.error("Admin update appointment error:", error)
    return NextResponse.json({ error: "خطا در ویرایش نوبت" }, { status: 500 })
  }
}
