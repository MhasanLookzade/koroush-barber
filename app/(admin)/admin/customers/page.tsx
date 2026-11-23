"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatToman, toPersianDigits } from "@/lib/jalali"
import {
  Users,
  Search,
  Phone,
  Calendar,
  CreditCard,
  RefreshCw,
  AlertCircle,
} from "lucide-react"

interface CustomerItem {
  id: string
  name: string
  phone: string
  email?: string
  birthDate?: string | null
  notes?: string
  totalVisits: number
  lifetimeSpend: number
  lastVisit: string
  createdAt: string
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#2D332F]">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#F5F1E8]">دایرکتوری مشتریان سالن</h1>
          <p className="text-xs text-[#A8A39A] mt-1">
            سوابق مراجعات، ارزش طول عمر مشتری (LTV) و یادداشت‌های پرسنل
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی نام یا تلفن..."
            className="bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-xs text-[#F5F1E8] placeholder:text-[#555C57] focus:outline-none focus:border-[#C8A96B] w-56"
          />
          <Button type="submit" size="sm" variant="outline" className="border-[#2D332F] text-xs">
            <Search className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
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
        <div className="p-10 text-center bg-[#161917] border border-[#2D332F] rounded-2xl text-xs text-[#A8A39A]">
          هیچ مشتری با این مشخصات یافت نشد.
        </div>
      ) : (
        <div className="bg-[#161917] border border-[#2D332F] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#1F2321] text-[#A8A39A] border-b border-[#2D332F]">
                <tr>
                  <th className="p-3.5 font-medium">نام مشتری</th>
                  <th className="p-3.5 font-medium">شماره موبایل</th>
                  <th className="p-3.5 font-medium">تاریخ تولد</th>
                  <th className="p-3.5 font-medium">تعداد مراجعات</th>
                  <th className="p-3.5 font-medium">ارزش کل خدمات (LTV)</th>
                  <th className="p-3.5 font-medium">آخرین مراجعه</th>
                  <th className="p-3.5 font-medium">یادداشت</th>
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
                    <td className="p-3.5 font-mono text-green-400 font-bold">
                      {formatToman(c.lifetimeSpend)}
                    </td>
                    <td className="p-3.5 text-[#A8A39A]">{c.lastVisit}</td>
                    <td className="p-3.5 text-[#A8A39A] text-[11px]">{c.notes || "—"}</td>
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
