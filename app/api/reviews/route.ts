import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"

export const dynamic = "force-dynamic"

const submitReviewSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ حرف باشد").max(50, "نام بیش از حد طولانی است"),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5, "متن نظر باید حداقل ۵ حرف باشد").max(600, "متن نظر حداکثر ۶۰۰ حرف است"),
  trackingCode: z.string().optional().nullable(),
})

// Simple in-memory IP rate limiter: max 3 reviews per IP per 10 minutes
const submissionTimestamps = new Map<string, number[]>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 10 * 60 * 1000
  const history = submissionTimestamps.get(ip) || []
  const valid = history.filter((t) => now - t < windowMs)
  if (valid.length >= 3) return false
  valid.push(now)
  submissionTimestamps.set(ip, valid)
  return true
}

/**
 * Public GET: Fetch approved reviews only
 */
export async function GET() {
  try {
    const reviews = await prisma.review.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        rating: true,
        comment: true,
        isVerified: true,
        createdAt: true,
      },
      take: 20,
    })

    const count = await prisma.review.count({ where: { status: "APPROVED" } })
    const avgRating =
      reviews.length > 0
        ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1))
        : 5.0

    return NextResponse.json({
      reviews,
      total: count,
      avgRating,
    })
  } catch (error) {
    console.error("Error fetching reviews:", error)
    return NextResponse.json(
      { error: "خطا در بارگذاری نظرات مراجعان" },
      { status: 500 }
    )
  }
}

/**
 * Public POST: Submit a new customer review (Status = PENDING by default)
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "local"
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "تعداد ارسال‌های شما بیش از حد مجاز است. لطفاً چند دقیقه دیگر امتحان کنید." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = submitReviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "داده‌های ورودی نامعتبر است" },
        { status: 400 }
      )
    }

    const { name, rating, comment, trackingCode } = parsed.data

    // Sanitize string (strip HTML brackets)
    const sanitizedName = name.replace(/[<>]/g, "").trim()
    const sanitizedComment = comment.replace(/[<>]/g, "").trim()

    // Check if tracking code belongs to a valid confirmed or completed booking
    let isVerified = false
    if (trackingCode && trackingCode.trim()) {
      const cleanCode = trackingCode.trim().toUpperCase()
      const appointment = await prisma.appointment.findFirst({
        where: {
          trackingCode: cleanCode,
          status: { in: ["CONFIRMED", "COMPLETED"] },
        },
      })
      if (appointment) {
        isVerified = true
      }
    }

    const newReview = await prisma.review.create({
      data: {
        name: sanitizedName,
        rating,
        comment: sanitizedComment,
        trackingCode: trackingCode?.trim() || null,
        isVerified,
        status: "PENDING", // Moderation required
      },
    })

    return NextResponse.json({
      success: true,
      message: "نظر شما با موفقیت ثبت شد و پس از بررسی و تایید مدیریت سالن منتشر خواهد شد.",
      reviewId: newReview.id,
      isVerified,
    })
  } catch (error) {
    console.error("Error creating review:", error)
    return NextResponse.json(
      { error: "خطا در ثبت نظر. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    )
  }
}
