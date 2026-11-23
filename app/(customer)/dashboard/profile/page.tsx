"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { User, Mail, Lock, Shield, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react"
import { LiveRegion } from "@/components/ui/live-region"

const profileSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ کاراکتر باشد"),
  email: z.string().email("ایمیل معتبر وارد کنید").optional().or(z.literal("")),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "رمز عبور فعلی الزامی است"),
  newPassword: z.string().min(8, "رمز عبور جدید باید حداقل ۸ کاراکتر باشد"),
  confirmPassword: z.string().min(1, "تکرار رمز عبور الزامی است"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "رمز عبورها مطابقت ندارند",
  path: ["confirmPassword"],
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

interface Customer {
  id: string
  name: string
  phone: string
  email: string | null
  avatar: string | null
  isVerified: boolean
  lastLoginAt: string | null
  createdAt: string
}

export default function ProfilePage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile")
  const [profileStatus, setProfileStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [profileMessage, setProfileMessage] = useState("")
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [passwordMessage, setPasswordMessage] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const fetchCustomer = useCallback(async () => {
    try {
      const res = await fetch("/api/customer/profile")
      if (res.ok) {
        const data = await res.json()
        setCustomer(data.customer)
      }
    } catch (error) {
      console.error("Failed to fetch customer:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomer()
  }, [fetchCustomer])

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", email: "" },
  })

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })

  useEffect(() => {
    if (customer) {
      profileForm.reset({ name: customer.name, email: customer.email || "" })
    }
  }, [customer, profileForm])

  const handleProfileSubmit = async (data: ProfileFormData) => {
    setProfileStatus("saving")
    setProfileMessage("در حال ذخیره...")
    try {
      const res = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (res.ok) {
        setProfileStatus("success")
        setProfileMessage("پروفایل با موفقیت به‌روزرسانی شد")
        fetchCustomer()
      } else {
        setProfileStatus("error")
        setProfileMessage(result.error || "خطا در به‌روزرسانی پروفایل")
      }
    } catch (error) {
      setProfileStatus("error")
      setProfileMessage("خطا در ارتباط با سرور")
    }
  }

  const handlePasswordSubmit = async (data: PasswordFormData) => {
    setPasswordStatus("saving")
    setPasswordMessage("در حال تغییر رمز عبور...")
    try {
      const res = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      })
      const result = await res.json()
      if (res.ok) {
        setPasswordStatus("success")
        setPasswordMessage("رمز عبور با موفقیت تغییر کرد")
        passwordForm.reset()
      } else {
        setPasswordStatus("error")
        setPasswordMessage(result.error || "خطا در تغییر رمز عبور")
      }
    } catch (error) {
      setPasswordStatus("error")
      setPasswordMessage("خطا در ارتباط با سرور")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">پروفایل کاربری</h1>
        <p className="text-muted-foreground">مدیریت اطلاعات شخصی و تنظیمات امنیتی</p>
      </div>

      {/* Profile Info Card */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            اطلاعات حساب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--color-gold-bright))] flex items-center justify-center text-primary-foreground font-heading font-bold text-3xl">
                {customer?.name?.charAt(0) || "ک"}
              </div>
              {customer?.isVerified && (
                <span className="absolute bottom-0 left-0 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white text-sm">
                  ✓
                </span>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold">{customer?.name}</h3>
              <p className="text-muted-foreground persian-nums">{customer?.phone}</p>
              {customer?.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                عضو از {customer?.createdAt ? formatDate(new Date(customer.createdAt)) : "—"}
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">احراز هویت</p>
                <p className="font-medium">{customer?.isVerified ? "تایید شده" : "تایید نشده"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">آخرین ورود</p>
                <p className="font-medium persian-nums">
                  {customer?.lastLoginAt ? formatDate(new Date(customer.lastLoginAt)) : "هرگز"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-border" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "profile"}
          aria-controls="profile-panel"
          id="profile-tab"
          onClick={() => setActiveTab("profile")}
          className={cn(
            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "profile"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          اطلاعات پروفایل
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "password"}
          aria-controls="password-panel"
          id="password-tab"
          onClick={() => setActiveTab("password")}
          className={cn(
            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "password"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          تغییر رمز عبور
        </button>
      </div>

      {/* Profile Form */}
      <div role="tabpanel" id="profile-panel" aria-labelledby="profile-tab" hidden={activeTab !== "profile"}>
        <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
          <LiveRegion message={profileMessage} politeness={profileStatus === "error" ? "assertive" : "polite"} clearAfter={profileStatus === "success" ? 5000 : 0} />

          {(profileStatus === "success" || profileStatus === "error") && (
            <Alert className={cn(
              profileStatus === "success" ? "bg-[hsl(var(--success)_/_0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)_/_0.2)]" :
              "bg-[hsl(var(--destructive)_/_0.1)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)_/_0.2)]"
            )}>
              <AlertDescription className="flex items-center gap-2">
                {profileStatus === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {profileMessage}
              </AlertDescription>
            </Alert>
          )}

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>اطلاعات شخصی</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-1">
                  <span>نام و نام خانوادگی</span>
                  <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="name"
                    {...profileForm.register("name")}
                    className="pr-10"
                    autoComplete="name"
                    aria-invalid={profileForm.formState.errors.name ? "true" : "false"}
                  />
                </div>
                {profileForm.formState.errors.name && (
                  <p className="text-sm text-destructive flex items-center gap-1" role="alert">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {profileForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <span>ایمیل</span>
                  <span className="text-muted-foreground text-xs">(اختیاری)</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="email"
                    type="email"
                    {...profileForm.register("email")}
                    className="pr-10"
                    autoComplete="email"
                    dir="ltr"
                    aria-invalid={profileForm.formState.errors.email ? "true" : "false"}
                  />
                </div>
                {profileForm.formState.errors.email && (
                  <p className="text-sm text-destructive flex items-center gap-1" role="alert">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {profileForm.formState.errors.email.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full btn-luxury gap-3 py-4"
            disabled={profileStatus === "saving"}
            aria-busy={profileStatus === "saving"}
          >
            {profileStatus === "saving" ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>در حال ذخیره...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" aria-hidden="true" />
                <span>ذیره تغییرات</span>
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Password Form */}
      <div role="tabpanel" id="password-panel" aria-labelledby="password-tab" hidden={activeTab !== "password"}>
        <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-6">
          <LiveRegion message={passwordMessage} politeness={passwordStatus === "error" ? "assertive" : "polite"} clearAfter={passwordStatus === "success" ? 5000 : 0} />

          {(passwordStatus === "success" || passwordStatus === "error") && (
            <Alert className={cn(
              passwordStatus === "success" ? "bg-[hsl(var(--success)_/_0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)_/_0.2)]" :
              "bg-[hsl(var(--destructive)_/_0.1)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)_/_0.2)]"
            )}>
              <AlertDescription className="flex items-center gap-2">
                {passwordStatus === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {passwordMessage}
              </AlertDescription>
            </Alert>
          )}

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>تغییر رمز عبور</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">رمز عبور فعلی</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    {...passwordForm.register("currentPassword")}
                    className="pr-10"
                    autoComplete="current-password"
                    aria-invalid={passwordForm.formState.errors.currentPassword ? "true" : "false"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={showCurrentPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
                    aria-pressed={showCurrentPassword}
                  >
                    {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1" role="alert">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">رمز عبور جدید</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    {...passwordForm.register("newPassword")}
                    className="pr-10"
                    autoComplete="new-password"
                    aria-invalid={passwordForm.formState.errors.newPassword ? "true" : "false"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
                    aria-pressed={showNewPassword}
                  >
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1" role="alert">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تکرار رمز عبور جدید</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    {...passwordForm.register("confirmPassword")}
                    className="pr-10"
                    autoComplete="new-password"
                    aria-invalid={passwordForm.formState.errors.confirmPassword ? "true" : "false"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1" role="alert">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full btn-luxury gap-3 py-4"
            disabled={passwordStatus === "saving"}
            aria-busy={passwordStatus === "saving"}
          >
            {passwordStatus === "saving" ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>در حال تغییر...</span>
              </>
            ) : (
              <>
                <Lock className="h-5 w-5" aria-hidden="true" />
                <span>تغییر رمز عبور</span>
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}