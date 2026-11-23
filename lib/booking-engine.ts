import { prisma } from "./db"
import { createUtcFromTehranTime, getTehranTimeString } from "./jalali"
import { getPaymentGateway } from "./providers/payment"
import { getSmsProvider, normalizeIranianPhone } from "./providers/sms"
import { generateTrackingCode } from "./auth"

export const OPERATING_START_HOUR = 10
export const OPERATING_END_HOUR = 23 // Closed at 23:00, last slot start is 22:00
export const SLOT_DURATION_MINUTES = 60
export const DEFAULT_HOLD_MINUTES = 10

export interface AvailableSlot {
  time: string // "10:00"
  endTime: string // "11:00"
  label: string // "۱۰:۰۰ تا ۱۱:۰۰"
  utcStartTime: string
  utcEndTime: string
  isAvailable: boolean
  status: "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED"
  holdExpiresAt?: string
}

/**
 * Generate authoritative daily 13 slots: 10:00 through 22:00
 */
export function generateBaseDailySlots(dateStr: string): Array<{
  time: string
  endTime: string
  label: string
  utcStartTime: Date
  utcEndTime: Date
}> {
  const slots = []
  for (let hour = OPERATING_START_HOUR; hour < OPERATING_END_HOUR; hour++) {
    const time = `${hour.toString().padStart(2, "0")}:00`
    const endHour = hour + 1
    const endTime = `${endHour.toString().padStart(2, "0")}:00`
    const label = `${time} - ${endTime}`
    
    const utcStartTime = createUtcFromTehranTime(dateStr, time)
    const utcEndTime = createUtcFromTehranTime(dateStr, endTime)

    slots.push({
      time,
      endTime,
      label,
      utcStartTime,
      utcEndTime,
    })
  }
  return slots
}

/**
 * Clean up expired holds in database
 */
export async function releaseExpiredHolds(): Promise<number> {
  const now = new Date()
  
  const expiredHolds = await prisma.slotHold.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lt: now },
    },
  })

  if (expiredHolds.length > 0) {
    await prisma.slotHold.updateMany({
      where: {
        id: { in: expiredHolds.map((h) => h.id) },
      },
      data: { status: "EXPIRED" },
    })

    for (const h of expiredHolds) {
      await prisma.appointment.updateMany({
        where: {
          barberId: h.barberId,
          date: h.slotTime,
          status: { in: ["HELD", "AWAITING_PAYMENT"] },
        },
        data: { status: "EXPIRED" },
      })
    }
  }

  return expiredHolds.length
}

/**
 * Get accurate slot availability for a specific local Tehran date (YYYY-MM-DD)
 */
