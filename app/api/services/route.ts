import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"

const serviceSchema = z.object({
  name: z.string().min(1, "نام خدمت الزامی است"),
  description: z.string().optional(),
  price: z.number().positive("قیمت باید مثبت باشد"),
  duration: z.number().positive("مدت زمان باید مثبت باشد"),
  category: z.string().min(1, "دسته‌بندی الزامی است"),
  isActive: z.boolean().default(true),
})

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' },
    })
    return NextResponse.json(services)
  } catch (error) {
    console.error("Error fetching services:", error)
    return NextResponse.json({ error: "خطا در دریافت خدمات" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = serviceSchema.parse(body)

    const service = await prisma.service.create({
      data: {
        ...validated,
        depositPrice: Math.round(validated.price * 0.2),
      },
    })

    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating service:", error)
    return NextResponse.json({ error: "خطا در ایجاد خدمت" }, { status: 500 })
  }
}