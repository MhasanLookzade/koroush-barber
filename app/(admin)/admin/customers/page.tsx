"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatToman, toPersianDigits } from "@/lib/jalali"
import { JalaliBirthDatePicker } from "@/components/booking/JalaliBirthDatePicker"
import {
  Users,
  Search,
  Phone,
  Calendar,
  CreditCard,
  RefreshCw,
  AlertCircle,
  Cake,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  MessageSquare,
  X,
  Save,
  Check,
  ChevronLeft,
  User,
  Trash2,
  AlertTriangle,
} from "lucide-react"

interface BookingRecord {
  id: string
  trackingCode: string
  serviceName: string
  date: string
  time: string
  status: string
  totalPrice: number
  depositPaid: number
  balanceDue: number
  createdAt: string
}

interface CustomerItem {
  id: string
  name: string
  phone: string
  email?: string | null
  birthDate?: string | null
  notes?: string
  smsConsent: boolean
  totalVisits: number
  cancelledVisits: number
  lifetimeSpend: number
  lastVisit: string
  servicesUsed: string[]
  bookingHistory: BookingRecord[]
  createdAt: string
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null)
  const [editingName, setEditingName] = useState("")
  const [editingBirthDate, setEditingBirthDate] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState("")
  const [editingConsent, setEditingConsent] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const url = new URL("/api/admin/customers", window.location.origin)
      if (search) url.searchParams.set("search", search)
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error("خطا در دریافت لیست مشتریان")
      const data = await res.json()
      setCustomers(data)
    } catch {
      setError("امکان دریافت اطلاعات مشتریان وجود ندارد")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchCustomers()
  }

  const openCustomerModal = (customer: CustomerItem) => {
    setSelectedCustomer(customer)
    setEditingName(customer.name || "")
    setEditingBirthDate(customer.birthDate || null)
    setEditingNotes(customer.notes || "")
    setEditingConsent(customer.smsConsent)
    setSaveSuccess(false)
    setShowDeleteConfirm(false)
  }

  const handleSaveCustomerProfile = async () => {
    if (!selectedCustomer) return
    if (!editingName.trim()) {
      alert("نام مشتری نمی‌تواند خالی باشد")
      return
    }
    try {
      setSaveLoading(true)
      const res = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCustomer.id,
          name: editingName.trim(),
          birthDate: editingBirthDate,
          notes: editingNotes,
          smsConsent: editingConsent,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "خطا در ذخیره پرونده مشتری")
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

      const updatedName = editingName.trim()
      const updatedBirthDate = editingBirthDate

      // Update local state
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id
            ? {
                ...c,
                name: updatedName,
                birthDate: updatedBirthDate,
                notes: editingNotes,
                smsConsent: editingConsent,
              }
            : c
        )
      )
      setSelectedCustomer((prev) =>
        prev
          ? {
              ...prev,
              name: updatedName,
              birthDate: updatedBirthDate,
              notes: editingNotes,
              smsConsent: editingConsent,
            }
          : null
      )
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "خطا در به‌روزرسانی اطلاعات مشتری")
    } finally {
      setSaveLoading(false)
    }
  }

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return
    try {
      setDeleteLoading(true)
      const res = await fetch(`/api/admin/customers?id=${selectedCustomer.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "خطا در حذف پرونده مشتری")
      }

      const deletedId = selectedCustomer.id
      setCustomers((prev) => prev.filter((c) => c.id !== deletedId))
      setSelectedCustomer(null)
      setShowDeleteConfirm(false)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "خطا در حذف پرونده مشتری")
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#2D332F]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#F5F1E8]">
            مدیریت و CRM مشتریان سالن
          </h1>
          <p className="text-xs sm:text-sm text-[#A8A39A] mt-1">
            پرونده جامع، سوابق مراجعات، ارزش مالی (LTV)، تاریخ تولد و رضایت پیامکی
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی نام یا تلفن..."
            className="flex-1 sm:w-60 bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-xs text-[#F5F1E8] placeholder:text-[#555C57] focus:outline-none focus:border-[#C8A96B] min-h-[40px]"
          />
          <Button type="submit" size="sm" variant="outline" className="border-[#2D332F] text-xs h-10 px-3 cursor-pointer">
            <Search className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-[#A8A39A] text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C8A96B] mb-2" />
          در حال بارگذاری اطلاعات مشتریان...
        </div>
      ) : customers.length === 0 ? (
        <div className="p-10 text-center bg-[#161917] border border-[#2D332F] rounded-2xl text-xs text-[#A8A39A] space-y-2">
          <Users className="w-8 h-8 mx-auto opacity-30" />
          <p>هیچ مشتری با این مشخصات یافت نشد.</p>
        </div>
      ) : (
        <>
          {/* 1. MOBILE CARDS VIEW (Visible on < md viewports) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {customers.map((c) => (
              <Card
                key={c.id}
                onClick={() => openCustomerModal(c)}
                className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] p-4 rounded-2xl space-y-3 cursor-pointer hover:border-[#C8A96B]/50 transition-colors"
              >
                {/* Header: Name + Phone */}
                <div className="flex items-center justify-between pb-2 border-b border-[#2D332F]">
                  <div>
                    <h3 className="font-bold text-sm text-[#F5F1E8]">{c.name}</h3>
                    <span className="text-xs font-mono text-[#A8A39A]" dir="ltr">
                      {c.phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-[#C8A96B]/15 text-[#E4C88E] text-xs font-bold border border-[#C8A96B]/30 font-mono">
                      {toPersianDigits(c.totalVisits)} مراجعه
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#0D0F0E] border border-[#222825]">
                    <span className="text-[#8C8477] block text-[11px] mb-0.5">تاریخ تولد:</span>
                    {c.birthDate ? (
                      <span className="font-mono text-[#E4C88E] font-semibold flex items-center gap-1">
                        <Cake className="w-3 h-3" />
                        {toPersianDigits(c.birthDate)}
                      </span>
                    ) : (
                      <span className="text-[#6D6559]">—</span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0D0F0E] border border-[#222825]">
                    <span className="text-[#8C8477] block text-[11px] mb-0.5">ارزش کل (LTV):</span>
                    <span className="font-bold text-emerald-400">
                      {formatToman(c.lifetimeSpend)}
                    </span>
                  </div>
                </div>

                {/* Footer: Last Visit & Action hint */}
                <div className="flex items-center justify-between text-[11px] text-[#A8A39A] pt-1">
                  <span>آخرین حضور: <strong className="text-[#F5F1E8]">{c.lastVisit || "—"}</strong></span>
                  <span className="text-[#C8A96B] flex items-center gap-1">
                    مشاهده پرونده
                    <ChevronLeft className="w-3 h-3" />
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* 2. DESKTOP TABLE VIEW (Visible on >= md viewports) */}
          <div className="hidden md:block bg-[#161917] border border-[#2D332F] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#1F2321] text-[#A8A39A] border-b border-[#2D332F]">
                  <tr>
                    <th className="p-3.5 font-medium">نام مشتری</th>
                    <th className="p-3.5 font-medium">شماره موبایل</th>
                    <th className="p-3.5 font-medium">تاریخ تولد</th>
                    <th className="p-3.5 font-medium">مراجعات موفق</th>
                    <th className="p-3.5 font-medium">ارزش کل (LTV)</th>
                    <th className="p-3.5 font-medium">آخرین مراجعه</th>
                    <th className="p-3.5 font-medium">رضایت پیامک</th>
                    <th className="p-3.5 font-medium">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D332F]">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#1F2321]/50 transition-colors">
                      <td className="p-3.5 font-bold text-[#F5F1E8]">{c.name}</td>
                      <td className="p-3.5 font-mono text-[#A8A39A] dir-ltr" dir="ltr">
                        {c.phone}
                      </td>
                      <td className="p-3.5 text-xs text-[#E4C88E]">
                        {c.birthDate ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#C8A96B]/15 text-[#E4C88E] border border-[#C8A96B]/30 font-mono">
                            {toPersianDigits(c.birthDate)}
                          </span>
                        ) : (
                          <span className="text-[#6D6559]">—</span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-[#C8A96B] font-bold">
                        {toPersianDigits(c.totalVisits)} بار
                      </td>
                      <td className="p-3.5 font-mono text-emerald-400 font-bold">
                        {formatToman(c.lifetimeSpend)}
                      </td>
                      <td className="p-3.5 text-[#A8A39A]">{c.lastVisit}</td>
                      <td className="p-3.5">
                        {c.smsConsent ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[10px]">
                            فعال
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-950/40 border border-red-500/30 text-red-300 text-[10px]">
                            غیرفعال
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCustomerModal(c)}
                          className="h-8 px-2.5 text-xs border-[#2D332F] text-[#E4C88E] hover:bg-[#C8A96B] hover:text-[#0D0F0E] cursor-pointer"
                        >
                          پرونده کامل
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 3. CUSTOMER PROFILE & HISTORY MODAL */}
      {selectedCustomer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          dir="rtl"
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#141715] border border-[#C8A96B]/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-right space-y-6">
            
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#242A27] gap-3">
              <div>
                <h3 className="text-lg sm:text-xl font-bold font-heading text-[#F7F4EE]">
                  پرونده مشتری: {selectedCustomer.name}
                </h3>
                <span className="text-xs font-mono text-[#C8A96B]" dir="ltr">
                  {selectedCustomer.phone}
                </span>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Link href={`/admin/sms?tab=compose&customerId=${selectedCustomer.id}`}>
                  <Button
                    size="sm"
                    className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs h-9 px-3 gap-1.5 cursor-pointer shadow-md shadow-[#C8A96B]/10 min-h-[44px] sm:min-h-0"
                    title="ارسال پیامک اختصاصی در مرکز پیامک"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>ارسال پیامک به مشتری</span>
                  </Button>
                </Link>

                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 rounded-xl bg-[#1C221F] text-[#A89E90] hover:text-[#F7F4EE] min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#101311] border border-[#222825]">
                <span className="text-[#8C8477] block text-[11px] mb-1">مراجعات موفق:</span>
                <span className="text-base font-bold text-[#E4C88E] font-mono">
                  {toPersianDigits(selectedCustomer.totalVisits)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#101311] border border-[#222825]">
                <span className="text-[#8C8477] block text-[11px] mb-1">لغو شده:</span>
                <span className="text-base font-bold text-red-400 font-mono">
                  {toPersianDigits(selectedCustomer.cancelledVisits)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#101311] border border-[#222825]">
                <span className="text-[#8C8477] block text-[11px] mb-1">ارزش کل (LTV):</span>
                <span className="text-sm font-bold text-emerald-400">
                  {formatToman(selectedCustomer.lifetimeSpend)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#101311] border border-[#222825]">
                <span className="text-[#8C8477] block text-[11px] mb-1">تاریخ تولد:</span>
                <span className="text-xs font-bold text-[#F7F4EE] font-mono">
                  {selectedCustomer.birthDate ? toPersianDigits(selectedCustomer.birthDate) : "ثبت نشده"}
                </span>
              </div>
            </div>

            {/* Customer Directory Identity & Jalali Birth Date */}
            <div className="p-4 rounded-2xl bg-[#101311] border border-[#242A27] space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#1E2421]">
                <User className="w-4 h-4 text-[#C8A96B]" />
                <h4 className="text-xs font-bold text-[#F7F4EE]">
                  مشخصات هویتی و ثبت تاریخ تولد در دایرکتوری
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Editable Canonical Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#C5BDB2] block">
                    نام و نام خانوادگی در دایرکتوری:
                  </label>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    placeholder="نام کامل مشتری..."
                    className="w-full px-3 py-2.5 rounded-xl bg-[#171B19] border border-[#2B332F] text-xs sm:text-sm text-[#F7F4EE] placeholder-[#555C57] focus:outline-none focus:border-[#C8A96B] min-h-[44px]"
                  />
                  <p className="text-[10px] text-[#8C8477]">
                    این نام به عنوان نام اصلی در دایرکتوری ثبت شده و با رزروهای بعدی بازنویسی نمی‌شود.
                  </p>
                </div>

                {/* Jalali Birth Date Picker */}
                <div>
                  <JalaliBirthDatePicker
                    value={editingBirthDate}
                    onChange={setEditingBirthDate}
                    label="تاریخ تولد مشتری (هجری شمسی):"
                    hint="(جهت تبریک خودکار و تخفیف)"
                  />
                </div>
              </div>
            </div>

            {/* Services Previously Booked */}
            {selectedCustomer.servicesUsed.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[#C5BDB2]">خدمات دریافت شده تاکنون:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCustomer.servicesUsed.map((srv, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-[#1C221F] border border-[#2B332F] text-[11px] text-[#E4C88E]">
                      {srv}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Notes & SMS Consent Setting */}
            <div className="p-4 rounded-2xl bg-[#101311] border border-[#242A27] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#F7F4EE] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#C8A96B]" />
                  <span>یادداشت محرمانه مدیریت برای این مشتری:</span>
                </label>

                {/* SMS Consent Toggle */}
                <label className="flex items-center gap-2 text-xs text-[#A89E90] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingConsent}
                    onChange={(e) => setEditingConsent(e.target.checked)}
                    className="w-4 h-4 rounded text-[#C8A96B] focus:ring-[#C8A96B] border-[#2D332F] bg-[#141715]"
                  />
                  <span>رضایت دریافت پیامک</span>
                </label>
              </div>

              <textarea
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="مثلاً: حساسیت به الکل بعد از اصلاح، علاقه به استایل فید پوستی، چای کمرنگ..."
                rows={3}
                className="w-full p-3 rounded-xl bg-[#171B19] border border-[#2B332F] text-xs text-[#F7F4EE] placeholder-[#555C57] focus:outline-none focus:border-[#C8A96B]"
              />

              <div className="flex items-center justify-between pt-1">
                {saveSuccess ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    <span>تغییرات با موفقیت ذخیره شد</span>
                  </span>
                ) : <span />}

                <Button
                  size="sm"
                  disabled={saveLoading}
                  onClick={handleSaveCustomerProfile}
                  className="bg-[#C8A96B] hover:bg-[#E4C88E] text-[#0D0F0E] font-bold text-xs h-9 px-4 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 ml-1.5" />
                  <span>{saveLoading ? "در حال ذخیره..." : "ذخیره تغییرات پرونده"}</span>
                </Button>
              </div>
            </div>

            {/* Booking History Timeline */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#F7F4EE] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#C8A96B]" />
                <span>سوابق رزروهای ثبت شده ({toPersianDigits(selectedCustomer.bookingHistory.length)} نوبت):</span>
              </h4>

              {selectedCustomer.bookingHistory.length === 0 ? (
                <p className="text-xs text-[#8C8477]">هیچ نوبتی ثبت نشده است.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 divide-y divide-[#1F2522]">
                  {selectedCustomer.bookingHistory.map((b) => (
                    <div key={b.id} className="pt-2 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-[#F7F4EE]">{b.serviceName}</div>
                        <div className="text-[11px] text-[#8C8477]">
                          {b.date} ساعت {b.time} — کد: <span className="font-mono text-[#C8A96B]">{b.trackingCode}</span>
                        </div>
                      </div>

                      <div className="text-left">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.status === "CONFIRMED" || b.status === "COMPLETED"
                            ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"
                            : b.status === "CANCELLED"
                            ? "bg-red-950/40 text-red-400 border border-red-500/30"
                            : "bg-[#1C221F] text-[#E4C88E] border border-[#2D332F]"
                        }`}>
                          {b.status === "CONFIRMED"
                            ? "تأیید شده"
                            : b.status === "COMPLETED"
                            ? "انجام شده"
                            : b.status === "CANCELLED"
                            ? "لغو شده"
                            : b.status}
                        </span>
                        <div className="text-[10px] text-[#A89E90] mt-0.5 font-mono">{formatToman(b.totalPrice)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-[#242A27] flex items-center justify-between">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="border-red-900/40 text-red-400 hover:bg-red-950/40 hover:text-red-300 text-xs h-9 px-3 gap-1.5 cursor-pointer min-h-[40px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف مشتری</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedCustomer(null)}
                className="border-[#2D332F] text-xs h-9 cursor-pointer min-h-[40px]"
              >
                بستن پنجره
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. DEDICATED DELETE CONFIRMATION POPUP MODAL */}
      {showDeleteConfirm && selectedCustomer && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          dir="rtl"
        >
          <div className="relative w-full max-w-md bg-[#161A18] border border-red-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl text-right space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header: Icon + Title */}
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-red-950/60 border border-red-500/30 flex items-center justify-center shrink-0 text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold font-heading text-[#F7F4EE]">
                  آیا از حذف کامل این مشتری از دایرکتوری اطمینان دارید؟
                </h3>
                <p className="text-xs text-[#A89E90]">
                  پرونده: <strong className="text-[#F7F4EE]">{selectedCustomer.name}</strong> (<span className="font-mono" dir="ltr">{selectedCustomer.phone}</span>)
                </p>
              </div>
            </div>

            {/* Warning Description */}
            <div className="p-3.5 rounded-2xl bg-[#0F1210] border border-[#262E2A] text-xs text-[#C5BDB2] leading-relaxed space-y-1.5">
              <p className="text-red-300 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"></span>
                این عمل غیرقابل بازگشت است.
              </p>
              <p className="text-[11px] text-[#8C8477]">
                سوابق مالی، مبالغ پرداختی و نوبت‌های گذشته برای حفظ صحت حسابداری و گزارش‌های سالن در سیستم باقی می‌مانند، اما پروفایل این مشتری به طور کامل از دایرکتوری و پنل حذف خواهد شد.
              </p>
            </div>

            {/* Action Buttons: Responsive Grid / Row */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={deleteLoading}
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full border-[#2D332F] hover:bg-[#202723] text-xs h-11 rounded-xl cursor-pointer font-medium min-h-[44px]"
              >
                انصراف
              </Button>

              <Button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteCustomer}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-11 rounded-xl cursor-pointer gap-1.5 shadow-lg shadow-red-950/50 min-h-[44px]"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleteLoading ? "در حال حذف..." : "بله، حذف مشتری"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
