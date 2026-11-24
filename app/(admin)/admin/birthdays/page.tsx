"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toPersianDigits, PERSIAN_MONTHS } from "@/lib/jalali"
import {
  Cake,
  Calendar,
  Gift,
  Send,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Sparkles,
  Phone,
  X,
  MessageSquare,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react"

interface BirthdayCustomer {
  id: string
  name: string
  phone: string
  birthDate: string
  birthYear: number
  birthMonth: number
  birthDay: number
  effectiveDay: number
  daysUntil: number
  isToday: boolean
  isPassed: boolean
  smsConsent: boolean
  alreadySentThisYear: boolean
}

interface BirthdayResponse {
  currentJalali: {
    year: number
    month: number
    day: number
    monthName: string
    isLeap: boolean
  }
  selectedMonth: number
  selectedMonthName: string
  stats: {
    totalThisMonth: number
    todayCount: number
    upcomingCount: number
    passedCount: number
    withoutBirthdateCount: number
  }
  customers: BirthdayCustomer[]
}

const DEFAULT_GREETING_TEMPLATE = `کوروش باربر
تولدت مبارک! 🎉
امیدواریم سال جدید زندگیت پر از اتفاق‌های خوب، سلامتی و موفقیت باشه.
خوشحالیم که همراه کوروش باربر هستی.`

export default function AdminBirthdaysPage() {
  const [data, setData] = useState<BirthdayResponse | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number>(9) // Default Azar (month 9)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  // SMS Modal State
  const [activeCustomerForSms, setActiveCustomerForSms] = useState<BirthdayCustomer | null>(null)
  const [smsMessage, setSmsMessage] = useState(DEFAULT_GREETING_TEMPLATE)
  const [sendingSms, setSendingSms] = useState(false)
  const [smsSuccessMsg, setSmsSuccessMsg] = useState<string | null>(null)
  const [smsErrorMsg, setSmsErrorMsg] = useState<string | null>(null)

  const fetchBirthdays = async (monthNum?: number) => {
    try {
      setLoading(true)
      const m = monthNum ?? selectedMonth
      const res = await fetch(`/api/admin/birthdays?month=${m}`)
      if (!res.ok) throw new Error("خطا در دریافت لیست متولدین")
      const json: BirthdayResponse = await res.json()
      setData(json)
      setSelectedMonth(json.selectedMonth)
    } catch {
      setError("امکان بارگذاری اطلاعات متولدین این ماه وجود ندارد")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBirthdays()
  }, [])

  const handleMonthChange = (monthIdx: number) => {
    setSelectedMonth(monthIdx)
    fetchBirthdays(monthIdx)
  }

  const openSmsModal = (customer: BirthdayCustomer) => {
    setActiveCustomerForSms(customer)
    setSmsMessage(`کوروش باربر\n${customer.name} عزیز، تولدت مبارک! 🎉\nامیدواریم سال جدید زندگیت پر از اتفاق‌های خوب، سلامتی و موفقیت باشه.\nخوشحالیم که همراه کوروش باربر هستی.`)
    setSmsSuccessMsg(null)
    setSmsErrorMsg(null)
  }

  const handleSendGreetingSms = async () => {
    if (!activeCustomerForSms) return
    try {
      setSendingSms(true)
      setSmsErrorMsg(null)

      const res = await fetch("/api/admin/birthdays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: activeCustomerForSms.id,
          customTemplate: smsMessage,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "خطا در ارسال پیامک")

      const firstResult = result.results?.[0]
      if (firstResult?.status === "SKIPPED_DUPLICATE") {
        setSmsErrorMsg("پیامک تبریک قبلاً برای این مشتری ارسال شده است.")
      } else if (firstResult?.status === "SKIPPED_NO_CONSENT") {
        setSmsErrorMsg("این مشتری دریافت پیامک‌های مناسبتی را غیرفعال کرده است.")
      } else {
        setSmsSuccessMsg("پیامک تبریک تولد با موفقیت ارسال و ثبت گردید.")
        // Refresh local data to show already sent badge
        setTimeout(() => {
          fetchBirthdays()
          setActiveCustomerForSms(null)
        }, 1500)
      }
    } catch (err: unknown) {
      setSmsErrorMsg(err instanceof Error ? err.message : "خطا در ارسال پیامک")
    } finally {
      setSendingSms(false)
    }
  }

  const filteredCustomers = (data?.customers || []).filter((c) => {
    if (!search) return true
    return (
      c.name.includes(search) ||
      c.phone.includes(search) ||
      c.birthDate.includes(search)
    )
  })

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#2D332F]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181D1A] border border-[#C8A96B]/30 text-xs font-semibold text-[#E4C88E] mb-2">
            <Cake className="w-3.5 h-3.5 text-[#C8A96B]" />
            <span>باشگاه مشتریان و وفاداری</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#F5F1E8]">
            مدیریت و تبریک تولد مشتریان
          </h1>
          <p className="text-xs sm:text-sm text-[#A89E90] mt-1">
            تقویم هجری شمسی، رهگیری روز تولد، ارسال تبریک اختصاصی و حفظ رضایت ارتباطی مراجعان
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی نام، تلفن یا روز..."
            className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-3 py-2 text-xs text-[#F5F1E8] placeholder:text-[#555C57] focus:outline-none focus:border-[#C8A96B] min-h-[40px]"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8477]" />
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* 12 Jalali Month Navigation Tabs */}
      <div className="bg-[#141715] p-2 sm:p-3 rounded-2xl border border-[#242A27] shadow-lg overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] sm:min-w-0 gap-1">
          {PERSIAN_MONTHS.map((name: string, idx: number) => {
            const monthNum = idx + 1
            const isSelected = selectedMonth === monthNum
            const isCurrentMonth = data?.currentJalali.month === monthNum
            return (
              <button
                key={monthNum}
                type="button"
                onClick={() => handleMonthChange(monthNum)}
                className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center relative ${
                  isSelected
                    ? "bg-[#C8A96B] text-[#0D0F0E] font-bold shadow-md"
                    : isCurrentMonth
                    ? "bg-[#1E2521] text-[#E4C88E] border border-[#C8A96B]/40 hover:bg-[#252E2A]"
                    : "text-[#A89E90] hover:text-[#F7F4EE] hover:bg-[#1C201E]"
                }`}
              >
                <span>{name}</span>
                {isCurrentMonth && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C8A96B] absolute -top-0.5 right-1/2 translate-x-1/2" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Stats Cards Grid */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Today */}
          <Card className="p-4 rounded-2xl bg-gradient-to-br from-[#1C221F] to-[#121614] border border-[#C8A96B]/50 shadow-lg text-right space-y-1">
            <div className="flex items-center justify-between text-xs text-[#E4C88E]">
              <span>متولدین امروز</span>
              <Sparkles className="w-4 h-4 text-[#C8A96B]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#F7F4EE]">
              {toPersianDigits(data.stats.todayCount)}
            </div>
            <div className="text-[11px] text-[#A89E90]">امروز {toPersianDigits(data.currentJalali.day)} {data.currentJalali.monthName}</div>
          </Card>

          {/* Upcoming this month */}
          <Card className="p-4 rounded-2xl bg-[#141715] border border-[#242A27] text-right space-y-1">
            <div className="flex items-center justify-between text-xs text-[#A89E90]">
              <span>پیش‌رو در این ماه</span>
              <Gift className="w-4 h-4 text-[#A89E90]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#E4C88E]">
              {toPersianDigits(data.stats.upcomingCount)}
            </div>
            <div className="text-[11px] text-[#7E776C]">روزهای آینده ماه {data.selectedMonthName}</div>
          </Card>

          {/* Total this month */}
          <Card className="p-4 rounded-2xl bg-[#141715] border border-[#242A27] text-right space-y-1">
            <div className="flex items-center justify-between text-xs text-[#A89E90]">
              <span>کل متولدین ماه</span>
              <Calendar className="w-4 h-4 text-[#A89E90]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#F7F4EE]">
              {toPersianDigits(data.stats.totalThisMonth)}
            </div>
            <div className="text-[11px] text-[#7E776C]">مجموع مشتریان ماه {data.selectedMonthName}</div>
          </Card>

          {/* Without birth date */}
          <Card className="p-4 rounded-2xl bg-[#141715] border border-[#242A27] text-right space-y-1">
            <div className="flex items-center justify-between text-xs text-[#A89E90]">
              <span>بدون ثبت تولد</span>
              <Clock className="w-4 h-4 text-[#A89E90]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#8C8477]">
              {toPersianDigits(data.stats.withoutBirthdateCount)}
            </div>
            <div className="text-[11px] text-[#7E776C]">امکان ثبت در رزروهای آتی</div>
          </Card>
        </div>
      )}

      {/* Esfand 30 Explicit Rule Banner */}
      {selectedMonth === 12 && (
        <div className="p-3.5 rounded-xl bg-[#1D221F] border border-[#C8A96B]/30 text-xs text-[#C5BDB2] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#C8A96B] shrink-0" />
          <span>
            <strong>قانون تقویمی سالن برای اسفند:</strong> در سال‌های عادی (غیرکبیسه)، متولدین ۳۰ اسفند در روز ۲۹ اسفند جشن گرفته شده و پیامک تبریک دریافت می‌دارند.
          </span>
        </div>
      )}

      {/* Customer List Section */}
      {loading ? (
        <div className="p-12 text-center text-[#A89E90] text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C8A96B] mb-2" />
          در حال بارگذاری متولدین ماه {PERSIAN_MONTHS[selectedMonth - 1]}...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="p-12 text-center bg-[#141715] border border-[#242A27] rounded-3xl text-xs text-[#A89E90] space-y-2">
          <Cake className="w-10 h-10 mx-auto text-[#C8A96B]/30" />
          <h3 className="text-sm font-bold text-[#F7F4EE]">هیچ متولد ثبت‌شده‌ای برای ماه {data?.selectedMonthName} یافت نشد</h3>
          <p className="text-[11px] text-[#7E776C]">
            مشتریان به هنگام ثبت نوبت آنلاین می‌توانند تاریخ تولد شمسی خود را ثبت فرمایند.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredCustomers.map((c) => {
            const age = data?.currentJalali.year ? data.currentJalali.year - c.birthYear : 0
            return (
              <Card
                key={c.id}
                className={`p-4 sm:p-5 rounded-2xl text-right transition-all flex flex-col justify-between space-y-3 ${
                  c.isToday
                    ? "bg-gradient-to-br from-[#1C2420] via-[#141A17] to-[#101311] border-2 border-[#C8A96B] shadow-[0_0_25px_rgba(200,169,107,0.2)]"
                    : c.isPassed
                    ? "bg-[#101311] border-[#202522] opacity-75"
                    : "bg-[#141715] border-[#262D29] hover:border-[#38413C]"
                }`}
              >
                {/* Header: Name + Badge */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#1E2421]">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#F7F4EE] flex items-center gap-1.5">
                      <span>{c.name}</span>
                      {c.isToday && (
                        <span className="px-2 py-0.5 rounded-full bg-[#C8A96B] text-[#0D0F0E] text-[10px] font-black animate-pulse">
                          تولد امروز 🎉
                        </span>
                      )}
                    </h3>
                    <span className="text-xs font-mono text-[#8C8477]" dir="ltr">
                      {c.phone}
                    </span>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-xs font-bold text-[#E4C88E] block">
                      {toPersianDigits(c.birthDay)} {data?.selectedMonthName}
                    </span>
                    {age > 0 && (
                      <span className="text-[10px] text-[#7E776C] font-mono">
                        {toPersianDigits(age)} سالگی
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-1.5">
                    {c.isToday ? (
                      <span className="text-xs font-bold text-[#E4C88E] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>همین امروز</span>
                      </span>
                    ) : c.daysUntil > 0 ? (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{toPersianDigits(c.daysUntil)} روز تا تولد</span>
                      </span>
                    ) : (
                      <span className="text-xs text-[#7E776C]">تولد سپری شد</span>
                    )}
                  </div>

                  {/* Messaging Consent */}
                  <div>
                    {c.smsConsent ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[10px]">
                        رضایت پیامک: فعال
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-red-950/40 border border-red-500/30 text-red-400 text-[10px]">
                        پیامک غیرفعال
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-[#1E2421] flex items-center justify-between gap-2">
                  {c.alreadySentThisYear ? (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>پیامک تبریک ارسال شده</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#7E776C]">تبریک امسال ارسال نشده</span>
                  )}

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/admin/sms?tab=compose&customerId=${c.id}&type=BIRTHDAY`}
                      className={!c.smsConsent ? "pointer-events-none opacity-40" : ""}
                    >
                      <Button
                        size="sm"
                        disabled={!c.smsConsent}
                        className="h-8 px-3 text-xs font-semibold bg-[#1C221F] hover:bg-[#C8A96B] hover:text-[#0D0F0E] text-[#E4C88E] border border-[#C8A96B]/30 disabled:opacity-40 cursor-pointer min-h-[44px] sm:min-h-0"
                        title="انتقال به مرکز پیامک و ارسال تبریک تولد"
                      >
                        <Send className="w-3 h-3 ml-1.5" />
                        <span>ارسال پیامک</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Birthday Greeting SMS Modal */}
      {activeCustomerForSms && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bday-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          dir="rtl"
        >
          <div className="relative w-full max-w-lg bg-[#141715] border border-[#C8A96B]/50 rounded-3xl p-6 sm:p-7 shadow-2xl text-right space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#242A27]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#C8A96B]/15 text-[#E4C88E] flex items-center justify-center">
                  <Cake className="w-4 h-4 text-[#C8A96B]" />
                </div>
                <div>
                  <h3 id="bday-modal-title" className="text-base font-bold font-heading text-[#F7F4EE]">
                    ارسال پیامک تبریک تولد
                  </h3>
                  <span className="text-xs text-[#A89E90]">
                    گیرنده: {activeCustomerForSms.name} ({activeCustomerForSms.phone})
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveCustomerForSms(null)}
                className="p-1.5 rounded-lg bg-[#1C221F] text-[#A89E90] hover:text-[#F7F4EE]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {smsSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{smsSuccessMsg}</span>
              </div>
            )}

            {smsErrorMsg && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{smsErrorMsg}</span>
              </div>
            )}

            {/* Message Text Editor */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#C5BDB2]">متن پیامک تبریک (قابل ویرایش):</label>
              <textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                rows={5}
                className="w-full p-3.5 rounded-xl bg-[#101311] border border-[#2B332F] text-xs sm:text-sm text-[#F7F4EE] leading-relaxed focus:outline-none focus:border-[#C8A96B] font-sans"
              />
              <div className="flex justify-between text-[11px] text-[#7E776C]">
                <span>تعداد کاراکتر: {toPersianDigits(smsMessage.length)}</span>
                <span>فرمت رسمی آرایشگاه کوروش</span>
              </div>
            </div>

            {/* Explicit Confirmation Note */}
            <div className="p-3 rounded-xl bg-[#191F1C] border border-[#262E29] text-[11px] text-[#A89E90] leading-relaxed">
              ارسال پیامک از طریق سامانه کاوه‌نگار (یا محیط شبیه‌ساز امن محلی) با ثبت رسمی در لاگ پیامک‌ها انجام خواهد شد.
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-[#242A27] flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setActiveCustomerForSms(null)}
                className="border-[#2D332F] text-xs h-10 px-4 cursor-pointer"
              >
                انصراف
              </Button>

              <Button
                disabled={sendingSms || !smsMessage.trim()}
                onClick={handleSendGreetingSms}
                className="bg-[#C8A96B] hover:bg-[#E4C88E] text-[#0D0F0E] font-bold text-xs h-10 px-5 cursor-pointer min-h-[40px]"
              >
                <Send className="w-3.5 h-3.5 ml-1.5" />
                <span>{sendingSms ? "در حال ارسال..." : "تأیید و ارسال پیامک"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
