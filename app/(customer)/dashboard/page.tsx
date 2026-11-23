"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatPrice, formatDate, formatTime, getPersianDayName } from "@/lib/utils"
import {
  CalendarClock,
  Clock,
  Scissors,
  User,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Appointment {
  id: string
  date: string
  endDate: string
  status: string
  price: number
  service: { id: string; name: string; price: number; duration: number }
  barber: { id: string; name: string }
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  PENDING: { label: "در انتظار", icon: <Clock className="h-3 w-3" />, variant: "warning" },
  CONFIRMED: { label: "تایید شده", icon: <CheckCircle className="h-3 w-3" />, variant: "success" },
  CANCELLED: { label: "لغو شده", icon: <XCircle className="h-3 w-3" />, variant: "destructive" },
  COMPLETED: { label: "انجام شده", icon: <CheckCircle className="h-3 w-3" />, variant: "default" },
  NO_SHOW: { label: "حضور نیافته", icon: <AlertCircle className="h-3 w-3" />, variant: "secondary" },
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [appointmentsRes, statsRes] = await Promise.all([
        fetch("/api/customer/appointments?limit=5"),
        fetch("/api/customer/appointments?limit=100"),
      ])

      if (appointmentsRes.ok) {
        const data = await appointmentsRes.json()
        setAppointments(data.appointments || [])
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        const allAppointments = data.appointments || []
        setStats({
          total: allAppointments.length,
          upcoming: allAppointments.filter((a: Appointment) => ["PENDING", "CONFIRMED"].includes(a.status)).length,
          completed: allAppointments.filter((a: Appointment) => a.status === "COMPLETED").length,
          cancelled: allAppointments.filter((a: Appointment) => ["CANCELLED", "NO_SHOW"].includes(a.status)).length,
        })
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const upcomingAppointments = appointments
    .filter((a) => ["PENDING", "CONFIRMED"].includes(a.status))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">داشبورد</h1>
          <p className="text-muted-foreground">نمای کلی نوبت‌ها و حساب کاربری شما</p>
        </div>
        <Link href="/book" className="btn-luxury gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>رزرو نوبت جدید</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">کل نوبت‌ها</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.total}</span>
              <span className="text-muted-foreground">نوبت</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">نوبت‌های آینده</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">{stats.upcoming}</span>
              <span className="text-muted-foreground">نوبت</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">انجام شده</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-600">{stats.completed}</span>
              <span className="text-muted-foreground">نوبت</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">لغو شده</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-destructive">{stats.cancelled}</span>
              <span className="text-muted-foreground">نوبت</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">نوبت‌های آینده</h2>
            <p className="text-sm text-muted-foreground">نوبت‌های در انتظار و تایید شده شما</p>
          </div>
          <Link href="/dashboard/appointments" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            مشاهده همه
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/50 animate-pulse">
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="h-16 w-16 rounded-xl bg-muted" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 w-3/4 bg-muted rounded" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                      <div className="h-3 w-1/3 bg-muted rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : upcomingAppointments.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-2">هیچ نوبت آینده‌ای ندارید</h3>
              <p className="text-muted-foreground mb-4">برای رزرو نوبت جدید روی دکمه زیر کلیک کنید</p>
              <Link href="/book" className="btn-luxury gap-2 inline-flex">
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>رزرو نوبت جدید</span>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingAppointments.map((apt) => {
              const config = statusConfig[apt.status] || statusConfig.PENDING
              const appointmentDate = new Date(apt.date)
              return (
                <Link
                  key={apt.id}
                  href={`/dashboard/appointments/${apt.id}`}
                  className="block"
                >
                  <Card className="border-border/50 hover:border-primary/30 transition-colors">
                    <CardContent className="pt-4">
                      <div className="flex gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary flex-shrink-0">
                          <Scissors className="h-7 w-7" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-semibold truncate">{apt.service.name}</h3>
                              <p className="text-sm text-muted-foreground">{apt.barber.name}</p>
                            </div>
                            <Badge variant={config.variant} className="gap-1 flex-shrink-0">
                              {config.icon}
                              {config.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1 persian-nums">
                              <CalendarClock className="h-4 w-4" aria-hidden="true" />
                              {getPersianDayName(appointmentDate)}، {formatDate(appointmentDate)}
                            </span>
                            <span className="flex items-center gap-1 persian-nums">
                              <Clock className="h-4 w-4" aria-hidden="true" />
                              {formatTime(apt.date)}
                            </span>
                            <span className="flex items-center gap-1 persian-nums">
                              <User className="h-4 w-4" aria-hidden="true" />
                              {apt.service.duration} دقیقه
                            </span>
                            <span className="font-medium text-primary persian-nums ml-auto">
                              {formatPrice(apt.price)}
                            </span>
                          </div>
                        </div>
                        <ChevronLeft className="h-5 w-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/book" className="card-luxury p-6 text-center hover:border-primary/30 transition-colors group">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto mb-4 group-hover:scale-105 transition-transform">
            <Plus className="h-7 w-7" aria-hidden="true" />
          </div>
          <h3 className="font-semibold mb-1">رزرو نوبت جدید</h3>
          <p className="text-sm text-muted-foreground">انتخاب خدمت، آرایشگر و ساعت</p>
        </Link>

        <Link href="/dashboard/appointments" className="card-luxury p-6 text-center hover:border-primary/30 transition-colors group">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto mb-4 group-hover:scale-105 transition-transform">
            <CalendarClock className="h-7 w-7" aria-hidden="true" />
          </div>
          <h3 className="font-semibold mb-1">مشاهده نوبت‌ها</h3>
          <p className="text-sm text-muted-foreground">تاریخچه و جزئیات نوبت‌ها</p>
        </Link>

        <Link href="/dashboard/profile" className="card-luxury p-6 text-center hover:border-primary/30 transition-colors group">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto mb-4 group-hover:scale-105 transition-transform">
            <User className="h-7 w-7" aria-hidden="true" />
          </div>
          <h3 className="font-semibold mb-1">ویرایش پروفایل</h3>
          <p className="text-sm text-muted-foreground">اطلاعات شخصی و تنظیمات</p>
        </Link>
      </div>
    </div>
  )
}