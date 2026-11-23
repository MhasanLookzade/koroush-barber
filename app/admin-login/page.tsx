"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Scissors, Lock, User, AlertCircle, RefreshCw, KeyRound, ShieldAlert } from "lucide-react"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/admin"

  const [username, setUsername] = useState("admin")
  const [password, setPassword] = useState("admin123456")
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

      router.push(callbackUrl)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در برقراری ارتباط")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md bg-[#161917] border-[#2D332F] text-[#F5F1E8] shadow-2xl rounded-3xl overflow-hidden">
      <CardHeader className="text-center pb-6 border-b border-[#2D332F]">
        <div className="w-14 h-14 rounded-2xl bg-[#C8A96B]/10 text-[#C8A96B] flex items-center justify-center mx-auto mb-3">
          <KeyRound className="w-7 h-7" />
        </div>
        <CardTitle className="text-2xl font-bold font-heading">
          ورود به پنل مدیریت کوروش باربر
        </CardTitle>
        <CardDescription className="text-[#A8A39A] text-xs mt-1">
          دسترسی امن برای مدیریت نوبت‌ها، ساعات کاری، خدمات و گزارش‌های مالی
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 sm:p-8 space-y-6">
        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#A8A39A] block">نام کاربری:</label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-4 py-3 pl-10 text-sm text-[#F5F1E8] focus:outline-none focus:border-[#C8A96B]"
              />
              <User className="w-4 h-4 text-[#A8A39A] absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#A8A39A] block">رمز عبور:</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-4 py-3 pl-10 text-sm text-[#F5F1E8] focus:outline-none focus:border-[#C8A96B]"
              />
              <Lock className="w-4 h-4 text-[#A8A39A] absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold py-6 rounded-xl text-base gap-2 shadow-lg"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                در حال بررسی اعتبار...
              </>
            ) : (
              "ورود به داشبورد مدیریت"
            )}
          </Button>
        </form>

        {/* Demo Credentials Box */}
        <div className="p-3.5 rounded-xl bg-[#1F2321] border border-[#2D332F] text-xs space-y-2 text-[#A8A39A]">
          <span className="font-bold text-[#C8A96B] block">حساب‌های آزمایشی آماده:</span>
          <div className="flex justify-between items-center">
            <span>مدیر کل (OWNER):</span>
            <code className="text-[#F5F1E8] font-mono">admin / admin123456</code>
          </div>
          <div className="flex justify-between items-center">
            <span>پرسنل پذیرش (STAFF):</span>
            <code className="text-[#F5F1E8] font-mono">staff / staff123456</code>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#0D0F0E] flex items-center justify-center p-4" dir="rtl">
      <Suspense
        fallback={
          <div className="text-[#A8A39A] text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#C8A96B]" />
            بارگذاری صفحه ورود...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  )
}
