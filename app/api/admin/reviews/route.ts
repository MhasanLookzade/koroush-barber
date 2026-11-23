import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authorizeAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) return auth.errorResponse

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: { status?: string } = {}
    if (status && status !== "ALL") {
      where.status = status
    }

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    const counts = {
      all: await prisma.review.count(),
      pending: await prisma.review.count({ where: { status: "PENDING" } }),
      approved: await prisma.review.count({ where: { status: "APPROVED" } }),
      rejected: await prisma.review.count({ where: { status: "REJECTED" } }),
      hidden: await prisma.review.count({ where: { status: "HIDDEN" } }),
    }

    return NextResponse.json({ reviews, counts })
  } catch (error) {
    console.error("Error fetching admin reviews:", error)
    return NextResponse.json(
      { error: "خطا در دریافت لیست نظرات" },
      { status: 500 }
    )
  }
}
