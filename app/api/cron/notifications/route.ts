import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { authorizeAdmin } from "@/lib/admin-auth"
import { sanitizeTelemetryInput } from "@/lib/http"
import { runScheduledNotificationCycle } from "@/lib/notifications"

export const dynamic = "force-dynamic"

function verifyCronSecret(request: NextRequest): boolean {
  const configured = process.env.CRON_SECRET
  if (!configured || configured.trim().length < 16) {
    return false
  }
  const authHeader = request.headers.get("authorization") || ""
  if (!authHeader.startsWith("Bearer ")) {
    return false
  }
  const provided = authHeader.slice(7).trim()
  const a = Buffer.from(provided)
  const b = Buffer.from(configured.trim())
  if (a.length !== b.length) {
    return false
  }
  return crypto.timingSafeEqual(a, b)
}

async function handleCron(request: NextRequest) {
  const isCronAuth = verifyCronSecret(request)
  if (!isCronAuth) {
    const adminAuth = authorizeAdmin(request)
    if ("errorResponse" in adminAuth) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 })
    }
  }

  try {
    const summary = await runScheduledNotificationCycle()
    return NextResponse.json({
      success: true,
      ...summary,
    })
  } catch (err) {
    console.error("[CronNotifications] Execution error:", sanitizeTelemetryInput(err))
    return NextResponse.json(
      { error: "خطا در اجرای پردازشگر اعلان‌ها" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return handleCron(request)
}

export async function GET(request: NextRequest) {
  return handleCron(request)
}
