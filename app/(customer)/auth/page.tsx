"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Scissors, User, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { LiveRegion } from "@/components/ui/live-region"

const loginSchema = z.object({
  phone: z.string().regex(/^09\d{9}$/, "فرمت شماره تماس: 09xxxxxxxxx"),
  password: z.string().min(1, "رمز عبور الزامی است"),
})

const registerSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ کاراکتر باشد"),
  phone: z.string().regex(/^09\d{9}$/, "فرمت شماره تماس: 09xxxxxxxxx"),
  email: z.string().email("ایمیل معتبر وارد کنید").optional().or(z.literal("")),
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد"),
  confirmPassword: z.string().min(1, "تکرار رمز عبور الزامی است"),
}).refine(data => data.password === data.confirmPassword, {
  message: "رمز عبورها مطابقت ندارند",
  path: ["confirmPassword"],
})

type LoginFormData = z.infer<typeof loginSchema>
type RegisterFormData = z.infer<typeof registerSchema>

export default function CustomerAuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const [activeTab, setActiveTab] = useState<"login" | "register">("login")
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "" },
  })

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", phone: "", email: "", password: "", confirmPassword: "" },
  })

  const handleLoginSubmit = async (data: LoginFormData) => {
    setStatus("submitting")
    setMessage("در حال ورود...")
    try {
      const res = await fetch("/api/auth/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (res.ok) {
        setStatus("success")
        setMessage("ورود با موفقیت انجام شد")
        setTimeout(() => router.push(callbackUrl), 1500)
      } else {
        setStatus("error")
        setMessage(result.error || "خطا در ورود")
      }
    } catch (error) {
      setStatus("error")
      setMessage("خطا در ارتباط با سرور")
    }
  }

  const handleRegisterSubmit = async (data: RegisterFormData) => {
    setStatus("submitting")
    setMessage("در حال ثبت‌نام...")
    try {
      const res = await fetch("/api/auth/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          email: data.email,
          password: data.password,
        }),
      })
      const result = await res.json()
      if (res.ok) {
        setStatus("success")
        setMessage("ثبت‌نام با موفقیت انجام شد")
        setTimeout(() => router.push(callbackUrl), 1500)
      } else {
        setStatus("error")
        setMessage(result.error || "خطا در ثبت‌نام")
      }
    } catch (error) {
      setStatus("error")
      setMessage("خطا در ارتباط با سرور")
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--color-gold-bright))]">
            <Scissors className="h-8 w-8 text-primary-foreground" aria-hidden="true" />
          </div>
          <div className="text-left">
            <span className="block text-heading-lg font-heading font-bold text-foreground tracking-tight">
              کوروش باربر
            </span>
            <span className="block text-caption font-medium text-primary tracking-widest uppercase">
              Kourosh Barber
            </span>
          </div>
        </Link>

        <Card className="border-border/50 shadow-luxury-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">ورود به پنل کاربری</CardTitle>
            <CardDescription>برای دسترسی به نوبت‌ها و پروفایل خود وارد شوید</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <LiveRegion message={message} politeness={status === "error" ? "assertive" : "polite"} clearAfter={status === "success" ? 5000 : 0} />

            {(status === "success" || status === "error") && (
              <Alert className={cn(
                status === "success" ? "bg-[hsl(var(--success)_/_0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)_/_0.2)]" :
                "bg-[hsl(var(--destructive)_/_0.1)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)_/_0.2)]"
              )}>
                <AlertDescription className="flex items-center gap-2 justify-center">
                  {status === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {message}
                </AlertDescription>
              </Alert>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab as (value: "login" | "register") => void}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">ورود</TabsTrigger>
                <TabsTrigger value="register">ثبت‌نام</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">شماره تماس</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="phone"
                        type="tel"
                        dir="ltr"
                        placeholder="۰۹xxxxxxxxx"
                        {...loginForm.register("phone")}
                        className="pr-10"
                        autoComplete="tel"
                        aria-invalid={loginForm.formState.errors.phone ? "true" : "false"}
                      />
                    </div>
                    {loginForm.formState.errors.phone && (
                      <p className="text-sm text-destructive flex items-center gap-1" role="alert">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {loginForm.formState.errors.phone.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">رمز عبور</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...loginForm.register("password")}
                        className="pr-10"
                        autoComplete="current-password"
                        aria-invalid={loginForm.formState.errors.password ? "true" : "false"}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive flex items-center gap-1" role="alert">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full btn-luxury gap-3 py-4"
                    disabled={status === "submitting"}
                    aria-busy={status === "submitting"}
                  >
                    {status === "submitting" ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>در حال ورود...</span>
                      </>
                    ) : (
                      <>
                        <span>ورود به حساب</span>
                        <CheckCircle className="h-5 w-5" aria-hidden="true" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4 mt-4">
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
                        {...registerForm.register("name")}
                        className="pr-10"
                        autoComplete="name"
                        aria-invalid={registerForm.formState.errors.name ? "true" : "false"}
                      />
                    </div>
                    {registerForm.formState.errors.name && (
                      <p className="text-sm text-destructive flex items-center gap-1" role="alert">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {registerForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1">
                      <span>شماره تماس</span>
                      <span className="text-destructive" aria-hidden="true">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="phone"
                        type="tel"
                        dir="ltr"
                        placeholder="۰۹xxxxxxxxx"
                        {...registerForm.register("phone")}
                        className="pr-10"
                        autoComplete="tel"
                        aria-invalid={registerForm.formState.errors.phone ? "true" : "false"}
                      />
                    </div>
                    {registerForm.formState.errors.phone && (
                      <p className="text-sm text-destructive flex items-center gap-1" role="alert">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {registerForm.formState.errors.phone.message}
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
                        placeholder="example@email.com"
                        {...registerForm.register("email")}
                        className="pr-10"
                        autoComplete="email"
                        dir="ltr"
                        aria-invalid={registerForm.formState.errors.email ? "true" : "false"}
                      />
                    </div>
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-destructive flex items-center gap-1" role="alert">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center gap-1">
                      <span>رمز عبور</span>
                      <span className="text-destructive" aria-hidden="true">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...registerForm.register("password")}
                        className="pr-10"
                        autoComplete="new-password"
                        aria-invalid={registerForm.formState.errors.password ? "true" : "false"}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-destructive flex items-center gap-1" role="alert">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="flex items-center gap-1">
                      <span>تکرار رمز عبور</span>
                      <span className="text-destructive" aria-hidden="true">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        {...registerForm.register("confirmPassword")}
                        className="pr-10"
                        autoComplete="new-password"
                        aria-invalid={registerForm.formState.errors.confirmPassword ? "true" : "false"}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                    </div>
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive flex items-center gap-1" role="alert">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {registerForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full btn-luxury gap-3 py-4"
                    disabled={status === "submitting"}
                    aria-busy={status === "submitting"}
                  >
                    {status === "submitting" ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>در حال ثبت‌نام...</span>
                      </>
                    ) : (
                      <>
                        <User className="h-5 w-5" aria-hidden="true" />
                        <span>ایجاد حساب کاربری</span>
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <Separator className="my-4" />

            <p className="text-center text-sm text-muted-foreground">
              بازگشت به <Link href="/" className="text-primary hover:underline">صفحه اصلی</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}