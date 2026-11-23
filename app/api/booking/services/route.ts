import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    })
    return NextResponse.json(services)
  } catch (error) {
    console.error("Error fetching services:", error)
    return NextResponse.json(
      { error: "خطا در دریافت لیست خدمات" },
      { status: 500 }
    )
  }
}
