# PHASE 6 — ROOT CAUSE ANALYSIS & PROPOSED ARCHITECTURAL FIXES

**Project:** Koroush Barber (barberbook)  
**Date:** November 25, 2026  
**Status:** Stage A — Root Cause Analysis (Read-Only / No Source Code Modified)  
**Target Branch:** `fix/phase-6-mobile-booking-ux`  
**Baseline Backup:** `backup/pre-phase-6`  

---

## EXECUTIVE SUMMARY

Phase 6 addresses seven critical areas across mobile navigation, booking flow, payment cancellation experience, OTP usability, and appointment lookup display.

A rigorous, code-level and browser-level investigation was conducted using automated Playwright tests, DOM inspection, and complete backend route tracing. All root causes have been pinpointed without ambiguity.

| # | Issue Area | Exact Root Cause Category | Severity |
|---|------------|---------------------------|----------|
| **1** | Mobile Hamburger Menu | CSS `backdrop-filter` containing block collapse + Missing backdrop/outside click | Critical Usability |
| **2** | Booking Step 5 Jalali Date | Unformatted raw Gregorian ISO date string (`selectedDateStr`) output | UI / Localization |
| **3** | Payment Cancellation Return | Callback redirects to `/booking?error=...` (legacy wizard Step 1) instead of restoring `BookingStudio` Step 5 | UX / State Machine |
| **4** | Redundant Payment Pages | Redundant intermediate redirect shims (`book/page.tsx`, `confirmation/[id]/page.tsx`) and fragmented booking components | Architectural Hygiene |
| **5** | OTP Login Button Styling | Ultra-dark low-contrast classes (`bg-[#1C221F]`) obscuring primary CTA | Visual Contrast / A11y |
| **6** | OTP Cooldown & Rate Limits | Backend resend cooldown was 2 min (120s), IP limit was 5 reqs / 10 min, countdown text non-standard | Functional / Rate Limit |
| **7** | Appointment Results Customer Name | Missing authenticated customer banner + `truncate` CSS cutting off full names in cards | UI / Privacy & Display |

---

## 1. MOBILE HAMBURGER MENU – BROKEN NAVIGATION

### 1.1 Files and Functions
- `components/shared/Header.tsx` (Shared Navigation Header)
- `components/home/Header.tsx` (Re-exports `components/shared/Header.tsx`)
- `components/booking/Header.tsx` (Re-exports `components/shared/Header.tsx`)
- `app/(booking)/layout.tsx` (Renders `<Header />`)
- `components/home/HomePageClient.tsx` (Renders `<Header />`)

