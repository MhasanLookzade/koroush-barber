import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: "ok",
      app: "Koroush Barber",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      timezone: "Asia/Tehran",
      database: "connected",
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Database error",
      },
      { status: 503 }
    )
  }
}
