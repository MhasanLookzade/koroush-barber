import { NextRequest, NextResponse } from "next/server"
import { verifyAdminToken, AdminSession } from "./auth"

export function getAdminFromRequest(request: NextRequest): AdminSession | null {
  // 1. Try reading cookie
  const cookie = request.cookies.get("admin_token")?.value || request.cookies.get("admin_auth")?.value
  if (cookie) {
    const session = verifyAdminToken(cookie)
    if (session) return session
  }

  // 2. Try Authorization header
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    const session = verifyAdminToken(token)
    if (session) return session
  }

  return null
}

export function authorizeAdmin(
  request: NextRequest,
  requiredRole?: "OWNER" | "STAFF"
): { session: AdminSession } | { errorResponse: NextResponse } {
  const session = getAdminFromRequest(request)

  if (!session) {
    return {
      errorResponse: NextResponse.json(
        { error: "دسترسی غیرمجاز. لطفاً وارد حساب مدیریت شوید." },
        { status: 401 }
      ),
    }
  }

  if (requiredRole === "OWNER" && session.role !== "OWNER") {
    return {
      errorResponse: NextResponse.json(
        { error: "این بخش تنها برای مدیر کل (OWNER) در دسترس است." },
        { status: 403 }
      ),
    }
  }

  return { session }
}
