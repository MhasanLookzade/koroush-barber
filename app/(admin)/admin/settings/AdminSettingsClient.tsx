"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toPersianDigits } from "@/lib/jalali"
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Shield,
  CreditCard,
  MessageSquare,
  Building,
} from "lucide-react"

export function AdminSettingsClient() {
  const [settings, setSettings] = useState<Record<string, string>>({
    salon_name: "آرایشگاه کوروش | Koroush Barber",
    core_promise: "استایل حرفه‌ای، دقیقاً سر وقت شما.",
    salon_address: "تهران، زعفرانیه، خیابان مقدس اردبیلی، مجتمع تجاری پیروز، طبقه ۲، واحد ۲۰۴",
    salon_phone: "۰۲۱-۲۲۴۴۶۶۸۸",
    support_mobile: "۰۹۱۲۳۴۵۶۷۸۹",
    hold_expiry_minutes: "10",
    cancellation_cutoff_hours: "12",
    payment_mode: "MOCK",
    sms_mode: "MOCK",
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/settings")
      if (!res.ok) {
        if (res.status === 403) throw new Error("دسترسی به تنظیمات تنها برای مدیر کل (OWNER) است.")
        throw new Error("خطا در دریافت تنظیمات")
      }
      const data = await res.json()
      if (data.settings) {
        setSettings((prev) => ({ ...prev, ...data.settings }))
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در ارتباط با سرور")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    try {
      setSaving(true)
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "خطا در ذخیره تنظیمات")

      setSuccessMsg("تمامی تنظیمات با موفقیت ذخیره گردید.")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطای ذخیره")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#2D332F]">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#F5F1E8]">تنظیمات سالن و قوانین سامانه</h1>
          <p className="text-xs text-[#A8A39A] mt-1">
            مشخصات کسب‌وکار، مدت هلد رزرو، مهلت کنسلی و وضعیت درگاه پرداخت
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs gap-1.5 px-6 py-5 rounded-xl shadow-lg"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              در حال ذخیره...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              ذخیره تغییرات
            </>
          )}
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

      {loading ? (
        <div className="p-12 text-center text-[#A8A39A] text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C8A96B] mb-2" />
          در حال بارگذاری تنظیمات...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Salon Details */}
          <Card className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#2D332F]">
              <Building className="w-4 h-4 text-[#C8A96B]" />
              <h2 className="text-sm font-bold">اطلاعات عمومی سالن</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[#A8A39A] block">نام عمومی آرایشگاه:</label>
                <input
                  type="text"
                  value={settings.salon_name || ""}
                  onChange={(e) => handleChange("salon_name", e.target.value)}
                  className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#A8A39A] block">شعار و وعده برند:</label>
                <input
                  type="text"
                  value={settings.core_promise || ""}
                  onChange={(e) => handleChange("core_promise", e.target.value)}
                  className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[#A8A39A] block">آدرس دقیق سالن:</label>
                <input
                  type="text"
                  value={settings.salon_address || ""}
                  onChange={(e) => handleChange("salon_address", e.target.value)}
                  className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#A8A39A] block">تلفن ثابت پذیرش:</label>
                <input
                  type="text"
                  value={settings.salon_phone || ""}
                  onChange={(e) => handleChange("salon_phone", e.target.value)}
                  className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#A8A39A] block">موبایل پشتیبانی و پیامک:</label>
                <input
                  type="text"
                  dir="ltr"
                  value={settings.support_mobile || ""}
                  onChange={(e) => handleChange("support_mobile", e.target.value)}
                  className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] font-mono focus:outline-none"
                />
              </div>
            </div>
          </Card>

          {/* Business & Booking Policy Rules */}
          <Card className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#2D332F]">
              <Clock className="w-4 h-4 text-[#C8A96B]" />
              <h2 className="text-sm font-bold">قوانین رزرو و هلد موقت</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[#A8A39A] block">مدت اعتبار هلد موقت پیش از پرداخت (دقیقه):</label>
                <input
                  type="number"
                  min={2}
                  max={60}
                  value={settings.hold_expiry_minutes || "10"}
                  onChange={(e) => handleChange("hold_expiry_minutes", e.target.value)}
                  className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] font-mono focus:outline-none"
                />
                <span className="text-[10px] text-[#A8A39A]">
                  پس از این مدت، در صورت عدم پرداخت درگاه، بازه به ظرفیت آزاد سالن بازمی‌گردد.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#A8A39A] block">فرصت لغو نوبت توسط مشتری (ساعت قبل از موعد):</label>
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={settings.cancellation_cutoff_hours || "12"}
                  onChange={(e) => handleChange("cancellation_cutoff_hours", e.target.value)}
                  className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] font-mono focus:outline-none"
                />
                <span className="text-[10px] text-[#A8A39A]">
                  لغو نوبت در کمتر از این بازه زمانی در پنل پیگیری مسدود می‌شود.
                </span>
              </div>
            </div>
          </Card>

          {/* Integration & Gateway Modes */}
          <Card className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#2D332F]">
              <CreditCard className="w-4 h-4 text-[#C8A96B]" />
              <h2 className="text-sm font-bold">درگاه پرداخت و سامانه پیامک</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[#A8A39A] block">حالت درگاه پرداخت:</label>
                <select
                  value={settings.payment_mode || "MOCK"}
                  onChange={(e) => handleChange("payment_mode", e.target.value)}
                  className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] focus:outline-none"
                >
                  <option value="MOCK">MOCK (شبیه‌ساز تستی / بدون کسر وجه)</option>
                  <option value="ZARINPAL">ZARINPAL (درگاه زرین‌پال شاپرک)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#A8A39A] block">حالت سامانه پیامک:</label>
                <select
                  value={settings.sms_mode || "MOCK"}
                  onChange={(e) => handleChange("sms_mode", e.target.value)}
                  className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-[#F5F1E8] focus:outline-none"
                >
                  <option value="MOCK">MOCK (شبیه‌ساز لاگ / تست محلی)</option>
                  <option value="KAVENEGAR">KAVENEGAR (سامانه کاوه‌نگار)</option>
                </select>
              </div>
            </div>
          </Card>
        </form>
      )}
    </div>
  )
}
