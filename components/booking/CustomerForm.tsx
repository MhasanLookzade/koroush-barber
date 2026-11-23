"use client"

import { useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { User, Phone, Mail, Calendar, Clock, Scissors, CreditCard, CheckCircle, Shield, Sparkles, AlertCircle, ChevronDown } from "lucide-react"
import { formatPrice, formatDateTime, getPersianDayName, formatDate, normalizePhoneNumber, toPersianDigits } from "@/lib/utils"
import { Service, Barber } from "@/types"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { LiveRegion } from "@/components/ui/live-region"

const customerSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ کاراکتر باشد"),
  phone: z.string()
    .min(10, "شماره تماس معتبر وارد کنید")
    .transform((val) => normalizePhoneNumber(val))
    .refine(
      (val) => /^09\d{9}$/.test(val),
      "شماره تماس باید شبیه ۰۹xxxxxxxxx یا +۹۸۹xxxxxxxxx باشد"
    ),
  email: z.string().email("ایمیل معتبر وارد کنید").optional().or(z.literal("")),
  notes: z.string().max(500, "یادداشت نباید بیشتر از ۵۰۰ کاراکتر باشد").optional(),
})

type CustomerFormData = z.infer<typeof customerSchema>

interface CustomerFormProps {
  service: Service
  barber: Barber
  selectedDate: Date
  selectedTime: string
  onSubmit: (data: CustomerFormData) => Promise<void>
  isLoading: boolean
}

