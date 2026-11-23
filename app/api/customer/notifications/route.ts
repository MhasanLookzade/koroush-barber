import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"

const querySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(50).default(20),
  unreadOnly: z.coerce.boolean().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const customerId = request.cookies.get("customer_auth")?.value

    if (!customerId) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const validated = querySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      unreadOnly: searchParams.get("unreadOnly"),
    })

    const where: Record<string, unknown> = { customerId }
    if (validated.unreadOnly) {
      where.isRead = false
    }

    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { sentAt: "desc" },
        skip: (validated.page - 1) * validated.limit,
        take: validated.limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { customerId, isRead: false } }),
    ])

    return NextResponse.json({
      notifications,
      unreadCount,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        totalCount,
        totalPages: Math.ceil(totalCount / validated.limit),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "خطا در دریافت اعلان‌ها" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const customerId = request.cookies.get("customer_auth")?.value

    if (!customerId) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 })
    }

    const body = await request.json()
    const { notificationIds, markAllAsRead } = body

    if (markAllAsRead) {
      await prisma.notification.updateMany({
        where: { customerId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      })
      return NextResponse.json({ message: "همه اعلان‌ها خوانده شده" })
    }

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: notificationIds }, customerId },
        data: { isRead: true, readAt: new Date() },
      })
      return NextResponse.json({ message: "اعلان‌ها خوانده شده" })
    }

    return NextResponse.json({ error: "پارامترهای نامعتبر" }, { status: 400 })
  } catch (error) {
    console.error("Error updating notifications:", error)
    return NextResponse.json({ error: "خطا در به‌روزرسانی اعلان‌ها" }, { status: 500 })
  }
}