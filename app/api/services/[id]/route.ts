import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { authorizeAdmin } from "@/lib/admin-auth"

const serviceSchema = z.object({
  name: z.string().min(1, "نام خدمت الزامی است").max(100).optional(),
  description: z.string().max(500).optional(),
  price: z.number().int().positive("قیمت باید مثبت باشد").optional(),
  duration: z.number().int().positive("مدت زمان باید مثبت باشد").optional(),
  category: z.string().min(1, "دسته‌بندی الزامی است").max(60).optional(),
  isActive: z.boolean().optional(),
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

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        barbers: {
          where: { isActive: true },
          select: { id: true, name: true, title: true, avatar: true },
        },
      },
    })

    if (!service || !service.isActive) {
      return NextResponse.json({ error: "خدمت یافت نشد" }, { status: 404 })
    }

    return NextResponse.json(service)
  } catch (error) {
    console.error("Error fetching service:", error)
    return NextResponse.json({ error: "خطا در دریافت خدمت" }, { status: 500 })
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
    const existing = await prisma.service.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "خدمت یافت نشد" }, { status: 404 })
    }

    const body = await request.json()
    const validated = serviceSchema.parse(body)

    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(validated.name !== undefined ? { name: validated.name } : {}),
        ...(validated.description !== undefined ? { description: validated.description || null } : {}),
        ...(validated.price !== undefined ? { price: validated.price } : {}),
        ...(validated.duration !== undefined ? { duration: validated.duration } : {}),
        ...(validated.category !== undefined ? { category: validated.category } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
      },
    })

    return NextResponse.json(service)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating service:", error)
    return NextResponse.json({ error: "خطا در به‌روزرسانی خدمت" }, { status: 500 })
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
    const existing = await prisma.service.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "خدمت یافت نشد" }, { status: 404 })
    }

    await prisma.service.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting service:", error)
    return NextResponse.json({ error: "خطا در حذف خدمت" }, { status: 500 })
  }
}