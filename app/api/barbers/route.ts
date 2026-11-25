import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { authorizeAdmin, getAdminFromRequest } from "@/lib/admin-auth"

const workingHoursSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  isWorking: z.boolean().default(true),
})

const barberSchema = z.object({
  name: z.string().min(1, "نام آرایشگر الزامی است").max(100),
  title: z.string().max(100).optional(),
  email: z.string().email("ایمیل معتبر وارد کنید").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  bio: z.string().max(1000).optional(),
  avatar: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  serviceIds: z.array(z.string()).default([]),
  workingHours: z.array(workingHoursSchema).default([]),
})

export async function GET(request: NextRequest) {
  try {
    const isAdmin = Boolean(getAdminFromRequest(request))
    const barbers = await prisma.barber.findMany({
      where: isAdmin ? undefined : { isActive: true },
      select: {
        id: true,
        name: true,
        title: true,
        bio: true,
        avatar: true,
        rating: true,
        reviewCount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        ...(isAdmin ? { email: true, phone: true } : {}),
        services: {
          select: { id: true, name: true, isActive: true },
        },
        workingHours: true,
      },
      orderBy: { name: "asc" },
    })
    return NextResponse.json(barbers)
  } catch (error) {
    console.error("Error fetching barbers:", error)
    return NextResponse.json({ error: "خطا در دریافت آرایشگرها" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = authorizeAdmin(request, "OWNER")
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const validated = barberSchema.parse(body)

    const { serviceIds, workingHours } = validated

    const barber = await prisma.barber.create({
      data: {
        name: validated.name,
        title: validated.title || null,
        email: validated.email || null,
        phone: validated.phone || null,
        bio: validated.bio || null,
        avatar: validated.avatar || null,
        isActive: validated.isActive ?? true,
        services: {
          connect: serviceIds.map((id) => ({ id })),
        },
        workingHours: {
          create: workingHours.map((wh) => ({
            dayOfWeek: wh.dayOfWeek,
            startTime: wh.startTime,
            endTime: wh.endTime,
            isWorking: wh.isWorking,
          })),
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