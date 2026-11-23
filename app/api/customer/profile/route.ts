import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"
import bcrypt from "bcryptjs"

const updateProfileSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ کاراکتر باشد").optional(),
  email: z.string().email("ایمیل معتبر وارد کنید").optional().or(z.literal("")),
  avatar: z.string().url("آدرس آواتار معتبر نیست").optional().or(z.literal("")),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "رمز عبور فعلی الزامی است"),
  newPassword: z.string().min(8, "رمز عبور جدید باید حداقل ۸ کاراکتر باشد"),
})

export async function GET(request: NextRequest) {
  try {
    const customerId = request.cookies.get("customer_auth")?.value

    if (!customerId) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 })
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
      return NextResponse.json({ error: "مشتری یافت نشد" }, { status: 404 })
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "خطا در دریافت پروفایل" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const customerId = request.cookies.get("customer_auth")?.value

    if (!customerId) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 })
    }

    const body = await request.json()
    const isPasswordChange = "currentPassword" in body

    if (isPasswordChange) {
      const validated = changePasswordSchema.parse(body)

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { passwordHash: true },
      })

      if (!customer || !customer.passwordHash) {
        return NextResponse.json({ error: "حساب کاربری یافت نشد" }, { status: 404 })
      }

      const isValid = await bcrypt.compare(validated.currentPassword, customer.passwordHash)
      if (!isValid) {
        return NextResponse.json({ error: "رمز عبور فعلی اشتباه است" }, { status: 400 })
      }

      const newPasswordHash = await bcrypt.hash(validated.newPassword, 12)

      await prisma.customer.update({
        where: { id: customerId },
        data: { passwordHash: newPasswordHash },
      })

      await prisma.auditLog.create({
        data: {
          action: "CUSTOMER_CHANGE_PASSWORD",
          entity: "Customer",
          entityId: customerId,
          userId: customerId,
          userType: "customer",
        },
      })

      return NextResponse.json({ message: "رمز عبور با موفقیت تغییر کرد" })
    } else {
      const validated = updateProfileSchema.parse(body)

      const updateData: Record<string, unknown> = {}
      if (validated.name !== undefined) updateData.name = validated.name
      if (validated.email !== undefined) updateData.email = validated.email || null
      if (validated.avatar !== undefined) updateData.avatar = validated.avatar || null

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: "هیچ تغییری ارسال نشده" }, { status: 400 })
      }

      const customer = await prisma.customer.update({
        where: { id: customerId },
        data: updateData,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          avatar: true,
          isVerified: true,
        },
      })

      await prisma.auditLog.create({
        data: {
          action: "CUSTOMER_UPDATE_PROFILE",
          entity: "Customer",
          entityId: customerId,
          userId: customerId,
          userType: "customer",
          newData: JSON.stringify(updateData),
        },
      })

      return NextResponse.json({ customer, message: "پروفایل با موفقیت به‌روزرسانی شد" })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "خطا در به‌روزرسانی پروفایل" }, { status: 500 })
  }
}