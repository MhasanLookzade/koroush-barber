import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"

const serviceSchema = z.object({
  name: z.string().min(1, "نام خدمت الزامی است").optional(),
  description: z.string().optional(),
  price: z.number().positive("قیمت باید مثبت باشد").optional(),
  duration: z.number().positive("مدت زمان باید مثبت باشد").optional(),
  category: z.string().min(1, "دسته‌بندی الزامی است").optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const service = await prisma.service.findUnique({
      where: { id },
      include: { barbers: true },
    })

    if (!service) {
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
  try {
    const { id } = await params
    const body = await request.json()
    const validated = serviceSchema.parse(body)

    const service = await prisma.service.update({
      where: { id },
      data: validated,
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
  try {
    const { id } = await params
    await prisma.service.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting service:", error)
    return NextResponse.json({ error: "خطا در حذف خدمت" }, { status: 500 })
  }
}