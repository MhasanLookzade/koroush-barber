import { Suspense } from "react"
import { Metadata } from "next"
import { BookingWizard } from "@/components/booking/BookingWizard"
import { Header } from "@/components/booking/Header"
import { Footer } from "@/components/booking/Footer"
import { RefreshCw } from "lucide-react"

export const metadata: Metadata = {
  title: "رزرو نوبت آنلاین | آرایشگاه کوروش",
  description: "رزرو آنلاین و مستقیم نوبت در آرایشگاه کوروش - استایل حرفه‌ای، دقیقاً سر وقت شما.",
}

export default function BookingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0F0E] text-[#F5F1E8]" dir="rtl">
      <Header />
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Suspense
            fallback={
              <div className="min-h-[50vh] flex items-center justify-center text-[#A8A39A]">
                <div className="text-center space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#C8A96B] mx-auto" />
                  <p className="text-sm">در حال بارگذاری فرم رزرو نوبت...</p>
                </div>
              </div>
            }
          >
            <BookingWizard />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  )
}
