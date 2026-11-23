"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatToman, toPersianDigits } from "@/lib/jalali"
import {
  CreditCard,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
} from "lucide-react"

interface PaymentItem {
  id: string
  authority: string
  trackingCode: string
  customerName: string
  customerPhone: string
  serviceName: string
  amountToman: number
  gateway: string
  status: string
  refId?: string
  cardPan?: string
  errorCode?: string
  errorMessage?: string
  jalaliFull: string
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [error, setError] = useState<string | null>(null)

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const url = new URL("/api/admin/payments", window.location.origin)
      if (statusFilter && statusFilter !== "ALL") url.searchParams.set("status", statusFilter)
      const res = await fetch(url.toString())
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("مشاهده گزارش‌های مالی تنها در دسترس مدیر کل (OWNER) است.")
        }
        throw new Error("خطا در بارگذاری گزارش پرداخت‌ها")
      }
      const data = await res.json()
      setPayments(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در ارتباط با سرور")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [statusFilter])

  const totalVerifiedSum = payments
    .filter((p) => p.status === "VERIFIED")
    .reduce((sum, p) => sum + p.amountToman, 0)

  return (
    <div className="space-y-6" dir="rtl">
      {/* Title & CSV Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#2D332F]">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#F5F1E8]">
            تراکنش‌های مالی و درگاه پرداخت
          </h1>
          <p className="text-xs text-[#A8A39A] mt-1">
            دفتر کل تراکنش‌های آنلاین، کدهای رهگیری شاپرک و استردادها
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/api/admin/payments?format=csv" download>
            <Button className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold text-xs gap-1.5 px-4 py-5 rounded-xl shadow-lg">
              <Download className="w-4 h-4" />
              خروجی اکسل (CSV UTF-8)
            </Button>
          </a>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-[#161917] p-4 rounded-2xl border border-[#2D332F] flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {["ALL", "VERIFIED", "PENDING", "FAILED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                statusFilter === st
                  ? "bg-[#C8A96B] text-[#0D0F0E] font-bold"
                  : "bg-[#1F2321] text-[#A8A39A] hover:text-[#F5F1E8]"
              }`}
            >
              {st === "ALL"
                ? "همه تراکنش‌ها"
                : st === "VERIFIED"
                ? "تایید شده (واریز شده)"
                : st === "PENDING"
                ? "در انتظار درگاه"
                : "ناموفق / لغو شده"}
            </button>
          ))}
        </div>

        <div className="text-xs text-[#A8A39A]">
          مجموع واریزی فیلتر شده:{" "}
          <span className="font-bold text-green-400 font-mono text-sm">
            {formatToman(totalVerifiedSum)}
          </span>
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="p-12 text-center text-[#A8A39A] text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C8A96B] mb-2" />
          در حال بارگذاری تراکنش‌ها...
        </div>
      ) : payments.length === 0 ? (
        <div className="p-10 text-center bg-[#161917] border border-[#2D332F] rounded-2xl text-xs text-[#A8A39A]">
          تراکنشی با این شرایط ثبت نشده است.
        </div>
      ) : (
        <div className="bg-[#161917] border border-[#2D332F] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#1F2321] text-[#A8A39A] border-b border-[#2D332F]">
                <tr>
                  <th className="p-3.5 font-medium">شناسه ارجاع (Authority)</th>
                  <th className="p-3.5 font-medium">کد رهگیری نوبت</th>
                  <th className="p-3.5 font-medium">مشتری</th>
                  <th className="p-3.5 font-medium">مبلغ بیعانه</th>
                  <th className="p-3.5 font-medium">درگاه</th>
                  <th className="p-3.5 font-medium">وضعیت</th>
                  <th className="p-3.5 font-medium">کد مرجع بانک (RefId)</th>
                  <th className="p-3.5 font-medium">تاریخ و زمان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D332F]">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#1F2321]/50 transition-colors">
                    <td className="p-3.5 font-mono text-xs text-[#C8A96B] dir-ltr" dir="ltr">
                      {p.authority}
                    </td>
                    <td className="p-3.5 font-mono text-[#F5F1E8] font-bold dir-ltr" dir="ltr">
                      {p.trackingCode}
                    </td>
                    <td className="p-3.5 text-[#F5F1E8]">{p.customerName}</td>
                    <td className="p-3.5 font-mono font-bold text-green-400">
                      {formatToman(p.amountToman)}
                    </td>
                    <td className="p-3.5 text-[#A8A39A]">{p.gateway}</td>
                    <td className="p-3.5">
                      <Badge
                        variant="outline"
                        className={
                          p.status === "VERIFIED"
                            ? "border-green-500/40 text-green-400 bg-green-500/10 text-[10px]"
                            : p.status === "PENDING"
                            ? "border-amber-500/40 text-amber-400 bg-amber-500/10 text-[10px]"
                            : "border-red-500/40 text-red-400 bg-red-500/10 text-[10px]"
                        }
                      >
                        {p.status === "VERIFIED"
                          ? "تایید شده"
                          : p.status === "PENDING"
                          ? "در انتظار"
                          : "ناموفق"}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-mono text-[#A8A39A] dir-ltr" dir="ltr">
                      {p.refId || "—"}
                    </td>
                    <td className="p-3.5 text-[#A8A39A]">{p.jalaliFull}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
