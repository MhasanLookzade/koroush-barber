import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"

const workingHoursSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  isWorking: z.boolean().default(true),
})

const barberSchema = z.object({
  name: z.string().min(1, "نام آرایشگر الزامی است"),
  email: z.string().email("ایمیل معتبر وارد کنید").optional().or(z.literal("")),
  phone: z.string().optional(),
  bio: z.string().optional(),
  avatar: z.string().url().optional().or(z.literal("")),
  serviceIds: z.array(z.string()).default([]),
  workingHours: z.array(workingHoursSchema).default([]),
})

export async function GET() {
  try {
    const barbers = await prisma.barber.findMany({
      where: { isActive: true },
      include: {
        services: true,
        workingHours: true,
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(barbers)
  } catch (error) {
    console.error("Error fetching barbers:", error)
    return NextResponse.json({ error: "خطا در دریافت آرایشگرها" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = barberSchema.parse(body)

    const { serviceIds, workingHours, ...barberData } = validated

    const barber = await prisma.barber.create({
      data: {
        ...barberData,
        services: {
          connect: serviceIds.map(id => ({ id })),
        },
        workingHours: {
          create: workingHours,
        },
      },
      include: {
        services: true,
        workingHours: true,
      },
    })

    return NextResponse.json(barber, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating barber:", error)
    return NextResponse.json({ error: "خطا در ایجاد آرایشگر" }, { status: 500 })
  }
}