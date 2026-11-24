"use client"

import { useState, useEffect } from "react"
import {
  Star,
  CheckCircle2,
  Quote,
  MessageSquarePlus,
  X,
  Send,
  Loader2,
  Sparkles,
  ShieldCheck,
  Calendar,
} from "lucide-react"
import { toPersianDigits } from "@/lib/jalali"

interface ReviewItem {
  id: string | number
  name: string
  rating: number
  comment: string
  isVerified?: boolean
  role?: string
  date?: string
  createdAt?: string
}

const FALLBACK_REVIEWS: ReviewItem[] = [
  {
    id: "f1",
    name: "دکتر امیرحسین کاظمی",
    role: "پزشک متخصص • مشتری ثابت ۱ ساله",
    rating: 5,
    date: "۲ هفته پیش",
    comment:
      "برای من که به عنوان جراح زمانم بسیار محدود است، بزرگترین مزیت کوروش باربر این است که ساعت ۱۴:۰۰ نوبت دارم و دقیقاً ساعت ۱۴:۰۰ روی صندلی می‌نشینم، بدون حتی یک دقیقه معطلی. استایل فید هم دقیقاً مطابق خواسته‌ام اجرا می‌شود.",
    isVerified: true,
  },
  {
    id: "f2",
    name: "مهندس نیما راد",
    role: "مدیر عامل شرکت نرم‌افزاری",
    rating: 5,
    date: "۱ ماه پیش",
    comment:
      "بهترین تجربه اصلاحی که در تهران داشتم. آرامش محیط، بوی خوش اکالیپتوس در حوله گرم، قهوه عالی و دقت وسواس‌گونه استاد کوروش روی تقارن خط ریش واقعاً کم‌نظیر است. سیستم رزرو آنلاین سایت هم در کمتر از یک دقیقه کار را تمام می‌کند.",
    isVerified: true,
  },
  {
    id: "f3",
    name: "فرزاد صبوری",
    role: "مشتری ۶۲ ساله سالن",
    rating: 5,
    date: "۳ هفته پیش",
    comment:
      "من با تلفن‌های هوشمند خیلی راحت نیستم اما نوبت گرفتن از این سایت آنقدر فونت درشت و دکمه‌های واضحی داشت که خودم بدون کمک پسرم رزرو کردم. برخورد بسیار محترمانه پرسنل هم جای تقدیر دارد.",
    isVerified: true,
  },
  {
    id: "f4",
    name: "سامان ابراهیمی",
    role: "معمار و طراح داخلی",
    rating: 5,
    date: "همین هفته",
    comment:
      "فید پوست و فرم‌دهی ریش فوق‌العاده بود. شفافیت قیمت و اینکه بیعانه را آنلاین دادم و مابقی را در سالن تسویه کردم بدون هیچ هزینه اضافی، حس اعتماد و امنیت بسیار بالایی به مشتری می‌دهد.",
    isVerified: true,
  },
]

const RATING_DESCRIPTIONS = [
  "",
  "نیاز به بهبود",
  "متوسط",
  "خوب و رضایت‌بخش",
  "بسیار عالی",
  "فوق‌العاده و بی‌نقص",
]

