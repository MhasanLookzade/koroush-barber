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
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
        role="region"
        aria-label="مقایسه قبل و بعد از پیرایش"
      >
        {/* Layer 1: BEFORE (Background) */}
        <div className="absolute inset-0 w-full h-full">
          <img
            src="/images/haircut-before.svg"
            alt="قبل از پیرایش در آرایشگاه کوروش"
            className="w-full h-full object-cover pointer-events-none"
            loading="lazy"
          />
          {/* Label Before */}
          <div className="absolute top-6 right-6 z-10 px-4 py-2 rounded-full bg-background/80 backdrop-blur-md border border-border text-xs sm:text-sm font-semibold text-muted-foreground shadow-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>قبل از پیرایش</span>
          </div>
        </div>

        {/* Layer 2: AFTER (Clipped Overlay) */}
        <div
          className="absolute inset-0 w-full h-full overflow-hidden"
          style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
        >
          <img
            src="/images/haircut-after.svg"
            alt="استایل نهایی و فید تخصصی در آرایشگاه کوروش"
            className="w-full h-full object-cover pointer-events-none"
            loading="lazy"
          />
          {/* Label After */}
          <div className="absolute top-6 left-6 z-10 px-4 py-2 rounded-full bg-primary/20 backdrop-blur-md border border-primary/40 text-xs sm:text-sm font-bold text-primary shadow-lg flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>استایل نهایی کوروش</span>
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
      <div className="mt-4 flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground text-center">
        <MoveHorizontal className="w-4 h-4 text-primary animate-pulse" />
        <span>دسته وسط را به چپ یا راست بکشید تا تغییر فرم و خط ریش را لمس کنید</span>
      </div>
    </div>
  )
}
