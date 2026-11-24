import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authorizeAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const [
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      completedAppointments,
      cancelledAppointments,
      thisMonthAppointments,
      lastMonthAppointments,
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      totalCustomers,
      totalServices,
      totalBarbers,
    ] = await Promise.all([
      prisma.appointment.count(),
      prisma.appointment.count({ where: { status: "HELD" } }),
      prisma.appointment.count({ where: { status: "CONFIRMED" } }),
      prisma.appointment.count({ where: { status: "COMPLETED" } }),
      prisma.appointment.count({ where: { status: "CANCELLED" } }),
      prisma.appointment.count({
        where: { date: { gte: startOfMonth }, status: { in: ["CONFIRMED", "COMPLETED"] } },
      }),
      prisma.appointment.count({
        where: { date: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { in: ["CONFIRMED", "COMPLETED"] } },
      }),
      prisma.appointment.aggregate({
        where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
        _sum: { totalPrice: true },
      }),
      prisma.appointment.aggregate({
        where: { date: { gte: startOfMonth }, status: { in: ["CONFIRMED", "COMPLETED"] } },
        _sum: { totalPrice: true },
      }),
      prisma.appointment.aggregate({
        where: { date: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { in: ["CONFIRMED", "COMPLETED"] } },
        _sum: { totalPrice: true },
      }),
      prisma.appointment.groupBy({ by: ["customerPhone"], _count: true }).then((r) => r.length),
      prisma.service.count({ where: { isActive: true } }),
      prisma.barber.count({ where: { isActive: true } }),
    ])

    const revenueData = await prisma.appointment.groupBy({
      by: ["date"],
      where: {
        date: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
      _sum: { totalPrice: true },
      _count: true,
    })

    const monthlyRevenue = revenueData.reduce((acc, item) => {
      const month = new Date(item.date).toLocaleDateString("fa-IR", { month: "short", year: "2-digit" })
      acc[month] = (acc[month] || 0) + (item._sum?.totalPrice || 0)
      return acc
    }, {} as Record<string, number>)

    const revenueChart = Object.entries(monthlyRevenue).map(([month, revenue]) => ({
      month,
      revenue,
    }))

    const lastMonthRev = lastMonthRevenue._sum?.totalPrice || 0
    const thisMonthRev = thisMonthRevenue._sum?.totalPrice || 0

    return NextResponse.json({
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      completedAppointments,
      cancelledAppointments,
      thisMonthAppointments,
      lastMonthAppointments,
      totalRevenue: totalRevenue._sum?.totalPrice || 0,
      thisMonthRevenue: thisMonthRev,
      lastMonthRevenue: lastMonthRev,
      totalCustomers,
      totalServices,
      totalBarbers,
      revenueChart,
      appointmentGrowth:
        lastMonthAppointments > 0
          ? ((thisMonthAppointments - lastMonthAppointments) / lastMonthAppointments) * 100
          : 0,
      revenueGrowth:
        lastMonthRev > 0
          ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100
          : 0,
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "خطا در دریافت آمار" }, { status: 500 })
  }
}
