"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toPersianDigits, formatJalaliShort } from "@/lib/jalali"
import {
  Send,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  RotateCw,
  Search,
  Filter,
  Check,
  Settings,
  Sparkles,
  Phone,
  User,
  Sliders,
  FileText,
} from "lucide-react"

interface NotificationJobItem {
  id: string
  phone: string
  recipientName?: string | null
  type: string
  message: string
  status: "PENDING" | "SENT" | "FAILED"
  error?: string | null
  provider: string
  sentAt?: string | null
  createdAt: string
}

interface SmsCenterResponse {
  provider: {
    name: string
    isConfigured: boolean
    mode: string
  }
  reminderHours: number
  stats: {
    total: number
    sent: number
    pending: number
    failed: number
  }
  jobs: NotificationJobItem[]
}

const PRESET_TEMPLATES = [
  {
    id: "confirmation",
    title: "تأیید نوبت پس از پرداخت",
    type: "CONFIRMATION",
    text: `کوروش باربر
نوبت شما با موفقیت ثبت شد.
خدمت: {service_name}
تاریخ: {jalali_date}
ساعت: {appointment_time}
کد پیگیری: {tracking_code}
مشتاق دیدارتون هستیم.`,
  },
  {
    id: "reminder",
    title: "یادآوری نوبت قبل از موعد",
    type: "REMINDER",
    text: `یادآوری نوبت کوروش باربر
ساعت {appointment_time} در تاریخ {jalali_date} منتظر دیدار شما هستیم.
کد پیگیری: {tracking_code}`,
  },
  {
    id: "birthday",
    title: "تبریک سالروز تولد",
    type: "BIRTHDAY",
    text: `کوروش باربر
تولدت مبارک! 🎉
امیدواریم سال جدید زندگیت پر از اتفاق‌های خوب، سلامتی و موفقیت باشه.
خوشحالیم که همراه کوروش باربر هستی.`,
  },
  {
    id: "thankyou",
    title: "تشکر و قدردانی پس از اصلاح",
    type: "CUSTOM",
    text: `کوروش باربر
از اینکه امروز همراه ما بودید سپاسگزاریم.
امیدواریم از استایل و کیفیت خدمات رضایت کامل داشته باشید. مشتاق دیدار مجدد شما هستیم.`,
  },
  {
    id: "cancellation",
    title: "اطلاع‌رسانی لغو نوبت",
    type: "CUSTOM",
    text: `کوروش باربر
نوبت شما با کد پیگیری {tracking_code} بنا به درخواست شما لغو شد و وجه بیعانه به حساب شما عودت داده شد.`,
  },
]

