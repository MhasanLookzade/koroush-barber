import { NextRequest, NextResponse } from "next/server"
import { handlePaymentCallback } from "@/lib/booking-engine"
import { getTehranDateString, getTehranTimeString } from "@/lib/jalali"

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
      return NextResponse.redirect(new URL("/?error=شناسه_تراکنش_نامعتبر_است#booking", request.url))
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

    const app = result.appointment as {
      id?: string
      serviceId?: string
      date?: Date | string
      customerName?: string
      customerPhone?: string
      trackingCode?: string
    } | null

    if (result.success) {
      return NextResponse.redirect(
        new URL(
          `/booking/success?trackingCode=${app?.trackingCode || ""}&authority=${authority}`,
          request.url
        )
      )
    } else {
      const redirectParams = new URLSearchParams()
      redirectParams.set("cancelled", "true")
      redirectParams.set("error", result.message)
      if (app) {
        if (app.serviceId) redirectParams.set("serviceId", app.serviceId)
        if (app.date) {
          const d = typeof app.date === "string" ? new Date(app.date) : app.date
          redirectParams.set("dateStr", getTehranDateString(d))
          redirectParams.set("timeStr", getTehranTimeString(d))
        }
        if (app.customerPhone) redirectParams.set("phone", app.customerPhone)
        if (app.customerName) redirectParams.set("name", app.customerName)
      }
      return NextResponse.redirect(
        new URL(`/?${redirectParams.toString()}#booking`, request.url)
      )
    }
  } catch (error: unknown) {
    console.error("Payment callback error:", error)
    const message = error instanceof Error ? error.message : "خطای پردازش بازگشت از درگاه"
    return NextResponse.redirect(
      new URL(`/#booking?error=${encodeURIComponent(message)}`, request.url)
    )
  }
}
