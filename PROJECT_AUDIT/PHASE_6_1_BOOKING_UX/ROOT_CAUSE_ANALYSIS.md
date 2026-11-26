# PHASE 6.1 — ROOT CAUSE ANALYSIS & PROPOSED ARCHITECTURAL FIXES

**Project:** Koroush Barber (barberbook)  
**Date:** November 25, 2026  
**Status:** Stage A — Root Cause Analysis (Diagnosis Complete, No Source Files Modified)  
**Target Branch:** `fix/phase-6-mobile-booking-ux`  
**Baseline Backup:** `backup/pre-phase-6`  

---

## 1. EXECUTIVE SUMMARY & EXPLANATION OF PREVIOUS GAPS

In Phase 6, a comprehensive diagnostic report (`PROJECT_AUDIT/PHASE_6_UI_FLOW/ROOT_CAUSE_ANALYSIS.md`) was produced in accordance with strict Stage A read-only instructions ("Do not modify source code until the initial findings and proposed changes have been documented"). Consequently, source files remained at their baseline state, leaving the following critical issues active in the live application:

1. **Step 1 Service Cards**: Service cards are excessively tall (~200px each) on both mobile and desktop. On mobile, 6 services stacked in `grid-cols-1` require over 1,600px of vertical scrolling before reaching the primary continue button ("ادامه به انتخاب روز").
2. **Step Navigation Jump**: Moving between steps triggered `bookingContainerRef.current.scrollIntoView({ block: "start" })`, which forcibly scrolled the viewport to the very top of `<section id="booking">` (above the title, subtitle, and stepper) rather than the active step container, disorienting the customer.
3. **Step 5 Date Display**: Step 5 rendered raw Gregorian ISO string `{selectedDateStr}` (`2026-11-25`) rather than formatted Persian weekday and month (`چهارشنبه ۴ آذر`).
4. **Payment Cancellation State Loss**: Bank cancellations at `/api/booking/callback` unconditionally redirected to `/booking?error=...`. This redirected to the legacy 4-step `BookingWizard` at Step 1, discarding all in-memory React state (service, date, time, customer details) and failing to restore Step 5.
5. **Redundant Pages & Dual Booking Engines**: The application maintains two fragmented booking flows (`BookingStudio` on `/` vs `BookingWizard` on `/booking`), along with unnecessary redirect shims (`book/page.tsx` and `confirmation/[id]/page.tsx`).

---

## 2. DETAILED ROOT CAUSE ANALYSIS BY ISSUE

### 2.1 Issue 1: Step 1 – Make Service Selection More Compact

#### 2.1.1 Files and Functions
- `components/home/BookingStudio.tsx` (Step 1 render block, lines 465–564)

