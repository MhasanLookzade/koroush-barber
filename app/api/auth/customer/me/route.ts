import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const customerId = request.cookies.get("customer_auth")?.value

    if (!customerId) {
      return NextResponse.json({ customer: null }, { status: 401 })
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        avatar: true,
        isVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })

    if (!customer) {
      return NextResponse.json({ customer: null }, { status: 404 })
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error("Error fetching customer:", error)
    return NextResponse.json(
      { error: "خطا در دریافت اطلاعات کاربر" },
      { status: 500 }
    )
  }
}
