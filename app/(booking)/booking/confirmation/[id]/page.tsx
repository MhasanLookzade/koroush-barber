import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/db"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return {
    title: `تایید نوبت | آرایشگاه کوروش`,
    description: `رسید دیجیتال و تاییدیه رزرو نوبت در آرایشگاه کوروش`,
  }
}

export default async function ConfirmationPage({ params }: PageProps) {
  const { id } = await params

  const appointment = await prisma.appointment.findFirst({
    where: {
      OR: [
        { id },
        { trackingCode: id.toUpperCase() },
      ],
    },
    select: { trackingCode: true },
  })

  if (!appointment) {
    notFound()
  }

  redirect(`/booking/success?trackingCode=${appointment.trackingCode}`)
}
