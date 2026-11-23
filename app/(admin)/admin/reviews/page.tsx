"use client"

import { useState, useEffect } from "react"
import {
  Star,
  CheckCircle2,
  XCircle,
  EyeOff,
  Trash2,
  ShieldCheck,
  Clock,
  Filter,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  Check,
  Calendar,
} from "lucide-react"
import { toPersianDigits, formatJalaliShort } from "@/lib/jalali"
import { Button } from "@/components/ui/button"

interface AdminReview {
  id: string
  name: string
  rating: number
  comment: string
  trackingCode: string | null
  isVerified: boolean
  status: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN"
  adminNote: string | null
  createdAt: string
  updatedAt: string
}

interface ReviewCounts {
  all: number
  pending: number
  approved: number
  rejected: number
  hidden: number
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING: {
    label: "در انتظار بررسی",
    color: "text-amber-400",
    bg: "bg-amber-950/40",
    border: "border-amber-500/30",
  },
  APPROVED: {
    label: "تایید و منتشر شده",
    color: "text-emerald-400",
    bg: "bg-emerald-950/40",
    border: "border-emerald-500/30",
  },
  REJECTED: {
    label: "رد شده",
    color: "text-red-400",
    bg: "bg-red-950/40",
    border: "border-red-500/30",
  },
  HIDDEN: {
    label: "پنهان شده",
    color: "text-neutral-400",
    bg: "bg-neutral-800/40",
    border: "border-neutral-600/30",
  },
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [counts, setCounts] = useState<ReviewCounts>({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    hidden: 0,
  })
  const [selectedStatus, setSelectedStatus] = useState<string>("PENDING")
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState<string>("")

