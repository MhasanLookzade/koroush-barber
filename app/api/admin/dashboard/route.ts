import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authorizeAdmin } from "@/lib/admin-auth"
import {
  getTehranDateString,
  getJalaliDate,
  getTehranTimeString,
  formatJalaliFull,
  getJalaliWeekDays,
  createUtcFromTehranTime,
} from "@/lib/jalali"
import { generateBaseDailySlots, releaseExpiredHolds } from "@/lib/booking-engine"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    // 1. Clean up any expired holds before computing availability
    await releaseExpiredHolds()

    const { searchParams } = new URL(request.url)
    const requestedDate = searchParams.get("date")
    const weekOffsetParam = parseInt(searchParams.get("weekOffset") || "0", 10)
    const weekOffset = isNaN(weekOffsetParam) ? 0 : weekOffsetParam

    const todayStr = getTehranDateString()

    // 2. Compute 7 Days of the Week (Saturday through Friday)
    const hasExplicitOffset = searchParams.has("weekOffset")
    let weekInfo = getJalaliWeekDays(todayStr, weekOffset)

    if (requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) && !hasExplicitOffset) {
      weekInfo = getJalaliWeekDays(requestedDate, 0)
    }

    // Determine selected date:
    // If requestedDate is within this week, use it;
    // Else if today is in this week, use today;
    // Otherwise use Saturday (the start of this week).
    const matchingRequestedDay = weekInfo.weekDays.find((d) => d.dateStr === requestedDate)
    const isTodayInWeek = weekInfo.weekDays.some((d) => d.isToday)
    const selectedDateStr = matchingRequestedDay
      ? matchingRequestedDay.dateStr
      : isTodayInWeek
      ? todayStr
      : weekInfo.saturdayDateStr

    // Range for querying week appointments: from Saturday 00:00 to Friday 23:59
    const weekStartUtc = createUtcFromTehranTime(weekInfo.saturdayDateStr, "00:00")
    const weekEndUtc = createUtcFromTehranTime(weekInfo.fridayDateStr, "23:59")

    const [weekAppointments, weekOverrides, services, barbers] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          date: { gte: weekStartUtc, lte: weekEndUtc },
          status: { in: ["CONFIRMED", "COMPLETED", "HELD", "PAYMENT_REVIEW"] },
        },
        select: {
          id: true,
          date: true,
          status: true,
        },
      }),
      prisma.scheduleOverride.findMany({
        where: {
          date: { in: weekInfo.weekDays.map((d) => d.dateStr) },
        },
      }),
      prisma.service.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.barber.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      }),
    ])

    // Map counts and closed status onto each day in the 7-day strip
    const weekDaysWithCounts = weekInfo.weekDays.map((day) => {
      const dayStartMs = createUtcFromTehranTime(day.dateStr, "00:00").getTime()
      const dayEndMs = createUtcFromTehranTime(day.dateStr, "23:59").getTime()

      const dayApps = weekAppointments.filter((a) => {
        const t = a.date.getTime()
        return t >= dayStartMs && t <= dayEndMs
      })

      const confirmedCount = dayApps.filter(
        (a) => a.status === "CONFIRMED" || a.status === "COMPLETED"
      ).length

      const override = weekOverrides.find((o) => o.date === day.dateStr)

      return {
        ...day,
        confirmedCount,
        isClosed: Boolean(override?.isClosed),
        closedReason: override?.reason || null,
        isSelected: day.dateStr === selectedDateStr,
      }
    })

    // 3. Compute Timeline for Selected Day (13 slots: 10:00 to 22:00 start times)
    const baseSlots = generateBaseDailySlots(selectedDateStr)
    const dayStartUtc = baseSlots[0].utcStartTime
    const dayEndUtc = baseSlots[baseSlots.length - 1].utcEndTime
    const now = new Date()

    const [dayAppointments, blockedIntervals, activeHolds, selectedDayOverride] =
      await Promise.all([
        prisma.appointment.findMany({
          where: {
            date: { gte: dayStartUtc, lte: dayEndUtc },
          },
          include: {
            service: true,
            barber: true,
            payments: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          orderBy: { date: "asc" },
        }),
        prisma.blockedInterval.findMany({
          where: { date: selectedDateStr },
        }),
        prisma.slotHold.findMany({
          where: {
            status: "ACTIVE",
            expiresAt: { gt: now },
            slotTime: { gte: dayStartUtc, lte: dayEndUtc },
          },
        }),
        prisma.scheduleOverride.findUnique({
          where: { date: selectedDateStr },
        }),
      ])

    // Map each of the 13 slots to its exact state and appointment details
    const timelineSlots = baseSlots.map((base) => {
      const slotTimeFormatted = `${base.time} الی ${base.endTime}`

      // Check blocked intervals
      const blocked = blockedIntervals.find(
        (b) => base.time >= b.startTime && base.time < b.endTime
      )
      if (blocked) {
        return {
          time: base.time,
          endTime: base.endTime,
          slotTime: slotTimeFormatted,
          label: base.label,
          utcStartTime: base.utcStartTime.toISOString(),
          utcEndTime: base.utcEndTime.toISOString(),
          status: "BLOCKED" as const,
          isAvailable: false,
          appointment: null,
          blockedInfo: {
            id: blocked.id,
            reason: blocked.reason,
            startTime: blocked.startTime,
            endTime: blocked.endTime,
          },
          holdInfo: null,
        }
      }

      // Check appointment
      const app = dayAppointments.find(
        (a) => a.date.getTime() === base.utcStartTime.getTime()
      )

      if (app) {
        let slotStatus: "BOOKED" | "COMPLETED" | "HELD" | "CANCELLED" = "BOOKED"
        if (app.status === "COMPLETED") {
          slotStatus = "COMPLETED"
        } else if (app.status === "HELD" || app.status === "AWAITING_PAYMENT") {
          slotStatus = "HELD"
        } else if (app.status === "CANCELLED") {
          slotStatus = "CANCELLED"
        }

        const appDetails = {
          id: app.id,
          trackingCode: app.trackingCode,
          customerName: app.customerName,
          customerPhone: app.customerPhone,
          customerEmail: app.customerEmail,
          serviceId: app.serviceId,
          serviceName: app.service.name,
          barberId: app.barberId,
          barberName: app.barber.name,
          status: app.status,
          dateUtc: app.date.toISOString(),
          jalaliFull: formatJalaliFull(app.date),
          time: base.time,
          endTime: base.endTime,
          slotTime: slotTimeFormatted,
          createdAtTime: getTehranTimeString(app.createdAt),
          createdAtJalali: formatJalaliFull(app.createdAt),
          totalPrice: app.totalPrice,
          depositPaid: app.depositPaid,
          balanceDue: app.balanceDue,
          isRemainderPaid: app.isRemainderPaid,
          notes: app.notes,
          adminNotes: app.adminNotes,
          cancellationReason: app.cancellationReason,
          paymentRefId: app.payments[0]?.refId || null,
        }

        // If cancelled, slot has been released back to availability unless another holds it
        if (app.status === "CANCELLED") {
          // Check if there is also an active hold or other active booking
          const activeHold = activeHolds.find(
            (h) => h.slotTime.getTime() === base.utcStartTime.getTime()
          )
          if (!activeHold) {
            const isPast = base.utcStartTime.getTime() <= now.getTime()
            return {
              time: base.time,
              endTime: base.endTime,
              slotTime: slotTimeFormatted,
              label: base.label,
              utcStartTime: base.utcStartTime.toISOString(),
              utcEndTime: base.utcEndTime.toISOString(),
              status: isPast ? ("PAST" as const) : ("AVAILABLE" as const),
              isAvailable: !isPast,
              appointment: null,
              previousCancelledAppointment: appDetails,
              blockedInfo: null,
              holdInfo: null,
            }
          }
        }

        return {
          time: base.time,
          endTime: base.endTime,
          slotTime: slotTimeFormatted,
          label: base.label,
          utcStartTime: base.utcStartTime.toISOString(),
          utcEndTime: base.utcEndTime.toISOString(),
          status: slotStatus,
          isAvailable: false,
          appointment: appDetails,
          blockedInfo: null,
          holdInfo: null,
        }
      }

      // Check active unconfirmed holds
      const hold = activeHolds.find(
        (h) => h.slotTime.getTime() === base.utcStartTime.getTime()
      )
      if (hold) {
        return {
          time: base.time,
          endTime: base.endTime,
          slotTime: slotTimeFormatted,
          label: base.label,
          utcStartTime: base.utcStartTime.toISOString(),
          utcEndTime: base.utcEndTime.toISOString(),
          status: "HELD" as const,
          isAvailable: false,
          appointment: null,
          blockedInfo: null,
          holdInfo: {
            id: hold.id,
            customerPhone: hold.customerPhone,
            expiresAt: hold.expiresAt.toISOString(),
          },
        }
      }

      // Check if slot start is already in the past
      if (base.utcStartTime.getTime() <= now.getTime()) {
        return {
          time: base.time,
          endTime: base.endTime,
          slotTime: slotTimeFormatted,
          label: base.label,
          utcStartTime: base.utcStartTime.toISOString(),
          utcEndTime: base.utcEndTime.toISOString(),
          status: "PAST" as const,
          isAvailable: false,
          appointment: null,
          blockedInfo: null,
          holdInfo: null,
        }
      }

      // Available Slot
      return {
        time: base.time,
        endTime: base.endTime,
        slotTime: slotTimeFormatted,
        label: base.label,
        utcStartTime: base.utcStartTime.toISOString(),
        utcEndTime: base.utcEndTime.toISOString(),
        status: "AVAILABLE" as const,
        isAvailable: true,
        appointment: null,
        blockedInfo: null,
        holdInfo: null,
      }
    })

    // 4. Daily KPI Metrics
    const totalSlots = 13
    const confirmedCount = dayAppointments.filter((a) => a.status === "CONFIRMED").length
    const completedCount = dayAppointments.filter((a) => a.status === "COMPLETED").length
    const cancelledCount = dayAppointments.filter((a) => a.status === "CANCELLED").length
    const paymentReviewCount = dayAppointments.filter((a) => a.status === "PAYMENT_REVIEW").length
    const heldCount = timelineSlots.filter((s) => s.status === "HELD").length
    const blockedCount = timelineSlots.filter((s) => s.status === "BLOCKED").length
    const freeSlotsCount = timelineSlots.filter((s) => s.status === "AVAILABLE").length
    const occupiedSlots = confirmedCount + completedCount
    const occupancyPercentage = Math.round((occupiedSlots / totalSlots) * 100)

    const confirmedApps = dayAppointments.filter(
      (a) => a.status === "CONFIRMED" || a.status === "COMPLETED"
    )
    const totalDepositsCollected = confirmedApps.reduce((sum, a) => sum + a.depositPaid, 0)
    const totalOutstandingBalance = confirmedApps
      .filter((a) => !a.isRemainderPaid)
      .reduce((sum, a) => sum + a.balanceDue, 0)
    const totalGrossValue = confirmedApps.reduce((sum, a) => sum + a.totalPrice, 0)

    const selectedJalali = getJalaliDate(
      createUtcFromTehranTime(selectedDateStr, "12:00")
    )

    return NextResponse.json({
      selectedDay: {
        dateStr: selectedDateStr,
        dayName: selectedJalali.dayName,
        jalaliFormatted: selectedJalali.formattedDate,
        isToday: selectedDateStr === todayStr,
        isClosed: Boolean(selectedDayOverride?.isClosed),
        closedReason: selectedDayOverride?.reason || null,
      },
      week: {
        weekDays: weekDaysWithCounts,
        weekTitle: weekInfo.weekTitle,
        weekOffset: (() => {
          const curSat = new Date(getJalaliWeekDays(todayStr, 0).saturdayDateStr + "T12:00:00Z").getTime()
          const targetSat = new Date(weekInfo.saturdayDateStr + "T12:00:00Z").getTime()
          return Math.round((targetSat - curSat) / (7 * 24 * 3600 * 1000))
        })(),
        startFormatted: weekInfo.startFormatted,
        endFormatted: weekInfo.endFormatted,
        saturdayDateStr: weekInfo.saturdayDateStr,
        fridayDateStr: weekInfo.fridayDateStr,
      },
      dailySummary: {
        totalSlots,
        occupiedSlots,
        occupancyPercentage,
        confirmedCount,
        completedCount,
        cancelledCount,
        paymentReviewCount,
        heldCount,
        blockedCount,
        freeSlotsCount,
        totalDepositsCollected,
        totalOutstandingBalance,
        totalGrossValue,
      },
      timelineSlots,
      catalog: {
        services: services.map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          depositPrice: s.depositPrice,
          duration: s.duration,
        })),
        barbers: barbers.map((b) => ({
          id: b.id,
          name: b.name,
        })),
      },
    })
  } catch (error) {
    console.error("Dashboard weekly scheduler error:", error)
    return NextResponse.json(
      { error: "خطا در بارگذاری برنامه هفتگی و نوبت‌های داشبورد" },
      { status: 500 }
    )
  }
}
