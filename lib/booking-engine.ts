import { prisma } from "./db"
import { createUtcFromTehranTime, getTehranTimeString } from "./jalali"
import { getPaymentGateway, type PaymentGatewayProvider } from "./providers/payment"
import { getSmsProvider, normalizeIranianPhone } from "./providers/sms"
import { enqueueNotificationJob, processNotificationJob } from "./notifications"
import { generateTrackingCode } from "./auth"

export const OPERATING_START_HOUR = 10
export const OPERATING_END_HOUR = 23 // Closed at 23:00, last slot start is 22:00
export const SLOT_DURATION_MINUTES = 60
export const DEFAULT_HOLD_MINUTES = 10

export const VALID_SLOT_TIMES = [
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
] as const

export type ValidSlotTime = (typeof VALID_SLOT_TIMES)[number]

export function isValidSlotTime(timeStr: string): timeStr is ValidSlotTime {
  return (VALID_SLOT_TIMES as readonly string[]).includes(timeStr)
}

/**
 * Authoritative server-side deposit calculation in integer Tomans.
 * Eliminates floating-point drift and validates fixed/percentage configuration.
 */
export function computeServiceDeposit(service: {
  price: number
  depositPrice: number
  depositType: string
  depositPercent?: number | null
}): number {
  if (!Number.isFinite(service.price) || service.price < 0) {
    throw new Error("قیمت سرویس نامعتبر است")
  }
  const price = Math.round(service.price)

  if (service.depositType === "percentage") {
    const pct = service.depositPercent
    if (pct === null || pct === undefined || !Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw new Error("درصد بیعانه سرویس نامعتبر است")
    }
    return Math.round((price * pct) / 100)
  }

  if (service.depositType === "fixed" || !service.depositType) {
    if (!Number.isFinite(service.depositPrice) || service.depositPrice < 0) {
      throw new Error("مبلغ بیعانه سرویس نامعتبر است")
    }
    return Math.min(price, Math.round(service.depositPrice))
  }

  throw new Error("نوع بیعانه سرویس نامعتبر است")
}

function isPostgresDatabase(): boolean {
  const url = process.env.DATABASE_URL || ""
  return url.startsWith("postgres://") || url.startsWith("postgresql://")
}

function isPrismaConcurrencyError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const code = (err as { code?: string }).code
  return code === "P2002" || code === "P2034"
}

export interface AvailableSlot {
  time: string // "10:00"
  endTime: string // "11:00"
  label: string // "۱۰:۰۰ تا ۱۱:۰۰"
  utcStartTime: string
  utcEndTime: string
  isAvailable: boolean
  status: "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED" | "PAST"
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

