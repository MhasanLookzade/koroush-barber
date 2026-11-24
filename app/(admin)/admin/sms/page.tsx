"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
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
  Check,
  Sparkles,
  Phone,
  User,
  Sliders,
  FileText,
  Plus,
  Trash2,
  Edit3,
  X,
  Cake,
  Calendar,
  ShieldCheck,
  HelpCircle,
  Eye,
  Info,
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

export interface SmsTemplateItem {
  id: string
  title: string
  type: "CONFIRMATION" | "REMINDER" | "BIRTHDAY" | "CANCELLATION" | "RESCHEDULE" | "THANKYOU" | "CUSTOM"
  trigger: string
  text: string
  isActive: boolean
  isSystem: boolean
}

export interface ReminderRulesConfig {
  appointmentReminder: {
    enabled: boolean
    hoursBefore: number
    templateId: string
  }
  birthdayGreeting: {
    enabled: boolean
    sendTime: string
    templateId: string
  }
  bookingConfirmation: {
    enabled: boolean
    templateId: string
  }
  cancellationNotice: {
    enabled: boolean
    templateId: string
  }
  rescheduleNotice: {
    enabled: boolean
    templateId: string
  }
}

interface SmsCenterResponse {
  provider: {
    name: string
    isConfigured: boolean
    mode: string
  }
  reminderHours: number
  templates: SmsTemplateItem[]
  reminderRules: ReminderRulesConfig
  prefillCustomer?: { id: string; name: string; phone: string } | null
  customersList: Array<{ id: string; name: string; phone: string }>
  stats: {
    total: number
    sent: number
    pending: number
    failed: number
  }
  jobs: NotificationJobItem[]
}

const DYNAMIC_VARIABLES = [
  { token: "{customer_name}", label: "نام مشتری", sample: "آقای رضایی" },
  { token: "{service_name}", label: "نام خدمت", sample: "اصلاح VIP و فید مو" },
  { token: "{jalali_date}", label: "تاریخ شمسی", sample: "سه‌شنبه، ۴ آذر ۱۴۰۵" },
  { token: "{appointment_time}", label: "ساعت نوبت", sample: "۱۵:۰۰" },
  { token: "{tracking_code}", label: "کد پیگیری", sample: "KB-8492" },
  { token: "{salon_name}", label: "نام سالن", sample: "کوروش باربر" },
]

function getSmsPartsCount(text: string): { chars: number; parts: number; remaining: number } {
  const chars = text.length
  if (chars <= 70) {
    return { chars, parts: chars === 0 ? 0 : 1, remaining: 70 - chars }
  }
  const parts = Math.ceil(chars / 67)
  const remaining = parts * 67 - chars
  return { chars, parts, remaining }
}

function substituteVariables(text: string, customerName = "آقای رضایی"): string {
  return text
    .replace(/\{customer_name\}/g, customerName)
    .replace(/\{service_name\}/g, "اصلاح مو و پیرایش ریش VIP")
    .replace(/\{jalali_date\}/g, "سه‌شنبه، ۴ آذر ۱۴۰۵")
    .replace(/\{appointment_time\}/g, "۱۶:۰۰")
    .replace(/\{tracking_code\}/g, "KB-5891")
    .replace(/\{salon_name\}/g, "کوروش باربر")
}

