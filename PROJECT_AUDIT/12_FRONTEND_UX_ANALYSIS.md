# 12 — Frontend & User Experience Analysis

## 1. Interface Architecture & Typography
- **RTL & Localization:** Full Persian (`dir="rtl"`, `lang="fa"`) across public site, booking/tracking/receipt flows, customer portal, and admin panel.
- **Typography:** Self-hosted `Estedad` (headings/KPIs) and `Vazirmatn` (body/UI/tables) loaded via `next/font/local` + `@font-face`, calibrated line-heights (`1.3–1.45` headings, `1.7` body), `.persian-nums` tabular digits.
- **Responsiveness:** Verified across 11 viewports (`320px` to `1920px`) on public pages and 5 viewports (`320px` to `1440px`) across 8 admin routes with **0px horizontal overflow**.

## 2. Frontend & UX Issues Found
1. **`BUG-006` (MEDIUM) — Infinite Loading Screen on Unauthenticated Customer Dashboard:** `app/(customer)/layout.tsx:74-83` shows a spinner indefinitely if `/api/auth/customer/me` returns 401 instead of redirecting to `/auth`.
2. **`SEC-004` (HIGH) — Demo Credentials Shown on Admin Login:** `app/admin-login/page.tsx` pre-fills and displays `admin/admin123456` and `staff/staff123456` in all environments.
3. **`app/payment/mock/[authority]/page.tsx:57`:** Hardcodes `"۵۰,۰۰۰ تومان"` instead of displaying the real deposit amount; redirects to unvalidated `callback` query param (`SEC-008`).
4. **`BUG-010` (LOW):** Missing `/og-image.jpg`, `/images/service-full.jpg`, `/images/service-haircut.jpg` assets.
5. **Large Client Components (`PERF-002`):** `BookingStudio.tsx` (`66.8 KB`), `admin/page.tsx` (`77.7 KB`), and `admin/sms/page.tsx` (`78.3 KB`) would benefit from modular subcomponent extraction; `BookingWizard.tsx` (`37.5 KB`) is duplicate/unused.
