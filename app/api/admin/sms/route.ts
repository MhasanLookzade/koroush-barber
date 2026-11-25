import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authorizeAdmin } from "@/lib/admin-auth"
import { getProviderStatus, isValidIranianPhone, normalizeIranianPhone } from "@/lib/providers/sms"
import {
  enqueueNotificationJob,
  processNotificationJob,
  processDueNotificationJobs,
  runScheduledNotificationCycle,
} from "@/lib/notifications"

export const dynamic = "force-dynamic"

export interface SmsTemplateItem {
  id: string
  title: string
  type: "CONFIRMATION" | "REMINDER" | "BIRTHDAY" | "CANCELLATION" | "RESCHEDULE" | "THANKYOU" | "CUSTOM"
  trigger: string
  text: string
  isActive: boolean
  isSystem: boolean
}

export interface ReminderRulesConfig {
  appointmentReminder: {
    enabled: boolean
    hoursBefore: number
    templateId: string
  }
  birthdayGreeting: {
    enabled: boolean
    sendTime: string
    templateId: string
  }
  bookingConfirmation: {
    enabled: boolean
    templateId: string
  }
  cancellationNotice: {
    enabled: boolean
    templateId: string
  }
  rescheduleNotice: {
    enabled: boolean
    templateId: string
  }
}

const DEFAULT_TEMPLATES: SmsTemplateItem[] = [
  {
    id: "tpl_confirmation",
    title: "تأیید رزرو نوبت",
    type: "CONFIRMATION",
    trigger: "رویداد-محور (بلافاصله پس از پرداخت بیعانه)",
    text: `کوروش باربر\n{customer_name} عزیز، نوبت شما با موفقیت ثبت شد.\nخدمت: {service_name}\nتاریخ: {jalali_date}\nساعت: {appointment_time}\nکد پیگیری: {tracking_code}\nمنتظر دیدارتان هستیم.`,
    isActive: true,
    isSystem: true,
  },
  {
    id: "tpl_reminder",
    title: "یادآوری نوبت قبل از مراجعه",
    type: "REMINDER",
    trigger: "زمان‌بندی‌شده (قبل از نوبت)",
    text: `یادآوری نوبت کوروش باربر\n{customer_name} عزیز، نوبت شما ساعت {appointment_time} در تاریخ {jalali_date} است.\nخدمت: {service_name}\nکد پیگیری: {tracking_code}`,
    isActive: true,
    isSystem: true,
  },
  {
    id: "tpl_birthday",
    title: "تبریک سالروز تولد",
    type: "BIRTHDAY",
    trigger: "زمان‌بندی‌شده (صبح روز تولد مشتری)",
    text: `کوروش باربر\n{customer_name} عزیز، سالروز تولدت مبارک! 🎉\nامیدواریم سال جدید زندگیت پر از سلامتی و موفقیت باشه.\nبه این مناسبت هدیه ویژه‌ای برای مراجعه بعدیت در نظر گرفته شده.`,
    isActive: true,
    isSystem: true,
  },
  {
    id: "tpl_cancellation",
    title: "اطلاع‌رسانی لغو نوبت",
    type: "CANCELLATION",
    trigger: "رویداد-محور (هنگام لغو نوبت)",
    text: `کوروش باربر\n{customer_name} عزیز، نوبت شما در تاریخ {jalali_date} ساعت {appointment_time} با کد {tracking_code} لغو گردید.`,
    isActive: true,
    isSystem: true,
  },
  {
    id: "tpl_reschedule",
    title: "اطلاع‌رسانی جابجایی زمان نوبت",
    type: "RESCHEDULE",
    trigger: "رویداد-محور (هنگام جابجایی نوبت)",
    text: `کوروش باربر\n{customer_name} عزیز، زمان نوبت شما تغییر یافت.\nتاریخ جدید: {jalali_date}\nساعت جدید: {appointment_time}\nکد پیگیری: {tracking_code}`,
    isActive: true,
    isSystem: true,
  },
  {
    id: "tpl_thankyou",
    title: "تشکر پس از انجام خدمت",
    type: "THANKYOU",
    trigger: "رویداد-محور (پس از تکمیل و تسویه)",
    text: `کوروش باربر\n{customer_name} عزیز، از حضورتان در سالن کوروش سپاسگزاریم.\nامیدواریم از کیفیت استایل رضایت کامل داشته باشید.`,
    isActive: true,
    isSystem: false,
  },
]

