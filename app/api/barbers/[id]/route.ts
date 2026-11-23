import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"

const workingHoursSchema = z.object({
  id: z.string().optional(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  isWorking: z.boolean().default(true),
})

const barberSchema = z.object({
  name: z.string().min(1, "نام آرایشگر الزامی است").optional(),
  email: z.string().email("ایمیل معتبر وارد کنید").optional().or(z.literal("")),
  phone: z.string().optional(),
  bio: z.string().optional(),
  avatar: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  serviceIds: z.array(z.string()).optional(),
  workingHours: z.array(workingHoursSchema).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const barber = await prisma.barber.findUnique({
      where: { id },
      include: {
        services: true,
        workingHours: true,
        appointments: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            date: { gte: new Date() },
          },
          orderBy: { date: 'asc' },
        },
      },
    })

    if (!barber) {
      return NextResponse.json({ error: "آرایشگر یافت نشد" }, { status: 404 })
    }

    return NextResponse.json(barber)
  } catch (error) {
    console.error("Error fetching barber:", error)
    return NextResponse.json({ error: "خطا در دریافت آرایشگر" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validated = barberSchema.parse(body)

    const { serviceIds, workingHours, ...barberData } = validated

    const barber = await prisma.barber.update({
      where: { id },
      data: {
        ...barberData,
        services: serviceIds ? {
          set: serviceIds.map(sid => ({ id: sid })),
        } : undefined,
        workingHours: workingHours ? {
          deleteMany: {},
          create: workingHours.map(wh => ({
            dayOfWeek: wh.dayOfWeek,
            startTime: wh.startTime,
            endTime: wh.endTime,
            isWorking: wh.isWorking,
          })),
        } : undefined,
      },
      include: {
        services: true,
        workingHours: true,
      },
    })

    return NextResponse.json(barber)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating barber:", error)
    return NextResponse.json({ error: "خطا در به‌روزرسانی آرایشگر" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.barber.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting barber:", error)
    return NextResponse.json({ error: "خطا در حذف آرایشگر" }, { status: 500 })
  }
}