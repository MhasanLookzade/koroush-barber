import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authorizeAdmin } from "@/lib/admin-auth"
import {
  createUtcFromTehranTime,
  getTehranDateString,
  getTehranTimeString,
  formatJalaliFull,
} from "@/lib/jalali"
import { isValidSlotTime } from "@/lib/booking-engine"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const { appointmentId, newDateStr, newTimeStr, reason } = body

    if (!appointmentId || !newDateStr || !newTimeStr) {
      return NextResponse.json(
        { error: "شناسه نوبت، تاریخ جدید و ساعت جدید الزامی هستند" },
        { status: 400 }
      )
    }

    // Validate format and hourly alignment
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDateStr) || !/^\d{2}:\d{2}$/.test(newTimeStr)) {
      return NextResponse.json(
        { error: "فرمت تاریخ یا ساعت نامعتبر است (الگوی صحیح: YYYY-MM-DD و HH:MM)" },
        { status: 400 }
      )
    }

    if (!isValidSlotTime(newTimeStr)) {
      return NextResponse.json(
        { error: "ساعت جدید نوبت نامعتبر است. ساعات معتبر ۱۰:۰۰ الی ۲۲:۰۰ و رأس ساعت هستند." },
        { status: 400 }
      )
    }

    const newSlotUtc = createUtcFromTehranTime(newDateStr, newTimeStr)
    const newSlotEndUtc = new Date(newSlotUtc.getTime() + 60 * 60 * 1000)

    // Execute atomic ACID rescheduling transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch appointment with payments and customer
      const app = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: { service: true, customer: true, payments: true, barber: true },
      })

      if (!app) {
        throw new Error("نوبت مورد نظر یافت نشد")
      }

      if (app.status === "CANCELLED") {
        throw new Error("نوبت لغوشده امکان تغییر زمان ندارد")
      }

      // 2. Verify new date is not closed in ScheduleOverride
      const override = await tx.scheduleOverride.findUnique({
        where: { date: newDateStr },
      })
      if (override?.isClosed) {
        throw new Error("این تاریخ در تقویم کاری سالن تعطیل است. لطفاً تاریخ دیگری انتخاب فرمایید.")
      }

      // 3. Verify new time is not within a blocked interval
      const blocked = await tx.blockedInterval.findFirst({
        where: {
          date: newDateStr,
          startTime: { lte: newTimeStr },
          endTime: { gt: newTimeStr },
          OR: [{ barberId: null }, { barberId: app.barberId }],
        },
      })
      if (blocked) {
        throw new Error("این بازه زمانی توسط مدیریت سالن مسدود شده است.")
      }

      // 4. Verify no conflicting confirmed or held appointment exists on new slot
      const conflict = await tx.appointment.findFirst({
        where: {
          barberId: app.barberId,
          date: newSlotUtc,
          id: { not: app.id },
          status: { in: ["CONFIRMED", "COMPLETED", "HELD"] },
        },
      })

      if (conflict) {
        throw new Error("این ساعت قبلاً برای نوبت دیگری رزرو شده است. لطفاً ساعت دیگری انتخاب نمایید.")
      }

      // 5. Gather previous details for audit & history
      const oldDateStr = getTehranDateString(app.date)
      const oldTimeStr = getTehranTimeString(app.date)
      const oldJalali = formatJalaliFull(app.date)
      const newJalali = formatJalaliFull(newSlotUtc)

      const historyEntry = `[تغییر زمان نوبت توسط مدیر: از ${oldJalali} ساعت ${oldTimeStr} به ${newJalali} ساعت ${newTimeStr}${
        reason ? " - علت: " + reason.trim() : ""
      }]`

      const updatedAdminNotes = app.adminNotes
        ? `${app.adminNotes} | ${historyEntry}`
        : historyEntry

      // 6. Atomically update the appointment
      // Identity, payments, customerId, depositPaid, and remaining balance are strictly preserved
      const updatedApp = await tx.appointment.update({
        where: { id: app.id },
        data: {
          date: newSlotUtc,
          endDate: newSlotEndUtc,
          adminNotes: updatedAdminNotes,
        },
        include: { service: true, barber: true, customer: true, payments: true },
      })

      // 7. Release any active holds on the previous slot
      await tx.slotHold.updateMany({
        where: {
          barberId: app.barberId,
          slotTime: app.date,
          status: "ACTIVE",
        },
        data: { status: "RELEASED" },
      })

      // 8. Record audit log
      await tx.auditLog.create({
        data: {
          action: "ADMIN_RESCHEDULE_APPOINTMENT",
          entity: "Appointment",
          entityId: app.id,
          userId: auth.session.userId,
          userRole: auth.session.role,
          details: JSON.stringify({
            trackingCode: app.trackingCode,
            customerPhone: app.customerPhone,
            previousSlot: { date: oldDateStr, time: oldTimeStr },
            newSlot: { date: newDateStr, time: newTimeStr },
            reason: reason || null,
          }),
        },
      })

      // 9. Prepare SMS notification
      const smsMessage = `کوروش باربر\nزمان نوبت شما تغییر کرد.\nتاریخ جدید: ${newJalali}\nساعت جدید: ${newTimeStr}\nکد پیگیری: ${app.trackingCode}`
      await tx.notificationJob.create({
        data: {
          phone: app.customerPhone,
          recipientName: app.customerName,
          type: "RESCHEDULE",
          message: smsMessage,
          status: "SENT",
          sentAt: new Date(),
          provider: "SMS_IR",
        },
      })

      return {
        updatedApp,
        oldDateStr,
        oldTimeStr,
        newDateStr,
        newTimeStr,
        newJalali,
      }
    })

    return NextResponse.json({
      success: true,
      message: "زمان نوبت با موفقیت تغییر کرد.",
      appointment: {
        id: result.updatedApp.id,
        trackingCode: result.updatedApp.trackingCode,
        customerName: result.updatedApp.customerName,
        customerPhone: result.updatedApp.customerPhone,
        serviceName: result.updatedApp.service.name,
        dateUtc: result.updatedApp.date.toISOString(),
        jalaliFull: result.newJalali,
        time: result.newTimeStr,
        totalPrice: result.updatedApp.totalPrice,
        depositPaid: result.updatedApp.depositPaid,
        balanceDue: result.updatedApp.balanceDue,
        adminNotes: result.updatedApp.adminNotes,
      },
    })
  } catch (error: unknown) {
    console.error("Admin reschedule appointment error:", error)
    const message = error instanceof Error ? error.message : "خطا در تغییر زمان نوبت"
    const isConflict = message.includes("قبلاً برای نوبت دیگری") || message.includes("تعطیل است") || message.includes("مسدود شده")
    return NextResponse.json(
      { error: message },
      { status: isConflict ? 409 : 500 }
    )
  }
}