    // Check if slot start time is already in the past
    if (base.utcStartTime.getTime() <= now.getTime()) {
      return {
        time: base.time,
        endTime: base.endTime,
        label: base.label,
        utcStartTime: base.utcStartTime.toISOString(),
        utcEndTime: base.utcEndTime.toISOString(),
        isAvailable: false,
        status: "PAST",
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

  // Validate exact hourly appointment start time
  if (!isValidSlotTime(params.timeStr)) {
    throw new Error("ساعت شروع نوبت نامعتبر است. ساعات معتبر ۱۰:۰۰ الی ۲۲:۰۰ و رأس ساعت هستند.")
  }

  const slotUtc = createUtcFromTehranTime(params.dateStr, params.timeStr)

  // Prevent booking past time slots
  if (slotUtc.getTime() <= Date.now()) {
    throw new Error("زمان انتخابی گذشته است و امکان رزرو آن وجود ندارد")
  }

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

  // Calculate authoritative pricing
  const totalPrice = Math.round(service.price)
  const depositAmount = computeServiceDeposit(service)
  const balanceDue = Math.max(0, totalPrice - depositAmount)

  const txOptions = isPostgresDatabase()
    ? { isolationLevel: "Serializable" as const }
    : undefined

  try {
    // Run interactive ACID transaction to acquire atomic hold
    return await prisma.$transaction(async (tx) => {
      const now = new Date()

      // 0. Verify date is not disabled or closed in schedule override
      const override = await tx.scheduleOverride.findUnique({
        where: { date: params.dateStr },
      })
      if (override?.isClosed) {
        throw new Error("این روز برای رزرو نوبت در دسترس نیست. لطفاً روز دیگری انتخاب کنید.")
      }

      // 0.1 Verify time is not in a blocked interval
      const blockedInterval = await tx.blockedInterval.findFirst({
        where: {
          date: params.dateStr,
          startTime: { lte: params.timeStr },
          endTime: { gt: params.timeStr },
          OR: [{ barberId: null }, { barberId: params.barberId }],
        },
      })
      if (blockedInterval) {
        throw new Error("این بازه زمانی توسط مدیریت سالن مسدود شده است. لطفاً ساعت دیگری انتخاب نمایید.")
      }

      // 0.2 Expire any stale ACTIVE holds on this slot before checking/inserting
      await tx.slotHold.updateMany({
        where: {
          barberId: params.barberId,
          slotTime: slotUtc,
          status: "ACTIVE",
          expiresAt: { lte: now },
        },
        data: { status: "EXPIRED" },
      })

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

      // 2. Check if an active unexpired hold exists
      const existingHold = await tx.slotHold.findFirst({
        where: {
          barberId: params.barberId,
          slotTime: slotUtc,
          status: "ACTIVE",
          expiresAt: { gt: now },
        },
      })

      if (existingHold && existingHold.customerPhone !== normalizedPhone) {
        throw new Error("این ساعت هم‌اکنون توسط کاربر دیگری در حال پرداخت است")
      }

      // 2.1 Same-user re-hold cleanup so partial unique index on ACTIVE hold permits retry
      if (existingHold && existingHold.customerPhone === normalizedPhone) {
        await tx.slotHold.update({
          where: { id: existingHold.id },
          data: { status: "RELEASED" },
        })
        await tx.appointment.updateMany({
          where: {
            barberId: params.barberId,
            date: slotUtc,
            customerPhone: normalizedPhone,
            status: { in: ["HELD", "AWAITING_PAYMENT"] },
          },
          data: {
            status: "CANCELLED",
            cancellationReason: "جایگزینی با هلد جدید توسط همان مشتری",
          },
        })
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

      // 5. Create Appointment in HELD state
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
    }, txOptions)
  } catch (err: unknown) {
    if (isPrismaConcurrencyError(err)) {
      throw new Error("این ساعت هم‌اکنون توسط کاربر دیگری در حال پرداخت است")
    }
    throw err
  }
}

/**
 * Handle payment verification with full idempotency and race condition reconciliation
 */
export async function handlePaymentCallback(params: {
  authority: string
  gatewayStatus?: string // e.g. "OK" or "NOK"
  gatewayOverride?: PaymentGatewayProvider
}): Promise<{
  success: boolean
  isIdempotentRepeat: boolean
  isUncertain?: boolean
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

  // 1. Idempotency Check: if already verified or failed, return safely without re-mutating
  if (payment.status === "VERIFIED") {
    return {
      success: true,
      isIdempotentRepeat: true,
      appointment: payment.appointment,
      message: "این پرداخت قبلاً تایید شده است",
    }
  }

  if (payment.status === "FAILED") {
    return {
      success: false,
      isIdempotentRepeat: true,
      appointment: payment.appointment,
      message: payment.errorMessage || "این تراکنش قبلاً ناموفق ثبت شده است",
    }
  }

  // If customer cancelled at gateway
  if (params.gatewayStatus === "NOK") {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.payment.findUnique({ where: { id: payment.id } })
      if (!fresh || fresh.status !== "PENDING") return

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", errorMessage: "انصراف مشتری در درگاه پرداخت" },
      })

      if (["HELD", "AWAITING_PAYMENT"].includes(payment.appointment.status)) {
        await tx.appointment.update({
          where: { id: payment.appointmentId },
          data: { status: "CANCELLED", cancellationReason: "انصراف در درگاه" },
        })
      }

      await tx.slotHold.updateMany({
        where: {
          barberId: payment.appointment.barberId,
          slotTime: payment.appointment.date,
          customerPhone: payment.appointment.customerPhone,
          status: "ACTIVE",
        },
        data: { status: "RELEASED" },
      })
    })

