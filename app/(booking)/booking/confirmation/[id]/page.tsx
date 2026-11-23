import { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { formatPrice, formatDateTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Scissors, User, Calendar, Clock, MapPin, CheckCircle, ArrowLeft, RotateCcw } from "lucide-react"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getAppointment(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    include: {
      service: true,
      barber: true,
    },
  })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const appointment = await getAppointment(id)

  if (!appointment) {
    return { title: "نوبت یافت نشد" }
  }

  return {
    title: `تایید نوبت #${id.slice(0, 8)} | BarberBook`,
    description: `نوبت ${appointment.customerName} برای ${appointment.service.name} با ${appointment.barber.name}`,
  }
}

export default async function ConfirmationPage({ params }: PageProps) {
  const { id } = await params
  const appointment = await getAppointment(id)

  if (!appointment) {
    notFound()
  }

  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
    PENDING: "warning",
    CONFIRMED: "success",
    CANCELLED: "destructive",
    COMPLETED: "default",
    NO_SHOW: "secondary",
  }

  const statusLabels: Record<string, string> = {
    PENDING: "در انتظار تایید",
    CONFIRMED: "تایید شده",
    CANCELLED: "لغو شده",
    COMPLETED: "انجام شده",
    NO_SHOW: "حضور نیافته",
  }

  return (
    <div className="py-12 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-1.5 text-sm font-medium text-green-700 mb-4">
            <CheckCircle className="h-4 w-4" />
            <span>نوبت با موفقیت ثبت شد</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">تایید رزرو نوبت</h1>
          <p className="mt-2 text-muted-foreground">
            کد رزرو: <span className="font-mono font-semibold text-primary">#{id.slice(0, 8).toUpperCase()}</span>
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              جزئیات نوبت
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Scissors className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium">{appointment.service.name}</p>
                  <p className="text-sm text-muted-foreground">{appointment.service.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-primary">{formatPrice(appointment.service.price)}</p>
                <p className="text-sm text-muted-foreground">{appointment.service.duration} دقیقه</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">آرایشگر</p>
                  <p className="font-medium">{appointment.barber.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">تاریخ و ساعت</p>
                  <p className="font-medium">{formatDateTime(appointment.date)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">مکان</p>
                <p className="font-medium">آرایشگاه باربر‌بوک، خیابان ولیعصر، کوچه ۱۲، پلاک ۴۵</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Badge variant={statusVariants[appointment.status]}>
                {statusLabels[appointment.status]}
              </Badge>
              <div className="text-sm text-muted-foreground">
                مشتری: {appointment.customerName} • {appointment.customerPhone}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                <Clock className="h-4 w-4" />
              </div>
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">نکات مهم:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>لطفاً ۱۰ دقیقه قبل از وقت حضور یابید</li>
                  <li>در صورت لغو نوبت، حداقل ۲ ساعت قبل اطلاع دهید</li>
                  <li>پرداخت در محل انجام می‌شود (نقد یا کارت)</li>
                  <li>برای تغییر نوبت با شماره ۰۲۱-۱۲۳۴۵۶۷۸ تماس بگیرید</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <RotateCcw className="h-4 w-4" />
            چاپ رسید
          </Button>
          <Link href="/">
            <Button className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              بازگشت به خانه
            </Button>
          </Link>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          پیامک تایید برای شماره {appointment.customerPhone} ارسال شد.
          <br />
          برای هرگونه سوال با ما تماس بگیرید.
        </p>
      </div>
    </div>
  )
}