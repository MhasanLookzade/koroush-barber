"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Lock, User, AlertCircle, RefreshCw, KeyRound, Eye, EyeOff, ArrowRight } from "lucide-react"

export interface DemoAccount {
  label: string
  username: string
  password: string
}

function LoginForm({ demoAccounts }: { demoAccounts?: DemoAccount[] }) {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/admin"

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
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
              <User className="w-4 h-4 text-[#A8A39A] absolute right-3.5 top-3.5" />
              <input
                id="admin-username"
                name="username"
                type="text"
                dir="ltr"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl pr-10 pl-4 py-3 text-sm text-[#F5F1E8] focus:border-[#C8A96B] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="text-xs sm:text-sm font-medium text-[#A8A39A] block">
              کلمه عبور:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#A8A39A] absolute right-3.5 top-3.5" />
              <input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                dir="ltr"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl pr-10 pl-10 py-3 text-sm text-[#F5F1E8] focus:border-[#C8A96B] focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-3 text-[#A8A39A] hover:text-[#F5F1E8]"
                aria-label="نمایش کلمه عبور"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold py-6 text-sm sm:text-base rounded-xl shadow-lg shadow-[#C8A96B]/20 gap-2 cursor-pointer transition-all"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                در حال احراز هویت...
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                ورود به داشبورد مدیریت
              </>
            )}
          </Button>
        </form>

        {demoAccounts && demoAccounts.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#1F2321] border border-[#2D332F] text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#C8A96B]">حساب‌های آزمایشی محیط توسعه:</span>
              <span className="text-[10px] text-[#A8A39A]">برای ورود سریع کلیک کنید</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => fillCredentials(acc.username, acc.password)}
                  className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1 ${
                    username === acc.username
                      ? "bg-[#C8A96B]/15 border-[#C8A96B] text-[#F5F1E8]"
                      : "bg-[#161917] border-[#2D332F] text-[#A8A39A] hover:border-[#7D786E]"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs text-[#F5F1E8]">
                    <span>{acc.label}</span>
                    <span className="text-[10px] text-[#C8A96B]">{acc.username}</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#A8A39A]">{acc.password}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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

export function AdminLoginClient({ demoAccounts }: { demoAccounts?: DemoAccount[] }) {
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
        <LoginForm demoAccounts={demoAccounts} />
      </Suspense>
    </main>
  )
}
