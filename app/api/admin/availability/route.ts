import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authorizeAdmin } from "@/lib/admin-auth"
import { createUtcFromTehranTime } from "@/lib/jalali"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const workingHours = await prisma.workingHour.findMany({
      orderBy: { dayOfWeek: "asc" },
    })

    const blockedIntervals = await prisma.blockedInterval.findMany({
      orderBy: [{ date: "desc" }, { startTime: "asc" }],
      take: 50,
    })

    const scheduleOverrides = await prisma.scheduleOverride.findMany({
      orderBy: { date: "desc" },
      take: 50,
    })

    return NextResponse.json({
      workingHours,
      blockedIntervals,
      scheduleOverrides,
    })
  } catch (error) {
    console.error("Availability admin error:", error)
    return NextResponse.json({ error: "خطا در بارگذاری ساعات کاری" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const { date, startTime, endTime, reason, barberId } = body

    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "تاریخ، ساعت شروع و ساعت پایان الزامی است" },
        { status: 400 }
      )
    }

    // Conflict Check: Check if any confirmed appointments exist in this window!
    const slotStartUtc = createUtcFromTehranTime(date, startTime)
    const slotEndUtc = createUtcFromTehranTime(date, endTime)

    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        date: { gte: slotStartUtc, lt: slotEndUtc },
        status: { in: ["CONFIRMED", "COMPLETED", "HELD"] },
      },
    })

    if (conflictingAppointments.length > 0) {
      const trackingCodes = conflictingAppointments.map((a) => a.trackingCode).join("، ")
      return NextResponse.json(
        {
          error: `امکان مسدودسازی وجود ندارد: در این بازه، نوبت‌های تایید شده (${trackingCodes}) از قبل ثبت شده است. ابتدا باید با مشتریان هماهنگ و نوبت آن‌ها جابجا شود.`,
          conflict: true,
          conflictingAppointments,
        },
        { status: 409 }
      )
    }

    const blocked = await prisma.blockedInterval.create({
      data: {
        date,
        startTime,
        endTime,
        reason: reason || "استراحت یا عدم حضور آرایشگر",
        barberId: barberId || null,
      },
    })

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_BLOCK_INTERVAL",
        entity: "BlockedInterval",
        entityId: blocked.id,
        userId: auth.session.userId,
        userRole: auth.session.role,
        details: JSON.stringify({ date, startTime, endTime, reason }),
      },
    })

    return NextResponse.json({
      success: true,
      blocked,
      message: "بازه زمانی با موفقیت مسدود شد و از لیست نوبت‌های مشتریان حذف گردید.",
    })
  } catch (error) {
    console.error("Block interval error:", error)
    return NextResponse.json({ error: "خطا در مسدودسازی بازه زمانی" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const { date, isClosed, reason } = body

    if (!date) {
      return NextResponse.json({ error: "تاریخ الزامی است" }, { status: 400 })
    }

    const override = await prisma.scheduleOverride.upsert({
      where: { date },
      update: {
        isClosed: !!isClosed,
        reason: reason || null,
      },
      create: {
        date,
        isClosed: !!isClosed,
        reason: reason || null,
      },
    })

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_SCHEDULE_OVERRIDE",
        entity: "ScheduleOverride",
        entityId: override.id,
        userId: auth.session.userId,
        userRole: auth.session.role,
        details: JSON.stringify({ date, isClosed, reason }),
      },
    })

    return NextResponse.json({
      success: true,
      override,
      message: "وضعیت تقویم این تاریخ به‌روزرسانی شد",
    })
  } catch (error) {
    console.error("Schedule override error:", error)
    return NextResponse.json({ error: "خطا در تنظیم تعطیلی تاریخ" }, { status: 500 })
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
      return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 })
    }

    await prisma.blockedInterval.delete({ where: { id } })

    return NextResponse.json({ success: true, message: "بازه مسدود شده حذف شد" })
  } catch (error) {
    console.error("Delete blocked interval error:", error)
    return NextResponse.json({ error: "خطا در حذف بازه مسدودی" }, { status: 500 })
  }
}