#### 2.1.2 Current Implementation & Metrics
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
  {services.map((srv) => {
    const isSelected = selectedService.id === srv.id
    const balanceDue = Math.max(0, srv.price - srv.depositPrice)
    return (
      <div
        key={srv.id}
        onClick={() => setSelectedService(srv)}
        className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
          isSelected
            ? "bg-[#1C221F] border-[#C8A96B] shadow-[0_0_20px_rgba(200,169,107,0.18)] scale-[1.01]"
            : "bg-[#101311] border-[#222825] hover:border-[#38413C]"
        }`}
...
```
- **Mobile Viewport (375px)**:
  - Each service card has `p-4` internal padding, a 3-badge header, title, 2-line description, and a 3-row financial ledger (`قیمت کامل`, `بیعانه ۲۰٪`, `مانده در سالن`).
  - Total card height is ~195px–210px.
  - With 6 services in a single column (`grid-cols-1`), the services alone occupy **~1,250px**.
  - Combined with the section header (220px) and stepper (140px), the customer must scroll **over 1,600px** on mobile to reach the "ادامه به انتخاب روز" button!
- **Desktop Viewport (1440px)**:
  - Cards are arranged in only 2 columns (`md:grid-cols-2`) within a `max-w-5xl` container.
  - Cards stretch wide and tall, creating excessive vertical whitespace across 3 rows, pushing the action button below the fold on standard laptop screens.

#### 2.1.3 Proposed Architectural Fix
1. **Compact Mobile Card Layout**:
   - Streamline padding to `p-3 sm:p-3.5`.
   - Consolidate pricing into an inline horizontal strip (e.g. `قیمت: [مبلغ] | بیعانه: [مبلغ]`).
   - Limit description to a crisp single line with `line-clamp-1 text-[11px]`.
   - Reduce card height from ~205px down to **~115px** (a **44% reduction in vertical height**).
   - Total mobile scroll requirement drops from 1,250px to ~700px.
2. **Efficient Desktop Grid**:
   - Switch to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`.
   - Arranging 6 cards in a 3-column × 2-row grid fits cleanly above the fold on 1024px+ viewports without requiring vertical page scrolling.
3. **Continue Button Accessibility**:
   - Make the "ادامه به انتخاب روز" button prominent, full-width on mobile with clear visual weight, while keeping touch target >= 48px.

---

### 2.2 Issue 2: Step Navigation – Scroll to the Active Step

#### 2.2.1 Files and Functions
- `components/home/BookingStudio.tsx` (Lines 188–201, and Line 370)

#### 2.2.2 Current Implementation
```tsx
  // Smooth scroll repositioning ONLY on actual step transition (never on initial mount)
  useEffect(() => {
    if (prevStepRef.current !== currentStep) {
      prevStepRef.current = currentStep

      const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
      if (bookingContainerRef.current) {
        bookingContainerRef.current.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "start",
        })
      }
    }
  }, [currentStep])
```
And at line 370:
```tsx
<section id="booking" ref={bookingContainerRef} ...>
```

#### 2.2.3 Exact Root Cause
- `bookingContainerRef` is attached to the top-level `<section id="booking">`.
- When transitioning from Step 1 → Step 2, Step 2 → Step 3, etc., `scrollIntoView({ block: "start" })` jumps to the **top of the entire section**, above the section title, hero badge, and stepper.
- The customer is forced to see the section intro again and manually scroll down to locate the newly opened step.

#### 2.2.4 Proposed Architectural Fix
1. Create a dedicated ref `stepContentRef = useRef<HTMLDivElement>(null)` attached directly to the active step wrapper.
2. When `currentStep` changes, calculate the scroll target using `getBoundingClientRect().top + window.scrollY - HEADER_OFFSET` (accounting for the 72px sticky header plus 16px comfortable breathing room).
3. Execute smooth window scrolling with `window.scrollTo({ top: targetY, behavior: "smooth" })`.
4. Ensure backward navigation (e.g. Step 5 → Step 4) applies the same smooth positioning.

---

### 2.3 Issue 3: Step 5 – Correct Persian Date Display

#### 2.3.1 Files and Functions
- `components/home/BookingStudio.tsx` (Line 1017, and Line 1095)
- `components/booking/BookingWizard.tsx` (Line 783)
- `lib/jalali.ts` (Persian date engine)

#### 2.3.2 Current Implementation & Date Flow
1. **Date State Origin**: In `BookingStudio.tsx`, `selectedDateStr` is initialized via `getTehranDateString()` (e.g. `"2026-11-25"`).
2. **Step 2 Selection**: User selects a day from `upcomingDays` (which holds `dateStr: "2026-11-25"`).
3. **Step 5 Rendering**:
   ```tsx
   <div className="p-3 rounded-xl bg-[#161A18] border border-[#222724]">
     <span className="text-[#8C8477] block text-[11px]">روز نوبت:</span>
     <strong className="text-[#F7F4EE]">{selectedDateStr}</strong>
   </div>
   ```
   The raw ISO string `{selectedDateStr}` (`2026-11-25`) is rendered verbatim without calendar conversion.
4. **Step 6 Rendering**:
   `{confirmedBooking.dateStr}` is also rendered unformatted.

#### 2.3.3 Proposed Architectural Fix
1. In `lib/jalali.ts`, export a dedicated, zero-side-effect formatter:
```ts
export function formatJalaliDayString(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return ""
  const [gy, gm, gd] = dateStr.split("-").map(Number)
  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd)
  // Use UTC noon to calculate weekday immutably, avoiding timezone day-shifts
  const d = new Date(Date.UTC(gy, gm - 1, gd, 12, 0, 0))
  const dayName = PERSIAN_WEEKDAYS[d.getUTCDay()]
  const monthName = PERSIAN_MONTHS[jm - 1]
  return `${dayName} ${toPersianDigits(jd)} ${monthName}`
}
```
2. For `"2026-11-25"`, this calculates:
   - Gregorian `2026-11-25` → Jalali `1405-09-04` (`jd = 4`, `jm = 9` = "آذر")
   - UTC Day 3 → `PERSIAN_WEEKDAYS[3]` = "چهارشنبه"
   - Output: `چهارشنبه ۴ آذر` (exact user requirement).
3. Update `BookingStudio.tsx` Step 5 and Step 6 to use `formatJalaliDayString`.

---

### 2.4 Issue 4: Payment Cancellation – Must Return to Step 5

#### 2.4.1 Files and Functions
- `app/api/booking/callback/route.ts` (Bank redirect handler)
- `lib/booking-engine.ts` (`handlePaymentCallback`, lines 572–607)
- `components/home/BookingStudio.tsx` (Primary booking interface)
- `app/payment/mock/[authority]/page.tsx` (Dev sandbox gateway)

#### 2.4.2 Root Cause of Previous State Loss
1. **Full Page Navigation Away**: When the customer clicked "هدایت به درگاه پرداخت شاپرک", `window.location.href = payData.redirectUrl` navigated away from the application. React state memory was cleared.
2. **Callback Redirect Target Mismatch**:
   In `app/api/booking/callback/route.ts` (line 56):
   ```ts
   return NextResponse.redirect(
     new URL(`/booking?error=${encodeURIComponent(result.message)}`, request.url)
   )
   ```
   - Redirected to `/booking`, which loaded the legacy `BookingWizard` initialized at `currentStep = 1`.
   - The user never returned to `BookingStudio` on the homepage (`/` or `/#booking`).
