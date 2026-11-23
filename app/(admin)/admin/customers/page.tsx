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
  Cake,
  Clock,
  FileText,
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#2D332F]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#F5F1E8]">
            دایرکتوری مشتریان سالن
          </h1>
          <p className="text-xs sm:text-sm text-[#A8A39A] mt-1">
            سوابق مراجعات، ارزش طول عمر مشتری (LTV) و تاریخ تولد جلالی
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی نام یا تلفن..."
            className="flex-1 sm:w-60 bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-xs text-[#F5F1E8] placeholder:text-[#555C57] focus:outline-none focus:border-[#C8A96B]"
          />
          <Button type="submit" size="sm" variant="outline" className="border-[#2D332F] text-xs h-9 px-3 cursor-pointer">
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
                className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] p-4 rounded-2xl space-y-3"
              >
                {/* Header: Name + Phone */}
                <div className="flex items-center justify-between pb-2 border-b border-[#2D332F]">
                  <div>
                    <h3 className="font-bold text-sm text-[#F5F1E8]">{c.name}</h3>
                    <span className="text-xs font-mono text-[#A8A39A]" dir="ltr">
                      {c.phone}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-[#C8A96B]/15 text-[#E4C88E] text-xs font-bold border border-[#C8A96B]/30 font-mono">
                    {toPersianDigits(c.totalVisits)} مراجعه
                  </span>
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

                {/* Last Visit & Notes */}
                <div className="text-[11px] text-[#A8A39A] space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <span>آخرین حضور:</span>
                    <span className="text-[#F5F1E8]">{c.lastVisit || "—"}</span>
                  </div>
                  {c.notes && (
                    <div className="p-2 rounded-lg bg-[#1F2321] text-[#A8A39A] border border-[#2D332F]">
                      یادداشت: {c.notes}
                    </div>
                  )}
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
        </>
      )}
    </div>
  )
}
