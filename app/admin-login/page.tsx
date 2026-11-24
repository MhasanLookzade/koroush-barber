"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Scissors, Lock, User, AlertCircle, RefreshCw, KeyRound, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/admin"

  const [username, setUsername] = useState("admin")
  const [password, setPassword] = useState("admin123456")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.error || "نام کاربری یا کلمه عبور نادرست است")
      }

      // Hard redirect to callbackUrl ensures browser synchronously sends set-cookie headers
      window.location.href = callbackUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در برقراری ارتباط با سرور")
      setIsLoading(false)
    }
  }

  const fillCredentials = (user: string, pass: string) => {
    setUsername(user)
    setPassword(pass)
    setError(null)
  }

  return (
    <Card className="w-full max-w-md bg-[#161917] border-[#2D332F] text-[#F5F1E8] shadow-2xl rounded-3xl overflow-hidden mx-auto">
      <CardHeader className="text-center pb-6 border-b border-[#2D332F] p-6 sm:p-8">
        <div className="w-16 h-16 rounded-2xl bg-[#C8A96B]/10 border border-[#C8A96B]/20 text-[#C8A96B] flex items-center justify-center mx-auto mb-4 shadow-inner">
          <KeyRound className="w-8 h-8" />
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold font-heading text-[#F5F1E8]">
          ورود به پنل مدیریت کوروش
        </CardTitle>
        <CardDescription className="text-[#A8A39A] text-xs sm:text-sm mt-2 leading-relaxed">
          دسترسی امن برای مدیریت هوشمند نوبت‌ها، خدمات، مراجعین و گزارش‌های مالی
        </CardDescription>
      </CardHeader>

      <CardContent className="p-5 sm:p-8 space-y-6">
        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/50 text-red-200 text-xs sm:text-sm flex items-center gap-2.5 animate-fadeIn"
          >
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} action="#" method="POST" className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="admin-username" className="text-xs sm:text-sm font-medium text-[#A8A39A] block">
              نام کاربری:
            </label>
            <div className="relative">
              <input
                id="admin-username"
                name="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-4 py-3 pl-10 text-sm text-[#F5F1E8] placeholder-[#7D786E] focus:outline-none focus:border-[#C8A96B] focus:ring-1 focus:ring-[#C8A96B] transition-colors"
                dir="ltr"
              />
              <User className="w-4 h-4 text-[#A8A39A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="text-xs sm:text-sm font-medium text-[#A8A39A] block">
              رمز عبور:
            </label>
            <div className="relative">
              <input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-4 py-3 pl-10 text-sm text-[#F5F1E8] placeholder-[#7D786E] focus:outline-none focus:border-[#C8A96B] focus:ring-1 focus:ring-[#C8A96B] transition-colors"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="w-8 h-8 absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center text-[#A8A39A] hover:text-[#F5F1E8] transition-colors"
                aria-label={showPassword ? "مخفی‌سازی رمز عبور" : "نمایش رمز عبور"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold py-6 rounded-xl text-sm sm:text-base gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                در حال احراز هویت و ورود...
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                ورود به داشبورد مدیریت
              </>
            )}
          </Button>
        </form>

        {/* Demo Credentials Quick-Select */}
        <div className="p-4 rounded-2xl bg-[#1F2321] border border-[#2D332F] text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#C8A96B]">حساب‌های کاربری آماده سیستم:</span>
            <span className="text-[10px] text-[#A8A39A]">برای ورود سریع کلیک کنید</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials("admin", "admin123456")}
              className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1 ${
                username === "admin"
                  ? "bg-[#C8A96B]/15 border-[#C8A96B] text-[#F5F1E8]"
                  : "bg-[#161917] border-[#2D332F] text-[#A8A39A] hover:border-[#7D786E]"
              }`}
            >
              <div className="flex items-center justify-between font-bold text-xs text-[#F5F1E8]">
                <span>مدیر کل (OWNER)</span>
                <span className="text-[10px] text-[#C8A96B]">admin</span>
              </div>
              <span className="text-[11px] font-mono text-[#A8A39A]">admin123456</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("staff", "staff123456")}
              className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1 ${
                username === "staff"
                  ? "bg-[#C8A96B]/15 border-[#C8A96B] text-[#F5F1E8]"
                  : "bg-[#161917] border-[#2D332F] text-[#A8A39A] hover:border-[#7D786E]"
              }`}
            >
              <div className="flex items-center justify-between font-bold text-xs text-[#F5F1E8]">
                <span>پرسنل (STAFF)</span>
                <span className="text-[10px] text-[#C8A96B]">staff</span>
              </div>
              <span className="text-[11px] font-mono text-[#A8A39A]">staff123456</span>
            </button>
          </div>
        </div>

        {/* Return to website */}
        <div className="text-center pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#A8A39A] hover:text-[#C8A96B] transition-colors"
          >
            <span>بازگشت به وب‌سایت مشتری آرایشگاه کوروش</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminLoginPage() {
  return (
    <main
      className="min-h-screen bg-[#0D0F0E] flex items-center justify-center p-4 sm:p-6"
      dir="rtl"
    >
      <Suspense
        fallback={
          <div className="text-[#A8A39A] text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#C8A96B]" />
            بارگذاری فرم ورود مدیریت...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  )
}