export async function getAvailabilityForDate(
  dateStr: string,
  barberId?: string
): Promise<{
  date: string
  isClosed: boolean
  closedReason?: string
  slots: AvailableSlot[]
}> {
  await releaseExpiredHolds()

  // Find or default to primary barber
  let activeBarberId = barberId
  if (!activeBarberId) {
    const defaultBarber = await prisma.barber.findFirst({ where: { isActive: true } })
    activeBarberId = defaultBarber?.id || "default-barber"
  }

  // 1. Check schedule override (holidays, special closures)
  const override = await prisma.scheduleOverride.findUnique({
    where: { date: dateStr },
  })

  if (override?.isClosed) {
    return {
      date: dateStr,
      isClosed: true,
      closedReason: override.reason || "سالن در این تاریخ تعطیل است",
      slots: [],
    }
  }

  // 2. Fetch base slots (always 13 slots: 10:00 to 22:00)
  const baseSlots = generateBaseDailySlots(dateStr)

  // 3. Fetch blocked intervals for this date
  const blockedIntervals = await prisma.blockedInterval.findMany({
    where: {
      date: dateStr,
      OR: [{ barberId: null }, { barberId: activeBarberId }],
    },
  })

  // 4. Fetch confirmed, held, or in-payment appointments for this day
  const dayStartUtc = baseSlots[0].utcStartTime
  const dayEndUtc = baseSlots[baseSlots.length - 1].utcEndTime

  const appointments = await prisma.appointment.findMany({
    where: {
      barberId: activeBarberId,
      date: { gte: dayStartUtc, lte: dayEndUtc },
      status: { in: ["CONFIRMED", "HELD", "AWAITING_PAYMENT", "COMPLETED"] },
    },
  })

  // 5. Fetch active unexpired holds
  const now = new Date()
  const activeHolds = await prisma.slotHold.findMany({
    where: {
      barberId: activeBarberId,
      status: "ACTIVE",
      expiresAt: { gt: now },
      slotTime: { gte: dayStartUtc, lte: dayEndUtc },
    },
  })

  // 6. Map each slot to status
  const slots: AvailableSlot[] = baseSlots.map((base) => {
    // Check if slot falls in a blocked interval
    const isBlocked = blockedIntervals.some(
      (b) => base.time >= b.startTime && base.time < b.endTime
    )

    if (isBlocked) {
      return {
        time: base.time,
        endTime: base.endTime,
        label: base.label,
        utcStartTime: base.utcStartTime.toISOString(),
        utcEndTime: base.utcEndTime.toISOString(),
        isAvailable: false,
        status: "BLOCKED",
      }
    }

    // Check confirmed appointments
    const appointment = appointments.find(
      (a) => a.date.getTime() === base.utcStartTime.getTime()
    )

    if (appointment && (appointment.status === "CONFIRMED" || appointment.status === "COMPLETED")) {
      return {
        time: base.time,
        endTime: base.endTime,
        label: base.label,
        utcStartTime: base.utcStartTime.toISOString(),
        utcEndTime: base.utcEndTime.toISOString(),
        isAvailable: false,
        status: "BOOKED",
      }
    }

    // Check active holds
    const hold = activeHolds.find(
      (h) => h.slotTime.getTime() === base.utcStartTime.getTime()
    )

    if (hold) {
      return {
        time: base.time,
        endTime: base.endTime,
        label: base.label,
        utcStartTime: base.utcStartTime.toISOString(),
        utcEndTime: base.utcEndTime.toISOString(),
        isAvailable: false,
        status: "HELD",
        holdExpiresAt: hold?.expiresAt.toISOString(),
      }
    }

    return {
      time: base.time,
      endTime: base.endTime,
      label: base.label,
      utcStartTime: base.utcStartTime.toISOString(),
      utcEndTime: base.utcEndTime.toISOString(),
      isAvailable: true,
      status: "AVAILABLE",
    }
  })

  return {
    date: dateStr,
    isClosed: false,
    slots,
  }
}

/**
 * Atomically reserve a temporary hold on a slot using a database transaction.
 * Guarantees no double-booking even under concurrent load.
 */