export default function AdminSmsPage() {
  const [data, setData] = useState<SmsCenterResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"logs" | "compose" | "settings">("logs")

  // Filter States
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [typeFilter, setTypeFilter] = useState("ALL")

  // Compose State
  const [recipientPhone, setRecipientPhone] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [composeType, setComposeType] = useState("CUSTOM")
  const [composeMessage, setComposeMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  // Settings State
  const [reminderHours, setReminderHours] = useState<number>(2)
  const [saveSettingLoading, setSaveSettingLoading] = useState(false)
  const [saveSettingSuccess, setSaveSettingSuccess] = useState(false)

  // Retry State
  const [retryingId, setRetryingId] = useState<string | null>(null)

  const fetchSmsData = async () => {
    try {
      setLoading(true)
      const url = new URL("/api/admin/sms", window.location.origin)
      if (search) url.searchParams.set("search", search)
      if (statusFilter !== "ALL") url.searchParams.set("status", statusFilter)
      if (typeFilter !== "ALL") url.searchParams.set("type", typeFilter)

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error("خطا در دریافت اطلاعات پیامک‌ها")
      const json: SmsCenterResponse = await res.json()
      setData(json)
      setReminderHours(json.reminderHours)
    } catch {
      setError("امکان بارگذاری مرکز پیامک‌ها وجود ندارد")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSmsData()
  }, [statusFilter, typeFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchSmsData()
  }

  const handleSendManualSms = async () => {
    setSendError(null)
    setSendSuccess(null)

    if (!recipientPhone.trim() || !composeMessage.trim()) {
      setSendError("لطفاً شماره تلفن گیرنده و متن پیام را وارد فرمایید")
      return
    }

    try {
      setSending(true)
      const res = await fetch("/api/admin/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: recipientPhone.trim(),
          recipientName: recipientName.trim() || undefined,
          type: composeType,
          message: composeMessage.trim(),
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "خطا در ارسال پیامک")

      setSendSuccess("پیامک با موفقیت در صف ارسال ثبت و منتقل شد.")
      setRecipientPhone("")
      setRecipientName("")
      setComposeMessage("")
      fetchSmsData()
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "خطا در ارسال پیامک")
    } finally {
      setSending(false)
    }
  }

  const handleRetryJob = async (jobId: string) => {
    try {
      setRetryingId(jobId)
      const res = await fetch("/api/admin/sms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", jobId }),
      })
      if (!res.ok) throw new Error("خطا در تلاش مجدد")
      fetchSmsData()
    } catch {
      alert("خطا در ارسال مجدد پیامک")
    } finally {
      setRetryingId(null)
    }
  }

  const handleSaveReminderSetting = async () => {
    try {
      setSaveSettingLoading(true)
      const res = await fetch("/api/admin/sms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_setting", reminderHours }),
      })
      if (!res.ok) throw new Error("خطا در ذخیره تنظیمات")
      setSaveSettingSuccess(true)
      setTimeout(() => setSaveSettingSuccess(false), 3000)
    } catch {
      alert("امکان ذخیره تنظیمات یادآوری وجود ندارد")
    } finally {
      setSaveSettingLoading(false)
    }
  }

  const applyTemplate = (text: string, type: string) => {
    setComposeMessage(text)
    setComposeType(type)
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#2D332F]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181D1A] border border-[#C8A96B]/30 text-xs font-semibold text-[#E4C88E] mb-2">
            <Send className="w-3.5 h-3.5 text-[#C8A96B]" />
            <span>سامانه مخابراتی سالن</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#F5F1E8]">
            مرکز پیامک‌ها و ارتباط با مشتریان
          </h1>
          <p className="text-xs sm:text-sm text-[#A89E90] mt-1">
            پیامک‌های تراکنشی تایید رزرو، یادآوری خودکار، تبریک تولد و ارسال پیام اختصاصی
          </p>
        </div>

        {/* Provider Status Pill */}
        {data && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141715] border border-[#2D332F] text-xs">
            <span className="text-[#8C8477]">وضعیت ارائه‌دهنده:</span>
            {data.provider.mode === "KAVENEGAR" && data.provider.isConfigured ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                کاوه‌نگار متصل
              </span>
            ) : (
              <span className="text-[#E4C88E] font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#C8A96B]" />
                شبیه‌ساز هوشمند محلی (Mock)
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Stats Cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4 rounded-2xl bg-[#141715] border border-[#242A27] text-right space-y-1">
            <div className="flex items-center justify-between text-xs text-[#A89E90]">
              <span>کل پیام‌های ثبتی</span>
              <MessageSquare className="w-4 h-4 text-[#A89E90]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#F7F4EE]">
              {toPersianDigits(data.stats.total)}
            </div>
          </Card>

          <Card className="p-4 rounded-2xl bg-[#141715] border border-[#242A27] text-right space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-400">
              <span>ارسال موفق</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">
              {toPersianDigits(data.stats.sent)}
            </div>
          </Card>

          <Card className="p-4 rounded-2xl bg-[#141715] border border-[#242A27] text-right space-y-1">
            <div className="flex items-center justify-between text-xs text-[#E4C88E]">
              <span>در صف ارسال</span>
              <Clock className="w-4 h-4 text-[#C8A96B]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#E4C88E]">
              {toPersianDigits(data.stats.pending)}
            </div>
          </Card>

          <Card className="p-4 rounded-2xl bg-[#141715] border border-[#242A27] text-right space-y-1">
            <div className="flex items-center justify-between text-xs text-red-400">
              <span>ناموفق / خطا</span>
              <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-black font-mono text-red-400">
              {toPersianDigits(data.stats.failed)}
            </div>
          </Card>
        </div>
      )}

      {/* Tabs Control */}
      <div className="flex items-center gap-2 border-b border-[#242A27] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[40px] ${
            activeTab === "logs"
              ? "bg-[#C8A96B] text-[#0D0F0E] font-bold shadow-md"
              : "text-[#A89E90] hover:text-[#F7F4EE] hover:bg-[#1C201E]"
          }`}
        >
          لاگ و تاریخچه پیام‌ها
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("compose")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
            activeTab === "compose"
              ? "bg-[#C8A96B] text-[#0D0F0E] font-bold shadow-md"
              : "text-[#A89E90] hover:text-[#F7F4EE] hover:bg-[#1C201E]"
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>ارسال پیامک جدید</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
            activeTab === "settings"
              ? "bg-[#C8A96B] text-[#0D0F0E] font-bold shadow-md"
              : "text-[#A89E90] hover:text-[#F7F4EE] hover:bg-[#1C201E]"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>قالب‌ها و یادآوری خودکار</span>
        </button>
      </div>

      {/* TAB 1: LOGS & OUTBOX */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-3.5 rounded-2xl bg-[#141715] border border-[#242A27] flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی شماره یا نام گیرنده..."
                className="flex-1 bg-[#101311] border border-[#2A332E] rounded-xl px-3 py-2 text-xs text-[#F7F4EE] placeholder:text-[#555C57] focus:outline-none focus:border-[#C8A96B] min-h-[38px]"
              />
              <Button type="submit" size="sm" variant="outline" className="border-[#2A332E] text-xs h-9 px-3 cursor-pointer">
                <Search className="w-3.5 h-3.5" />
              </Button>
            </form>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#101311] border border-[#2A332E] text-xs text-[#F7F4EE] rounded-xl px-3 py-2 focus:outline-none min-h-[38px]"
              >
                <option value="ALL">تمامی وضعیت‌ها</option>
                <option value="SENT">ارسال موفق</option>
                <option value="PENDING">در صف ارسال</option>
                <option value="FAILED">ناموفق / خطا</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-[#101311] border border-[#2A332E] text-xs text-[#F7F4EE] rounded-xl px-3 py-2 focus:outline-none min-h-[38px]"
              >
                <option value="ALL">تمامی انواع</option>
                <option value="CONFIRMATION">تأیید نوبت</option>
                <option value="REMINDER">یادآوری نوبت</option>
                <option value="BIRTHDAY">تبریک تولد</option>
                <option value="CUSTOM">دستی / اختصاصی</option>
              </select>
            </div>
          </div>

          {/* Job List */}
          {loading ? (
            <div className="p-12 text-center text-[#A8A39A] text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C8A96B] mb-2" />
              در حال دریافت تاریخچه پیامک‌ها...
            </div>
          ) : !data?.jobs || data.jobs.length === 0 ? (
            <div className="p-12 text-center bg-[#141715] border border-[#242A27] rounded-3xl text-xs text-[#A8A39A]">
              هیچ پیامکی در این بازه یا فیلتر یافت نشد.
            </div>
          ) : (
            <>
              {/* Mobile Card View (< md) */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {data.jobs.map((job) => (
                  <Card key={job.id} className="p-4 rounded-2xl bg-[#141715] border border-[#242A27] text-right space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-[#202522]">
                      <div>
                        <div className="font-bold text-sm text-[#F7F4EE]">{job.recipientName || "مشتری سالن"}</div>
                        <span className="text-xs font-mono text-[#8C8477]" dir="ltr">{job.phone}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        job.status === "SENT"
                          ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"
                          : job.status === "FAILED"
                          ? "bg-red-950/40 text-red-400 border border-red-500/30"
                          : "bg-[#1E2521] text-[#E4C88E] border border-[#C8A96B]/30"
                      }`}>
                        {job.status === "SENT" ? "ارسال شد" : job.status === "FAILED" ? "خطا" : "در صف"}
                      </span>
                    </div>

                    <div className="text-xs text-[#C5BDB2] whitespace-pre-line leading-relaxed bg-[#101311] p-3 rounded-xl border border-[#202522]">
                      {job.message}
                    </div>

                    {job.error && (
                      <div className="text-[11px] text-red-400">علت خطا: {job.error}</div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[11px] text-[#7E776C]">
                      <span>نوع: {job.type}</span>
                      {job.status === "FAILED" && (
                        <Button
                          size="sm"
                          disabled={retryingId === job.id}
                          onClick={() => handleRetryJob(job.id)}
                          className="h-7 px-2 text-[11px] bg-[#1C221F] text-[#E4C88E] hover:bg-[#C8A96B] hover:text-[#0D0F0E] border border-[#C8A96B]/30 cursor-pointer"
                        >
                          <RotateCw className="w-3 h-3 ml-1" />
                          <span>{retryingId === job.id ? "در حال ارسال..." : "ارسال مجدد"}</span>
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block bg-[#141715] border border-[#242A27] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#101311] text-[#8C8477] border-b border-[#202522]">
                      <tr>
                        <th className="p-3.5 font-medium">گیرنده</th>
                        <th className="p-3.5 font-medium">شماره موبایل</th>
                        <th className="p-3.5 font-medium">نوع پیام</th>
                        <th className="p-3.5 font-medium">متن پیام</th>
                        <th className="p-3.5 font-medium">وضعیت</th>
                        <th className="p-3.5 font-medium">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#202522]">
                      {data.jobs.map((job) => (
                        <tr key={job.id} className="hover:bg-[#181D1A]/50 transition-colors">
                          <td className="p-3.5 font-bold text-[#F7F4EE] whitespace-nowrap">
                            {job.recipientName || "مشتری سالن"}
                          </td>
                          <td className="p-3.5 font-mono text-[#8C8477] dir-ltr whitespace-nowrap" dir="ltr">
                            {job.phone}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-[#1C221F] border border-[#2B332F] text-[#E4C88E] text-[10px]">
                              {job.type}
                            </span>
                          </td>
                          <td className="p-3.5 text-[#C5BDB2] max-w-xs truncate" title={job.message}>
                            {job.message}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              job.status === "SENT"
                                ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"
                                : job.status === "FAILED"
                                ? "bg-red-950/40 text-red-400 border border-red-500/30"
                                : "bg-[#1E2521] text-[#E4C88E] border border-[#C8A96B]/30"
                            }`}>
                              {job.status === "SENT" ? "ارسال شد" : job.status === "FAILED" ? "خطا" : "در صف"}
                            </span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            {job.status === "FAILED" ? (
                              <Button
                                size="sm"
                                disabled={retryingId === job.id}
                                onClick={() => handleRetryJob(job.id)}
                                className="h-7 px-2 text-[11px] bg-[#1C221F] text-[#E4C88E] hover:bg-[#C8A96B] hover:text-[#0D0F0E] border border-[#C8A96B]/30 cursor-pointer"
                              >
                                <RotateCw className="w-3 h-3 ml-1" />
                                <span>ارسال مجدد</span>
                              </Button>
                            ) : (
                              <span className="text-[#6D6559]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: COMPOSE NEW SMS */}
      {activeTab === "compose" && (
        <div className="max-w-2xl mx-auto space-y-5">
          <Card className="p-5 sm:p-7 rounded-3xl bg-[#141715] border border-[#242A27] text-right space-y-4">
            <h3 className="text-base sm:text-lg font-bold font-heading text-[#F7F4EE]">
              ارسال پیامک اختصاصی به مشتری
            </h3>

            {sendSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{sendSuccess}</span>
              </div>
            )}

            {sendError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{sendError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#C5BDB2]">شماره تلفن همراه گیرنده:</label>
                <div className="relative">
                  <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8477]" />
                  <input
                    type="tel"
                    dir="ltr"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="09123456789"
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-[#101311] border border-[#2B332F] text-[#F7F4EE] placeholder-[#5C5549] focus:outline-none focus:border-[#C8A96B] font-mono text-sm min-h-[44px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#C5BDB2]">نام گیرنده (اختیاری):</label>
                <div className="relative">
                  <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8477]" />
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="مثال: آقای رضایی"
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-[#101311] border border-[#2B332F] text-[#F7F4EE] placeholder-[#5C5549] focus:outline-none focus:border-[#C8A96B] text-sm min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            {/* Quick Template Fill Buttons */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-semibold text-[#8C8477]">الگوهای آماده پیامک:</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => applyTemplate(tmpl.text, tmpl.type)}
                    className="px-2.5 py-1 rounded-lg bg-[#1C221F] hover:bg-[#28322D] border border-[#2B332F] text-[11px] text-[#E4C88E] transition-colors cursor-pointer"
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Body */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-[#C5BDB2]">متن پیامک:</label>
              <textarea
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                placeholder="متن پیامک را در این بخش بنویسید..."
                rows={5}
                className="w-full p-3.5 rounded-xl bg-[#101311] border border-[#2B332F] text-xs sm:text-sm text-[#F7F4EE] leading-relaxed focus:outline-none focus:border-[#C8A96B]"
              />
              <div className="flex justify-between text-[11px] text-[#7E776C]">
                <span>تعداد کاراکتر: {toPersianDigits(composeMessage.length)}</span>
                <span>فرمت رسمی آرایشگاه کوروش</span>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-3 border-t border-[#242A27] flex justify-end">
              <Button
                disabled={sending || !recipientPhone.trim() || !composeMessage.trim()}
                onClick={handleSendManualSms}
                className="bg-[#C8A96B] hover:bg-[#E4C88E] text-[#0D0F0E] font-bold text-xs sm:text-sm h-11 px-6 cursor-pointer min-h-[44px]"
              >
                <Send className="w-4 h-4 ml-2" />
                <span>{sending ? "در حال ارسال پیامک..." : "ارسال نهایی پیامک"}</span>
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: SETTINGS & TEMPLATES */}
      {activeTab === "settings" && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Automatic Reminder Setting Card */}
          <Card className="p-5 sm:p-7 rounded-3xl bg-[#141715] border border-[#242A27] text-right space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C8A96B]/15 text-[#E4C88E] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-[#C8A96B]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold font-heading text-[#F7F4EE]">
                  زمان‌بندی یادآوری خودکار نوبت‌ها
                </h3>
                <p className="text-xs text-[#A89E90] mt-0.5">
                  تعیین بازه زمانی ارسال پیامک یادآوری هوشمند به مشتری قبل از زمان شروع نوبت
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#101311] border border-[#202522] space-y-3">
              <label className="text-xs font-semibold text-[#C5BDB2] block">
                فاصله زمانی ارسال پیامک یادآوری:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { hours: 1, label: "۱ ساعت قبل" },
                  { hours: 2, label: "۲ ساعت قبل (پیش‌فرض)" },
                  { hours: 4, label: "۴ ساعت قبل" },
                  { hours: 24, label: "۲۴ ساعت قبل (یک روز)" },
                ].map((opt) => (
                  <button
                    key={opt.hours}
                    type="button"
                    onClick={() => setReminderHours(opt.hours)}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                      reminderHours === opt.hours
                        ? "bg-[#C8A96B] text-[#0D0F0E] border-[#E4C88E] shadow-md"
                        : "bg-[#141715] text-[#C5BDB2] border-[#2A332E] hover:border-[#C8A96B]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                {saveSettingSuccess ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                    <Check className="w-4 h-4" />
                    تنظیمات با موفقیت ذخیره شد
                  </span>
                ) : <span />}

                <Button
                  size="sm"
                  disabled={saveSettingLoading}
                  onClick={handleSaveReminderSetting}
                  className="bg-[#C8A96B] hover:bg-[#E4C88E] text-[#0D0F0E] font-bold text-xs h-9 px-4 cursor-pointer"
                >
                  {saveSettingLoading ? "در حال ذخیره..." : "ذخیره زمان‌بندی"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Standard Templates Gallery */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#F7F4EE]">الگوهای مصوب پیامکی آرایشگاه کوروش:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PRESET_TEMPLATES.map((tmpl) => (
                <Card key={tmpl.id} className="p-4 rounded-2xl bg-[#141715] border border-[#202522] text-right space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-[#1E2421]">
                    <span className="text-xs font-bold text-[#E4C88E]">{tmpl.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#101311] text-[#8C8477] border border-[#202522]">
                      {tmpl.type}
                    </span>
                  </div>
                  <p className="text-xs text-[#C5BDB2] whitespace-pre-line leading-relaxed font-sans">
                    {tmpl.text}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