export function CustomerForm({ service, barber, selectedDate, selectedTime, onSubmit, isLoading }: CustomerFormProps) {
  const [showOptional, setShowOptional] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [submitMessage, setSubmitMessage] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: { email: "", notes: "" },
  })

  const appointmentDateTime = new Date(selectedDate)
  const [hours, minutes] = selectedTime.split(':').map(Number)
  appointmentDateTime.setHours(hours, minutes, 0, 0)

  const email = watch("email")

  const handleFormSubmit = useCallback(async (data: CustomerFormData) => {
    setSubmitStatus("submitting")
    setSubmitMessage("در حال ثبت نوبت...")
    try {
      await onSubmit(data)
      setSubmitStatus("success")
      setSubmitMessage("نوبت شما با موفقیت ثبت شد. پیامک تأییدیه ارسال خواهد شد.")
    } catch (error) {
      setSubmitStatus("error")
      setSubmitMessage(error instanceof Error ? error.message : "خطا در ثبت نوبت. لطفاً مجدداً تلاش کنید.")
    }
  }, [onSubmit])

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6" noValidate>
      {/* Live region for form submission announcements */}
      <LiveRegion message={submitMessage} politeness={submitStatus === "error" ? "assertive" : "polite"} clearAfter={submitStatus === "success" ? 5000 : 0} />
      {/* Customer Info Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <span>اطلاعات مشتری</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-1">
              <span>نام و نام خانوادگی</span>
              <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <Input
                id="name"
                placeholder="مثال: علی احمدی"
                {...register("name")}
                className={cn("pr-10", errors.name && "border-destructive focus-visible:ring-destructive")}
                autoComplete="name"
                aria-invalid={errors.name ? "true" : "false"}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
            </div>
            {errors.name && (
              <p id="name-error" className="text-sm text-destructive flex items-center gap-1" role="alert">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1">
              <span>شماره تماس</span>
              <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <Input
                id="phone"
                type="tel"
                placeholder="۰۹xxxxxxxxx یا +۹۸۹xxxxxxxxx"
                {...register("phone")}
                className={cn("pr-10", errors.phone && "border-destructive focus-visible:ring-destructive")}
                autoComplete="tel"
                dir="ltr"
                aria-invalid={errors.phone ? "true" : "false"}
                aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
              />
            </div>
            {errors.phone ? (
              <p id="phone-error" className="text-sm text-destructive flex items-center gap-1" role="alert">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.phone.message}
              </p>
            ) : (
              <p id="phone-hint" className="text-caption text-muted-foreground">
                فرمت‌های پذیرفته شده: ۰۹xxxxxxxxx، +۹۸۹xxxxxxxxx، ۰۰۹۸۹xxxxxxxxx
              </p>
            )}
          </div>

          <Separator className="my-2" />

          {/* Optional Fields Toggle */}
          <Button
            type="button"
            variant="luxury-ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-xl px-4 py-2"
            onClick={() => setShowOptional(!showOptional)}
            aria-expanded={showOptional}
            aria-controls="optional-fields"
            aria-label={showOptional ? "مخفی کردن اطلاعات اختیاری" : "نمایش اطلاعات اختیاری"}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", showOptional && "rotate-180")} aria-hidden="true" />
            <span className="font-medium">اطلاعات اختیاری</span>
            <span className="text-xs text-muted-foreground/70">
              {email ? "پر شده" : "اختیاری"}
            </span>
          </Button>

          <div
            id="optional-fields"
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              showOptional ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            )}
            role="region"
            aria-label="فیلدهای اختیاری فرم"
          >
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200 pt-2">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1">
                  <span>ایمیل</span>
                  <span className="text-muted-foreground text-xs">(برای ارسال تأییدیه)</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    {...register("email")}
                    className={cn("pr-10", errors.email && "border-destructive focus-visible:ring-destructive")}
                    autoComplete="email"
                    dir="ltr"
                    aria-invalid={errors.email ? "true" : "false"}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="text-sm text-destructive flex items-center gap-1" role="alert">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-1">
                  <span>یادداشت‌ها</span>
                  <span className="text-muted-foreground text-xs">(اختیاری)</span>
                </Label>
                <Textarea
                  id="notes"
                  placeholder="هرگونه درخواست خاص، حساسیت، یا یادداشت برای آرایشگر..."
                  {...register("notes")}
                  rows={3}
                  className="resize-none input-luxury"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground text-left">حداکثر ۵۰۰ کاراکتر</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Summary Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-primary">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <span>خلاصه رزرو</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 pt-0">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                <Scissors className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">خدمت</p>
                <p className="font-medium text-foreground truncate">{service.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">آرایشگر</p>
                <p className="font-medium text-foreground truncate">{barber.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">تاریخ و ساعت</p>
                <p className="font-medium text-foreground">
                  {getPersianDayName(selectedDate)}، {formatDate(selectedDate)} - {toPersianDigits(selectedTime)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">مدت زمان</p>
                <p className="font-medium text-foreground">{service.duration} دقیقه</p>
              </div>
            </div>
          </div>

          <Separator className="my-2" />

          {/* Price */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="font-medium text-primary">مبلغ قابل پرداخت</span>
              </div>
              <div className="text-left">
                <p className="font-heading text-xl font-bold text-primary persian-nums">{formatPrice(service.price)}</p>
                <p className="text-xs text-primary/80">تومان</p>
              </div>
            </div>
            <p className="text-xs text-primary/70 text-center mt-2 flex items-center justify-center gap-1">
              <Shield className="h-3.5 w-3.5" />
              پرداخت در محل انجام می‌شود - هیچ پیش‌پرداختی وجود ندارد
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full btn-luxury gap-3 text-lg py-5 shadow-luxury hover:shadow-luxury-hover"
        disabled={submitStatus === "submitting"}
        size="lg"
        aria-busy={submitStatus === "submitting"}
      >
        {submitStatus === "submitting" ? (
          <>
            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>در حال ثبت نوبت...</span>
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            <span>تایید و ثبت نوبت</span>
            <CheckCircle className="h-5 w-5" aria-hidden="true" />
          </>
        )}
      </Button>

      {/* Submit Status Message (visible) */}
      {(submitStatus === "success" || submitStatus === "error") && (
        <div
          className={cn(
            "p-4 rounded-xl text-center animate-in slide-in-from-bottom-2",
            submitStatus === "success"
              ? "bg-[hsl(var(--success)_/_0.1)] text-[hsl(var(--success))] border border-[hsl(var(--success)_/_0.2)]"
              : "bg-[hsl(var(--destructive)_/_0.1)] text-[hsl(var(--destructive))] border border-[hsl(var(--destructive)_/_0.2)]"
          )}
          role="alert"
          aria-live={submitStatus === "error" ? "assertive" : "polite"}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            {submitStatus === "success" ? (
              <CheckCircle className="h-5 w-5" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
            )}
            <span className="font-medium">
              {submitStatus === "success" ? "موفقیت" : "خطا"}
            </span>
          </div>
          <p className="text-sm">{submitMessage}</p>
        </div>
      )}

      {/* Trust Indicators */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground/60">
        <span className="flex items-center gap-1">
          <Shield className="h-3.5 w-3.5" />
          تراکنش امن
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
          تأییدیه پیامکی
        </span>
        <span className="flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          لغو رایگان تا ۲ ساعت قبل
        </span>
      </div>
    </form>
  )
}