export async function reserveSlotHold(params: {
  barberId: string
  serviceId: string
  dateStr: string // "2026-11-24"
  timeStr: string // "14:00"
  customerName: string
  customerPhone: string
  customerEmail?: string
  customerBirthDate?: string
  holdMinutes?: number
}): Promise<{
  holdId: string
  appointmentId: string
  trackingCode: string
  expiresAt: Date
  depositAmount: number
  totalPrice: number
  balanceDue: number
}> {
  const normalizedPhone = normalizeIranianPhone(params.customerPhone)
  const slotUtc = createUtcFromTehranTime(params.dateStr, params.timeStr)
  const slotEndUtc = new Date(slotUtc.getTime() + SLOT_DURATION_MINUTES * 60 * 1000)
  const holdMinutes = params.holdMinutes || DEFAULT_HOLD_MINUTES
  const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000)

  // Verify service exists
  const service = await prisma.service.findUnique({
    where: { id: params.serviceId },
  })
  if (!service || !service.isActive) {
    throw new Error("خدمت انتخابی معتبر نیست یا غیرفعال شده است")
  }

  // Calculate pricing
  const totalPrice = service.price
  let depositAmount = service.depositPrice
  if (service.depositType === "percentage" && service.depositPercent) {
    depositAmount = Math.round((totalPrice * service.depositPercent) / 100)
  }
  const balanceDue = Math.max(0, totalPrice - depositAmount)

  // Run interactive ACID transaction to acquire atomic hold
  return await prisma.$transaction(async (tx) => {
    // 1. Check if an active confirmed booking already exists for this slot
    const existingConfirmed = await tx.appointment.findFirst({
      where: {
        barberId: params.barberId,
        date: slotUtc,
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
    })

    if (existingConfirmed) {
      throw new Error("این ساعت قبلاً رزرو و تایید شده است")
    }

    // 2. Check if an active unexpired hold exists for another user
    const existingHold = await tx.slotHold.findFirst({
      where: {
        barberId: params.barberId,
        slotTime: slotUtc,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
    })

    if (existingHold && existingHold.customerPhone !== normalizedPhone) {
      throw new Error("این ساعت هم‌اکنون توسط کاربر دیگری در حال پرداخت است")
    }

    // 3. Upsert / create customer record
    let customer = await tx.customer.findUnique({
      where: { phone: normalizedPhone },
    })
    if (!customer) {
      customer = await tx.customer.create({
        data: {
          phone: normalizedPhone,
          name: params.customerName,
          email: params.customerEmail || null,
          birthDate: params.customerBirthDate || null,
        },
      })
    } else if (params.customerBirthDate && !customer.birthDate) {
      await tx.customer.update({
        where: { id: customer.id },
        data: { birthDate: params.customerBirthDate },
      })
    }

    // 4. Create the atomic SlotHold
    const hold = await tx.slotHold.create({
      data: {
        barberId: params.barberId,
        slotTime: slotUtc,
        customerPhone: normalizedPhone,
        expiresAt,
        status: "ACTIVE",
      },
    })

    // 5. Create or reuse Appointment in HELD state
    const trackingCode = generateTrackingCode()
    const appointment = await tx.appointment.create({
      data: {
        trackingCode,
        barberId: params.barberId,
        serviceId: params.serviceId,
        customerId: customer.id,
        customerName: params.customerName,
        customerPhone: normalizedPhone,
        customerEmail: params.customerEmail || null,
        customerBirthDate: params.customerBirthDate || null,
        date: slotUtc,
        endDate: slotEndUtc,
        status: "HELD",
        totalPrice,
        depositPaid: 0,
        balanceDue,
      },
    })

    return {
      holdId: hold.id,
      appointmentId: appointment.id,
      trackingCode: appointment.trackingCode,
      expiresAt,
      depositAmount,
      totalPrice,
      balanceDue,
    }
  })
}

/**
 * Handle payment verification with full idempotency and race condition reconciliation
 */
export async function handlePaymentCallback(params: {
  authority: string
  gatewayStatus?: string // e.g. "OK" or "NOK"
}): Promise<{
  success: boolean
  isIdempotentRepeat: boolean
  appointment: unknown
  message: string
}> {
  const payment = await prisma.payment.findUnique({
    where: { authority: params.authority },
    include: {
      appointment: {
        include: {
          service: true,
          barber: true,
        },
      },
    },
  })

  if (!payment) {
    throw new Error("تراکنش پرداخت یافت نشد")
  }

  // 1. Idempotency Check: if already verified, return existing confirmed state safely
  if (payment.status === "VERIFIED" && payment.appointment.status === "CONFIRMED") {
    return {
      success: true,
      isIdempotentRepeat: true,
      appointment: payment.appointment,
      message: "این پرداخت قبلاً تایید شده است",
    }
  }

  // If customer cancelled at gateway
  if (params.gatewayStatus === "NOK") {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", errorMessage: "انصراف مشتری در درگاه پرداخت" },
      }),
      prisma.appointment.update({
        where: { id: payment.appointmentId },
        data: { status: "CANCELLED", cancellationReason: "انصراف در درگاه" },
      }),
      prisma.slotHold.updateMany({
        where: {
          barberId: payment.appointment.barberId,
          slotTime: payment.appointment.date,
          status: "ACTIVE",
        },
        data: { status: "RELEASED" },
      }),
    ])

    return {
      success: false,
      isIdempotentRepeat: false,
      appointment: payment.appointment,
      message: "پرداخت لغو گردید و نوبت آزاد شد",
    }
  }

  // 2. Perform server-to-server gateway verification
  const gateway = getPaymentGateway()
  const verification = await gateway.verifyPayment({
    authority: params.authority,
    amountToman: payment.amountToman,
  })

  if (!verification.success) {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          errorCode: verification.errorCode,
          errorMessage: verification.errorMessage || "خطا در تایید درگاه",
        },
      }),
      prisma.appointment.update({
        where: { id: payment.appointmentId },
        data: { status: "CANCELLED", cancellationReason: verification.errorMessage },
      }),
      prisma.slotHold.updateMany({
        where: {
          barberId: payment.appointment.barberId,
          slotTime: payment.appointment.date,
          status: "ACTIVE",
        },
        data: { status: "RELEASED" },
      }),
    ])

    return {
      success: false,
      isIdempotentRepeat: false,
      appointment: payment.appointment,
      message: verification.errorMessage || "تایید تراکنش با خطا مواجه شد",
    }
  }

  // 3. Gateway verified! Now atomically confirm the appointment or handle delayed race
  return await prisma.$transaction(async (tx) => {
    // Check if slot was assigned to another confirmed appointment during delay!
    const conflictingConfirmed = await tx.appointment.findFirst({
      where: {
        id: { not: payment.appointmentId },
        barberId: payment.appointment.barberId,
        date: payment.appointment.date,
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
    })

    if (conflictingConfirmed) {
      // Slot was already taken! Move this appointment to PAYMENT_REVIEW to reconcile
      const updatedApp = await tx.appointment.update({
        where: { id: payment.appointmentId },
        data: {
          status: "PAYMENT_REVIEW",
          depositPaid: payment.amountToman,
          adminNotes: `هشدار مغایرت: وجه پرداخت شد اما بازه زمانی قبل از بازگشت درگاه به نوبت ${conflictingConfirmed.trackingCode} اختصاص یافته بود. نیاز به عودت یا هماهنگی دستی.`,
        },
        include: { service: true, barber: true },
      })

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "VERIFIED",
          refId: verification.refId,
          cardPan: verification.cardPan,
          verifiedAt: new Date(),
        },
      })

      await tx.auditLog.create({
        data: {
          action: "PAYMENT_RECONCILIATION_ALERT",
          entity: "Appointment",
          entityId: payment.appointmentId,
          details: JSON.stringify({
            authority: params.authority,
            refId: verification.refId,
            conflictingTrackingCode: conflictingConfirmed.trackingCode,
          }),
        },
      })

      return {
        success: true,
        isIdempotentRepeat: false,
        appointment: updatedApp,
        message: "پرداخت موفق، نیازمند هماهنگی مدیر به دلیل انقضای زمان هلد",
      }
    }

    // Standard happy path: Confirm appointment
    const updatedApp = await tx.appointment.update({
      where: { id: payment.appointmentId },
      data: {
        status: "CONFIRMED",
        depositPaid: payment.amountToman,
        balanceDue: Math.max(0, payment.appointment.totalPrice - payment.amountToman),
      },
      include: { service: true, barber: true },
    })

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "VERIFIED",
        refId: verification.refId,
        cardPan: verification.cardPan,
        verifiedAt: new Date(),
      },
    })

    // Convert hold to CONVERTED
    await tx.slotHold.updateMany({
      where: {
        barberId: payment.appointment.barberId,
        slotTime: payment.appointment.date,
        status: "ACTIVE",
      },
      data: { status: "CONVERTED" },
    })

    // Dispatch confirmation SMS
    const sms = getSmsProvider()
    const jalaliParts = new Intl.DateTimeFormat("fa-IR", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(updatedApp.date)

    const tehranTime = getTehranTimeString(updatedApp.date)

    await sms.sendBookingConfirmation(updatedApp.customerPhone, {
      trackingCode: updatedApp.trackingCode,
      serviceName: updatedApp.service.name,
      jalaliDate: jalaliParts,
      time: tehranTime,
      depositPaid: updatedApp.depositPaid,
      balanceDue: updatedApp.balanceDue,
    })

    return {
      success: true,
      isIdempotentRepeat: false,
      appointment: updatedApp,
      message: "نوبت شما با موفقیت تایید شد",
    }
  })
}
