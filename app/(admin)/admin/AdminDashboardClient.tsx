"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatPrice, formatDate, formatTime } from "@/lib/utils"
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Scissors,
  User,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface Stats {
  totalAppointments: number
  pendingAppointments: number
  confirmedAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  thisMonthAppointments: number
  lastMonthAppointments: number
  totalRevenue: number
  thisMonthRevenue: number
  lastMonthRevenue: number
  totalCustomers: number
  totalServices: number
  totalBarbers: number
  revenueChart: { month: string; revenue: number }[]
  appointmentGrowth: number
  revenueGrowth: number
}

interface RecentAppointment {
  id: string
  date: string
  status: string
  customerName: string
  customerPhone: string
  service: { name: string; price: number }
  barber: { name: string }
}

interface AdminDashboardClientProps {
  initialStats: Stats | null
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  PENDING: { label: "در انتظار", icon: <Clock className="h-3 w-3" />, variant: "warning" },
  CONFIRMED: { label: "تایید شده", icon: <CheckCircle className="h-3 w-3" />, variant: "success" },
  CANCELLED: { label: "لغو شده", icon: <XCircle className="h-3 w-3" />, variant: "destructive" },
  COMPLETED: { label: "انجام شده", icon: <CheckCircle className="h-3 w-3" />, variant: "default" },
  NO_SHOW: { label: "حضور نیافته", icon: <AlertCircle className="h-3 w-3" />, variant: "secondary" },
}

