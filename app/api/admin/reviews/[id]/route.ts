import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authorizeAdmin } from "@/lib/admin-auth"
import { z } from "zod"

export const dynamic = "force-dynamic"

const updateSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "HIDDEN"]).optional(),
  adminNote: z.string().optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) return auth.errorResponse

  try {
    const { id } = params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "داده‌های ورودی نامعتبر است" }, { status: 400 })
    }

    const review = await prisma.review.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json({ success: true, review })
  } catch (error) {
    console.error("Error updating review:", error)
    return NextResponse.json(
      { error: "خطا در بروزرسانی وضعیت نظر" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = authorizeAdmin(request)
  if ("errorResponse" in auth) return auth.errorResponse

  try {
    const { id } = params
    await prisma.review.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting review:", error)
    return NextResponse.json(
      { error: "خطا در حذف نظر" },
      { status: 500 }
    )
  }
}
