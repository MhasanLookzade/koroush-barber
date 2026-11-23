import { NextRequest, NextResponse } from "next/server"
import { handlePaymentCallback } from "@/lib/booking-engine"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return processCallback(request)
}

export async function POST(request: NextRequest) {
  return processCallback(request)
}

async function processCallback(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let authority = searchParams.get("Authority") || searchParams.get("authority")
    let status = searchParams.get("Status") || searchParams.get("status") || "OK"

    // If POST with body
    if (!authority && request.method === "POST") {
      try {
        const body = await request.json()
        authority = body.Authority || body.authority
        status = body.Status || body.status || "OK"
      } catch {
        // Body was not JSON
      }
    }

    if (!authority) {
      return NextResponse.redirect(new URL("/booking?error=شناسه_تراکنش_نامعتبر_است", request.url))
    }

    const result = await handlePaymentCallback({
      authority,
      gatewayStatus: status,
    })

    // If client requested JSON (e.g. API/integration test)
    const acceptsJson = request.headers.get("accept")?.includes("application/json")
    if (acceptsJson) {
      return NextResponse.json(result)
    }

    const appointment = result.appointment as { trackingCode: string }
    if (result.success) {
      return NextResponse.redirect(
        new URL(
          `/booking/success?trackingCode=${appointment?.trackingCode || ""}&authority=${authority}`,
          request.url
        )
      )
    } else {
      return NextResponse.redirect(
        new URL(`/booking?error=${encodeURIComponent(result.message)}`, request.url)
      )
    }
  } catch (error: unknown) {
    console.error("Payment callback error:", error)
    const message = error instanceof Error ? error.message : "خطای پردازش بازگشت از درگاه"
    return NextResponse.redirect(
      new URL(`/booking?error=${encodeURIComponent(message)}`, request.url)
    )
  }
}
