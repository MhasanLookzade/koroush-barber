# PHASE 6.1 — IMPLEMENTATION REPORT

**Project:** Koroush Barber (barberbook)  
**Date:** November 26, 2026  
**Status:** Implementation Complete & Fully Verified  
**Branch:** `fix/phase-6-mobile-booking-ux`  
**Baseline Backup:** `backup/pre-phase-6` (Commit `407a9a2`)  

---

## 1. Executive Summary

Phase 6.1 addresses the user experience and reliability requirements across the mobile and desktop booking flows, specifically targeting:
1. **Ultra-Compact Step 1 Service Selection**: Drastically reducing card height (<130px on mobile) and utilizing a 3-column desktop layout so users can view and advance with minimal scrolling.
2. **Step Transition Scroll Alignment**: Dynamically computing target scroll positions to land smoothly at the active step container, factoring in the sticky header height (84px offset) across all step transitions.
3. **Persian Jalali Date Formatting in Step 5 & 6**: Rendering full Persian weekday and month strings (e.g. `چهارشنبه ۴ آذر`) rather than raw Gregorian ISO timestamps.
4. **Resilient Payment Cancellation Return**: Seamlessly restoring users to Step 5 with their service, date, time, and customer details preserved, showing a clear Persian notification message, and resetting the expired hold to prevent illegal hold reuse.
5. **Mobile Navigation Drawer Height & Clipping Fix**: Portaling the mobile menu to `document.body` to break free from the sticky header's `backdrop-blur-xl` containing block trap, ensuring full viewport height expansion and reliable dismiss handling.
6. **Authentication & Profile Enhancements**: Bright gold OTP button styling, 60s resend cooldown, and customer identity banner display on the appointment tracking status page.

---

## 2. Detailed Technical Implementations

### 2.1 Step 1 – Compact Service Cards & Desktop Grid Layout

**File:** `components/home/BookingStudio.tsx`

- **Mobile Viewport Optimization**:
  - Re-architected card layout from stacked 3-row financial tables into a single horizontal summary strip (`کل: [قیمت] | بیعانه: [بیعانه]`).
  - Restricted service descriptions to a crisp single line using `line-clamp-1 text-[11px] text-[#A89E90]`.
  - Streamlined padding from `p-4 sm:p-5` to `p-2.5 sm:p-3` and reduced badge margins.
  - Reduced total card height from **205px** down to **119px** (a **42% reduction**).
  - On a 375px viewport, the entire list of 6 services now fits in ~720px, placing the primary action button ("ادامه به انتخاب روز") easily within natural reach.
- **Desktop Viewport Optimization**:
  - Changed grid configuration from `grid-cols-1 md:grid-cols-2` to:
    ```tsx
    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3"
    ```
  - Arranged 6 cards into a 3×2 grid, eliminating dead vertical space on 1024px, 1280px, and 1440px displays.

---

### 2.2 Step Transitions – Active Step Scroll Alignment

**File:** `components/home/BookingStudio.tsx`

- **Problem Solved**:
  - Previously, `bookingContainerRef.current.scrollIntoView({ block: "start" })` scrolled to the top of `<section id="booking">`, forcing the user to re-read the hero banner and 6-step progress bar on every click.
  - Calling scroll immediately on `currentStep` change conflicted with Framer Motion's `AnimatePresence mode="wait"` (250ms exit duration).
- **Architectural Solution**:
  - Introduced `stepContainerRef` attached directly to the dynamic step card wrapper.
  - Implemented an offset calculation that determines the container's absolute vertical position in the document and scrolls with an 84px buffer for the sticky header:
    ```tsx
    useEffect(() => {
      if (prevStepRef.current !== currentStep) {
        prevStepRef.current = currentStep

        // 300ms delay ensures previous step exit animation (250ms) finishes and new step mounts
        const timer = setTimeout(() => {
          const targetEl = stepContainerRef.current || bookingContainerRef.current
          if (targetEl) {
            let absTop = 0
            let curr: HTMLElement | null = targetEl
            while (curr) {
              absTop += curr.offsetTop
              curr = curr.offsetParent as HTMLElement | null
            }
            const targetY = Math.max(0, absTop - 84)
            window.scrollTo({
              top: targetY,
              behavior: "smooth",
            })
          }
        }, 300)

        return () => clearTimeout(timer)
      }
    }, [currentStep])
    ```
  - Result: Step 2, Step 3, Step 4, and Step 5 headings align at exactly `y = 100.68px` in the viewport, comfortably below the 72px–84px sticky header.

---

### 2.3 Persian Jalali Date Engine in Step 5 & 6

**Files:** `lib/jalali.ts`, `components/home/BookingStudio.tsx`

