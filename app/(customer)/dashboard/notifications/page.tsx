"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatTime } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  Bell,
  CheckCircle,
  Mail,
  CalendarClock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data: string | null
  isRead: boolean
  sentAt: string
  readAt: string | null
}

const typeConfig: Record<string, { icon: React.ReactNode; label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  appointment_confirmed: { icon: <CheckCircle className="h-3 w-3" />, label: "تایید نوبت", variant: "success" },
  appointment_reminder: { icon: <CalendarClock className="h-3 w-3" />, label: "یادآوری نوبت", variant: "info" },
  appointment_cancelled: { icon: <AlertCircle className="h-3 w-3" />, label: "لغو نوبت", variant: "destructive" },
  promotion: { icon: <Mail className="h-3 w-3" />, label: "پیش‌پرداخت", variant: "default" },
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const pageSize = 20

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        unreadOnly: showUnreadOnly.toString(),
      })
      const res = await fetch(`/api/customer/notifications?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setTotalCount(data.pagination?.totalCount || data.notifications.length)
        setUnreadCount(data.unreadCount)
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err)
    } finally {
      setIsLoading(false)
    }
  }, [page, showUnreadOnly])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAsRead = async (ids: string[]) => {
    try {
      const res = await fetch("/api/customer/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: ids }),
      })
      if (res.ok) {
        fetchNotifications()
      }
    } catch (err) {
      console.error("Failed to mark as read:", err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/customer/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      })
      if (res.ok) {
        fetchNotifications()
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err)
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">اعلان‌ها</h1>
          <p className="text-muted-foreground">مدیریت اعلان‌های نوبت‌ها و اخبار</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            خواندن همه ({unreadCount})
          </Button>
        )}
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={e => { setShowUnreadOnly(e.target.checked); setPage(1); }}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">فقط خوانده نشده‌ها</span>
            </label>
            <span className="text-sm text-muted-foreground">
              {unreadCount} اعلان خوانده نشده از کل {totalCount}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-2">هیچ اعلانی وجود ندارد</h3>
              <p className="text-muted-foreground">وقتی نوبتی رزرو یا تایید شود، اینجا نمایش داده می‌شود</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const config = typeConfig[notification.type] || { icon: <Bell className="h-3 w-3" />, label: "اعلان", variant: "default" }
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-muted/50 transition-colors",
                      !notification.isRead && "bg-primary/5 border-r-2 border-primary"
                    )}
                  >
                    <div className="flex gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold">{notification.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant={config.variant} className="gap-1">
                              {config.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground persian-nums whitespace-nowrap">
                              {formatDate(new Date(notification.sentAt))}، {formatTime(notification.sentAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:bg-green-600/10"
                          onClick={() => markAsRead([notification.id])}
                          aria-label="علامت‌گذاری به عنوان خوانده شده"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
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