### 1.2 Current Implementation
In `components/shared/Header.tsx`:
```tsx
export function Header({ id }: { id?: string }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  ...
  return (
    <header
      id={id || "site-header"}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || !isHome
          ? "bg-[#0D0F0E]/95 backdrop-blur-xl border-b border-[#242A27] shadow-2xl py-3 sm:py-3.5"
          : "bg-transparent py-4 sm:py-5"
      }`}
      role="banner"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4 ...">
        {/* Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden ... "
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-x-0 top-[64px] sm:top-[72px] bottom-0 bg-[#0D0F0E]/98 backdrop-blur-2xl border-t border-[#242A27] p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in fade-in duration-200"
          dir="rtl"
        >
          ...
        </div>
      )}
    </header>
  )
}
```

### 1.3 Exact Root Cause
1. **CSS Containing Block & Stacking Context Trapping (Primary Root Cause)**:
   - When `isScrolled` is true or when on any page other than the homepage (`!isHome`), `<header>` applies the Tailwind class `backdrop-blur-xl` (`backdrop-filter: blur(24px)`).
   - Under the W3C CSS Transforms and CSS Filter Effects Level 1 specifications:
     > *"Any value other than none for the filter or backdrop-filter property causes the element to become the containing block for all descendants, including those with position: fixed."*
   - Because the drawer `<div className="fixed inset-x-0 top-[64px] bottom-0 ...">` is a DOM descendant inside `<header>`, its fixed positioning is trapped inside the bounding box of `<header>` (which is only ~72px tall) rather than the viewport (667px - 900px)!
   - **Playwright Verification**:
     - At top of homepage (`isScrolled=false`): drawer bounding box height is `603px`.
     - Scrolled by 100px or on `/booking` (`backdrop-blur-xl` active): drawer bounding box height **collapses to 49px**!
     - The entire drawer content is squashed and clipped off-screen inside a 49px sliver, making all links invisible and unclickable.
2. **Missing Outside Click Handler / Backdrop**:
   - There is no backdrop element or click-outside listener (`mousedown` / `touchstart` ref). Clicking outside the drawer on page content does not close the menu.
3. **Missing Semantic Attributes**:
   - The hamburger button has `aria-expanded` but lacks `aria-controls="mobile-navigation-drawer"`.
   - The drawer lacks `id="mobile-navigation-drawer"` and focus management.

### 1.4 Proposed Safe Fix
1. **Decouple the Drawer from the Header's Containing Block**:
   - Use React `createPortal` (rendering to `document.body`) or position the drawer outside the container that applies `backdrop-filter`.
2. **Add a Full-Screen Clickable Backdrop**:
   - Add a fixed backdrop (`fixed inset-0 bg-black/60 backdrop-blur-sm z-50`) with `onClick={() => setMobileMenuOpen(false)}`.
3. **Add Accessible Attributes & Keyboard Control**:
   - Connect `aria-controls="mobile-navigation-drawer"` and `id="mobile-navigation-drawer"`.
   - Ensure the existing Escape key handler and body scroll lock continue to function smoothly without causing horizontal shift.

---

## 2. BOOKING STEP 5 — PERSIAN JALALI APPOINTMENT DATE

### 2.1 Files and Functions
- `components/home/BookingStudio.tsx` (Step 5: Lines 1013–1023)
- `components/booking/BookingWizard.tsx` (Step 4: Line 783)
- `lib/jalali.ts` (Persian date engine)

### 2.2 Current Implementation
In `components/home/BookingStudio.tsx` (lines 1014–1018):
```tsx
{/* Date & Time */}
<div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
  <div className="p-3 rounded-xl bg-[#161A18] border border-[#222724]">
    <span className="text-[#8C8477] block text-[11px]">روز نوبت:</span>
    <strong className="text-[#F7F4EE]">{selectedDateStr}</strong>
  </div>
```
`selectedDateStr` is stored as an ISO date string (e.g., `"2026-11-25"`). It is rendered directly without formatting.

In `BookingWizard.tsx` (line 783):
```tsx
ساعت {toPersianDigits(selectedTime || "")} - تاریخ {toPersianDigits(selectedDateStr)}
```
Only converts Latin digits to Persian digits (e.g., `۲۰۲۶-۱۱-۲۵`), without weekday or month names.

### 2.3 Exact Root Cause
Neither component called a Jalali formatting function for the day display in Step 5.

### 2.4 Proposed Safe Fix
1. In `lib/jalali.ts`, export a robust formatter:
```ts
export function formatJalaliDayString(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return ""
  const [gy, gm, gd] = dateStr.split("-").map(Number)
  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd)
  // Use UTC noon to compute day-of-week immutably regardless of client timezone
  const d = new Date(Date.UTC(gy, gm - 1, gd, 12, 0, 0))
  const dayName = PERSIAN_WEEKDAYS[d.getUTCDay()]
  const monthName = PERSIAN_MONTHS[jm - 1]
  return `${dayName} ${toPersianDigits(jd)} ${monthName}`
}
```
2. For `"2026-11-25"`, this outputs: `چهارشنبه ۴ آذر`.
3. In `BookingStudio.tsx` Step 5, render:
```tsx
<strong className="text-[#F7F4EE]">{formatJalaliDayString(selectedDateStr)}</strong>
```
4. Preserve underlying `selectedDateStr` unchanged for server communication and scheduling.

---

## 3. PAYMENT CANCELLATION RETURN BEHAVIOR

### 3.1 Files and Functions
- `app/api/booking/callback/route.ts` (Payment gateway callback handler)
- `lib/booking-engine.ts` (`handlePaymentCallback` function, lines 572–607)
- `components/home/BookingStudio.tsx` (6-step booking studio)
- `app/api/booking/pay/route.ts` (Payment initiation)

### 3.2 Current Implementation & Workflow
1. User starts booking on homepage at `BookingStudio`.
2. Completes Step 1 (Service), Step 2 (Date), Step 3 (Time), Step 4 (Customer details).
3. At Step 5 (`مرحله ۵: تایید مشخصات و پرداخت بیعانه`), user confirms details and clicks "هدایت به درگاه پرداخت شاپرک".
4. `BookingStudio` posts to `/api/booking/hold` (creates 10-minute hold), then `/api/booking/pay` (creates PENDING payment), and redirects to the payment gateway.
5. In the gateway, the customer cancels or closes the gateway (`Status=NOK`).
6. Gateway redirects to `/api/booking/callback?Authority=...&Status=NOK`.
7. `handlePaymentCallback` in `lib/booking-engine.ts` executes:
   - Sets `payment.status = "FAILED"`.
   - Sets `appointment.status = "CANCELLED"`.
   - Sets `slotHold.status = "RELEASED"`.
8. `app/api/booking/callback/route.ts` lines 54–58:
```ts
} else {
  return NextResponse.redirect(
    new URL(`/booking?error=${encodeURIComponent(result.message)}`, request.url)
  )
}
```
9. Customer is redirected to `http://localhost:3000/booking?error=...`.

