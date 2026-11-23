"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { formatPrice, formatDate, formatTime } from "@/lib/utils"
import {
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  MoreHorizontal,
  Download,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
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
  CANCELLED: { label: "لغو شده", icon: <XCircle className="h-3 w-3" />, variant: "destructive" },
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

export function AdminAppointmentsClient({ initialParams }: { initialParams: { status?: string; barberId?: string; date?: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState(initialParams.status || "")
  const [dateFilter, setDateFilter] = useState(initialParams.date || "")
  const debouncedSearch = useDebounce(search, 300)

  const pageSize = 15

  useEffect(() => {
    fetchAppointments()
  }, [page, debouncedSearch, statusFilter, dateFilter])

  const fetchAppointments = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      })
      if (debouncedSearch) params.append("search", debouncedSearch)
      if (statusFilter) params.append("status", statusFilter)
      if (dateFilter) params.append("date", dateFilter)

      const res = await fetch(`/api/appointments?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setAppointments(data)
        const total = res.headers.get("X-Total-Count")
        setTotalCount(total ? parseInt(total) : data.length)
      }
    } catch (err) {
      console.error("Failed to fetch appointments:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchAppointments()
      }
    } catch (err) {
      console.error("Failed to update appointment:", err)
    }
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.append("search", debouncedSearch)
      if (statusFilter) params.append("status", statusFilter)
      if (dateFilter) params.append("date", dateFilter)

      const res = await fetch(`/api/appointments/export?${params.toString()}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `appointments-${new Date().toISOString().split("T")[0]}.csv`
        a.click()
      }
    } catch (err) {
      console.error("Failed to export:", err)
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">مدیریت نوبت‌ها</h1>
          <p className="text-muted-foreground">مشاهده، فیلتر و مدیریت تمام نوبت‌های آرایشگاه</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            صادرات CSV
          </Button>
          <Button variant="outline" onClick={fetchAppointments} disabled={isLoading} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            تازه‌سازی
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            فیلترها
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="جستجو بر اساس نام، تلفن، خدمت، آرایشگر..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
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
            <div className="relative w-full sm:w-48">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={e => { setDateFilter(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">هیچ نوبتی یافت نشد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" scope="col">#</TableHead>
                    <TableHead scope="col">مشتری</TableHead>
                    <TableHead scope="col">خدمت</TableHead>
                    <TableHead scope="col">آرایشگر</TableHead>
                    <TableHead scope="col">تاریخ و ساعت</TableHead>
                    <TableHead scope="col">وضعیت</TableHead>
                    <TableHead scope="col">مبلغ</TableHead>
                    <TableHead scope="col" className="w-40">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((apt, index) => {
                    const config = statusConfig[apt.status] || statusConfig.PENDING
                    const rowIndex = (page - 1) * pageSize + index + 1
                    return (
                      <TableRow key={apt.id} className="hover:bg-muted/50">
                        <TableCell className="text-muted-foreground font-medium">{rowIndex}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{apt.customerName}</p>
                            <p className="text-sm text-muted-foreground">{apt.customerPhone}</p>
                            {apt.customerEmail && (
                              <p className="text-xs text-muted-foreground">{apt.customerEmail}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{apt.service.name}</p>
                          <p className="text-sm text-muted-foreground">{apt.service.duration} دقیقه</p>
                        </TableCell>
                        <TableCell>{apt.barber.name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{formatDate(apt.date)}</p>
                            <p className="text-muted-foreground">{formatTime(apt.date)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.variant} className="gap-1">
                            {config.icon}
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-primary">{formatPrice(apt.price)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className={cn("flex items-center gap-2", apt.status === "CONFIRMED" ? "text-green-600" : "")}
                                onClick={() => handleStatusChange(apt.id, "CONFIRMED")}
                                disabled={apt.status === "CONFIRMED"}
                              >
                                <CheckCircle className="h-4 w-4" />
                                تایید
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className={cn("flex items-center gap-2", apt.status === "COMPLETED" ? "text-blue-600" : "")}
                                onClick={() => handleStatusChange(apt.id, "COMPLETED")}
                                disabled={apt.status === "COMPLETED" || apt.status === "CANCELLED"}
                              >
                                <CheckCircle className="h-4 w-4" />
                                انجام شده
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className={cn("flex items-center gap-2", apt.status === "CANCELLED" ? "text-red-600" : "")}
                                onClick={() => handleStatusChange(apt.id, "CANCELLED")}
                                disabled={apt.status === "CANCELLED" || apt.status === "COMPLETED"}
                              >
                                <XCircle className="h-4 w-4" />
                                لغو
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className={cn("flex items-center gap-2", apt.status === "NO_SHOW" ? "text-orange-600" : "")}
                                onClick={() => handleStatusChange(apt.id, "NO_SHOW")}
                                disabled={apt.status === "NO_SHOW" || apt.status === "COMPLETED" || apt.status === "CANCELLED"}
                              >
                                <AlertCircle className="h-4 w-4" />
                                حضور نیافته
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
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