import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { verifyPassword, signAdminToken } from "@/lib/auth"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const isLocalhost = ip === "127.0.0.1" || ip === "::1" || ip === "localhost"
    const maxAttempts = isLocalhost && process.env.NODE_ENV !== "production" ? 100 : 8
    const rateCheck = checkRateLimit(`login_${ip}`, maxAttempts, 15 * 60 * 1000)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر مجدداً تلاش فرمایید." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: "نام کاربری و کلمه عبور الزامی است" },
        { status: 400 }
      )
    }

    const admin = await prisma.adminUser.findUnique({
      where: { username: username.trim().toLowerCase() },
    })

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { error: "نام کاربری یا کلمه عبور نادرست است" },
        { status: 401 }
      )
    }

    const isValid = await verifyPassword(password, admin.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: "نام کاربری یا کلمه عبور نادرست است" },
        { status: 401 }
      )
    }

    // Update last login
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    })

    const token = signAdminToken({
      userId: admin.id,
      username: admin.username,
      name: admin.name,
      role: admin.role as "OWNER" | "STAFF",
    })

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
      },
    })

    // Set secure cookie
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 3600,
      path: "/",
    })
    response.cookies.set("admin_auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 3600,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Admin login error:", error)
    return NextResponse.json({ error: "خطا در ورود به سیستم" }, { status: 500 })
  }
}
