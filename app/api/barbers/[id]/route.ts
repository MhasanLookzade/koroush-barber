import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { authorizeAdmin, getAdminFromRequest } from "@/lib/admin-auth"

const workingHoursSchema = z.object({
  id: z.string().optional(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  isWorking: z.boolean().default(true),
})

const barberSchema = z.object({
  name: z.string().min(1, "نام آرایشگر الزامی است").max(100).optional(),
  title: z.string().max(100).optional(),
  email: z.string().email("ایمیل معتبر وارد کنید").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  bio: z.string().max(1000).optional(),
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
    if (!id) {
      return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 })
    }
    const isAdmin = Boolean(getAdminFromRequest(request))

    const barber = await prisma.barber.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        title: true,
        bio: true,
        avatar: true,
        rating: true,
        reviewCount: true,
        isActive: true,
        ...(isAdmin ? { email: true, phone: true } : {}),
        services: {
          select: { id: true, name: true, isActive: true },
        },
        workingHours: true,
        ...(isAdmin
          ? {
              appointments: {
                where: {
                  status: { in: ["HELD", "CONFIRMED"] },
                  date: { gte: new Date() },
                },
                orderBy: { date: "asc" },
              },
            }
          : {}),
      },
    })

    if (!barber || (!isAdmin && !barber.isActive)) {
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
  const auth = authorizeAdmin(request, "OWNER")
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 })
    }
    const existing = await prisma.barber.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "آرایشگر یافت نشد" }, { status: 404 })
    }

    const body = await request.json()
    const validated = barberSchema.parse(body)

    const { serviceIds, workingHours } = validated

    const barber = await prisma.barber.update({
      where: { id },
      data: {
        ...(validated.name !== undefined ? { name: validated.name } : {}),
        ...(validated.title !== undefined ? { title: validated.title || null } : {}),
        ...(validated.email !== undefined ? { email: validated.email || null } : {}),
        ...(validated.phone !== undefined ? { phone: validated.phone || null } : {}),
        ...(validated.bio !== undefined ? { bio: validated.bio || null } : {}),
        ...(validated.avatar !== undefined ? { avatar: validated.avatar || null } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
        services: serviceIds
          ? {
              set: serviceIds.map((sid) => ({ id: sid })),
            }
          : undefined,
        workingHours: workingHours
          ? {
              deleteMany: {},
              create: workingHours.map((wh) => ({
                dayOfWeek: wh.dayOfWeek,
                startTime: wh.startTime,
                endTime: wh.endTime,
                isWorking: wh.isWorking,
              })),
            }
          : undefined,
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
  const auth = authorizeAdmin(request, "OWNER")
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 })
    }
    const existing = await prisma.barber.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "آرایشگر یافت نشد" }, { status: 404 })
    }
    await prisma.barber.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting barber:", error)
    return NextResponse.json({ error: "خطا در حذف آرایشگر" }, { status: 500 })
  }
}