### 3.3 Exact Root Cause
1. **Redirect Destination Mismatch**:
   - The user started booking on `BookingStudio` (on the homepage `/` or `/#booking`).
   - The callback unconditionally redirects to `/booking?error=...`.
   - `/booking` renders the legacy `BookingWizard`, starting at Step 1 (`currentStep = 1`).
   - All customer state (service, date, time, name, phone) is lost.
2. **Missing Cancellation State Restoration in `BookingStudio`**:
   - `BookingStudio` lacked URL query parameter detection for cancellation (`cancelled=true`).

### 3.4 Proposed Safe Fix
1. **Gateway Callback Redirection**:
   When payment is cancelled (`gatewayStatus === "NOK"` or `!result.success`):
   Redirect to:
   `/?cancelled=true&serviceId=${serviceId}&dateStr=${dateStr}&timeStr=${timeStr}&phone=${phone}&name=${encodeURIComponent(name)}#booking`
2. **State Restoration in `BookingStudio`**:
   - On mount, detect `cancelled=true` from URL parameters.
   - Pre-populate `selectedService`, `selectedDateStr`, `selectedTime`, `customerName`, `customerPhone`.
   - Restore view directly to **Step 5** (`setCurrentStep(5)`).
   - Display prominent Persian notification:
     > `پرداخت لغو شد و نوبت قبلی آزاد گردید. در صورت تمایل میتوانید مجدداً اقدام کنید.`
   - Set `holdDetails = null` so the cancelled hold is never reused.
3. **Safe Payment Retry**:
   - When customer clicks retry, `handleInitiatePayment()` attempts a fresh `/api/booking/hold`.
   - If the slot was taken by another user during the elapsed time, `holdRes.ok === false` cleanly informs the user: *"این بازه زمانی هم‌اکنون توسط فرد دیگری رزرو شده است"*.
   - If still available, a brand-new hold and payment record are generated atomically.
   - Database integrity, server-authoritative amounts, and idempotency remain 100% intact.

---

## 4. REDUNDANT PAYMENT & BOOKING PAGES AUDIT

### 4.1 Route & Page Inventory

| Route / Path | Type | Purpose / Who Calls It | Gateway Dependency | Action / Recommendation |
|---|---|---|---|---|
| `app/page.tsx` (`#booking`) | UI Page | Modern 6-step `BookingStudio` for online booking | None (Direct client entry) | **KEEP** (Authoritative booking desk) |
| `app/api/booking/hold/route.ts` | API | Creates atomic 10-minute slot hold | Internal (Called by frontend) | **KEEP** (Critical concurrency control) |
| `app/api/booking/pay/route.ts` | API | Initiates gateway transaction | Internal (Called by frontend) | **KEEP** (Payment initiation) |
| `app/api/booking/callback/route.ts` | API | Receives bank redirect, verifies transaction | **Mandatory** (Gateway callback URL) | **KEEP** (Server-side payment verification) |
| `app/(booking)/booking/success/page.tsx` | UI Page | Digital receipt and confirmation view | None (Redirected after verified callback) | **KEEP** (Clean digital receipt) |
| `app/(booking)/booking/confirmation/[id]/page.tsx` | UI Page | 34-line file querying DB to redirect to `/booking/success?trackingCode=...` | None | **CONSOLIDATE**: Keep minimal server redirect for link compatibility; do not expose as independent UI |
| `app/(booking)/book/page.tsx` | UI Page | 5-line file redirecting to `/booking` | None | **CONSOLIDATE**: Redirect to `/#booking` (the active booking studio) |
| `app/(booking)/booking/page.tsx` | UI Page | Standalone page rendering legacy `BookingWizard` | None | **CONSOLIDATE**: Render or redirect to `BookingStudio` to ensure unified booking experience |
| `app/payment/mock/[authority]/page.tsx` | UI Page | Local sandbox simulator for dev/test without real bank card | Dev gateway provider | **KEEP** (Essential for local development and test automation) |

