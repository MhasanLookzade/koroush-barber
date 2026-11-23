import { NextRequest, NextResponse } from "next/server"
import { authorizeAdmin } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  return NextResponse.json({
    authenticated: true,
    user: auth.session,
  })
}
