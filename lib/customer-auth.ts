import { NextRequest, NextResponse } from "next/server"
import { verifyCustomerToken, CustomerSession } from "./auth"

export const CUSTOMER_COOKIE_NAME = "customer_auth"

export function getCustomerFromRequest(request: NextRequest): CustomerSession | null {
  const cookie = request.cookies.get(CUSTOMER_COOKIE_NAME)?.value
  if (cookie) {
    const session = verifyCustomerToken(cookie)
    if (session) return session
  }

  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    const session = verifyCustomerToken(token)
    if (session) return session
  }

  return null
}

export function authorizeCustomer(
  request: NextRequest
): { session: CustomerSession } | { errorResponse: NextResponse } {
  const session = getCustomerFromRequest(request)
  if (!session) {
    return {
      errorResponse: NextResponse.json(
        { error: "غیرمجاز. لطفاً وارد حساب کاربری خود شوید." },
        { status: 401 }
      ),
    }
  }

  return { session }
}
