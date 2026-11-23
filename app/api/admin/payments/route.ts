import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authorizeAdmin } from "@/lib/admin-auth"
import { formatJalaliFull, getTehranDateString } from "@/lib/jalali"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = authorizeAdmin(request, "OWNER")
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format")
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {}
    if (status && status !== "ALL") {
      where.status = status
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        appointment: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    if (format === "csv") {
      // Build UTF-8 CSV with BOM for Persian Excel support
      const BOM = "\uFEFF"
      const headers = [
        "شناسه پرداخت",
        "کد رهگیری نوبت",
        "مشتری",
        "شماره تماس",
        "خدمت",
        "مبلغ (تومان)",
        "درگاه",
        "وضعیت",
        "شماره ارجاع بانک (RefId)",
        "کارت",
        "تاریخ و زمان",
      ].join(",")

      const rows = payments.map((p) => {
        return [
          p.authority,
          p.appointment.trackingCode,
          `"${p.appointment.customerName}"`,
          p.appointment.customerPhone,
          `"${p.appointment.service.name}"`,
          p.amountToman,
          p.gateway,
          p.status,
          p.refId || "—",
          p.cardPan || "—",
          `"${p.verifiedAt ? formatJalaliFull(p.verifiedAt) : formatJalaliFull(p.createdAt)}"`,
        ].join(",")
      })

      const csvContent = BOM + [headers, ...rows].join("\r\n")

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="kourosh-barber-payments-${getTehranDateString()}.csv"`,
        },
      })
    }

    const formatted = payments.map((p) => ({
      id: p.id,
      authority: p.authority,
      trackingCode: p.appointment.trackingCode,
      customerName: p.appointment.customerName,
      customerPhone: p.appointment.customerPhone,
      serviceName: p.appointment.service.name,
      amountToman: p.amountToman,
      gateway: p.gateway,
      status: p.status,
      refId: p.refId,
      cardPan: p.cardPan,
      errorCode: p.errorCode,
      errorMessage: p.errorMessage,
      verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
      jalaliFull: p.verifiedAt ? formatJalaliFull(p.verifiedAt) : formatJalaliFull(p.createdAt),
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Admin payments error:", error)
    return NextResponse.json({ error: "خطا در دریافت گزارش مالی" }, { status: 500 })
  }
}
