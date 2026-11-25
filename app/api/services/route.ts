import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { authorizeAdmin } from "@/lib/admin-auth"

const serviceSchema = z.object({
  name: z.string().min(1, "نام خدمت الزامی است").max(100),
  description: z.string().max(500).optional(),
  price: z.number().int().positive("قیمت باید مثبت باشد"),
  duration: z.number().int().positive("مدت زمان باید مثبت باشد"),
  category: z.string().min(1, "دسته‌بندی الزامی است").max(60),
  isActive: z.boolean().default(true),
})

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { category: "asc" },
    })
    return NextResponse.json(services)
  } catch (error) {
    console.error("Error fetching services:", error)
    return NextResponse.json({ error: "خطا در دریافت خدمات" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = authorizeAdmin(request, "OWNER")
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const validated = serviceSchema.parse(body)

    const service = await prisma.service.create({
      data: {
        name: validated.name,
        description: validated.description || null,
        price: validated.price,
        duration: validated.duration,
        category: validated.category,
        isActive: validated.isActive,
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