import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { verifyPassword, signAdminToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
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

    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 3600,
      path: "/",
    })
    response.cookies.set("admin_auth", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 3600,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "خطا در ورود" }, { status: 500 })
  }
}
