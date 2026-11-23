"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatPrice, formatDate, formatTime, getPersianDayName } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  CalendarClock,
  Clock,
  Scissors,
  User,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  RefreshCw,
} from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"

interface Appointment {
  id: string
  date: string
  endDate: string
  status: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  notes: string | null
  price: number
  service: { id: string; name: string; price: number; duration: number }
  barber: { id: string; name: string }
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  PENDING: { label: "در انتظار", icon: <Clock className="h-3 w-3" />, variant: "warning" },
  CONFIRMED: { label: "تایید شده", icon: <CheckCircle className="h-3 w-3" />, variant: "success" },
  CANCELLE: { label: "لغو شده", icon: <XCircle className="h-3 w-3" />, variant: "destructive" },
  COMPLETED: { label: "انجام شده", icon: <CheckCircle className="h-3 w-3" />, variant: "default" },
  NO_SHOW: { label: "حضور نیافته", icon: <AlertCircle className="h-3 w-3" />, variant: "secondary" },
}

const statusOptions = [
  { value: "", label: "همه وضعیت‌ها" },
  { value: "PENDING", label: "در انتظار" },
  { value: "CONFIRMED", label: "تایید شده" },
  { value: "CANCELLED", label: "لغو شده" },
  { value: "COMPLETED", label: "انجام شده" },
  { value: "NO_SHOW", label: "حضور نیافته" },
]

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  const pageSize = 10

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      })
      if (debouncedSearch) params.append("search", debouncedSearch)
      if (statusFilter) params.append("status", statusFilter)

      const res = await fetch(`/api/customer/appointments?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setAppointments(data.appointments)
        setTotalCount(data.pagination?.totalCount || data.appointments.length)
      }
    } catch (err) {
      console.error("Failed to fetch appointments:", err)
    } finally {
      setIsLoading(false)
    }
  }, [page, debouncedSearch, statusFilter])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const handleCancel = async (id: string) => {
    if (!window.confirm("آیا از لغو این نوبت مطمئن هستید؟")) return

    try {
      const res = await fetch(`/api/customer/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      })
      if (res.ok) {
        fetchAppointments()
      } else {
        const error = await res.json()
        alert(error.error || "خطا در لغو نوبت")
      }
    } catch (err) {
      console.error("Failed to cancel appointment:", err)
      alert("خطا در لغو نوبت")
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">نوبت‌های من</h1>
          <p className="text-muted-foreground">مشاهده، فیلتر و مدیریت تمام نوبت‌های شما</p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            فیلترها
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="جستجو بر اساس نام خدمت، آرایشگر، وضعیت..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pr-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="وضعیت" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12">
              <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">هیچ نوبتی یافت نشد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th scope="col" className="px-4 py-3 text-right font-medium">#</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">خدمت</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">آرایشگر</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">تاریخ و ساعت</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">وضعیت</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">مبلغ</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt, index) => {
                    const config = statusConfig[apt.status] || statusConfig.PENDING
                    const rowIndex = (page - 1) * pageSize + index + 1
                    return (
                      <tr key={apt.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="px-4 py-3 text-muted-foreground font-medium">{rowIndex}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{apt.service.name}</p>
                          <p className="text-sm text-muted-foreground">{apt.service.duration} دقیقه</p>
                        </td>
                        <td className="px-4 py-3">{apt.barber.name}</td>
                        <td className="px-4 py-3 text-sm">
                          <p className="persian-nums">{getPersianDayName(new Date(apt.date))}، {formatDate(new Date(apt.date))}</p>
                          <p className="text-muted-foreground persian-nums">{formatTime(apt.date)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={config.variant} className="gap-1">
                            {config.icon}
                            {config.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium text-primary persian-nums">{formatPrice(apt.price)}</td>
                        <td className="px-4 py-3">
                          {apt.status === "PENDING" || apt.status === "CONFIRMED" ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancel(apt.id)}
                              className="gap-1"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              لغو
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                نمایش { (page - 1) * pageSize + 1 } تا { Math.min(page * pageSize, totalCount) } از { totalCount }
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}