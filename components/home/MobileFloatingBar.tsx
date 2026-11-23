"use client"

import { useState, useEffect } from "react"
import { Scissors, Clock } from "lucide-react"

export function MobileFloatingBar() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Hide when inside the booking section to avoid duplicate buttons
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting)
      },
      { threshold: 0.2 }
    )

    const bookingEl = document.querySelector("#booking")
    if (bookingEl) observer.observe(bookingEl)

    return () => {
      if (bookingEl) observer.unobserve(bookingEl)
    }
  }, [])

  const handleScrollToBooking = () => {
    const el = document.querySelector("#booking")
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  if (!visible) return null

  return (
    <aside
      aria-label="دسترسی سریع به رزرو نوبت"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-[#0F1210]/95 backdrop-blur-xl border-t border-[#262D29] shadow-[0_-10px_30px_rgba(0,0,0,0.7)] animate-slideUp"
    >
      <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
        <div className="flex flex-col text-right pr-1">
          <span className="text-[11px] text-[#A89E90] flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#C8A96B]" />
            <span>نوبت‌های ۶۰ دقیقه‌ای</span>
          </span>
          <span className="text-xs font-bold text-[#F7F4EE]">۱۰:۰۰ الی ۲۳:۰۰ هر روز</span>
        </div>

        <button
          type="button"
          onClick={handleScrollToBooking}
          className="flex-1 py-3 px-5 rounded-2xl text-base font-bold text-[#0D0F0E] bg-gradient-to-r from-[#E4C88E] via-[#C8A96B] to-[#B58B59] hover:brightness-110 shadow-[0_2px_15px_rgba(200,169,107,0.4)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform"
        >
          <span>رزرو نوبت</span>
          <Scissors className="w-4 h-4 text-[#0D0F0E]" />
        </button>
      </div>
    </aside>
  )
}
