import { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatToman } from "@/lib/jalali"
import { Clock, ArrowLeft, ShieldCheck } from "lucide-react"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "خدمات و تعرفه‌ها | آرایشگاه کوروش",
  description: "لیست خدمات، قیمت‌ها و مبالغ بیعانه در آرایشگاه کوروش. تمامی نوبت‌ها ۶۰ دقیقه اختصاصی هستند.",
}

interface ServiceItem {
  id: string
  name: string
  category: string
  duration: number
  price: number
  depositPrice: number
  description: string
}

export default async function ServicesPage() {
  let services: ServiceItem[] = []
  try {
    const dbServices = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    })
    services = dbServices.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      duration: s.duration,
      price: s.price,
      depositPrice: s.depositPrice,
      description: s.description || "",
    }))
  } catch {
    services = [
      {
        id: "srv-full-cut",
        name: "اصلاح کامل مو و صورت",
        category: "اصلاح و استایل",
        duration: 60,
        price: 1000000,
        depositPrice: 200000,
        description: "خدمت جامع پیرایش سر و ریش با طراحی اختصاصی فرم، خط‌زنی دقیق با تیغ سنتی، حوله گرم و سشوار حرفه‌ای",
      },
      {
        id: "srv-hair-cut",
        name: "اصلاح مو",
        category: "اصلاح و استایل",
        duration: 60,
        price: 750000,
        depositPrice: 150000,
        description: "کوتاهی کلاسیک و مدرن متناسب با فرم جمجمه و صورت، شست‌وشو با شامپوی ارگانیک و استایل نهایی",
      },
      {
        id: "srv-fade-special",
        name: "اصلاح تخصصی فید و مدل مو",
        category: "اصلاح و استایل",
        duration: 60,
        price: 850000,
        depositPrice: 170000,
        description: "اجرای دقیق انواع فید (Skin Fade, Taper, Drop Fade) با تلفیق تکنیک‌های قیچی و ماشین، تکسچرینگ مدرن",
      },
      {
        id: "srv-beard-trim",
        name: "اصلاح و مرتب‌سازی ریش و صورت",
        category: "ریش و سبیل",
        duration: 60,
        price: 350000,
        depositPrice: 70000,
        description: "فرم‌دهی متقارن ریش و سبیل، آنکارد با تیغ ژاپنی، بخور گرم و استفاده از روغن تقویتی طبیعی",
      },
      {
        id: "srv-vip-package",
        name: "پکیج ویژه اصلاح VIP",
        category: "پکیج‌های اختصاصی",
        duration: 60,
        price: 1300000,
        depositPrice: 260000,
        description: "پکیج شاهانه شامل اصلاح کامل سر و ریش، فیشیال عمیق پوست، ماسک طلا، ماساژ اسکالپ سر و پذیرایی ویژه سالن",
      },
      {
        id: "srv-facial-care",
        name: "پاکسازی و مراقبت پوست صورت",
        category: "مراقبت پوست",
        duration: 60,
        price: 450000,
        depositPrice: 90000,
        description: "بخور گرم، پاکسازی منافذ، اسکراب لایه‌بردار سلول‌های مرده، ماسک زغال فعال و آبرسانی عمیق با سرم طلا",
      },
    ]
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0F0E] text-[#F5F1E8]" dir="rtl">
      <main className="flex-1 pt-24 sm:pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-bold tracking-widest text-[#C8A96B] uppercase">تعرفه شفاف و خدمات</span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-[#F5F1E8]">
              منوی خدمات کوروش باربر
            </h1>
            <p className="text-sm text-[#A8A39A] leading-relaxed">
              در آرایشگاه کوروش، زمان شما سرمایه ماست. هر خدمت دقیقاً ۶۰ دقیقه زمان اختصاصی و بدون تداخل دارد.
            </p>
          </div>

          {/* Guarantee Banner */}
          <div className="bg-[#161917] border border-[#2D332F] p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#C8A96B]/10 text-[#C8A96B] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs sm:text-sm">
                <span className="font-bold text-[#F5F1E8] block">تضمین نظم و شفافیت مالی</span>
                <span className="text-[#A8A39A]">قیمت‌ها قطعی بوده و بیعانه پرداختی (۲۰٪) از صورت‌حساب نهایی در سالن کسر می‌گردد.</span>
              </div>
            </div>
            <Link href="/#booking">
              <Button className="bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold px-6 py-5 rounded-xl shrink-0 text-sm cursor-pointer">
                رزرو نوبت آنلاین
              </Button>
            </Link>
          </div>

          {/* Service Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((srv) => {
              const balanceDue = Math.max(0, srv.price - srv.depositPrice)
              return (
                <Card
                  key={srv.id}
                  className="bg-[#161917] border-[#2D332F] text-[#F5F1E8] rounded-2xl overflow-hidden hover:border-[#C8A96B]/50 transition-all flex flex-col justify-between"
                >
                  <div className="p-6 sm:p-8 space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-xs px-3 py-1 rounded-full bg-[#1F2321] text-[#C8A96B] border border-[#2D332F]">
                        {srv.category}
                      </span>
                      <span className="text-xs text-[#A89E90] flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-[#C8A96B]" />
                        <span>۶۰ دقیقه</span>
                      </span>
                    </div>

                    <h3 className="text-xl font-bold font-heading text-[#F5F1E8]">{srv.name}</h3>
                    <p className="text-xs sm:text-sm text-[#A8A39A] leading-relaxed">{srv.description}</p>
                  </div>

                  <div className="p-6 sm:p-8 pt-0">
                    <div className="pt-4 border-t border-[#2D332F] space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#C5BDB2]">
                        <span>قیمت کامل:</span>
                        <strong className="text-sm font-bold text-[#F7F4EE]">{formatToman(srv.price)}</strong>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#A89E90]">
                        <span>بیعانه (۲۰٪):</span>
                        <strong className="text-xs font-bold text-[#E4C88E]">{formatToman(srv.depositPrice)}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#787063]">
                        <span>مانده پرداخت در سالن:</span>
                        <span className="text-xs text-[#A89E90]">{formatToman(balanceDue)}</span>
                      </div>

                      <div className="pt-3 flex justify-end">
                        <Link href={`/#booking?service=${srv.id}`} className="w-full">
                          <Button className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold py-5 rounded-xl gap-2 text-xs cursor-pointer">
                            رزرو این خدمت
                            <ArrowLeft className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