3. **No State Carryover**: The callback URL contained only `?error=...` with no appointment identity or booking context.

#### 2.4.3 Safe Restoration Mechanism
1. **Database State Machine (Verified Intact)**:
   In `lib/booking-engine.ts`, when `gatewayStatus === "NOK"`:
   - `payment.status` becomes `FAILED` (`"انصراف مشتری در درگاه پرداخت"`).
   - `appointment.status` becomes `CANCELLED`.
   - `slotHold.status` becomes `RELEASED`.
   The previous reservation hold is completely released so no phantom locks linger.
2. **Server Callback Redirection**:
   When payment is cancelled, `handlePaymentCallback` has access to `payment.appointment` (`serviceId`, `date`, `customerName`, `customerPhone`, `customerEmail`, `customerBirthDate`).
   In `app/api/booking/callback/route.ts`, construct the redirect URL to the authoritative booking interface:
   ```ts
   const dateStr = getTehranDateString(appointment.date)
   const timeStr = getTehranTimeString(appointment.date)
   const params = new URLSearchParams({
     cancelled: "true",
     serviceId: appointment.serviceId,
     dateStr,
     timeStr,
     phone: appointment.customerPhone,
     name: appointment.customerName,
   })
   return NextResponse.redirect(new URL(`/#booking?${params.toString()}`, request.url))
   ```
3. **Client-Side Storage Backup (`sessionStorage`)**:
   Before navigating to the gateway, `BookingStudio` saves a draft record `koroush_booking_draft` containing selected service, date, time, customer details.
4. **State Rehydration in `BookingStudio`**:
   On mount, when `searchParams.get("cancelled") === "true"`:
   - Restore `selectedService` (from `serviceId`).
   - Restore `selectedDateStr` and `selectedTime`.
   - Restore `customerName` and `customerPhone`.
   - Set `currentStep` to **5** (`setCurrentStep(5)`).
   - Set `holdDetails = null` (ensuring the cancelled hold is NEVER reused).
   - Set `cancellationNotice`:
     `پرداخت لغو شد و نوبت قبلی آزاد گردید. در صورت تمایل میتوانید مجدداً اقدام کنید.`
5. **Safe Payment Retry**:
   - When the customer clicks "هدایت به درگاه پرداخت شاپرک" on Step 5 to retry, `handleInitiatePayment()` calls `/api/booking/hold` freshly.
   - If another customer reserved that slot in the interim, the server returns 409 and `BookingStudio` prompts: *"این بازه زمانی دیگر در دسترس نیست. لطفاً ساعت دیگری را انتخاب فرمایید."*
   - If still free, a new hold and payment are established atomically.

---

### 2.5 Issue 5: Redundant Payment UI Pages Audit

| Page / Route | Role | Caller | Gateway Dependency | Action & Justification |
|---|---|---|---|---|
| `app/page.tsx` (`#booking`) | Authoritative 6-step `BookingStudio` | Users, callbacks | None | **KEEP**: Central booking desk |
| `app/(booking)/booking/page.tsx` | Standalone page rendering legacy 4-step `BookingWizard` | Legacy links | None | **CONSOLIDATE**: Render `BookingStudio` or redirect to `/#booking` to eliminate dual-flow confusion |
| `app/(booking)/book/page.tsx` | 5-line file `redirect("/booking")` | Legacy links | None | **CONSOLIDATE**: Redirect directly to `/#booking` |
| `app/(booking)/booking/confirmation/[id]/page.tsx` | Intermediate redirect to `/booking/success?trackingCode=...` | Direct URLs | None | **CONSOLIDATE**: Retain minimal server redirect for link preservation; remove unnecessary UI layers |
| `app/(booking)/booking/success/page.tsx` | Digital receipt (`trackingCode=...`) | Payment callback | Post-verification | **KEEP**: Clean confirmed booking receipt. Remove unused `isFailedParam` dead-end branch |
| `app/payment/mock/[authority]/page.tsx` | Local dev sandbox simulator | `/api/booking/pay` in dev | Mock gateway provider | **KEEP**: Critical for local verification and automated tests |
| `app/api/booking/*` | Server APIs (`hold`, `pay`, `callback`, `status`, `cancel`) | Frontend & bank | Mandatory | **KEEP 100% INTACT**: Critical transaction integrity |

