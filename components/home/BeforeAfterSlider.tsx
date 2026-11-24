"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Scissors, Sparkles, MoveHorizontal } from "lucide-react"

export function BeforeAfterSlider() {
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPosition(percentage)
  }, [])

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return
      handleMove(e.touches[0].clientX)
    },
    [isDragging, handleMove]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return
      handleMove(e.clientX)
    },
    [isDragging, handleMove]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
      window.addEventListener("touchmove", handleTouchMove)
      window.addEventListener("touchend", handleMouseUp)
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove])

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Slider Container */}
      <div
        ref={containerRef}
        className="relative aspect-[4/3] sm:aspect-[16/10] w-full overflow-hidden rounded-3xl border border-border/80 shadow-2xl select-none cursor-ew-resize bg-card"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "100%",
          aspectRatio: "16 / 10",
          overflow: "hidden",
        }}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
        role="region"
        aria-label="مقایسه قبل و بعد از پیرایش"
      >
        {/* Layer 1: BEFORE (Background) */}
        <div
          className="absolute inset-0 w-full h-full overflow-hidden"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "hidden" }}
        >
          <img
            src="/images/haircut-before.jpg"
            alt="قبل از پیرایش (تصویر نمونه استایل)"
            className="w-full h-full object-cover block pointer-events-none max-w-full"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", maxWidth: "100%" }}
            loading="lazy"
          />
          {/* Label Before */}
          <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#0D0F0E]/85 backdrop-blur-md border border-[#2D332F] text-[11px] sm:text-xs font-semibold text-[#A89E90] shadow-lg flex items-center gap-1.5 sm:gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>قبل از اصلاح</span>
          </div>
        </div>

        {/* Layer 2: AFTER (Clipped Overlay) */}
        <div
          className="absolute inset-0 w-full h-full overflow-hidden"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "hidden",
            clipPath: `inset(0 0 0 ${sliderPosition}%)`,
          }}
        >
          <img
            src="/images/haircut-after.jpg"
            alt="بعد از استایل و فید حرفه‌ای (تصویر نمونه استایل)"
            className="w-full h-full object-cover block pointer-events-none max-w-full"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", maxWidth: "100%" }}
            loading="lazy"
          />
          {/* Label After */}
          <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#1A1F1C]/90 backdrop-blur-md border border-[#C8A96B]/50 text-[11px] sm:text-xs font-bold text-[#E4C88E] shadow-lg flex items-center gap-1.5 sm:gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#C8A96B]" />
            <span>استایل نهایی و فید</span>
          </div>
        </div>

        {/* Divider Line & Interactive Handle */}
        <div
          className="absolute top-0 bottom-0 z-20 w-1 bg-gradient-to-b from-primary/30 via-primary to-primary/30"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Center Handle Button */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--color-gold-700))] text-primary-foreground shadow-2xl border-2 border-primary-foreground/30 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing"
            aria-hidden="true"
          >
            <MoveHorizontal className="w-5 h-5 text-slate-950" />
          </div>
        </div>

        {/* Accessible hidden range input for screen readers & keyboard nav */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPosition}
          onChange={(e) => setSliderPosition(Number(e.target.value))}
          aria-label="درصد نمایش تصویر بعد از پیرایش نسبت به قبل"
          className="sr-only"
        />
      </div>

      {/* Instructional Caption */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-[#8C8477] text-center">
        <div className="flex items-center gap-1.5 text-[#C8A96B]">
          <MoveHorizontal className="w-4 h-4 animate-pulse" />
          <span>دسته وسط را به چپ یا راست بکشید تا تغییر فرم و خط ریش را مقایسه کنید</span>
        </div>
        <span className="hidden sm:inline text-[#3A423D]">•</span>
        <span className="text-[11px] text-[#716A5E]">(تصویر فوق صرفاً نمونه شبیه‌سازی استایل بوده و از مشتریان واقعی عکاسی نشده است)</span>
      </div>
    </div>
  )
}