---

## 5. MY APPOINTMENTS — OTP LOGIN BUTTON STYLING

### 5.1 Files and Functions
- `app/(booking)/booking/status/page.tsx` (Lines 460–472)

### 5.2 Current Implementation
```tsx
<Button
  type="button"
  onClick={handleSendOtp}
  disabled={loading || otpTimer > 0 || !phone.trim()}
  className="bg-[#1C221F] hover:bg-[#28302C] text-[#E4C88E] border border-[#C8A96B]/30 font-bold px-6 py-3.5 rounded-2xl text-xs sm:text-sm min-h-[48px] cursor-pointer"
>
  {otpTimer > 0
    ? `${toPersianDigits(otpTimer)} ثانیه تا ارسال مجدد`
    : isOtpSent
    ? "ارسال مجدد پیامک"
    : "دریافت کد تایید"}
</Button>
```

### 5.3 Exact Root Cause
- The button uses `bg-[#1C221F]`, which has almost zero contrast against the card background (`#141715`).
- It looks like a muted or disabled element rather than the primary interactive trigger.

### 5.4 Proposed Safe Fix
- Apply the authoritative gold gradient styling:
  `bg-gradient-to-r from-[#E4C88E] via-[#C8A96B] to-[#B58B59] text-[#0D0F0E] font-bold shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`
- Ensure high contrast, clear focus outline, and distinct states across mobile and desktop viewports.

---

## 6. MY APPOINTMENTS — OTP COOLDOWN & BACKEND RATE LIMITS

### 6.1 Files and Functions
- `app/api/booking/otp/send/route.ts` (OTP send endpoint)
- `app/(booking)/booking/status/page.tsx` (Tracking page OTP form)
- `lib/rate-limit.ts` (Memory rate-limiter)

### 6.2 Current Rate-Limiting Rules in Code

| Rule Name | Scope | Key | Limit | Window | Error Message in Code |
|---|---|---|---|---|---|
| **IP Abuse Limit** | IP address | `otp_ip_${ip}` | 5 requests | 10 minutes | *"تعداد درخواست‌های کد تایید از آدرس شما بیش از حد مجاز است. لطفاً ۱۰ دقیقه دیگر تلاش نمایید."* |
| **Phone Burst Limit** | Phone number | `otp_phone_burst_${phone}` | 3 requests | 15 minutes | *"تعداد درخواست‌های کد تایید برای این شماره بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش نمایید."* |
| **Daily Phone Limit** | Phone number | DB `otpChallenge` count | 8 OTPs | 24 hours | *"سقف ارسال روزانه کد تایید برای این شماره به پایان رسیده است."* |
| **Resend Cooldown** | Phone number | DB `createdAt > 2min` | 1 request | **2 minutes** | *"لطفاً تا انقضای کد قبلی (۲ دقیقه) شکیبا باشید"* |

### 6.3 Exact Root Cause of the 10-Minute Error
1. The user was encountering the rule at lines 10–16:
   `const ipRate = checkRateLimit("otp_ip_" + ip, 5, 10 * 60 * 1000)`
   In development or shared environments, after 5 attempts in 10 minutes, the customer was blocked for 10 minutes.
2. Even when not IP-blocked, the backend resend cooldown was hardcoded to **2 minutes (120 seconds)** (lines 55–69), while the frontend timer was 60 seconds! When the frontend 60s expired, clicking resend resulted in a 429 error.

### 6.4 Proposed Safe Fix
1. **Resend Cooldown Adjustment**:
   - Change backend cooldown to exactly **60 seconds**:
     `const oneMinuteAgo = new Date(Date.now() - 60 * 1000)`
   - Error message if attempted within 60s:
     `"لطفاً تا امکان ارسال مجدد کد (۶۰ ثانیه) شکیبا باشید"`
