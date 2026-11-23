# Koroush Barber — Product Plan (سند طرح محصول)
**Brand:** Koroush Barber | آرایشگاه کوروش  
**Core Promise:** استایل حرفه‌ای، دقیقاً سر وقت شما.  
**Primary Customer CTA:** رزرو نوبت  
**Target Market:** Iran (fa-IR, RTL, Jalali Solar Hijri calendar, Asia/Tehran timezone)  
**Version:** 1.0.0 Production Architecture  

---

## 1. Executive Summary & Brand Identity
Koroush Barber is a luxury men's grooming and barbershop brand located in Tehran, Iran. The platform provides a streamlined, mobile-first appointment booking experience where a returning client can complete a reservation in under 60 seconds.

### Key Brand Principles
1. **Refined Masculine Luxury:** High-contrast editorial aesthetic combining midnight charcoal, warm ivory, and muted bronze.
2. **Effortless Usability:** Frictionless Persian interface designed for Iranian smartphone users with native Jalali dates, Persian numerals, and mobile OTP.
3. **Punctuality & Precision:** Guaranteed 60-minute service slots with zero overbooking and transparent pricing.
4. **Transparent Economics:** Clear separation of total service price (مبلغ کل), online deposit (بیعانه), and remaining in-salon balance (مانده در محل).

---

## 2. Market & Localization Specifics
- **Language & Direction:** 100% Persian (fa-IR) with full Right-to-Left (RTL) layout.
- **Directional Isolation:** Telephone numbers (`09...`), hours (`10:00 - 11:00`), and numeric transaction IDs are wrapped in explicit directional isolation (`dir="ltr"` or `bdi`) to prevent reversed or fragmented punctuation.
- **Calendar & Time:** Solar Hijri (هجری شمسی / Jalali) representation with correct Persian month names (فروردین، اردیبهشت، خرداد، تیر، مرداد، شهریور، مهر، آبان، آذر، دی، بهمن، اسفند).
- **Timezone:** Authoritative timezone is `Asia/Tehran` (+03:30 standard / UTC conversion handled server-side).
- **Currency:** Displayed in Tomans (تومان) with Persian thousands separators (e.g. `۲۵۰,۰۰۰ تومان`). Internal accounting uses integers in Tomans; gateway integration translates reliably to Rials (x10) at the adapter boundary.

---

## 3. Operational Schedule & Slot Invariants
- **Operating Hours:** 10:00 to 23:00 local Tehran time daily.
- **Slot Duration:** Exactly 60 minutes per appointment.
- **Possible Start Hours:** Exactly 13 slots per day:  
  `10:00`, `11:00`, `12:00`, `13:00`, `14:00`, `15:00`, `16:00`, `17:00`, `18:00`, `19:00`, `20:00`, `21:00`, `22:00`.
- **Hard Restriction:** The shop closes at 23:00; therefore, `23:00` is **never** offered as a start time.
- **Resource Extensibility:** Initial launch operates with 1 master barber (Koroush) and 1 location, while database entities and service logic support multiple barbers and branches without cluttering V1 UI.

---

## 4. User Journeys & Route Map

### Customer Routes
1. **`/` (Landing Page):**
   - Brand Header & Wordmark Monogram (`KB` / `کوروش`)
   - Signature Promise & Hero Section with high-conversion "رزرو نوبت" CTA
   - Service Showcase with pricing, duration, and deposit details
   - "How It Works" 3-step explanation (انتخاب خدمت و زمان -> تایید شماره -> پرداخت بیعانه)
   - Salon Atmosphere & Authentic Gallery Placeholders
   - Opening Hours, Address, Google Map link, and Direct Phone
   - FAQ & SEO Structured Data
   - Persistent Sticky Mobile Booking CTA bar (< 768px)

2. **`/booking` (Booking Wizard):**
   - Step 1: **انتخاب خدمت (Service Selection):** Filterable cards with price, duration (60m), and deposit amount.
   - Step 2: **تاریخ و ساعت (Date & Time):** Responsive Jalali calendar with visual slot selector showing available, held, and booked statuses.
   - Step 3: **تایید موبایل (Mobile Verification):** Iranian phone number input (`09xxxxxxxxx`) with 6-digit OTP challenge, resend timer, and attempt limits.
   - Step 4: **پیش‌فاکتور و پرداخت (Summary & Deposit):** Transparent cost breakdown (مبلغ کل، بیعانه، مانده در آرایشگاه) with atomic 10-minute slot hold before gateway handoff.

3. **`/booking/success` (Confirmed Booking):**
   - Visible only upon server-verified payment callback.
   - Unique tracking code (کد پیگیری), Jalali date & time, chosen service, deposit paid receipt, and in-salon balance due.
   - "افزودن به تقویم" (Add to Calendar `.ics` download).
   - Direct directions and cancellation policy summary.

4. **`/booking/status` (Customer Self-Service):**
   - Mobile OTP authentication to view active, past, and cancelled reservations.
   - Reschedule and cancel actions adhering to the configured salon cutoff policies.

5. **`/services`, `/about`, `/contact`:**
   - Dedicated public pages providing complete brand story, service menu details, working hours, address, and contact information.

### Admin Routes (`/admin/*`)
- **`/admin` (Dashboard):** Real-time daily overview: today's appointments, occupancy rate, collected deposits, outstanding salon balances, no-shows, and next upcoming client.
- **`/admin/appointments`:** Interactive Day/Week calendar view with status filters, manual phone booking creation, arrival check-in, completion, no-show marking, and remaining balance settlement.
- **`/admin/availability`:** Manage standard working hours, daily breaks, holidays, and emergency schedule overrides with automated conflict detection against existing bookings.
- **`/admin/services`:** Full CRUD for salon services, base pricing, deposit requirements (fixed or percentage), and sort order. Historical bookings preserve price snapshots.
- **`/admin/customers`:** Customer directory, total visit counts, lifetime spend, and staff notes.
- **`/admin/payments`:** Financial log with gateway authorities, verification status, deposit sums, uncollected balances, and CSV export.
- **`/admin/settings`:** Salon profile, business hours, cancellation rules, hold timeout duration (minutes), SMS templates, gateway mode toggle (Mock / ZarinPal Sandbox / Live).

---

## 5. Pricing & Payment Policy
- **Demo Seed Data:**
  - اصلاح کلاسیک و استایل (Classic Haircut & Style): ۲۵۰,۰۰۰ تومان (بیعانه: ۵۰,۰۰۰ تومان)
  - اصلاح تخصصی ریش و حالت‌دهی (Beard Styling & Grooming): ۱۵۰,۰۰۰ تومان (بیعانه: ۵۰,۰۰۰ تومان)
  - پکیج کامل پیرایش و مراقبت پوست (VIP Grooming & Facial): ۵۰۰,۰۰۰ تومان (بیعانه: ۱۰۰,۰۰۰ تومان)
- **Refund & Cancellation Window:** Configured in admin settings (default: cancellation permitted up to 12 hours before appointment). Deposit handling follows the documented salon policy.