    return {
      success: false,
      isIdempotentRepeat: false,
      appointment: payment.appointment,
      message: "پرداخت لغو گردید و نوبت آزاد شد",
    }
  }

  // 2. Perform server-to-server gateway verification OUTSIDE database transaction
  const gateway = params.gatewayOverride ?? getPaymentGateway()
  let verification: Awaited<ReturnType<PaymentGatewayProvider["verifyPayment"]>>
  try {
    verification = await gateway.verifyPayment({
      authority: params.authority,
      amountToman: payment.amountToman,
    })
  } catch (verifyErr: unknown) {
    // Transient network / unexpected exception: keep payment PENDING (uncertain, never confirm or blindly fail)
    const errMsg = verifyErr instanceof Error ? verifyErr.message : "خطای موقت در ارتباط با درگاه پرداخت"
    await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { errorCode: "NETWORK_UNCERTAIN", errorMessage: errMsg },
    })
    return {
      success: false,
      isIdempotentRepeat: false,
      isUncertain: true,
      appointment: payment.appointment,
      message: errMsg,
    }
  }

  if (!verification.success) {
    if (verification.isUncertain) {
      // Transient gateway timeout / 5xx / invalid JSON: keep Payment PENDING & hold intact until verified
      await prisma.payment.updateMany({
        where: { id: payment.id, status: "PENDING" },
        data: {
          errorCode: verification.errorCode || verification.failureCategory || "UNCERTAIN",
          errorMessage: verification.errorMessage || "وضعیت تراکنش در درگاه نامشخص است",
        },
      })

      return {
        success: false,
        isIdempotentRepeat: false,
        isUncertain: true,
        appointment: payment.appointment,
        message: verification.errorMessage || "خطای موقت در استعلام درگاه پرداخت. لطفاً کمی بعد مجدداً تلاش کنید.",
      }
    }

    // Explicit bank / gateway rejection -> transition Payment=FAILED, Appointment=CANCELLED, SlotHold=RELEASED
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.payment.findUnique({ where: { id: payment.id } })
      if (!fresh || fresh.status !== "PENDING") return

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          errorCode: verification.errorCode,
          errorMessage: verification.errorMessage || "خطا در تایید درگاه",
        },
      })

      if (["HELD", "AWAITING_PAYMENT"].includes(payment.appointment.status)) {
        await tx.appointment.update({
          where: { id: payment.appointmentId },
          data: { status: "CANCELLED", cancellationReason: verification.errorMessage },
        })
      }

      await tx.slotHold.updateMany({
        where: {
          barberId: payment.appointment.barberId,
          slotTime: payment.appointment.date,
          customerPhone: payment.appointment.customerPhone,
          status: "ACTIVE",
        },
        data: { status: "RELEASED" },
      })
    })

    return {
      success: false,
      isIdempotentRepeat: false,
      isUncertain: false,
      appointment: payment.appointment,
      message: verification.errorMessage || "تایید تراکنش با خطا مواجه شد",
    }
  }

  // 3. Gateway verified! Atomically reconcile state in short DB transaction
  const txOptions = isPostgresDatabase()
    ? { isolationLevel: "Serializable" as const }
    : undefined

  let txResult: {
    success: boolean
    isIdempotentRepeat: boolean
    confirmedNow: boolean
    queuedJobId?: string
    jalaliParts?: string
    tehranTime?: string
    appointment: typeof payment.appointment
    message: string
  }

  try {
    txResult = await prisma.$transaction(async (tx) => {
      const now = new Date()
      const freshPayment = await tx.payment.findUnique({
        where: { id: payment.id },
        include: {
          appointment: {
            include: { service: true, barber: true },
          },
        },
      })

      if (!freshPayment) {
        throw new Error("تراکنش پرداخت یافت نشد")
      }

      // Concurrent callback idempotency check inside transaction
      if (freshPayment.status === "VERIFIED") {
        return {
          success: true,
          isIdempotentRepeat: true,
          confirmedNow: false,
          appointment: freshPayment.appointment,
          message: "این پرداخت قبلاً تایید شده است",
        }
      }

      const app = freshPayment.appointment

      // Check if slot was assigned to another confirmed/completed appointment
      const conflictingConfirmed = await tx.appointment.findFirst({
        where: {
          id: { not: app.id },
          barberId: app.barberId,
          date: app.date,
          status: { in: ["CONFIRMED", "COMPLETED"] },
        },
      })

      // Check if this appointment was already cancelled/expired or its hold expired/released
      const activeOwnHold = await tx.slotHold.findFirst({
        where: {
          barberId: app.barberId,
          slotTime: app.date,
          customerPhone: app.customerPhone,
          status: "ACTIVE",
          expiresAt: { gt: now },
        },
      })

      const isTerminalOrExpiredState = !["HELD", "AWAITING_PAYMENT"].includes(app.status)
      const holdMissingOrExpired = !activeOwnHold

      if (conflictingConfirmed || isTerminalOrExpiredState || holdMissingOrExpired) {
        const reason = conflictingConfirmed
          ? `هشدار مغایرت: وجه پرداخت شد اما بازه زمانی قبل از بازگشت درگاه به نوبت ${conflictingConfirmed.trackingCode} اختصاص یافته بود.`
          : isTerminalOrExpiredState
            ? `هشدار مغایرت: وجه پس از تغییر وضعیت نوبت به ${app.status} دریافت شد. نیاز به عودت یا بررسی دستی.`
            : `هشدار مغایرت: وجه پس از انقضا یا آزاد شدن هلد موقت دریافت شد. نیاز به عودت یا بررسی دستی.`

        const updatedApp = await tx.appointment.update({
          where: { id: app.id },
          data: {
            status: app.status === "CONFIRMED" ? "CONFIRMED" : "PAYMENT_REVIEW",
            depositPaid: app.status === "CONFIRMED" ? app.depositPaid : freshPayment.amountToman,
            adminNotes: reason,
          },
          include: { service: true, barber: true },
        })

        await tx.payment.update({
          where: { id: freshPayment.id },
          data: {
            status: "VERIFIED",
            refId: verification.refId,
            cardPan: verification.cardPan,
            verifiedAt: now,
          },
        })

        await tx.auditLog.create({
          data: {
            action: "PAYMENT_RECONCILIATION_ALERT",
            entity: "Appointment",
            entityId: app.id,
            details: JSON.stringify({
              authority: params.authority,
              refId: verification.refId,
              reason,
              conflictingTrackingCode: conflictingConfirmed?.trackingCode || null,
            }),
          },
        })

        return {
          success: true,
          isIdempotentRepeat: false,
          confirmedNow: false,
          appointment: updatedApp,
          message: "پرداخت موفق، نیازمند هماهنگی مدیر به دلیل انقضای زمان هلد",
        }
      }

      // Standard happy path: Confirm appointment
      const updatedApp = await tx.appointment.update({
        where: { id: app.id },
        data: {
          status: "CONFIRMED",
          depositPaid: freshPayment.amountToman,
          balanceDue: Math.max(0, app.totalPrice - freshPayment.amountToman),
        },
        include: { service: true, barber: true },
      })

      await tx.payment.update({
        where: { id: freshPayment.id },
        data: {
          status: "VERIFIED",
          refId: verification.refId,
          cardPan: verification.cardPan,
          verifiedAt: now,
        },
      })

      // Convert own hold to CONVERTED
      await tx.slotHold.update({
        where: { id: activeOwnHold.id },
        data: { status: "CONVERTED" },
      })

      // Enqueue transactional outbox NotificationJob atomically inside confirmation tx (status=QUEUED)
      const jalaliParts = new Intl.DateTimeFormat("fa-IR", {
        timeZone: "Asia/Tehran",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(updatedApp.date)
      const tehranTime = getTehranTimeString(updatedApp.date)
      const confirmationText = `کوروش باربر\nنوبت شما با موفقیت ثبت شد.\nخدمت: ${updatedApp.service.name}\nتاریخ: ${jalaliParts}\nساعت: ${tehranTime}\nکد پیگیری: ${updatedApp.trackingCode}\nمشتاق دیدارتون هستیم.`

      const enq = await enqueueNotificationJob(tx, {
        phone: updatedApp.customerPhone,
        recipientName: updatedApp.customerName,
        type: "CONFIRMATION",
        message: confirmationText,
        dedupKey: `CONFIRMATION:${updatedApp.trackingCode}`,
        dedupContains: updatedApp.trackingCode,
      })

      return {
        success: true,
        isIdempotentRepeat: false,
        confirmedNow: true,
        queuedJobId: enq.enqueued ? enq.job.id : undefined,
        jalaliParts,
        tehranTime,
        appointment: updatedApp,
        message: "نوبت شما با موفقیت تایید شد",
      }
    }, txOptions)
  } catch (err: unknown) {
    // Handle concurrent PostgreSQL serialization / unique constraint race on confirmation
    if (isPrismaConcurrencyError(err)) {
      const latestPayment = await prisma.payment.findUnique({
        where: { authority: params.authority },
        include: { appointment: { include: { service: true, barber: true } } },
      })
      if (latestPayment?.status === "VERIFIED") {
        return {
          success: true,
          isIdempotentRepeat: true,
          appointment: latestPayment.appointment,
          message: "این پرداخت قبلاً تایید شده است",
        }
      }
      // Route to PAYMENT_REVIEW cleanly if another appointment won the slot
      if (latestPayment) {
        const reviewApp = await prisma.$transaction(async (tx) => {
          const updated = await tx.appointment.update({
            where: { id: latestPayment.appointmentId },
            data: {
              status: "PAYMENT_REVIEW",
              depositPaid: latestPayment.amountToman,
              adminNotes: "هشدار مغایرت هم‌زمانی در تایید پرداخت. نیاز به بررسی دستی مدیر.",
            },
            include: { service: true, barber: true },
          })
          await tx.payment.update({
            where: { id: latestPayment.id },
            data: {
              status: "VERIFIED",
              refId: verification.refId,
              cardPan: verification.cardPan,
              verifiedAt: new Date(),
            },
          })
          return updated
        })
        return {
          success: true,
          isIdempotentRepeat: false,
          appointment: reviewApp,
          message: "پرداخت موفق، نیازمند هماهنگی مدیر به دلیل تداخل هم‌زمان",
        }
      }
    }
    throw err
  }

  // 4. Dispatch confirmation SMS strictly AFTER DB transaction commits via idempotent outbox
  if (txResult.confirmedNow && txResult.queuedJobId) {
    try {
      const updatedApp = txResult.appointment
      const jalaliParts = txResult.jalaliParts || ""
      const tehranTime = txResult.tehranTime || getTehranTimeString(updatedApp.date)

      await processNotificationJob(txResult.queuedJobId, {
        dispatcher: (sms) =>
          sms.sendBookingConfirmation(updatedApp.customerPhone, {
            trackingCode: updatedApp.trackingCode,
            serviceName: updatedApp.service.name,
            jalaliDate: jalaliParts,
            time: tehranTime,
            depositPaid: updatedApp.depositPaid,
            balanceDue: updatedApp.balanceDue,
          }),
      })
    } catch (smsErr) {
      console.error("[BookingEngine] Safe Outbox SMS Dispatch Error (Payment remains confirmed):", smsErr)
    }
  }

  return {
    success: txResult.success,
    isIdempotentRepeat: txResult.isIdempotentRepeat,
    appointment: txResult.appointment,
    message: txResult.message,
  }
}
