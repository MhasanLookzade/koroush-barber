"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { ShieldCheck, AlertCircle, ArrowLeft, RefreshCw, XCircle, CheckCircle2 } from "lucide-react"

function MockPaymentContent({ authority }: { authority: string }) {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callback") || "/api/booking/callback"
  const [isProcessing, setIsProcessing] = useState(false)

  const handleAction = (status: "OK" | "NOK", simulateDelay = false) => {
    setIsProcessing(true)
    const fallbackUrl = new URL("/api/booking/callback", window.location.origin)
    let targetUrl: URL
    try {
      const candidate = new URL(callbackUrl, window.location.origin)
      targetUrl = candidate.origin === window.location.origin ? candidate : fallbackUrl
    } catch {
      targetUrl = fallbackUrl
    }
    targetUrl.searchParams.set("Authority", authority)
    targetUrl.searchParams.set("Status", status)

    if (simulateDelay) {
      setTimeout(() => {
        window.location.href = targetUrl.toString()
      }, 3000)
    } else {
      window.location.href = targetUrl.toString()
    }
  }

  return (
    <Card className="w-full max-w-lg border-[#2D332F] bg-[#161917] text-[#F5F1E8] shadow-2xl">
      <CardHeader className="text-center border-b border-[#2D332F] pb-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-[#C8A96B]/10 flex items-center justify-center text-[#C8A96B] mb-3">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <CardTitle className="text-xl font-bold font-heading">
          درگاه پرداخت آزمایشی (سندباکس توسعه)
        </CardTitle>
        <p className="text-sm text-[#A8A39A] mt-1">
          شبیه‌ساز پرداخت الکترونیک برای تست بدون کسر وجه واقعی
        </p>
      </CardHeader>

      <CardContent className="space-y-4 pt-6 text-sm">
        <div className="bg-[#1F2321] p-4 rounded-lg border border-[#2D332F] space-y-2">
          <div className="flex justify-between items-center text-[#A8A39A]">
            <span>شناسه ارجاع بانکی (Authority):</span>
            <span className="font-mono text-xs text-[#C8A96B] dir-ltr" dir="ltr">
              {authority}
            </span>
          </div>
          <div className="flex justify-between items-center text-[#A8A39A]">
            <span>پذیرنده:</span>
            <span className="text-[#F5F1E8] font-medium">آرایشگاه کوروش (Koroush Barber)</span>
          </div>
          <div className="flex justify-between items-center text-[#A8A39A]">
            <span>مبلغ بیعانه تستی:</span>
            <span className="text-lg font-bold text-[#C8A96B]">۵۰,۰۰۰ تومان</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex gap-2 items-start">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            این محیط آزمایشی است. با فشردن هریک از دکمه‌های زیر، عملکرد سیستم رزرو را در سناریوهای مختلف بررسی کنید.
          </span>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 pt-2">
        <Button
          onClick={() => handleAction("OK")}
          disabled={isProcessing}
          className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold py-6 gap-2 text-base transition-colors"
        >
          <CheckCircle2 className="w-5 h-5" />
          تایید و پرداخت موفق (سناریوی عادی)
        </Button>

        <Button
          onClick={() => handleAction("NOK")}
          disabled={isProcessing}
          variant="outline"
          className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 py-5 gap-2"
        >
          <XCircle className="w-5 h-5" />
          انصراف مشتری از پرداخت (لغو و آزادسازی هلد)
        </Button>

        <Button
          onClick={() => handleAction("OK", true)}
          disabled={isProcessing}
          variant="ghost"
          className="w-full text-[#A8A39A] hover:text-[#F5F1E8] text-xs py-2 gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          شبیه‌سازی بازگشت تاخیری با وقفه ۳ ثانیه‌ای (تست همزمانی و مغایرت)
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function MockPaymentPage({
  params,
}: {
  params: { authority: string }
}) {
  return (
    <div className="min-h-screen bg-[#0D0F0E] text-[#F5F1E8] flex items-center justify-center p-4" dir="rtl">
      <Suspense
        fallback={
          <div className="text-center text-[#A8A39A] text-sm">
            <RefreshCw className="w-8 h-8 animate-spin text-[#C8A96B] mx-auto mb-2" />
            در حال اتصال به درگاه تستی...
          </div>
        }
      >
        <MockPaymentContent authority={params.authority} />
      </Suspense>
    </div>
  )
}
