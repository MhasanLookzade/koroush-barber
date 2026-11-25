import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { signCustomerToken } from "@/lib/auth"
import { CUSTOMER_COOKIE_NAME } from "@/lib/customer-auth"

const registerSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ کاراکتر باشد"),
  phone: z.string().regex(/^09\d{9}$/, "فرمت شماره تماس: 09xxxxxxxxx"),
  email: z.string().email("ایمیل معتبر وارد کنید").optional().or(z.literal("")),
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = registerSchema.parse(body)

    // Check if customer already exists
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: validated.phone },
          ...(validated.email ? [{ email: validated.email }] : []),
        ],
      },
    })

    if (existingCustomer) {
      return NextResponse.json(
        { error: "مشتری با این شماره تماس یا ایمیل قبلاً ثبت‌نام کرده است" },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, 12)

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        name: validated.name,
        phone: validated.phone,
        email: validated.email || null,
        passwordHash,
        isVerified: false,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        isVerified: true,
        createdAt: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "CUSTOMER_REGISTER",
        entity: "Customer",
        entityId: customer.id,
        userId: customer.id,
        userType: "customer",
        newData: JSON.stringify({ name: customer.name, phone: customer.phone }),
      },
    })

    const response = NextResponse.json({
      success: true,
      customer,
      message: "ثبت‌نام با موفقیت انجام شد",
    })

    const token = signCustomerToken({
      customerId: customer.id,
      phone: customer.phone,
      name: customer.name,
    })

    // Set signed auth cookie
    response.cookies.set(CUSTOMER_COOKIE_NAME, token, {
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
    console.error("Error registering customer:", error)
    return NextResponse.json({ error: "خطا در ثبت‌نام" }, { status: 500 })
  }
}