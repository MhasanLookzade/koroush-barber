"use client"

import { useState } from "react"
import { Header } from "@/components/booking/Header"
import { Footer } from "@/components/booking/Footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, Scissors, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ContactPage() {
  const [sent, setSent] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !phone || !message) return
    setSent(true)
    setName("")
    setPhone("")
    setMessage("")
    setTimeout(() => setSent(false), 6000)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0F0E] text-[#F5F1E8]" dir="rtl">
      <Header />

      <main className="flex-1 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-bold tracking-widest text-[#C8A96B] uppercase">ارتباط با سالن</span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-[#F5F1E8]">
              اطلاعات تماس و نشانی
            </h1>
            <p className="text-sm text-[#A8A39A]">
              جهت رزرو نوبت لطفاً از سامانه آنلاین استفاده فرمایید؛ برای هماهنگی‌های خاص با پذیرش در تماس باشید.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Contact Details Card */}
            <div className="bg-[#161917] border border-[#2D332F] rounded-3xl p-8 space-y-6">
              <h2 className="text-xl font-bold font-heading text-[#F5F1E8]">شعبه مرکزی زعفرانیه</h2>

              <div className="space-y-5 text-sm text-[#A8A39A]">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1F2321] text-[#C8A96B] flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="block text-[#F5F1E8] mb-1">نشانی:</strong>
                    <span>تهران، زعفرانیه، خیابان مقدس اردبیلی، مجتمع تجاری پیروز، طبقه ۲، واحد ۲۰۴</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1F2321] text-[#C8A96B] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="block text-[#F5F1E8] mb-1">ساعات کاری و پذیرش:</strong>
                    <span>همه روزه از ساعت ۱۰:۰۰ الی ۲۳:۰۰ (۱۳ بازه ۶۰ دقیقه‌ای)</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1F2321] text-[#C8A96B] flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="block text-[#F5F1E8] mb-1">شماره تماس ثابت:</strong>
                    <span className="font-mono text-[#F5F1E8] dir-ltr inline-block" dir="ltr">۰۲۱-۲۲۴۴۶۶۸۸</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1F2321] text-[#C8A96B] flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="block text-[#F5F1E8] mb-1">پشتیبانی و واتس‌اپ:</strong>
                    <span className="font-mono text-[#F5F1E8] dir-ltr inline-block" dir="ltr">۰۹۱۲۳۴۵۶۷۸۹</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#2D332F]">
                <Link href="/booking">
                  <Button className="w-full bg-[#C8A96B] hover:bg-[#D9BD82] text-[#0D0F0E] font-bold py-6 rounded-xl gap-2">
                    <Scissors className="w-4 h-4" />
                    رزرو نوبت آنلاین
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick Contact Form */}
            <div className="bg-[#161917] border border-[#2D332F] rounded-3xl p-8 space-y-6">
              <h2 className="text-xl font-bold font-heading text-[#F5F1E8]">ارسال پیام به مدیریت</h2>

              {sent ? (
                <div className="p-6 rounded-2xl bg-green-950/40 border border-green-500/30 text-green-300 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-green-400" />
                  <h3 className="font-bold text-base">پیام شما با موفقیت ثبت شد</h3>
                  <p className="text-xs">مدیریت آرایشگاه در اسرع وقت با شما تماس خواهد گرفت.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-xs text-[#A8A39A] block">نام و نام خانوادگی:</label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="کیان راد"
                      className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-4 py-3 text-[#F5F1E8] text-sm focus:outline-none focus:border-[#C8A96B]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="phone" className="text-xs text-[#A8A39A] block">شماره موبایل:</label>
                    <input
                      id="phone"
                      type="tel"
                      dir="ltr"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09123456789"
                      className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-4 py-3 text-[#F5F1E8] font-mono text-sm focus:outline-none focus:border-[#C8A96B]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="message" className="text-xs text-[#A8A39A] block">متن پیام:</label>
                    <textarea
                      id="message"
                      rows={4}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="پیام یا درخواست خود را بنویسید..."
                      className="w-full bg-[#1F2321] border border-[#2D332F] rounded-xl px-4 py-3 text-[#F5F1E8] text-sm focus:outline-none focus:border-[#C8A96B] resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#1F2321] hover:bg-[#C8A96B] text-[#F5F1E8] hover:text-[#0D0F0E] font-bold py-6 rounded-xl border border-[#2D332F] hover:border-[#C8A96B] gap-2 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    ارسال پیام
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