export default function AdminSmsPage() {
  const [data, setData] = useState<SmsCenterResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // STRICT TAB ORDER:
  // 1: compose (Default!)
  // 2: templates
  // 3: reminders
  // 4: logs (MUST BE LAST!)
  const [activeTab, setActiveTab] = useState<"compose" | "templates" | "reminders" | "logs">("compose")

  // Compose State
  const [recipientPhone, setRecipientPhone] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [composeType, setComposeType] = useState("CUSTOM")
  const [composeMessage, setComposeMessage] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Template Editing State
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplateItem | null>(null)
  const [tplTitle, setTplTitle] = useState("")
  const [tplType, setTplType] = useState<SmsTemplateItem["type"]>("CUSTOM")
  const [tplTrigger, setTplTrigger] = useState("")
  const [tplText, setTplText] = useState("")
  const [tplIsActive, setTplIsActive] = useState(true)
  const [saveTplLoading, setSaveTplLoading] = useState(false)
  const [tplModalOpen, setTplModalOpen] = useState(false)
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Reminders Configuration State
  const [reminderRules, setReminderRules] = useState<ReminderRulesConfig | null>(null)
  const [saveRulesLoading, setSaveRulesLoading] = useState(false)
  const [rulesSuccessMsg, setRulesSuccessMsg] = useState<string | null>(null)

  // Logs Filter States
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [retryingId, setRetryingId] = useState<string | null>(null)

  // Fetch Central SMS Data
  const fetchSmsData = async (queryCustomerId?: string) => {
    try {
      setLoading(true)
      const url = new URL("/api/admin/sms", window.location.origin)
      if (search) url.searchParams.set("search", search)
      if (statusFilter !== "ALL") url.searchParams.set("status", statusFilter)
      if (typeFilter !== "ALL") url.searchParams.set("type", typeFilter)
      if (queryCustomerId) url.searchParams.set("customerId", queryCustomerId)

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error("خطا در دریافت اطلاعات مرکز پیامک")
      const json: SmsCenterResponse = await res.json()
      setData(json)
      setReminderRules(json.reminderRules)

      // Handle URL prefill if customer returned
      if (json.prefillCustomer) {
        setRecipientName(json.prefillCustomer.name)
        setRecipientPhone(json.prefillCustomer.phone)
      }
    } catch {
      setError("امکان بارگذاری مرکز پیامک وجود ندارد")
    } finally {
      setLoading(false)
    }
  }

  // Initial mount: inspect URL parameters for tab, customerId, type
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search)
      const tabParam = sp.get("tab")
      const customerIdParam = sp.get("customerId")
      const typeParam = sp.get("type")

      if (tabParam === "templates" || tabParam === "reminders" || tabParam === "logs") {
        setActiveTab(tabParam)
      } else {
        setActiveTab("compose") // Default Tab
      }

      fetchSmsData(customerIdParam || undefined).then(() => {
        if (typeParam === "BIRTHDAY") {
          setComposeType("BIRTHDAY")
        }
      })
    } else {
      fetchSmsData()
    }
  }, [statusFilter, typeFilter])

  // React to template prefill when data arrives
  useEffect(() => {
    if (data?.templates && typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search)
      const typeParam = sp.get("type")
      if (typeParam === "BIRTHDAY") {
        const bdayTpl = data.templates.find((t) => t.type === "BIRTHDAY")
        if (bdayTpl) {
          setSelectedTemplateId(bdayTpl.id)
          setComposeMessage(bdayTpl.text)
          setComposeType("BIRTHDAY")
        }
      }
    }
  }, [data])

  // Select customer from quick selector
  const handleSelectCustomer = (customer: { id: string; name: string; phone: string }) => {
    setRecipientName(customer.name)
    setRecipientPhone(customer.phone)
  }

  // Apply chosen template to compose message
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    if (!templateId) return
    const found = data?.templates.find((t) => t.id === templateId)
    if (found) {
      setComposeMessage(found.text)
      setComposeType(found.type)
    }
  }

  // Insert token into compose textarea at cursor
  const insertToken = (token: string) => {
    const el = textareaRef.current
    if (!el) {
      setComposeMessage((prev) => prev + " " + token)
      return
    }
    const start = el.selectionStart || 0
    const end = el.selectionEnd || 0
    const newText = composeMessage.substring(0, start) + token + composeMessage.substring(end)
    setComposeMessage(newText)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    }, 50)
  }

  // Insert token into template editor textarea
  const insertTokenInTemplate = (token: string) => {
    const el = templateTextareaRef.current
    if (!el) {
      setTplText((prev) => prev + " " + token)
      return
    }
    const start = el.selectionStart || 0
    const end = el.selectionEnd || 0
    const newText = tplText.substring(0, start) + token + tplText.substring(end)
    setTplText(newText)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    }, 50)
  }

  // Send SMS Handler
  const handleConfirmAndSend = async () => {
    setShowConfirmModal(false)
    setSendError(null)
    setSendSuccess(null)

    if (!recipientPhone.trim() || !composeMessage.trim()) {
      setSendError("شماره همراه و متن پیام الزامی است")
      return
    }

    try {
      setSending(true)
      // Resolve dynamic variables before send if customer name is provided
      const finalMessage = recipientName.trim()
        ? composeMessage.replace(/\{customer_name\}/g, recipientName.trim())
        : composeMessage

      const res = await fetch("/api/admin/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: recipientPhone.trim(),
          recipientName: recipientName.trim() || undefined,
          type: composeType,
          message: finalMessage.trim(),
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "خطا در ارسال پیامک")

      setSendSuccess(`پیامک با موفقیت به ${recipientName || recipientPhone} ارسال گردید.`)
      setRecipientPhone("")
      setRecipientName("")
      setComposeMessage("")
      setSelectedTemplateId("")
      fetchSmsData()
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "خطا در ارسال پیامک")
    } finally {
      setSending(false)
    }
  }

  // Open Template Modal for Create
  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null)
    setTplTitle("")
    setTplType("CUSTOM")
    setTplTrigger("ارسال دستی یا سفارشی")
    setTplText("")
    setTplIsActive(true)
    setTplModalOpen(true)
  }

  // Open Template Modal for Edit
  const handleOpenEditTemplate = (tmpl: SmsTemplateItem) => {
    setEditingTemplate(tmpl)
    setTplTitle(tmpl.title)
    setTplType(tmpl.type)
    setTplTrigger(tmpl.trigger)
    setTplText(tmpl.text)
    setTplIsActive(tmpl.isActive)
    setTplModalOpen(true)
  }

  // Save Template (Create or Update)
  const handleSaveTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tplTitle.trim() || !tplText.trim()) return

    try {
      setSaveTplLoading(true)
      const res = await fetch("/api/admin/sms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_template",
          template: {
            id: editingTemplate?.id || `custom_${Date.now()}`,
            title: tplTitle.trim(),
            type: tplType,
            trigger: tplTrigger.trim(),
            text: tplText.trim(),
            isActive: tplIsActive,
            isSystem: editingTemplate?.isSystem ?? false,
          },
        }),
      })

      if (!res.ok) throw new Error("خطا در ذخیره قالب پیامک")
      setTplModalOpen(false)
      fetchSmsData()
    } catch {
      alert("خطا در ذخیره قالب پیامک")
    } finally {
      setSaveTplLoading(false)
    }
  }

  // Delete Template
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("آیا از حذف این قالب پیامک اطمینان دارید؟")) return
    try {
      const res = await fetch("/api/admin/sms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_template",
          templateId,
        }),
      })
      if (!res.ok) throw new Error("خطا در حذف قالب")
      fetchSmsData()
    } catch {
      alert("خطا در حذف قالب پیامک")
    }
  }

  // Toggle Template Active State
  const handleToggleTemplateActive = async (tmpl: SmsTemplateItem) => {
    try {
      await fetch("/api/admin/sms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_template",
          template: {
            ...tmpl,
            isActive: !tmpl.isActive,
          },
        }),
      })
      fetchSmsData()
    } catch {
      alert("خطا در تغییر وضعیت قالب")
    }
  }

  // Save Reminder Rules
  const handleSaveReminderRules = async () => {
    if (!reminderRules) return
    try {
      setSaveRulesLoading(true)
      const res = await fetch("/api/admin/sms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_reminder_rules",
          rules: reminderRules,
        }),
      })
      if (!res.ok) throw new Error("خطا در ذخیره زمان‌بندی یادآوری‌ها")
      setRulesSuccessMsg("تنظیمات زمان‌بندی و یادآوری‌ها با موفقیت ذخیره شد.")
      setTimeout(() => setRulesSuccessMsg(null), 4000)
      fetchSmsData()
    } catch {
      alert("خطا در ذخیره تنظیمات زمان‌بندی")
    } finally {
      setSaveRulesLoading(false)
    }
  }

  // Retry Failed Job
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

  const composeParts = getSmsPartsCount(composeMessage)
  const templateEditorParts = getSmsPartsCount(tplText)

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#2D332F]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181D1A] border border-[#C8A96B]/30 text-xs font-semibold text-[#E4C88E] mb-2">
            <Send className="w-3.5 h-3.5 text-[#C8A96B]" />
            <span>سامانه مخابراتی سالن کوروش</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-heading text-[#F5F1E8]">
            مرکز پیامک و مدیریت ارتباط با مشتریان
          </h1>
          <p className="text-xs sm:text-sm text-[#A89E90] mt-1">
            ارسال پیامک اختصاصی، ویرایش قالب‌ها، زمان‌بندی یادآوری‌های خودکار و رهگیری پیام‌ها
          </p>
        </div>

        {/* Provider Status Pill */}
        {data && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#141715] border border-[#2D332F] text-xs">
            <span className="text-[#8C8477]">وضعیت خط ارائه‌دهنده:</span>
            {data.provider.mode === "KAVENEGAR" && data.provider.isConfigured ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                کاوه‌نگار متصل
              </span>
            ) : (
              <span className="text-[#E4C88E] font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#C8A96B]" />
                شبیه‌ساز هوشمند محلی (توسعه/تست)
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <Card className="p-3.5 sm:p-4 rounded-2xl bg-[#141715] border border-[#242A27] text-right space-y-1">
            <div className="flex items-center justify-between text-xs text-[#A89E90]">
              <span>کل پیام‌ها</span>
              <MessageSquare className="w-4 h-4 text-[#A89E90]" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-heading persian-nums text-[#F7F4EE]">
              {toPersianDigits(data.stats.total)}
            </div>
          </Card>

          <Card className="p-3.5 sm:p-4 rounded-2xl bg-[#141715] border border-[#242A27] text-right space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-400">
              <span>تحویل شده</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-heading persian-nums text-emerald-400">
              {toPersianDigits(data.stats.sent)}
            </div>
          </Card>

          <Card className="p-3.5 sm:p-4 rounded-2xl bg-[#141715] border border-[#242A27] text-right space-y-1">
            <div className="flex items-center justify-between text-xs text-[#E4C88E]">
              <span>در صف ارسال</span>
              <Clock className="w-4 h-4 text-[#C8A96B]" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-heading persian-nums text-[#E4C88E]">
              {toPersianDigits(data.stats.pending)}
            </div>
          </Card>

          <Card className="p-3.5 sm:p-4 rounded-2xl bg-[#141715] border border-[#242A27] text-right space-y-1">
            <div className="flex items-center justify-between text-xs text-red-400">
              <span>خطا / ناموفق</span>
              <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-heading persian-nums text-red-400">
              {toPersianDigits(data.stats.failed)}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4 TABS NAVIGATION — STRICTLY REQUIRED ORDER */}
      {/* 1. ارسال پیامک جدید (Default) */}
      {/* 2. قالب‌های پیامک */}
      {/* 3. یادآوری‌ها و زمان‌بندی */}
      {/* 4. لاگ‌ها و تاریخچه ارسال (MUST BE LAST) */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-[#242A27] pb-2 overflow-x-auto">
        {/* Tab 1: Compose New SMS (DEFAULT) */}
        <button
          type="button"
          onClick={() => setActiveTab("compose")}
          className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5 shrink-0 ${
            activeTab === "compose"
              ? "bg-[#C8A96B] text-[#0D0F0E] font-bold shadow-lg shadow-[#C8A96B]/15"
              : "text-[#A89E90] hover:text-[#F7F4EE] hover:bg-[#1C201E]"
          }`}
        >
          <Send className="w-4 h-4" />
          <span>ارسال پیامک جدید</span>
        </button>

        {/* Tab 2: SMS Templates */}
        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5 shrink-0 ${
            activeTab === "templates"
              ? "bg-[#C8A96B] text-[#0D0F0E] font-bold shadow-lg shadow-[#C8A96B]/15"
              : "text-[#A89E90] hover:text-[#F7F4EE] hover:bg-[#1C201E]"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>قالب‌های پیامک</span>
        </button>

        {/* Tab 3: Reminders & Scheduling */}
        <button
          type="button"
          onClick={() => setActiveTab("reminders")}
          className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5 shrink-0 ${
            activeTab === "reminders"
              ? "bg-[#C8A96B] text-[#0D0F0E] font-bold shadow-lg shadow-[#C8A96B]/15"
              : "text-[#A89E90] hover:text-[#F7F4EE] hover:bg-[#1C201E]"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>یادآوری‌ها و زمان‌بندی</span>
        </button>

        {/* Tab 4: Logs & History (MUST BE LAST) */}
        <button
          type="button"
          onClick={() => setActiveTab("logs")}
          className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5 shrink-0 ${
            activeTab === "logs"
              ? "bg-[#C8A96B] text-[#0D0F0E] font-bold shadow-lg shadow-[#C8A96B]/15"
              : "text-[#A89E90] hover:text-[#F7F4EE] hover:bg-[#1C201E]"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>لاگ‌ها و تاریخچه ارسال</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMPOSE NEW SMS (DEFAULT TAB) */}
      {/* ========================================================================= */}
      {activeTab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Main Compose Card (8 cols) */}
          <Card className="lg:col-span-7 p-4 sm:p-6 rounded-3xl bg-[#141715] border border-[#242A27] text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#242A27]">
              <div>
                <h3 className="text-base sm:text-lg font-bold font-heading text-[#F7F4EE]">
                  ارسال پیامک اختصاصی به مشتری
                </h3>
                <p className="text-xs text-[#8C8477] mt-0.5">
                  ارسال فوری پیام با متغیرهای هوشمند و بررسی پیش‌نمایش زنده
                </p>
              </div>

              {selectedTemplateId && (
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#C8A96B]/15 border border-[#C8A96B]/30 text-[#E4C88E] font-medium">
                  قالب فعال: {data?.templates.find((t) => t.id === selectedTemplateId)?.title}
                </span>
              )}
            </div>

            {sendSuccess && (
              <div role="status" className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">{sendSuccess}</span>
              </div>
            )}

            {sendError && (
              <div role="alert" className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{sendError}</span>
              </div>
            )}

            {/* Recipient Selection & Quick Customer Picker */}
            <div className="space-y-3">
              {data?.customersList && data.customersList.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#8C8477]">
                    انتخاب سریع از لیست مراجعین اخیر سالن:
                  </label>
                  <select
                    onChange={(e) => {
                      const cust = data.customersList.find((c) => c.id === e.target.value)
                      if (cust) handleSelectCustomer(cust)
                    }}
                    defaultValue=""
                    className="w-full bg-[#101311] border border-[#2B332F] rounded-xl px-3 py-2 text-xs text-[#F7F4EE] focus:outline-none focus:border-[#C8A96B] min-h-[44px]"
                  >
                    <option value="" disabled>جستجو یا انتخاب مشتری از بانک اطلاعات سالن...</option>
                    {data.customersList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {toPersianDigits(c.phone)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#C5BDB2]">
                    شماره تلفن همراه گیرنده: <span className="text-red-400">*</span>
                  </label>
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
            </div>

            {/* Template Selector Dropdown */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-[#8C8477] flex items-center justify-between">
                <span>بارگذاری متن از الگوهای سالن:</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("templates")}
                  className="text-[#C8A96B] hover:underline text-[11px]"
                >
                  مدیریت و ویرایش قالب‌ها ←
                </button>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {data?.templates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] transition-all cursor-pointer min-h-[36px] ${
                      selectedTemplateId === tmpl.id
                        ? "bg-[#C8A96B] text-[#0D0F0E] font-bold border-[#E4C88E]"
                        : "bg-[#1C221F] hover:bg-[#28322D] border-[#2B332F] text-[#E4C88E]"
                    }`}
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Variable Insertion Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-[#8C8477] block font-medium">
                متغیرهای هوشمند پویا (با کلیک در متن پیام درج می‌شوند):
              </span>
              <div className="flex flex-wrap gap-1">
                {DYNAMIC_VARIABLES.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() => insertToken(v.token)}
                    className="px-2 py-1 rounded-lg bg-[#101311] hover:bg-[#1C221F] border border-[#28322D] hover:border-[#C8A96B]/50 text-[11px] text-[#C5BDB2] transition-colors cursor-pointer"
                    title={`درج ${v.label} (نمونه: ${v.sample})`}
                  >
                    <span className="text-[#E4C88E] font-mono">{v.token}</span>
                    <span className="text-[#716A5E] mr-1 text-[10px]">({v.label})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message Body */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-[#C5BDB2]">متن پیامک:</label>
              <textarea
                ref={textareaRef}
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                placeholder="متن پیامک را در این بخش وارد فرمایید..."
                rows={6}
                className="w-full p-3.5 rounded-2xl bg-[#101311] border border-[#2B332F] text-xs sm:text-sm text-[#F7F4EE] leading-relaxed focus:outline-none focus:border-[#C8A96B]"
              />

              {/* Character & Segment Counter */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-[#8C8477] pt-1">
                <div className="flex items-center gap-3">
                  <span>
                    طول پیام: <strong className="text-[#F7F4EE] font-mono">{toPersianDigits(composeParts.chars)}</strong> کاراکتر
                  </span>
                  <span>•</span>
                  <span>
                    تعداد پارت:{" "}
                    <strong className="text-[#E4C88E] font-mono font-bold">
                      {toPersianDigits(composeParts.parts)} پیامک فارسی
                    </strong>
                  </span>
                  {composeParts.chars > 0 && (
                    <span className="text-[#716A5E] hidden sm:inline">
                      ({toPersianDigits(composeParts.remaining)} کاراکتر تا پارت بعدی)
                    </span>
                  )}
                </div>

                <span className="text-[#716A5E]">کدگذاری رسمی UCS-2 فارسی</span>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-3 border-t border-[#242A27] flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setComposeMessage("")
                  setRecipientPhone("")
                  setRecipientName("")
                  setSelectedTemplateId("")
                }}
                className="border-[#2D332F] text-[#8C8477] hover:text-[#F7F4EE] text-xs h-10 px-3 cursor-pointer"
              >
                پاک کردن فرم
              </Button>

              <Button
                disabled={sending || !recipientPhone.trim() || !composeMessage.trim()}
                onClick={() => setShowConfirmModal(true)}
                className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs sm:text-sm h-11 px-6 cursor-pointer min-h-[44px] shadow-lg shadow-[#C8A96B]/10"
              >
                <Send className="w-4 h-4 ml-2" />
                <span>بررسی و ارسال پیامک</span>
              </Button>
            </div>
          </Card>

          {/* Live Mobile Device Preview Mockup (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-4 sm:p-5 rounded-3xl bg-[#141715] border border-[#242A27] text-right space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[#202522]">
                <Eye className="w-4 h-4 text-[#C8A96B]" />
                <h4 className="text-sm font-bold font-heading text-[#F7F4EE]">
                  پیش‌نمایش زنده در گوشی مشتری
                </h4>
              </div>

              {/* Smartphone Frame Mockup */}
              <div className="rounded-3xl bg-[#0A0C0B] border-2 border-[#222825] p-4 shadow-2xl relative overflow-hidden">
                {/* Phone Speaker & Camera Notch */}
                <div className="w-24 h-4 bg-[#141715] rounded-full mx-auto mb-3 flex items-center justify-center">
                  <div className="w-8 h-1 bg-[#28322D] rounded-full" />
                </div>

                {/* Chat Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#1E2521] text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#C8A96B]/20 text-[#E4C88E] flex items-center justify-center font-bold text-[11px]">
                      KB
                    </div>
                    <div>
                      <div className="font-bold text-[#F7F4EE]">کوروش باربر</div>
                      <div className="text-[10px] text-emerald-400">سامانه پیامکی سالن</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#716A5E] font-mono">الآن</span>
                </div>

                {/* SMS Bubble */}
                <div className="my-4 space-y-1">
                  <div className="bg-[#1C221F] border border-[#2C3631] text-[#F7F4EE] p-3.5 rounded-2xl rounded-tr-sm text-xs leading-relaxed whitespace-pre-line shadow-md">
                    {composeMessage ? (
                      substituteVariables(composeMessage, recipientName.trim() || undefined)
                    ) : (
                      <span className="text-[#555C57] italic">
                        متن پیامک پس از درج در این قسمت نمایش داده خواهد شد...
                      </span>
                    )}
                  </div>
                  <div className="text-left text-[9px] text-[#716A5E] font-mono pl-1">
                    تحویل داده شد • ۲۴ ساعت
                  </div>
                </div>

                {/* Footer simulation */}
                <div className="pt-2 border-t border-[#1C221F] text-center text-[10px] text-[#555C57]">
                  پیامک متنی معتبر مخابراتی
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Confirmation Modal before Sending */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          dir="rtl"
        >
          <div className="bg-[#161917] border border-[#2D332F] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-5 sm:p-6 space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-[#242A27]">
              <h3 className="text-base font-bold font-heading text-[#F7F4EE] flex items-center gap-2">
                <Send className="w-4 h-4 text-[#C8A96B]" />
                <span>تأیید نهایی ارسال پیامک</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-8 h-8 rounded-lg bg-[#222825] text-[#A8A39A] hover:text-[#F7F4EE] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#101311] border border-[#222825] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#8C8477]">گیرنده:</span>
                  <span className="font-bold text-[#F7F4EE]">{recipientName || "مشتری سالن"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8C8477]">شماره موبایل:</span>
                  <span className="font-mono text-[#C8A96B]" dir="ltr">{recipientPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8C8477]">تعداد پارت مخابراتی:</span>
                  <span className="font-mono text-[#E4C88E] font-bold">{toPersianDigits(composeParts.parts)} پیامک</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#101311] border border-[#222825] space-y-1">
                <span className="text-[#8C8477] text-[11px] block">متن ارسالی:</span>
                <p className="text-[#C5BDB2] whitespace-pre-line text-xs max-h-32 overflow-y-auto">
                  {substituteVariables(composeMessage, recipientName.trim() || undefined)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#242A27]">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                className="border-[#2D332F] text-[#A8A39A] hover:text-[#F7F4EE] text-xs h-10 px-4 cursor-pointer"
              >
                انصراف
              </Button>

              <Button
                disabled={sending}
                onClick={handleConfirmAndSend}
                className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs h-10 px-5 cursor-pointer shadow-md shadow-[#C8A96B]/10"
              >
                <span>{sending ? "در حال ارسال..." : "تأیید و ارسال به خط مخابراتی"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SMS TEMPLATES MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === "templates" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold font-heading text-[#F7F4EE]">
                قالب‌ها و الگوهای مصوب پیامکی آرایشگاه کوروش
              </h3>
              <p className="text-xs text-[#8C8477] mt-0.5">
                ویرایش، ساخت و فعال‌سازی قالب‌های پیامک با پشتیبانی از متغیرهای خودکار نوبت
              </p>
            </div>

            <Button
              onClick={handleOpenCreateTemplate}
              className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs h-10 px-4 cursor-pointer gap-1.5 shadow-md shadow-[#C8A96B]/10 min-h-[44px] sm:min-h-0"
            >
              <Plus className="w-4 h-4" />
              <span>ایجاد قالب جدید</span>
            </Button>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {data?.templates.map((tmpl) => (
              <Card
                key={tmpl.id}
                className={`p-4 sm:p-5 rounded-3xl border transition-all text-right space-y-3 ${
                  tmpl.isActive
                    ? "bg-[#141715] border-[#28322D] hover:border-[#C8A96B]/40"
                    : "bg-[#101311] border-[#1C201E] opacity-60"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#202522]">
                  <div>
                    <h4 className="text-sm font-bold text-[#F7F4EE]">{tmpl.title}</h4>
                    <span className="text-[10px] text-[#716A5E] block mt-0.5">{tmpl.trigger}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleTemplateActive(tmpl)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        tmpl.isActive
                          ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                          : "bg-zinc-900 text-zinc-500 border border-zinc-700"
                      }`}
                      title={tmpl.isActive ? "کلیک جهت غیرفعال‌سازی" : "کلیک جهت فعال‌سازی"}
                    >
                      {tmpl.isActive ? "فعال" : "غیرفعال"}
                    </button>
                  </div>
                </div>

                {/* Template Content */}
                <div className="p-3 rounded-2xl bg-[#0D0F0E] border border-[#1E2420] text-xs text-[#C5BDB2] leading-relaxed whitespace-pre-line max-h-36 overflow-y-auto">
                  {tmpl.text}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-[#1C201E] text-xs">
                  <span className="text-[10px] text-[#716A5E]">
                    نوع: <strong className="text-[#A89E90]">{tmpl.type}</strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditTemplate(tmpl)}
                      className="border-[#2D332F] text-[#E4C88E] hover:bg-[#1C221F] text-xs h-8 px-2.5 cursor-pointer gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#C8A96B]" />
                      <span>ویرایش</span>
                    </Button>

                    {!tmpl.isSystem && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTemplate(tmpl.id)}
                        className="text-red-400 hover:text-white hover:bg-red-950/40 text-xs h-8 px-2 cursor-pointer"
                        title="حذف قالب سفارشی"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Template Create / Edit Modal */}
      {tplModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          dir="rtl"
        >
          <div className="bg-[#141715] border border-[#2D332F] rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-[#242A27]">
              <h3 className="text-base font-bold font-heading text-[#F7F4EE] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C8A96B]" />
                <span>{editingTemplate ? `ویرایش قالب: ${editingTemplate.title}` : "ایجاد قالب پیامک جدید"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setTplModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#222825] text-[#A8A39A] hover:text-[#F7F4EE] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#C5BDB2]">عنوان قالب:</label>
                  <input
                    type="text"
                    required
                    value={tplTitle}
                    onChange={(e) => setTplTitle(e.target.value)}
                    placeholder="مثال: یادآوری اختصاصی نوبت VIP"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#101311] border border-[#2B332F] text-[#F7F4EE] focus:outline-none focus:border-[#C8A96B] min-h-[44px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#C5BDB2]">نوع پیامک:</label>
                  <select
                    value={tplType}
                    onChange={(e) => setTplType(e.target.value as SmsTemplateItem["type"])}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#101311] border border-[#2B332F] text-[#F7F4EE] focus:outline-none focus:border-[#C8A96B] min-h-[44px]"
                  >
                    <option value="CONFIRMATION">تأیید نوبت پس از پرداخت</option>
                    <option value="REMINDER">یادآوری نوبت قبل از موعد</option>
                    <option value="BIRTHDAY">تبریک سالروز تولد</option>
                    <option value="CANCELLATION">اطلاع‌رسانی لغو نوبت</option>
                    <option value="RESCHEDULE">اطلاع‌رسانی جابجایی زمان</option>
                    <option value="THANKYOU">تشکر پس از اصلاح</option>
                    <option value="CUSTOM">سفارشی / عمومی</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#C5BDB2]">شرح زمان ارسال یا رویداد محرک:</label>
                <input
                  type="text"
                  value={tplTrigger}
                  onChange={(e) => setTplTrigger(e.target.value)}
                  placeholder="مثال: ۲ ساعت قبل از نوبت، یا بلافاصله پس از پرداخت بیعانه"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#101311] border border-[#2B332F] text-[#F7F4EE] focus:outline-none focus:border-[#C8A96B] min-h-[44px]"
                />
              </div>

              {/* Dynamic Variables Chips for Template */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-[#8C8477] block font-medium">
                  برای درج هر متغیر، روی دکمه آن کلیک کنید:
                </span>
                <div className="flex flex-wrap gap-1">
                  {DYNAMIC_VARIABLES.map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => insertTokenInTemplate(v.token)}
                      className="px-2 py-1 rounded-lg bg-[#101311] hover:bg-[#1C221F] border border-[#28322D] hover:border-[#C8A96B]/50 text-[11px] text-[#C5BDB2] transition-colors cursor-pointer"
                    >
                      <span className="text-[#E4C88E] font-mono">{v.token}</span>
                      <span className="text-[#716A5E] mr-1 text-[10px]">({v.label})</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#C5BDB2]">متن قالب:</label>
                <textarea
                  ref={templateTextareaRef}
                  required
                  rows={6}
                  value={tplText}
                  onChange={(e) => setTplText(e.target.value)}
                  placeholder="متن قالب را با متغیرها بنویسید..."
                  className="w-full p-3.5 rounded-2xl bg-[#101311] border border-[#2B332F] text-xs text-[#F7F4EE] leading-relaxed focus:outline-none focus:border-[#C8A96B]"
                />
                <div className="flex justify-between text-[11px] text-[#8C8477]">
                  <span>طول: {toPersianDigits(templateEditorParts.chars)} کاراکتر ({toPersianDigits(templateEditorParts.parts)} پارت)</span>
                  <span>پیش‌نمایش زنده در پایین</span>
                </div>
              </div>

              {/* Live Preview Box inside Modal */}
              <div className="p-3.5 rounded-2xl bg-[#0D0F0E] border border-[#202522] space-y-1.5">
                <span className="text-[11px] text-[#8C8477] block font-medium">نمونه پیام جایگزین شده:</span>
                <p className="text-xs text-[#E4C88E] leading-relaxed whitespace-pre-line">
                  {tplText ? substituteVariables(tplText) : "متنی وارد نشده است."}
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs text-[#C5BDB2] cursor-pointer">
                <input
                  type="checkbox"
                  checked={tplIsActive}
                  onChange={(e) => setTplIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#C8A96B] focus:ring-[#C8A96B] border-[#2D332F] bg-[#101311]"
                />
                <span>این قالب فعال و آماده استفاده در سیستم باشد</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#242A27]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTplModalOpen(false)}
                  className="border-[#2D332F] text-[#A8A39A] hover:text-[#F7F4EE] text-xs h-10 px-4 cursor-pointer"
                >
                  انصراف
                </Button>

                <Button
                  type="submit"
                  disabled={saveTplLoading}
                  className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs h-10 px-5 cursor-pointer shadow-md shadow-[#C8A96B]/10"
                >
                  <span>{saveTplLoading ? "در حال ذخیره..." : "ذخیره قالب پیامک"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REMINDERS & SCHEDULING MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === "reminders" && reminderRules && (
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold font-heading text-[#F7F4EE]">
                قوانین و زمان‌بندی یادآوری‌های خودکار سالن
              </h3>
              <p className="text-xs text-[#8C8477] mt-0.5">
                تعیین دقیق زمان ارسال پیامک‌های خودکار پیش از نوبت، تبریک تولد و تاییدیه رویدادها
              </p>
            </div>
          </div>

          {rulesSuccessMsg && (
            <div role="status" className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">{rulesSuccessMsg}</span>
            </div>
          )}

          {/* Rule 1: Appointment Reminder */}
          <Card className="p-4 sm:p-5 rounded-3xl bg-[#141715] border border-[#242A27] text-right space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#202522]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C8A96B]/15 text-[#E4C88E] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-[#C8A96B]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#F7F4EE]">یادآوری قبل از نوبت (Appointment Reminder)</h4>
                  <span className="text-[11px] text-[#8C8477]">ارسال پیامک یادآوری هوشمند به مراجع قبل از شروع زمان رزرو</span>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-[#E4C88E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderRules.appointmentReminder.enabled}
                  onChange={(e) =>
                    setReminderRules({
                      ...reminderRules,
                      appointmentReminder: {
                        ...reminderRules.appointmentReminder,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded text-[#C8A96B] focus:ring-[#C8A96B] border-[#2D332F] bg-[#101311]"
                />
                <span className="font-bold">{reminderRules.appointmentReminder.enabled ? "فعال" : "غیرفعال"}</span>
              </label>
            </div>

            {reminderRules.appointmentReminder.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="space-y-1">
                  <label className="text-xs text-[#C5BDB2]">زمان ارسال قبل از نوبت:</label>
                  <select
                    value={reminderRules.appointmentReminder.hoursBefore}
                    onChange={(e) =>
                      setReminderRules({
                        ...reminderRules,
                        appointmentReminder: {
                          ...reminderRules.appointmentReminder,
                          hoursBefore: parseInt(e.target.value, 10),
                        },
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-[#101311] border border-[#2B332F] text-[#F7F4EE] focus:outline-none focus:border-[#C8A96B] min-h-[44px]"
                  >
                    <option value={1}>۱ ساعت قبل از نوبت</option>
                    <option value={2}>۲ ساعت قبل از نوبت (توصیه‌شده)</option>
                    <option value={3}>۳ ساعت قبل از نوبت</option>
                    <option value={4}>۴ ساعت قبل از نوبت</option>
                    <option value={24}>۲۴ ساعت قبل (یک روز قبل)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[#C5BDB2]">قالب پیامک مورد استفاده:</label>
                  <select
                    value={reminderRules.appointmentReminder.templateId}
                    onChange={(e) =>
                      setReminderRules({
                        ...reminderRules,
                        appointmentReminder: {
                          ...reminderRules.appointmentReminder,
                          templateId: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-[#101311] border border-[#2B332F] text-[#F7F4EE] focus:outline-none focus:border-[#C8A96B] min-h-[44px]"
                  >
                    {data?.templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </Card>

          {/* Rule 2: Birthday Greeting */}
          <Card className="p-4 sm:p-5 rounded-3xl bg-[#141715] border border-[#242A27] text-right space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#202522]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C8A96B]/15 text-[#E4C88E] flex items-center justify-center shrink-0">
                  <Cake className="w-4 h-4 text-[#C8A96B]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#F7F4EE]">تبریک سالروز تولد مشتریان (Birthday Greeting)</h4>
                  <span className="text-[11px] text-[#8C8477]">ارسال خودکار پیامک تبریک در تقویم شمسی روز تولد</span>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-[#E4C88E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderRules.birthdayGreeting.enabled}
                  onChange={(e) =>
                    setReminderRules({
                      ...reminderRules,
                      birthdayGreeting: {
                        ...reminderRules.birthdayGreeting,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded text-[#C8A96B] focus:ring-[#C8A96B] border-[#2D332F] bg-[#101311]"
                />
                <span className="font-bold">{reminderRules.birthdayGreeting.enabled ? "فعال" : "غیرفعال"}</span>
              </label>
            </div>

            {reminderRules.birthdayGreeting.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="space-y-1">
                  <label className="text-xs text-[#C5BDB2]">ساعت ارسال در روز تولد:</label>
                  <select
                    value={reminderRules.birthdayGreeting.sendTime}
                    onChange={(e) =>
                      setReminderRules({
                        ...reminderRules,
                        birthdayGreeting: {
                          ...reminderRules.birthdayGreeting,
                          sendTime: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-[#101311] border border-[#2B332F] text-[#F7F4EE] focus:outline-none focus:border-[#C8A96B] min-h-[44px]"
                  >
                    <option value="09:00">ساعت ۰۹:۰۰ صبح</option>
                    <option value="10:00">ساعت ۱۰:۰۰ صبح (توصیه‌شده)</option>
                    <option value="11:00">ساعت ۱۱:۰۰ ظهر</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[#C5BDB2]">قالب پیامک مورد استفاده:</label>
                  <select
                    value={reminderRules.birthdayGreeting.templateId}
                    onChange={(e) =>
                      setReminderRules({
                        ...reminderRules,
                        birthdayGreeting: {
                          ...reminderRules.birthdayGreeting,
                          templateId: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-[#101311] border border-[#2B332F] text-[#F7F4EE] focus:outline-none focus:border-[#C8A96B] min-h-[44px]"
                  >
                    {data?.templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </Card>

          {/* Rule 3: Booking Confirmation */}
          <Card className="p-4 sm:p-5 rounded-3xl bg-[#141715] border border-[#242A27] text-right space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#202522]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C8A96B]/15 text-[#E4C88E] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#F7F4EE]">تأیید فوری رزرو (Booking Confirmation)</h4>
                  <span className="text-[11px] text-[#8C8477]">رویداد-محور: ارسال آنی بلافاصله پس از پرداخت موفق بیعانه</span>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-[#E4C88E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderRules.bookingConfirmation.enabled}
                  onChange={(e) =>
                    setReminderRules({
                      ...reminderRules,
                      bookingConfirmation: {
                        ...reminderRules.bookingConfirmation,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded text-[#C8A96B] focus:ring-[#C8A96B] border-[#2D332F] bg-[#101311]"
                />
                <span className="font-bold">{reminderRules.bookingConfirmation.enabled ? "فعال" : "غیرفعال"}</span>
              </label>
            </div>
          </Card>

          {/* Rule 4: Cancellation Notice */}
          <Card className="p-4 sm:p-5 rounded-3xl bg-[#141715] border border-[#242A27] text-right space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#202522]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C8A96B]/15 text-[#E4C88E] flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#F7F4EE]">اطلاع‌رسانی لغو نوبت (Cancellation Notice)</h4>
                  <span className="text-[11px] text-[#8C8477]">رویداد-محور: ارسال خودکار پیام هنگام لغو نوبت به مشتری</span>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-[#E4C88E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderRules.cancellationNotice.enabled}
                  onChange={(e) =>
                    setReminderRules({
                      ...reminderRules,
                      cancellationNotice: {
                        ...reminderRules.cancellationNotice,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded text-[#C8A96B] focus:ring-[#C8A96B] border-[#2D332F] bg-[#101311]"
                />
                <span className="font-bold">{reminderRules.cancellationNotice.enabled ? "فعال" : "غیرفعال"}</span>
              </label>
            </div>
          </Card>

          {/* Rule 5: Reschedule Notice */}
          <Card className="p-4 sm:p-5 rounded-3xl bg-[#141715] border border-[#242A27] text-right space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#202522]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C8A96B]/15 text-[#E4C88E] flex items-center justify-center shrink-0">
                  <RotateCw className="w-4 h-4 text-[#C8A96B]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#F7F4EE]">اطلاع‌رسانی جابجایی زمان (Reschedule Notice)</h4>
                  <span className="text-[11px] text-[#8C8477]">رویداد-محور: ارسال تاریخ و ساعت جدید به مشتری پس از ویرایش زمان</span>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-[#E4C88E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderRules.rescheduleNotice.enabled}
                  onChange={(e) =>
                    setReminderRules({
                      ...reminderRules,
                      rescheduleNotice: {
                        ...reminderRules.rescheduleNotice,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded text-[#C8A96B] focus:ring-[#C8A96B] border-[#2D332F] bg-[#101311]"
                />
                <span className="font-bold">{reminderRules.rescheduleNotice.enabled ? "فعال" : "غیرفعال"}</span>
              </label>
            </div>
          </Card>

          {/* Save Button */}
          <div className="pt-2 flex justify-end">
            <Button
              disabled={saveRulesLoading}
              onClick={handleSaveReminderRules}
              className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs sm:text-sm h-11 px-6 cursor-pointer shadow-lg shadow-[#C8A96B]/15 min-h-[44px]"
            >
              <Check className="w-4 h-4 ml-2" />
              <span>{saveRulesLoading ? "در حال ذخیره‌سازی..." : "ذخیره تغییرات زمان‌بندی"}</span>
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LOGS & OUTBOX (MUST BE LAST TAB!) */}
      {/* ========================================================================= */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-3.5 rounded-2xl bg-[#141715] border border-[#242A27] flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                fetchSmsData()
              }}
              className="flex gap-2 flex-1"
            >
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی شماره همراه یا نام گیرنده..."
                className="flex-1 bg-[#101311] border border-[#2A332E] rounded-xl px-3 py-2 text-xs text-[#F7F4EE] placeholder:text-[#555C57] focus:outline-none focus:border-[#C8A96B] min-h-[44px]"
              />
              <Button type="submit" size="sm" variant="outline" className="border-[#2A332E] text-xs h-11 px-3.5 cursor-pointer min-h-[44px]">
                <Search className="w-4 h-4" />
              </Button>
            </form>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#101311] border border-[#2A332E] text-xs text-[#F7F4EE] rounded-xl px-3 py-2 focus:outline-none min-h-[44px]"
              >
                <option value="ALL">تمامی وضعیت‌ها</option>
                <option value="SENT">ارسال موفق</option>
                <option value="PENDING">در صف ارسال</option>
                <option value="FAILED">ناموفق / خطا</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-[#101311] border border-[#2A332E] text-xs text-[#F7F4EE] rounded-xl px-3 py-2 focus:outline-none min-h-[44px]"
              >
                <option value="ALL">تمامی انواع</option>
                <option value="CONFIRMATION">تأیید نوبت</option>
                <option value="REMINDER">یادآوری نوبت</option>
                <option value="BIRTHDAY">تبریک تولد</option>
                <option value="CANCELLATION">لغو نوبت</option>
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
                        <span className="text-xs font-mono text-[#8C8477]" dir="ltr">{toPersianDigits(job.phone)}</span>
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
                          className="h-8 px-2.5 text-xs bg-[#1C221F] text-[#E4C88E] hover:bg-[#C8A96B] hover:text-[#0D0F0E] border border-[#C8A96B]/30 cursor-pointer min-h-[44px] sm:min-h-0"
                        >
                          <RotateCw className="w-3.5 h-3.5 ml-1" />
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
    </div>
  )
}
