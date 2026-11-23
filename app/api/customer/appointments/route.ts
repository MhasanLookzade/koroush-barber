import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"

export const dynamic = "force-dynamic"

const querySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(50).default(10),
  status: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const customerId = request.cookies.get("customer_auth")?.value

    if (!customerId) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const validated = querySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      status: searchParams.get("status"),
    })

    const where: { customerId: string; status?: string } = { customerId }
    if (validated.status) {
      where.status = validated.status
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          barber: {
            select: {
              name: true,
              avatar: true,
            },
          },
          service: {
            select: {
              name: true,
              price: true,
              duration: true,
            },
          },
        },
        orderBy: {
          date: "desc",
        },
        skip: (validated.page - 1) * validated.limit,
        take: validated.limit,
      }),
      prisma.appointment.count({ where }),
    ])

    return NextResponse.json({
      appointments,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total,
        totalPages: Math.ceil(total / validated.limit),
      },
    })
  } catch (error) {
    console.error("Error fetching customer appointments:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: "خطا در دریافت لیست نوبت‌ها" },
      { status: 500 }
    )
  }
}