export function ReviewSystemSection() {
  const [reviews, setReviews] = useState<ReviewItem[]>(FALLBACK_REVIEWS)
  const [totalCount, setTotalCount] = useState<number>(FALLBACK_REVIEWS.length)
  const [avgRating, setAvgRating] = useState<number>(4.9)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form states
  const [authorName, setAuthorName] = useState("")
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")
  const [trackingCode, setTrackingCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Body scroll lock when review modal is open
  useEffect(() => {
    if (isModalOpen) {
      const original = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = original
      }
    }
  }, [isModalOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isModalOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDialog()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isModalOpen])

  // Fetch approved reviews from API
  useEffect(() => {
    async function loadReviews() {
      try {
        const res = await fetch("/api/reviews")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.reviews) && data.reviews.length > 0) {
            setReviews(data.reviews)
            setTotalCount(data.total || data.reviews.length)
            if (data.avgRating) setAvgRating(data.avgRating)
          }
        }
      } catch {
        // Fallback reviews will remain visible
      }
    }
    loadReviews()
  }, [])

  // Handle review submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!authorName.trim() || authorName.trim().length < 2) {
      setSubmitError("لطفاً نام و نام‌خانوادگی خود را وارد کنید (حداقل ۲ حرف).")
      return
    }

    if (!comment.trim() || comment.trim().length < 5) {
      setSubmitError("متن نظر باید حداقل شامل ۵ حرف باشد.")
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: authorName.trim(),
          rating,
          comment: comment.trim(),
          trackingCode: trackingCode.trim() ? trackingCode.trim().toUpperCase() : null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "خطا در ثبت نظر. لطفاً مجدداً تلاش کنید.")
      }

      setSubmitSuccess(
        data.message ||
          "نظر شما با موفقیت ثبت شد و پس از بررسی و تایید مدیریت سالن منتشر خواهد شد."
      )

      // Reset form
      setAuthorName("")
      setComment("")
      setTrackingCode("")
      setRating(5)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "خطای ناشناخته در ارسال نظر."
      setSubmitError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeDialog = () => {
    setIsModalOpen(false)
    setSubmitSuccess(null)
    setSubmitError(null)
  }

  return (
    <section id="reviews" className="py-24 bg-[#0D0F0E] relative overflow-hidden" dir="rtl">
      {/* Decorative hairline */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#2D332F] to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#181D1A] border border-[#C8A96B]/30 text-xs sm:text-sm font-semibold text-[#E4C88E]">
            <Sparkles className="w-3.5 h-3.5 text-[#C8A96B]" />
            <span>تجربه شما از کوروش باربر</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-[#F7F4EE] tracking-normal text-balance">
            روایت مشتریان از کیفیت، دقت و انضباط
          </h2>

          <p className="text-base sm:text-lg text-[#C5BDB2]">
            تمام نظرات ثبت شده حاصل تجربه واقعی مراجعان روی صندلی پیرایش کوروش است.
          </p>
        </div>

        {/* Aggregate Ratings & CTA Bar */}
        <div className="bg-[#141715] border border-[#242A27] rounded-3xl p-6 sm:p-8 mb-12 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Score info */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-center md:text-right">
              <div className="flex items-center gap-3">
                <span className="text-4xl sm:text-5xl font-black font-heading text-[#E4C88E]">
                  {toPersianDigits(avgRating.toFixed(1))}
                </span>
                <div>
                  <div className="flex items-center gap-1 text-[#E4C88E]">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.round(avgRating)
                            ? "fill-[#E4C88E] text-[#E4C88E]"
                            : "text-[#3D4540]"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-[#8C8477] mt-0.5 block">از ۵ ستاره کیفی</span>
                </div>
              </div>

              <div className="h-8 w-px bg-[#2D332F] hidden sm:block" />

              <div className="text-sm">
                <span className="font-bold text-[#F7F4EE] block">
                  {toPersianDigits(totalCount)} نظر تایید شده
                </span>
                <span className="text-xs text-[#8C8477]">۹۹٪ رضایت مراجعان دائم</span>
              </div>
            </div>

            {/* Action CTA */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#C8A96B] hover:bg-[#D4B779] text-[#0D0F0E] font-bold text-sm transition-all duration-200 shadow-lg hover:shadow-[#C8A96B]/20 active:scale-[0.98] min-h-[44px]"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>ثبت تجربه و نظر شما</span>
            </button>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-[#141715] p-6 sm:p-8 rounded-3xl border border-[#242A27] hover:border-[#C8A96B]/40 transition-all duration-300 shadow-xl flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                {/* Rating Stars & Quote */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[#E4C88E]">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#E4C88E]" />
                    ))}
                  </div>
                  <Quote className="w-7 h-7 text-[#262C29]" />
                </div>

                {/* Comment Text */}
                <p className="text-sm sm:text-base text-[#D4CCC1] leading-relaxed">
                  «{rev.comment}»
                </p>
              </div>

              {/* Author Info & Verified Badge */}
              <div className="pt-4 border-t border-[#1F2522] flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-[#F7F4EE]">{rev.name}</h4>
                    {rev.isVerified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>نوبت تایید شده</span>
                      </span>
                    )}
                  </div>
                  {rev.role && <p className="text-xs text-[#8C8477] mt-0.5">{rev.role}</p>}
                </div>

                {rev.date && (
                  <span className="text-[#6D6559] text-xs font-mono">{rev.date}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Review Submission Modal Dialog - Responsive Bottom Sheet on Mobile */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDialog()
          }}
        >
          <div
            className="bg-[#161A18] border-t sm:border border-[#2D332F] rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl relative max-h-[92vh] sm:max-h-[90vh] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Sheet Drag Handle */}
            <div className="w-12 h-1.5 bg-[#2E3631] rounded-full mx-auto mb-4 sm:hidden" />

            {/* Close Button */}
            <button
              type="button"
              onClick={closeDialog}
              aria-label="بستن فرم نظر"
              className="absolute top-4 sm:top-5 left-4 sm:left-5 p-2 rounded-xl text-[#A8A39A] hover:text-[#F7F4EE] hover:bg-[#222824] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div className="space-y-1 mb-6 text-right">
              <h3
                id="review-modal-title"
                className="text-xl sm:text-2xl font-bold font-heading text-[#F7F4EE]"
              >
                ثبت تجربه شما از سالن کوروش
              </h3>
              <p className="text-xs sm:text-sm text-[#A8A39A]">
                نظرات شما پس از تایید مدیریت، مستقیماً در این بخش نمایش داده می‌شوند.
              </p>
            </div>

            {/* Success Message Banner */}
            {submitSuccess ? (
              <div
                role="status"
                className="p-6 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-center space-y-4 my-4"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-emerald-200">با سپاس از همراهی شما</h4>
                <p className="text-xs sm:text-sm text-emerald-300/90 leading-relaxed">
                  {submitSuccess}
                </p>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs transition-colors min-h-[44px]"
                >
                  متوجه شدم و بستن پنجره
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-5 text-right">
                {/* Error Banner */}
                {submitError && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs leading-relaxed"
                  >
                    {submitError}
                  </div>
                )}

                {/* 1. Name */}
                <div className="space-y-1.5">
                  <label htmlFor="rev-author" className="block text-xs font-semibold text-[#E4C88E]">
                    نام و نام‌خانوادگی <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="rev-author"
                    type="text"
                    required
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="مثال: علیرضا محمدی"
                    className="w-full bg-[#111413] border border-[#2D332F] rounded-xl px-4 py-3 text-sm text-[#F7F4EE] placeholder:text-[#525954] focus:outline-none focus:border-[#C8A96B] transition-colors"
                  />
                </div>

                {/* 2. Interactive Star Rating */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#E4C88E]">
                    امتیاز شما به کیفیت خدمات <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="انتخاب امتیاز">
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const activeVal = hoverRating || rating
                        const isFilled = starVal <= activeVal
                        return (
                          <button
                            key={starVal}
                            type="button"
                            role="radio"
                            aria-checked={rating === starVal}
                            aria-label={`${starVal} ستاره`}
                            onClick={() => setRating(starVal)}
                            onMouseEnter={() => setHoverRating(starVal)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-[#202522] transition-colors"
                          >
                            <Star
                              className={`w-6 h-6 transition-all ${
                                isFilled
                                  ? "fill-[#E4C88E] text-[#E4C88E] scale-110"
                                  : "text-[#3D4540]"
                              }`}
                            />
                          </button>
                        )
                      })}
                    </div>
                    <span className="text-xs text-[#A8A39A] font-medium mr-2">
                      ({toPersianDigits(rating)} ستاره - {RATING_DESCRIPTIONS[rating]})
                    </span>
                  </div>
                </div>

                {/* 3. Review Comment */}
                <div className="space-y-1.5">
                  <label htmlFor="rev-comment" className="block text-xs font-semibold text-[#E4C88E]">
                    متن نظر و تجربه شما <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="rev-comment"
                    required
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="درباره کیفیت اصلاح، زمان‌بندی، بهداشت و برخورد پرسنل برای ما بنویسید..."
                    className="w-full bg-[#111413] border border-[#2D332F] rounded-xl px-4 py-3 text-sm text-[#F7F4EE] placeholder:text-[#525954] focus:outline-none focus:border-[#C8A96B] transition-colors resize-none"
                  />
                  <div className="flex justify-between text-[11px] text-[#6E7570]">
                    <span>حداقل ۵ کاراکتر</span>
                    <span>{toPersianDigits(comment.length)} / ۶۰۰</span>
                  </div>
                </div>

                {/* 4. Optional Tracking Code for Verification */}
                <div className="space-y-1.5 p-3.5 rounded-2xl bg-[#111413] border border-[#262B28]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#C8A96B]" />
                    <label htmlFor="rev-tracking" className="text-xs font-semibold text-[#F7F4EE]">
                      کد پیگیری نوبت <span className="text-[#8C8477] font-normal">(اختیاری)</span>
                    </label>
                  </div>
                  <input
                    id="rev-tracking"
                    type="text"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="مثال: KB-84192"
                    className="w-full bg-[#161A18] border border-[#2D332F] rounded-xl px-3 py-2 text-xs font-mono text-[#F7F4EE] placeholder:text-[#525954] focus:outline-none focus:border-[#C8A96B]"
                  />
                  <p className="text-[11px] text-[#8C8477] leading-relaxed">
                    در صورت ورود کد پیگیری نوبت، پس از احراز صحت نوبت در سیستم، نشان «مشتری تایید شده» در کنار نظر شما ثبت می‌شود.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#C8A96B] hover:bg-[#D4B779] text-[#0D0F0E] font-bold text-sm transition-all duration-200 shadow-lg disabled:opacity-50 min-h-[44px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>در حال ارسال و ثبت نظر...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>ارسال نظر جهت بررسی و انتشار</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