2. **Separate Cooldown from Abuse Prevention**:
   - Adjust IP limit on this lookup endpoint to 10 requests per 10 minutes (allowing up to 10 legitimate 60s resends without false-positive blocks, while continuing to block automated bots).
   - Adjust phone burst limit to 5 requests per 15 minutes.
   - Maintain the 24-hour daily cap of 8 OTPs per phone.
3. **Frontend Countdown Presentation**:
   - While timer is running: `ارسال مجدد کد تا ${toPersianDigits(otpTimer)} ثانیه دیگر`
   - When cooldown expires after first send: `ارسال مجدد کد`
   - Initial state: `دریافت کد تایید`
4. **Security Isolation**:
   - No changes to admin login, customer auth, payment, or OTP verification rate limits.

---

## 7. APPOINTMENT LOOKUP RESULTS — FULL CUSTOMER NAME DISPLAY

### 7.1 Files and Functions
- `app/(booking)/booking/status/page.tsx` (Lines 542–545, 658–666)
- `app/api/booking/status/route.ts` (Status API)

### 7.2 Current Implementation
In `app/api/booking/status/route.ts`:
- When accessed via verified OTP (`isOtpAuthenticated === true`), `a.customerName` is already returned in FULL from the database.
In `app/(booking)/booking/status/page.tsx`:
- The section header only displays:
  `<h2 ...>نتایج استعلام رزرواسیون ({toPersianDigits(appointments.length)})</h2>`
- Inside each appointment card:
  `<strong className="text-[#F7F4EE] text-sm block truncate">{a.customerName}</strong>`
  The name is trapped inside a narrow 1/3-column box with the `truncate` CSS class.

### 7.3 Exact Root Cause
1. Long Persian customer names (e.g., "محمدحسین شمس‌آبادی فراهانی") are cut off with `...` due to `truncate` and narrow column width.
2. The authenticated customer's full name is missing from the results section header/profile banner.

### 7.4 Proposed Safe Fix
1. **Authenticated Customer Profile Banner**:
   Above the results cards, render a dedicated customer header:
   ```tsx
   <div className="p-4 sm:p-5 rounded-2xl bg-[#171D19] border border-[#C8A96B]/30 flex items-center justify-between">
     <div className="flex items-center gap-3">
       <div className="w-10 h-10 rounded-xl bg-[#C8A96B]/20 text-[#E4C88E] flex items-center justify-center">
         <User className="w-5 h-5" />
       </div>
       <div>
         <span className="text-xs text-[#A89E90] block">مشتری گرامی:</span>
         <h3 className="text-base sm:text-lg font-bold font-heading text-[#F7F4EE]">
           {appointments[0]?.customerName}
         </h3>
       </div>
     </div>
     <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
       احراز هویت شده با پیامک
     </Badge>
   </div>
   ```
2. **Card Details Display**:
   Remove the restrictive `truncate` class in the appointment card and allow the full name to render naturally with proper line-height and font weight.
3. Derive the name strictly from `appointments[0].customerName` returned by the authenticated backend.

---

## DEPENDENCY & REGRESSION RISK MATRIX

| Change Area | Direct Dependencies | Potential Regression Risk | Verification Strategy |
|---|---|---|---|
| **Mobile Menu** | `Header.tsx`, Viewports (320px–1440px) | Desktop navigation styling, z-index overlays | Automated Playwright test across 7 viewports |
| **Jalali Date** | `lib/jalali.ts`, `BookingStudio.tsx` | Timezone skew, invalid day calculations | Unit test with leap years and UTC offsets |
| **Payment Cancel** | `callback/route.ts`, `BookingStudio.tsx` | Double booking, slot hold leak | Concurrency test with mock gateway cancellation |
| **OTP Styling** | `status/page.tsx` | Mobile touch target sizing | Visual check on 375px/1440px |
| **OTP Cooldown** | `otp/send/route.ts`, `rate-limit.ts` | SMS spam abuse | Test 60s cooldown + 10-req IP rate-limit boundary |
| **Customer Name** | `status/page.tsx` | Long name overflow on 320px | Test long Persian names without truncation |
