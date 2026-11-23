import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authorizeAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const settings = await prisma.siteSetting.findMany({
      orderBy: { key: "asc" },
    })

    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => {
      settingsMap[s.key] = s.value
    })

    return NextResponse.json({
      settings: settingsMap,
      raw: settings,
    })
  } catch (error) {
    console.error("Admin settings error:", error)
    return NextResponse.json({ error: "خطا در دریافت تنظیمات" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = authorizeAdmin(request, "OWNER")
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const { settings } = body

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "فرمت تنظیمات نامعتبر است" }, { status: 400 })
    }

    const updates = []
    for (const [key, value] of Object.entries(settings)) {
      updates.push(
        prisma.siteSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: {
            key,
            value: String(value),
            group: key.includes("sms") ? "sms" : key.includes("payment") ? "payment" : "general",
          },
        })
      )
    }

    await prisma.$transaction(updates)

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_UPDATE_SETTINGS",
        entity: "SiteSetting",
        userId: auth.session.userId,
        userRole: auth.session.role,
        details: JSON.stringify(settings),
      },
    })

    return NextResponse.json({
      success: true,
      message: "تنظیمات با موفقیت ذخیره گردید",
    })
  } catch (error) {
    console.error("Save settings error:", error)
    return NextResponse.json({ error: "خطا در ذخیره تنظیمات" }, { status: 500 })
  }
}
