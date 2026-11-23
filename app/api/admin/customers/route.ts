import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authorizeAdmin } from "@/lib/admin-auth"
import { formatJalaliShort } from "@/lib/jalali"

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
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        appointments: {
          select: {
            id: true,
            totalPrice: true,
            status: true,
            date: true,
          },
          orderBy: { date: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const formatted = customers.map((c) => {
      const validAppointments = c.appointments.filter(
        (a) => a.status === "CONFIRMED" || a.status === "COMPLETED"
      )
      const lifetimeSpend = validAppointments.reduce((sum, a) => sum + a.totalPrice, 0)
      const lastAppointment = c.appointments[0]

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        notes: c.notes,
        totalVisits: validAppointments.length,
        lifetimeSpend,
        lastVisit: lastAppointment ? formatJalaliShort(lastAppointment.date) : "—",
        createdAt: c.createdAt.toISOString(),
      }
    })

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Admin customers error:", error)
    return NextResponse.json({ error: "خطا در دریافت لیست مشتریان" }, { status: 500 })
  }
}
