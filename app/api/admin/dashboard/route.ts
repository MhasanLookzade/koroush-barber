import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authorizeAdmin } from "@/lib/admin-auth"
import { getTehranDateString, getJalaliDate, getTehranTimeString, formatJalaliFull } from "@/lib/jalali"
import { generateBaseDailySlots } from "@/lib/booking-engine"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const todayStr = getTehranDateString()
    const jalaliToday = getJalaliDate(new Date())

    const baseSlots = generateBaseDailySlots(todayStr)
    const dayStartUtc = baseSlots[0].utcStartTime
    const dayEndUtc = baseSlots[baseSlots.length - 1].utcEndTime

    // Today's appointments
    const todayAppointments = await prisma.appointment.findMany({
      where: {
        date: { gte: dayStartUtc, lte: dayEndUtc },
      },
      include: {
        service: true,
        barber: true,
      },
      orderBy: { date: "asc" },
    })

    const confirmedCount = todayAppointments.filter((a) => a.status === "CONFIRMED").length
    const completedCount = todayAppointments.filter((a) => a.status === "COMPLETED").length
    const cancelledCount = todayAppointments.filter((a) => a.status === "CANCELLED").length
    const noShowCount = todayAppointments.filter((a) => a.status === "NO_SHOW").length
    const paymentReviewCount = todayAppointments.filter((a) => a.status === "PAYMENT_REVIEW").length

    // Occupancy: booked slots out of 13 possible slots
    const totalSlots = 13
    const occupiedSlots = confirmedCount + completedCount
    const occupancyPercentage = Math.round((occupiedSlots / totalSlots) * 100)

    // Financial calculations
    const confirmedApps = todayAppointments.filter(
      (a) => a.status === "CONFIRMED" || a.status === "COMPLETED"
    )
    const totalDepositsCollected = confirmedApps.reduce((sum, a) => sum + a.depositPaid, 0)
    const totalOutstandingBalance = confirmedApps
      .filter((a) => !a.isRemainderPaid)
      .reduce((sum, a) => sum + a.balanceDue, 0)
    const totalGrossValue = confirmedApps.reduce((sum, a) => sum + a.totalPrice, 0)

    // Next upcoming appointment
    const now = new Date()
    const nextAppointment = todayAppointments.find(
      (a) => a.date >= now && (a.status === "CONFIRMED" || a.status === "HELD")
    )

    // Format appointments for frontend
    const formattedToday = todayAppointments.map((a) => ({
      id: a.id,
      trackingCode: a.trackingCode,
      customerName: a.customerName,
      customerPhone: a.customerPhone,
      serviceName: a.service.name,
      status: a.status,
      dateUtc: a.date.toISOString(),
      jalaliFull: formatJalaliFull(a.date),
      time: getTehranTimeString(a.date),
      totalPrice: a.totalPrice,
      depositPaid: a.depositPaid,
      balanceDue: a.balanceDue,
      isRemainderPaid: a.isRemainderPaid,
      adminNotes: a.adminNotes,
    }))

    // Recent 5 system audit logs
    const recentLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    })

    return NextResponse.json({
      today: {
        tehranDate: todayStr,
        jalaliFormatted: jalaliToday.formattedDate,
        dayName: jalaliToday.dayName,
      },
      metrics: {
        totalSlots,
        occupiedSlots,
        occupancyPercentage,
        confirmedCount,
        completedCount,
        cancelledCount,
        noShowCount,
        paymentReviewCount,
        totalDepositsCollected,
        totalOutstandingBalance,
        totalGrossValue,
      },
      nextAppointment: nextAppointment
        ? {
            id: nextAppointment.id,
            trackingCode: nextAppointment.trackingCode,
            customerName: nextAppointment.customerName,
            customerPhone: nextAppointment.customerPhone,
            serviceName: nextAppointment.service.name,
            time: getTehranTimeString(nextAppointment.date),
            status: nextAppointment.status,
            balanceDue: nextAppointment.balanceDue,
          }
        : null,
      appointments: formattedToday,
      recentLogs,
    })
  } catch (error) {
    console.error("Dashboard error:", error)
    return NextResponse.json({ error: "خطا در بارگذاری داشبورد مدیریت" }, { status: 500 })
  }
}
