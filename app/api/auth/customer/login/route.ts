import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"
import bcrypt from "bcryptjs"

const loginSchema = z.object({
  phone: z.string().regex(/^09\d{9}$/, "فرمت شماره تماس: 09xxxxxxxxx"),
  password: z.string().min(1, "رمز عبور الزامی است"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = loginSchema.parse(body)

    // Find customer by phone
    const customer = await prisma.customer.findUnique({
      where: { phone: validated.phone },
    })

    if (!customer || !customer.passwordHash) {
      return NextResponse.json(
        { error: "شماره تماس یا رمز عبور اشتباه است" },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await bcrypt.compare(validated.password, customer.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: "شماره تماس یا رمز عبور اشتباه است" },
        { status: 401 }
      )
    }

    // Update last login
    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "CUSTOMER_LOGIN",
        entity: "Customer",
        entityId: customer.id,
        userId: customer.id,
        userType: "customer",
      },
    })

    const response = NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        isVerified: customer.isVerified,
      },
      message: "ورود با موفقیت انجام شد",
    })

    // Set auth cookie
    response.cookies.set("customer_auth", customer.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error logging in customer:", error)
    return NextResponse.json({ error: "خطا در ورود" }, { status: 500 })
  }
}