---

## 3. LIST OF INTENDED FILE CHANGES

1. **`lib/jalali.ts`**:
   - Add `formatJalaliDayString(dateStr: string): string` to format ISO dates to `چهارشنبه ۴ آذر`.
2. **`components/home/BookingStudio.tsx`**:
   - Compact Step 1 service cards (mobile & desktop grid optimization).
   - Add `stepContentRef` and smooth scroll to active step on step transition.
   - Step 5 date formatting with `formatJalaliDayString`.
   - Cancellation rehydration from URL params & `sessionStorage` returning directly to Step 5.
   - Persian cancellation notice display.
3. **`app/api/booking/callback/route.ts`**:
   - On cancelled payment (`Status=NOK`), redirect to `/#booking?cancelled=true&...` with booking context.
4. **`app/(booking)/book/page.tsx`**:
   - Redirect directly to `/#booking`.
5. **`app/(booking)/booking/page.tsx`**:
   - Unify with `BookingStudio` to ensure consistent 6-step experience.
6. **`components/shared/Header.tsx`**:
   - Fix mobile hamburger menu using React Portal to `document.body` and clickable backdrop overlay.

---

## 4. REGRESSION RISK MATRIX & TEST PLAN

| Area | Regression Risk | Mitigation & Test |
|---|---|---|
| **Compact Step 1** | Truncation of service titles or prices | Playwright tests at 320px, 375px, 390px, 430px, 1440px |
| **Step Scroll** | Jumping under fixed header | Verify offset accounts for 72px header |
| **Jalali Date** | Timezone shift (+3:30 Tehran) | Unit test against UTC noon conversion |
| **Payment Cancel** | Slot hold leakage or double payment | Concurrency test verifying hold release + fresh hold on retry |
| **TypeScript / Build** | Typing inconsistencies | `npx tsc --noEmit` and `npm run build` |