export function AdminDashboardClient({ initialStats }: AdminDashboardClientProps) {
  const [stats, setStats] = useState<Stats | null>(initialStats)
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([])
  const [isLoading, setIsLoading] = useState(!initialStats)

  useEffect(() => {
    if (!initialStats) {
      fetchStats()
    }
    fetchRecentAppointments()
  }, [initialStats])

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats")
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRecentAppointments = async () => {
    try {
      const res = await fetch("/api/appointments?startDate=" + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      if (res.ok) {
        const data = await res.json()
        setRecentAppointments(data.slice(0, 10))
      }
    } catch (err) {
      console.error("Failed to fetch recent appointments:", err)
    }
  }

  const StatCard = ({ title, value, change, icon: Icon, trend, color = "text-primary" }: {
    title: string
    value: string | number
    change?: number
    icon: React.ComponentType<{ className?: string }>
    trend?: "up" | "down"
    color?: string
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", color)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs mt-1", trend === "up" ? "text-green-600" : "text-red-600")}>
            {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span>{Math.abs(change).toFixed(1)}%</span>
            <span className="text-muted-foreground">از ماه قبل</span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">خطا در بارگذاری آمار</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          تلاش مجدد
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">داشبورد مدیریت</h1>
          <p className="text-muted-foreground">نمای کلی عملکرد آرایشگاه</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/appointments?status=PENDING">
              <Clock className="mr-2 h-4 w-4" />
              نوبت‌های در انتظار
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/appointments">
              <BarChart2 className="mr-2 h-4 w-4" />
              همه نوبت‌ها
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="نوبت‌های امروز"
          value={stats.thisMonthAppointments}
          change={stats.appointmentGrowth}
          trend={stats.appointmentGrowth >= 0 ? "up" : "down"}
          icon={Calendar}
        />
        <StatCard
          title="در انتظار تایید"
          value={stats.pendingAppointments}
          icon={Clock}
          color="text-yellow-600"
        />
        <StatCard
          title="درآمد این ماه"
          value={formatPrice(stats.thisMonthRevenue)}
          change={stats.revenueGrowth}
          trend={stats.revenueGrowth >= 0 ? "up" : "down"}
          icon={DollarSign}
          color="text-green-600"
        />
        <StatCard
          title="کل مشتریان"
          value={stats.totalCustomers}
          icon={Users}
          color="text-blue-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              درآمد ۶ ماه اخیر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <RevenueChart data={stats.revenueChart} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              آمار نوبت‌ها
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <StatCard title="تایید شده" value={stats.confirmedAppointments} icon={CheckCircle} color="text-green-600" />
              <StatCard title="انجام شده" value={stats.completedAppointments} icon={CheckCircle} color="text-blue-600" />
              <StatCard title="لغو شده" value={stats.cancelledAppointments} icon={XCircle} color="text-red-600" />
              <StatCard title="کل نوبت‌ها" value={stats.totalAppointments} icon={Calendar} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            نوبت‌های اخیر
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/appointments">مشاهده همه</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>هیچ نوبت اخیری یافت نشد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-sm text-muted-foreground">
                    <th className="text-right py-3 px-4">مشتری</th>
                    <th className="text-right py-3 px-4">خدمت</th>
                    <th className="text-right py-3 px-4">آرایشگر</th>
                    <th className="text-right py-3 px-4">تاریخ و ساعت</th>
                    <th className="text-right py-3 px-4">وضعیت</th>
                    <th className="text-right py-3 px-4">مبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentAppointments.map(apt => {
                    const config = statusConfig[apt.status] || statusConfig.PENDING
                    return (
                      <tr key={apt.id} className="hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{apt.customerName}</p>
                            <p className="text-sm text-muted-foreground">{apt.customerPhone}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">{apt.service.name}</td>
                        <td className="py-3 px-4">{apt.barber.name}</td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <p>{formatDate(apt.date)}</p>
                            <p className="text-muted-foreground">{formatTime(apt.date)}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={config.variant} className="gap-1">
                            {config.icon}
                            {config.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-medium text-primary">
                          {formatPrice(apt.service.price)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              خدمات فعال
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats.totalServices}</p>
            <p className="text-sm text-muted-foreground">خدمت در دسترس</p>
            <Button asChild variant="outline" className="mt-4 w-full" size="sm">
              <Link href="/admin/services">مدیریت خدمات</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              آرایشگرها
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats.totalBarbers}</p>
            <p className="text-sm text-muted-foreground">آرایشگر فعال</p>
            <Button asChild variant="outline" className="mt-4 w-full" size="sm">
              <Link href="/admin/barbers">مدیریت آرایشگرها</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              کل درآمد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatPrice(stats.totalRevenue)}</p>
            <p className="text-sm text-muted-foreground">مجموع درآمدها</p>
            <Button asChild variant="outline" className="mt-4 w-full" size="sm">
              <Link href="/admin/reports">گزارش‌های مالی</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function RevenueChart({ data }: { data: { month: string; revenue: number }[] }) {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1)
  const chartWidth = 600
  const height = 256

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`} className="w-full h-full">
      <defs>
        <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x={40} y={20} width={chartWidth - 80} height={height - 60} fill="transparent" />

      {data.map((d, i) => {
        const x = 40 + (i / Math.max(data.length - 1, 1)) * (chartWidth - 80)
        const barHeight = (d.revenue / maxRevenue) * (height - 80)
        const y = height - 40 - barHeight

        return (
          <g key={i}>
            <rect
              x={x - 20}
              y={y}
              width={40}
              height={barHeight}
              rx={4}
              fill="url(#revenue-gradient)"
              className="transition-all duration-300 hover:opacity-80"
            />
            <rect
              x={x - 20}
              y={y}
              width={40}
              height={barHeight}
              rx={4}
              fill="hsl(var(--primary))"
              className="transition-all duration-300"
            />
            <text
              x={x}
              y={height - 20}
              textAnchor="middle"
              fontSize="10"
              fill="hsl(var(--muted-foreground))"
              className="font-medium"
            >
              {d.month}
            </text>
            {d.revenue > 0 && (
              <text
                x={x}
                y={y - 5}
                textAnchor="middle"
                fontSize="10"
                fill="hsl(var(--primary))"
                fontWeight="bold"
              >
                {(d.revenue / 1000000).toFixed(1)}M
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}