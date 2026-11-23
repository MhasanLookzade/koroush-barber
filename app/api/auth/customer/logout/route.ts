import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true, message: "خروج با موفقیت انجام شد" })

  response.cookies.set("customer_auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })

  return response
}