"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatToman, toPersianDigits } from "@/lib/jalali"
import {
  Scissors,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
} from "lucide-react"

interface ServiceItem {
  id: string
  name: string
  description?: string
  price: number
  depositPrice: number
  duration: number
  category: string
  isActive: boolean
  sortOrder: number
  _count?: { appointments: number }
}

export function AdminServicesClient() {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<ServiceItem | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState(250000)
  const [depositPrice, setDepositPrice] = useState(50000)
  const [category, setCategory] = useState("اصلاح مو")
  const [isActive, setIsActive] = useState(true)

  const fetchServices = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/services")
      if (!res.ok) throw new Error("خطا در دریافت لیست خدمات")
      const data = await res.json()
      setServices(data)
    } catch {
      setError("امکان ارتباط با سرور وجود ندارد")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
  }, [])

  const openCreateModal = () => {
    setEditingService(null)
    setName("")
    setDescription("")
    setPrice(250000)
    setDepositPrice(50000)
    setCategory("اصلاح مو")
    setIsActive(true)
    setIsModalOpen(true)
  }

  const openEditModal = (s: ServiceItem) => {
    setEditingService(s)
    setName(s.name)
    setDescription(s.description || "")
    setPrice(s.price)
    setDepositPrice(s.depositPrice)
    setCategory(s.category)
    setIsActive(s.isActive)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    try {
      setLoading(true)
      const method = editingService ? "PUT" : "POST"
      const payload: Record<string, unknown> = {
        name,
        description,
        price,
        depositPrice,
        category,
        isActive,
      }
      if (editingService) payload.id = editingService.id

      const res = await fetch("/api/admin/services", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "خطا در ذخیره خدمت")

      setSuccessMsg(editingService ? "خدمت با موفقیت ویرایش شد." : "خدمت جدید تعریف شد.")
      setIsModalOpen(false)
      fetchServices()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطای عملیات")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm("آیا از حذف یا غیرفعال‌سازی این خدمت اطمینان دارید؟")
    if (!confirmDelete) return

    try {
      const res = await fetch(`/api/admin/services?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "خطا در حذف")
      setSuccessMsg(data.message)
      fetchServices()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در حذف")
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Title & Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#2D332F]">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#F5F1E8]">
            مدیریت خدمات و مبالغ بیعانه
          </h1>
          <p className="text-xs text-[#A8A39A] mt-1">
            ویرایش مبالغ خدمات بر حسب تومان؛ مبالغ نوبت‌های گذشته به صورت تاریخی حفظ می‌شوند.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs gap-1.5 px-4 py-5 rounded-xl shadow-lg"
        >
          <Plus className="w-4 h-4" />
          تعریف خدمت جدید
        </Button>
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div role="status" className="p-3.5 rounded-xl bg-green-950/40 border border-green-500/40 text-green-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Services Grid */}
      {loading ? (
        <div className="p-12 text-center text-[#A8A39A] text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C8A96B] mb-2" />
          در حال بارگذاری لیست خدمات...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((srv) => (
            <Card
              key={srv.id}
              className={`bg-[#161917] border p-6 rounded-2xl flex flex-col justify-between ${
                srv.isActive ? "border-[#2D332F]" : "border-gray-800 opacity-60"
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#1F2321] text-[#C8A96B] border border-[#2D332F]">
                    {srv.category}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      srv.isActive
                        ? "border-green-500/30 text-green-400 text-[10px]"
                        : "border-gray-600 text-gray-500 text-[10px]"
                    }
                  >
                    {srv.isActive ? "فعال برای رزرو" : "غیرفعال (آرشیو)"}
                  </Badge>
                </div>

                <h3 className="text-lg font-bold text-[#F5F1E8]">{srv.name}</h3>
                {srv.description && (
                  <p className="text-xs text-[#A8A39A] leading-relaxed line-clamp-2">
                    {srv.description}
                  </p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-[#2D332F] space-y-3">
                <div className="grid grid-cols-3 gap-2 text-xs text-center bg-[#101311] p-2.5 rounded-xl border border-[#222724]">
                  <div>
                    <span className="text-[#8C8477] block text-[10px]">مبلغ کل:</span>
                    <strong className="text-xs text-[#F7F4EE]">{formatToman(srv.price)}</strong>
                  </div>
                  <div>
                    <span className="text-[#8C8477] block text-[10px]">بیعانه:</span>
                    <strong className="text-xs text-[#E4C88E]">{formatToman(srv.depositPrice)}</strong>
                  </div>
                  <div>
                    <span className="text-[#8C8477] block text-[10px]">مانده در سالن:</span>
                    <span className="text-xs text-[#A89E90]">{formatToman(Math.max(0, srv.price - srv.depositPrice))}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-[#2D332F]/60">
                  <span className="text-[11px] text-[#A8A39A]">
                    سابقه: {toPersianDigits(srv._count?.appointments || 0)} نوبت
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(srv)}
                      className="border-[#2D332F] text-[#F5F1E8] hover:bg-[#1F2321] text-xs gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      ویرایش
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(srv.id)}
                      className="text-red-400 hover:bg-red-500/10 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-[#161917] border-[#2D332F] text-[#F5F1E8] p-6 rounded-3xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-[#2D332F]">
              <h3 className="font-bold text-base text-[#F5F1E8]">
                {editingService ? "ویرایش خدمت" : "تعریف خدمت جدید"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#A8A39A] hover:text-[#F5F1E8] text-sm"
              >
                بستن &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[#A8A39A] block">نام خدمت:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: اصلاح و استایل کلاسیک"
                  className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#A8A39A] block">توضیحات کوتاه:</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="توضیحات تکمیلی خدمت..."
                  className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#A8A39A] block">مبلغ کل (تومان):</label>
                  <input
                    type="number"
                    required
                    step={1000}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#A8A39A] block">بیعانه آنلاین (تومان):</label>
                  <input
                    type="number"
                    required
                    step={1000}
                    value={depositPrice}
                    onChange={(e) => setDepositPrice(Number(e.target.value))}
                    className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#A8A39A] block">دسته‌بندی:</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#A8A39A] block">مدت زمان:</label>
                  <input
                    type="text"
                    disabled
                    value="۶۰ دقیقه (ثابت در فاز ۱)"
                    className="w-full bg-[#0D0F0E] border border-[#2D332F] rounded-xl px-3 py-2 text-[#A8A39A] cursor-not-allowed"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-[#A8A39A]">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded bg-[#1F2321] border-[#2D332F]"
                />
                <span>این خدمت فعال و در صفحه رزرو قابل انتخاب باشد</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2D332F]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="border-[#2D332F] text-xs"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs px-5"
                >
                  ذخیره تغییرات
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
