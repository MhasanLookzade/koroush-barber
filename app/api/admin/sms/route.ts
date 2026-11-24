import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authorizeAdmin } from "@/lib/admin-auth"
import { getSmsProvider, getProviderStatus, isValidIranianPhone, normalizeIranianPhone } from "@/lib/providers/sms"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get("type")
    const statusFilter = searchParams.get("status")
    const search = searchParams.get("search")

    const providerStatus = getProviderStatus()

    // Fetch reminder interval setting
    const reminderSetting = await prisma.siteSetting.findUnique({
      where: { key: "sms_reminder_hours" },
    })
    const reminderHours = reminderSetting ? parseInt(reminderSetting.value, 10) : 2

    // Query filter
    const where: Record<string, unknown> = {}
    if (typeFilter && typeFilter !== "ALL") where.type = typeFilter
    if (statusFilter && statusFilter !== "ALL") where.status = statusFilter
    if (search) {
      where.OR = [
        { phone: { contains: search } },
        { recipientName: { contains: search } },
        { message: { contains: search } },
      ]
    }

    const [jobs, totalCount, sentCount, pendingCount, failedCount] = await Promise.all([
      prisma.notificationJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.notificationJob.count(),
      prisma.notificationJob.count({ where: { status: "SENT" } }),
      prisma.notificationJob.count({ where: { status: "PENDING" } }),
      prisma.notificationJob.count({ where: { status: "FAILED" } }),
    ])

    return NextResponse.json({
      provider: providerStatus,
      reminderHours,
      stats: {
        total: totalCount,
        sent: sentCount,
        pending: pendingCount,
        failed: failedCount,
      },
      jobs,
    })
  } catch (error) {
    console.error("Admin SMS API error:", error)
    return NextResponse.json({ error: "خطا در دریافت لاگ پیامک‌ها" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const { phone, recipientName, type, message } = body

    if (!phone || !message || !message.trim()) {
      return NextResponse.json(
        { error: "شماره همراه و متن پیام الزامی است" },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizeIranianPhone(phone)
    if (!isValidIranianPhone(normalizedPhone)) {
      return NextResponse.json(
        { error: "شماره تلفن همراه معتبر نیست (نمونه: ۰۹۱۲۳۴۵۶۷۸۹)" },
        { status: 400 }
      )
    }

    // Check opt-out consent if customer exists
    const customer = await prisma.customer.findUnique({
      where: { phone: normalizedPhone },
    })

    const msgType = type || "CUSTOM"
    if (customer && customer.smsConsent === false && msgType !== "CONFIRMATION" && msgType !== "REMINDER") {
      return NextResponse.json(
        { error: "این مشتری رضایت دریافت پیامک‌های تبلیغاتی/مناسبتی را لغو کرده است" },
        { status: 403 }
      )
    }

    const sms = getSmsProvider()
    const sendRes = await sms.sendCustomSms(normalizedPhone, message.trim())

    const job = await prisma.notificationJob.create({
      data: {
        phone: normalizedPhone,
        recipientName: recipientName || customer?.name || "مشتری سالن",
        type: msgType,
        message: message.trim(),
        status: sendRes.success ? "SENT" : "FAILED",
        error: sendRes.error || null,
        provider: sms.name,
        sentAt: sendRes.success ? new Date() : null,
      },
    })

    return NextResponse.json({
      success: true,
      job,
      deliveryStatus: sendRes.success ? "DELIVERED" : "FAILED",
    })
  } catch (error) {
    console.error("Send SMS error:", error)
    return NextResponse.json({ error: "خطا در ارسال پیامک" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const { action, jobId, reminderHours } = body

    // Action 1: Retry failed notification
    if (action === "retry" && jobId) {
      const job = await prisma.notificationJob.findUnique({ where: { id: jobId } })
      if (!job) {
        return NextResponse.json({ error: "پیام مورد نظر یافت نشد" }, { status: 404 })
      }

      const sms = getSmsProvider()
      const sendRes = await sms.sendCustomSms(job.phone, job.message)

      const updated = await prisma.notificationJob.update({
        where: { id: jobId },
        data: {
          status: sendRes.success ? "SENT" : "FAILED",
          error: sendRes.error || null,
          sentAt: sendRes.success ? new Date() : null,
        },
      })

      return NextResponse.json({ success: true, job: updated })
    }

    // Action 2: Update reminder interval hours setting
    if (action === "update_setting" && reminderHours !== undefined) {
      const hours = Math.max(1, Math.min(48, parseInt(String(reminderHours), 10)))
      await prisma.siteSetting.upsert({
        where: { key: "sms_reminder_hours" },
        create: {
          key: "sms_reminder_hours",
          value: String(hours),
          group: "sms",
          label: "زمان‌بندی یادآوری پیامکی نوبت (ساعت)",
          description: "فاصله زمانی ارسال پیامک یادآوری قبل از ساعت نوبت",
        },
        update: {
          value: String(hours),
        },
      })

      return NextResponse.json({ success: true, reminderHours: hours })
    }

    return NextResponse.json({ error: "عملیات نامعتبر است" }, { status: 400 })
  } catch (error) {
    console.error("SMS patch error:", error)
    return NextResponse.json({ error: "خطا در پردازش عملیات پیامک" }, { status: 500 })
  }
}