- Added `formatJalaliDayString(dateStr: string): string` in `lib/jalali.ts`:
  ```ts
  export function formatJalaliDayString(dateStr: string): string {
    const parts = dateStr.split("-").map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) return dateStr
    const [gy, gm, gd] = parts
    const { jy, jm, jd } = gregorianToJalali(gy, gm, gd)
    const monthNames = [
      "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
      "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
    ]
    const weekdayNames = [
      "یک‌شنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"
    ]
    const dateObj = new Date(Date.UTC(gy, gm - 1, gd, 12, 0, 0))
    const dayOfWeek = weekdayNames[dateObj.getUTCDay()]
    const monthName = monthNames[jm - 1] || ""
    return `${dayOfWeek} ${toPersianDigits(jd)} ${monthName}`
  }
  ```
- In `components/home/BookingStudio.tsx`:
  - Step 5 invoice date row updated to:
    ```tsx
    <strong>{formatJalaliDayString(selectedDateStr)}</strong>
    ```
  - Step 6 booking confirmation receipt date updated to:
    ```tsx
    <span>{formatJalaliDayString(confirmedBooking.dateStr)}</span>
    ```
  - Verification: `2026-11-25` renders as `چهارشنبه ۴ آذر`.

---

### 2.4 Payment Cancellation Return Flow & State Preservation

**Files:** `app/api/booking/callback/route.ts`, `lib/booking-engine.ts`, `components/home/BookingStudio.tsx`

- **Backend Gateway Callback (`app/api/booking/callback/route.ts`)**:
  - When payment fails or customer cancels (`gatewayStatus === "NOK"`):
    - Sets standard RFC 3986 parameters: `cancelled=true`, `serviceId`, `dateStr`, `timeStr`, `phone`, `name`.
    - Redirects to `/?${redirectParams.toString()}#booking`.
- **Booking Engine Cancellation Message (`lib/booking-engine.ts`)**:
  - Updated cancellation message to the exact Persian phrasing:
    `"پرداخت لغو شد و نوبت قبلی آزاد گردید. در صورت تمایل میتوانید مجدداً اقدام کنید."`
- **Frontend State Rehydration (`components/home/BookingStudio.tsx`)**:
  - Inspects both standard `useSearchParams` and URL hash query parameters.
  - Restores `selectedService`, `selectedDateStr`, `selectedTime`, `customerName`, and `customerPhone`.
  - Sets `currentStep(5)`.
  - Displays the prominent warning alert banner with the cancellation message.
  - Crucially sets `setHoldDetails(null)` to ensure the released reservation hold cannot be illegally reused. When the customer clicks "پرداخت بیعانه و ثبت نوبت", a fresh reservation lock is requested from `/api/booking/hold`.

---

### 2.5 Header Mobile Navigation Drawer Fix

**File:** `components/shared/Header.tsx`

- **Containing Block Fix**:
  - Under W3C CSS specifications, `backdrop-filter: blur(...)` creates a containing block for fixed-position descendants.
  - Portaled the mobile drawer and its backdrop directly into `document.body` via `createPortal(..., document.body)`.
  - Drawer now expands to the full viewport height below the 64px/72px header (measured at `603px` on 375×667 screen).
- **Accessibility & Dismiss Handling**:
  - Added full backdrop overlay (`fixed inset-0 bg-black/60 z-40`).
  - Added `aria-controls="mobile-navigation-drawer"` and `aria-expanded` to toggle button.
  - Clicking links, the toggle button, or tapping the overlay cleanly dismisses the drawer.

---

### 2.6 Authentication & Profile Display Improvements

**Files:** `app/(booking)/booking/status/page.tsx`, `app/api/booking/otp/send/route.ts`

- In `app/(booking)/booking/status/page.tsx`:
  - Styled the OTP button with bright gold action gradient: `bg-gradient-to-r from-[#E4C88E] via-[#C8A96B] to-[#B58B59] text-[#0D0F0E] font-bold`.
  - Updated timer label: `ارسال مجدد کد تا [ثانیه] ثانیه دیگر`.
  - Added authenticated customer profile header in lookup results showing full customer name and phone without truncation.
- In `app/api/booking/otp/send/route.ts`:
  - Adjusted cooldown interval to 60 seconds (`Date.now() - 60 * 1000`).
  - Adjusted IP rate limit to 10 requests per 10 minutes to allow legitimate 60s retries.

---

### 2.7 Consolidation of Redundant Booking Pages

**Files:** `app/(booking)/book/page.tsx`, `app/(booking)/booking/page.tsx`

- Unified all booking requests to the primary `BookingStudio` engine on `/#booking`.
- `/book` and `/booking` issue immediate permanent client/server redirects to `/#booking`.