const DEFAULT_REMINDER_RULES: ReminderRulesConfig = {
  appointmentReminder: {
    enabled: true,
    hoursBefore: 2,
    templateId: "tpl_reminder",
  },
  birthdayGreeting: {
    enabled: true,
    sendTime: "10:00",
    templateId: "tpl_birthday",
  },
  bookingConfirmation: {
    enabled: true,
    templateId: "tpl_confirmation",
  },
  cancellationNotice: {
    enabled: true,
    templateId: "tpl_cancellation",
  },
  rescheduleNotice: {
    enabled: true,
    templateId: "tpl_reschedule",
  },
}

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
    const customerId = searchParams.get("customerId")

    const providerStatus = getProviderStatus()

    // Fetch reminder interval setting
    const reminderSetting = await prisma.siteSetting.findUnique({
      where: { key: "sms_reminder_hours" },
    })
    const reminderHours = reminderSetting ? parseInt(reminderSetting.value, 10) : 2

    // Fetch or initialize templates
    const templatesSetting = await prisma.siteSetting.findUnique({
      where: { key: "sms_templates" },
    })
    let templates: SmsTemplateItem[] = DEFAULT_TEMPLATES
    if (templatesSetting?.value) {
      try {
        templates = JSON.parse(templatesSetting.value)
      } catch {
        templates = DEFAULT_TEMPLATES
      }
    }

    // Fetch or initialize reminder rules
    const rulesSetting = await prisma.siteSetting.findUnique({
      where: { key: "sms_reminder_rules" },
    })
    let reminderRules: ReminderRulesConfig = DEFAULT_REMINDER_RULES
    if (rulesSetting?.value) {
      try {
        reminderRules = JSON.parse(rulesSetting.value)
      } catch {
        reminderRules = DEFAULT_REMINDER_RULES
      }
    }

    // Prefill customer info if requested
    let prefillCustomer: { id: string; name: string; phone: string } | null = null
    if (customerId) {
      const cust = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, name: true, phone: true },
      })
      if (cust) {
        prefillCustomer = cust
      }
    }

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

    const [jobs, totalCount, sentCount, pendingCount, failedCount, allCustomers] = await Promise.all([
      prisma.notificationJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.notificationJob.count(),
      prisma.notificationJob.count({ where: { status: "SENT" } }),
      prisma.notificationJob.count({ where: { status: { in: ["PENDING", "QUEUED", "SENDING", "RETRY_PENDING"] } } }),
      prisma.notificationJob.count({ where: { status: { in: ["FAILED", "UNKNOWN"] } } }),
      prisma.customer.findMany({
        select: { id: true, name: true, phone: true },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
    ])

    return NextResponse.json({
      provider: providerStatus,
      reminderHours,
      templates,
      reminderRules,
      prefillCustomer,
      customersList: allCustomers,
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
    return NextResponse.json({ error: "خطا در دریافت اطلاعات مرکز پیامک" }, { status: 500 })
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

    const enqueued = await enqueueNotificationJob(prisma, {
      phone: normalizedPhone,
      recipientName: recipientName || customer?.name || "مشتری سالن",
      type: msgType,
      message: message.trim(),
    })

    const delivery = await processNotificationJob(enqueued.job.id, {
      skipScheduleGuard: true,
    })

    const job = delivery.job || enqueued.job

    return NextResponse.json({
      success: delivery.finalStatus === "SENT",
      job,
      deliveryStatus: delivery.finalStatus === "SENT" ? "ACCEPTED_BY_PROVIDER" : delivery.finalStatus,
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
    const { action, jobId, reminderHours, template, templateId, rules } = body

    // Action 1: Retry failed/pending notification via outbox dispatcher
    if (action === "retry" && jobId) {
      const job = await prisma.notificationJob.findUnique({ where: { id: jobId } })
      if (!job) {
        return NextResponse.json({ error: "پیام مورد نظر یافت نشد" }, { status: 404 })
      }

      const outcome = await processNotificationJob(jobId, {
        allowManualRetry: true,
        skipScheduleGuard: true,
      })

      return NextResponse.json({
        success: outcome.finalStatus === "SENT",
        job: outcome.job || job,
        finalStatus: outcome.finalStatus,
      })
    }

    // Action 1b: Process due notification outbox jobs
    if (action === "process_outbox") {
      const outbox = await processDueNotificationJobs()
      return NextResponse.json({ success: true, outbox })
    }

    // Action 1c: Trigger scheduled reminder & birthday automation cycle
    if (action === "run_automations") {
      const cycle = await runScheduledNotificationCycle()
      return NextResponse.json({ success: true, ...cycle })
    }

    // Action 2: Save / Create / Update SMS Template
    if (action === "save_template" && template) {
      const currentSetting = await prisma.siteSetting.findUnique({ where: { key: "sms_templates" } })
      let currentTemplates: SmsTemplateItem[] = DEFAULT_TEMPLATES
      if (currentSetting?.value) {
        try {
          currentTemplates = JSON.parse(currentSetting.value)
        } catch {
          currentTemplates = DEFAULT_TEMPLATES
        }
      }

      const targetId = template.id || `custom_${Date.now()}`
      const existingIdx = currentTemplates.findIndex((t) => t.id === targetId)
      if (existingIdx >= 0) {
        currentTemplates[existingIdx] = {
          ...currentTemplates[existingIdx],
          ...template,
          id: targetId,
        }
      } else {
        currentTemplates.push({
          id: targetId,
          title: template.title || "قالب جدید",
          type: template.type || "CUSTOM",
          trigger: template.trigger || "سفارشی",
          text: template.text || "",
          isActive: template.isActive ?? true,
          isSystem: false,
        })
      }

      await prisma.siteSetting.upsert({
        where: { key: "sms_templates" },
        create: {
          key: "sms_templates",
          value: JSON.stringify(currentTemplates),
          group: "sms",
          label: "قالب‌های پیامک سالن",
        },
        update: { value: JSON.stringify(currentTemplates) },
      })

      return NextResponse.json({ success: true, templates: currentTemplates })
    }

    // Action 3: Delete Template
    if (action === "delete_template" && templateId) {
      const currentSetting = await prisma.siteSetting.findUnique({ where: { key: "sms_templates" } })
      let currentTemplates: SmsTemplateItem[] = DEFAULT_TEMPLATES
      if (currentSetting?.value) {
        try {
          currentTemplates = JSON.parse(currentSetting.value)
        } catch {
          currentTemplates = DEFAULT_TEMPLATES
        }
      }

      currentTemplates = currentTemplates.filter((t) => t.id !== templateId)

      await prisma.siteSetting.upsert({
        where: { key: "sms_templates" },
        create: { key: "sms_templates", value: JSON.stringify(currentTemplates), group: "sms" },
        update: { value: JSON.stringify(currentTemplates) },
      })

      return NextResponse.json({ success: true, templates: currentTemplates })
    }

    // Action 4: Update Reminder Rules & Scheduling
    if (action === "update_reminder_rules" && rules) {
      await prisma.siteSetting.upsert({
        where: { key: "sms_reminder_rules" },
        create: {
          key: "sms_reminder_rules",
          value: JSON.stringify(rules),
          group: "sms",
          label: "تنظیمات زمان‌بندی پیامک‌ها",
        },
        update: { value: JSON.stringify(rules) },
      })

      if (rules.appointmentReminder?.hoursBefore) {
        await prisma.siteSetting.upsert({
          where: { key: "sms_reminder_hours" },
          create: {
            key: "sms_reminder_hours",
            value: String(rules.appointmentReminder.hoursBefore),
            group: "sms",
          },
          update: { value: String(rules.appointmentReminder.hoursBefore) },
        })
      }

      return NextResponse.json({ success: true, rules })
    }

    // Action 5: Simple reminder interval hours update
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