  const fetchReviews = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/admin/reviews?status=${selectedStatus}`)
      if (!res.ok) throw new Error("خطا در دریافت لیست نظرات")
      const data = await res.json()
      setReviews(data.reviews || [])
      if (data.counts) setCounts(data.counts)
    } catch {
      setError("امکان برقراری ارتباط با سرور و دریافت نظرات وجود ندارد.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [selectedStatus])

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      setActionLoadingId(id)
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error("بروزرسانی وضعیت نظر با شکست مواجه شد")
      await fetchReviews()
    } catch {
      alert("خطا در تغییر وضعیت نظر")
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm("آیا از حذف دائمی این نظر اطمینان دارید؟")) return
    try {
      setActionLoadingId(id)
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("حذف نظر با شکست مواجه شد")
      await fetchReviews()
    } catch {
      alert("خطا در حذف نظر")
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleSaveNote = async (id: string) => {
    try {
      setActionLoadingId(id)
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: noteDraft }),
      })

      if (!res.ok) throw new Error("ذخیره یادداشت با شکست مواجه شد")
      setEditingNoteId(null)
      await fetchReviews()
    } catch {
      alert("خطا در ذخیره یادداشت")
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#2D332F]">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#F5F1E8]">
            مدیریت و تایید نظرات مراجعان
          </h1>
          <p className="text-xs text-[#A8A39A] mt-1">
            بررسی و مدیریت نظرات ارسال شده توسط مشتریان سالن پیرایش کوروش
          </p>
        </div>

        <Button
          onClick={fetchReviews}
          disabled={loading}
          size="sm"
          variant="outline"
          className="border-[#2D332F] text-xs gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>تازه‌سازی</span>
        </Button>
      </div>

      {/* Metric Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: "PENDING", label: "در انتظار بررسی", count: counts.pending, alert: counts.pending > 0 },
          { key: "APPROVED", label: "تایید شده", count: counts.approved, alert: false },
          { key: "REJECTED", label: "رد شده", count: counts.rejected, alert: false },
          { key: "HIDDEN", label: "پنهان شده", count: counts.hidden, alert: false },
          { key: "ALL", label: "همه نظرات", count: counts.all, alert: false },
        ].map((tab) => {
          const isActive = selectedStatus === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedStatus(tab.key)}
              className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between min-h-[70px] ${
                isActive
                  ? "bg-[#1E2320] border-[#C8A96B] shadow-md"
                  : "bg-[#141715] border-[#262B28] hover:border-[#3D4540]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#D4CCC1]">{tab.label}</span>
                {tab.alert && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
              <span className="text-xl font-bold font-heading text-[#F5F1E8] mt-1">
                {toPersianDigits(tab.count)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Error alert */}
      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="p-16 text-center text-[#A8A39A] text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C8A96B] mb-2" />
          در حال بارگذاری نظرات...
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-12 text-center bg-[#141715] border border-[#242A27] rounded-3xl text-sm text-[#A8A39A] space-y-2">
          <MessageSquare className="w-8 h-8 mx-auto text-[#444D47]" />
          <p>هیچ نظری در این دسته‌بندی یافت نشد.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const statusMeta = STATUS_LABELS[rev.status] || STATUS_LABELS.PENDING
            const isActing = actionLoadingId === rev.id

            return (
              <div
                key={rev.id}
                className="bg-[#141715] border border-[#242A27] hover:border-[#38413B] rounded-2xl p-5 sm:p-6 transition-all space-y-4 shadow-sm"
              >
                {/* Header row: Author, Rating, Date, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E2421]">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-base font-bold text-[#F5F1E8]">{rev.name}</span>

                    <div className="flex items-center gap-1 text-[#E4C88E]">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-[#E4C88E]" />
                      ))}
                    </div>

                    {rev.isVerified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>مشتری احراز شده {rev.trackingCode ? `(${rev.trackingCode})` : ""}</span>
                      </span>
                    )}

                    {!rev.isVerified && rev.trackingCode && (
                      <span className="text-[11px] text-[#A8A39A] font-mono bg-[#1E2320] px-2 py-0.5 rounded-full border border-[#2D332F]">
                        کد پیگیری: {rev.trackingCode}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8C8477] font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatJalaliShort(new Date(rev.createdAt))}
                    </span>

                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${statusMeta.bg} ${statusMeta.color} ${statusMeta.border}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-sm text-[#D4CCC1] leading-relaxed bg-[#0E1110] p-4 rounded-xl border border-[#1A1F1C]">
                  «{rev.comment}»
                </p>

                {/* Admin Note Section */}
                <div className="text-xs text-[#A8A39A] space-y-2">
                  {editingNoteId === rev.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="یادداشت داخلی مدیریت درباره این نظر..."
                        className="flex-1 bg-[#1A1F1C] border border-[#2D332F] rounded-lg px-3 py-1.5 text-xs text-[#F5F1E8] focus:outline-none focus:border-[#C8A96B]"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveNote(rev.id)}
                        disabled={isActing}
                        className="bg-[#C8A96B] hover:bg-[#D4B779] text-[#0D0F0E] text-xs h-8"
                      >
                        <Check className="w-3.5 h-3.5 ml-1" />
                        ثبت
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingNoteId(null)}
                        className="text-xs h-8"
                      >
                        انصراف
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px]">
                      <span>
                        یادداشت مدیریت:{" "}
                        <strong className="text-[#F5F1E8]">
                          {rev.adminNote || "بدون یادداشت"}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(rev.id)
                          setNoteDraft(rev.adminNote || "")
                        }}
                        className="text-[#C8A96B] hover:underline"
                      >
                        {rev.adminNote ? "ویرایش یادداشت" : "+ افزودن یادداشت"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#1E2421]">
                  {rev.status !== "APPROVED" && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(rev.id, "APPROVED")}
                      disabled={isActing}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تایید و انتشار</span>
                    </Button>
                  )}

                  {rev.status !== "REJECTED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(rev.id, "REJECTED")}
                      disabled={isActing}
                      className="border-red-900/60 text-red-400 hover:bg-red-950/40 text-xs h-8 gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>رد نظر</span>
                    </Button>
                  )}

                  {rev.status !== "HIDDEN" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUpdateStatus(rev.id, "HIDDEN")}
                      disabled={isActing}
                      className="text-neutral-400 hover:text-white text-xs h-8 gap-1"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>پنهان‌سازی</span>
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteReview(rev.id)}
                    disabled={isActing}
                    className="text-red-500 hover:bg-red-950/40 hover:text-red-400 text-xs h-8 gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
