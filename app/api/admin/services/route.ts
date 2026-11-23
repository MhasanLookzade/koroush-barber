import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authorizeAdmin } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const services = await prisma.service.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { appointments: true } },
      },
    })
    return NextResponse.json(services)
  } catch (error) {
    console.error("Admin services error:", error)
    return NextResponse.json({ error: "خطا در دریافت خدمات" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const { name, description, price, depositPrice, category, sortOrder, isActive } = body

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: "نام خدمت و مبلغ کل الزامی است" },
        { status: 400 }
      )
    }

    const service = await prisma.service.create({
      data: {
        name,
        description: description || null,
        price: Number(price),
        depositPrice: depositPrice !== undefined ? Number(depositPrice) : Math.round(Number(price) * 0.2),
        duration: 60, // Fixed 60 minutes in V1
        category: category || "اصلاح مو",
        sortOrder: sortOrder ? Number(sortOrder) : 0,
        isActive: isActive ?? true,
      },
    })

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_CREATE_SERVICE",
        entity: "Service",
        entityId: service.id,
        userId: auth.session.userId,
        userRole: auth.session.role,
        details: JSON.stringify({ name, price, depositPrice }),
      },
    })

    return NextResponse.json({ success: true, service })
  } catch (error) {
    console.error("Admin create service error:", error)
    return NextResponse.json({ error: "خطا در تعریف خدمت جدید" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const { id, name, description, price, depositPrice, category, sortOrder, isActive } = body

    if (!id) {
      return NextResponse.json({ error: "شناسه خدمت الزامی است" }, { status: 400 })
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(depositPrice !== undefined && { depositPrice: Number(depositPrice) }),
        ...(category && { category }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
        ...(isActive !== undefined && { isActive: !!isActive }),
      },
    })

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_UPDATE_SERVICE",
        entity: "Service",
        entityId: id,
        userId: auth.session.userId,
        userRole: auth.session.role,
        details: JSON.stringify(body),
      },
    })

    return NextResponse.json({ success: true, service: updated })
  } catch (error) {
    console.error("Admin update service error:", error)
    return NextResponse.json({ error: "خطا در به‌روزرسانی خدمت" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = authorizeAdmin(request, "OWNER")
  if ("errorResponse" in auth) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 })
    }

    // Check if appointments exist for this service
    const count = await prisma.appointment.count({ where: { serviceId: id } })
    if (count > 0) {
      // Soft-delete to preserve foreign key constraints and historical invoices
      await prisma.service.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        success: true,
        message: "به دلیل وجود سابقه نوبت، خدمت غیرفعال (آرشیو) گردید.",
      })
    }

    await prisma.service.delete({ where: { id } })
    return NextResponse.json({ success: true, message: "خدمت با موفقیت حذف شد" })
  } catch (error) {
    console.error("Admin delete service error:", error)
    return NextResponse.json({ error: "خطا در حذف خدمت" }, { status: 500 })
  }
}
