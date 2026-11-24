import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authorizeAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: { endpoint: string } }
) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const { endpoint } = params
    const setting = await prisma.siteSetting.findUnique({
      where: { key: `admin_${endpoint}` },
    })

    if (!setting) {
      return NextResponse.json({})
    }

    try {
      return NextResponse.json(JSON.parse(setting.value))
    } catch {
      return NextResponse.json(setting.value)
    }
  } catch (error) {
    console.error("Error fetching setting:", error)
    return NextResponse.json({ error: "خطا در دریافت تنظیمات" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { endpoint: string } }
) {
  const auth = authorizeAdmin(request, "OWNER")
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const { endpoint } = params
    const body = await request.json()

    const setting = await prisma.siteSetting.upsert({
      where: { key: `admin_${endpoint}` },
      update: { value: JSON.stringify(body) },
      create: {
        key: `admin_${endpoint}`,
        value: JSON.stringify(body),
        group: endpoint,
      },
    })

    return NextResponse.json({ success: true, setting })
  } catch (error) {
    console.error("Error saving setting:", error)
    return NextResponse.json({ error: "خطا در ذخیره تنظیمات" }, { status: 500 })
  }
}
