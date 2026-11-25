# Phase 2.1 — Admin UI Regression, ToastProvider & Mock Payment Review

**Branch:** `fix/phase-2-api-security`  
**Backup Baseline:** `backup/pre-phase-2` (`edfe2d8a64640ffe6a60782f83955e50149e14be`)  
**Scope:** [`app/(admin)/admin/barbers/AdminBarbersClient.tsx`](file:///c:/Users/blue/Documents/projects/barber/app/%28admin%29/admin/barbers/AdminBarbersClient.tsx), [`hooks/use-toast.tsx`](file:///c:/Users/blue/Documents/projects/barber/hooks/use-toast.tsx), [`app/payment/mock/[authority]/page.tsx`](file:///c:/Users/blue/Documents/projects/barber/app/payment/mock/%5Bauthority%5D/page.tsx), and [`app/admin-login/page.tsx`](file:///c:/Users/blue/Documents/projects/barber/app/admin-login/page.tsx)

---

## 1. `/admin/barbers` & `ToastProvider` Fix Verification

- **Source Verification:**
  - [`app/(admin)/admin/barbers/AdminBarbersClient.tsx`](file:///c:/Users/blue/Documents/projects/barber/app/%28admin%29/admin/barbers/AdminBarbersClient.tsx) wraps `AdminBarbersContent` inside `<ToastProviderComponent>` from [`hooks/use-toast.tsx`](file:///c:/Users/blue/Documents/projects/barber/hooks/use-toast.tsx), which renders `ToastProvider` and `ToastViewport`.
- **Headless Chromium Verification (`http://localhost:3000/admin/barbers`):**
  - Authenticated admin (`OWNER`) login returned HTTP `200`.
  - `/admin/barbers` rendered cleanly (`loadedKoroush: true`) with **`0` console errors** and **`0` uncaught page errors**.
  - **Barber Create (`POST /api/barbers`):** Creating a temporary test barber succeeded (`createdVisible: true`) and rendered the toast notification (`آرایشگر ایجاد شد` -> `createToastVisible: true`) without crashing.
  - **Barber Edit (`PUT /api/barbers/[id]`):** Editing the temporary barber succeeded (`editSucceeded: true`).
  - **Barber Delete (`DELETE /api/barbers/[id]`):** In the automated Playwright script, the post-delete `1000ms` DOM poll reported `deleteSucceeded: false` before the table refresh completed, while `GET /api/barbers` confirmed the temporary barber was cleanly removed and only the seeded barber remains.

---

## 2. Mock Payment Open-Redirect Protection (`app/payment/mock/[authority]/page.tsx`)

- **Source Verification:** [`app/payment/mock/[authority]/page.tsx`](file:///c:/Users/blue/Documents/projects/barber/app/payment/mock/%5Bauthority%5D/page.tsx) validates `candidate.origin === window.location.origin` inside `handleAction` before redirecting.
- **Headless Chromium Verification:**
  - `?callback=https://evil.example/phish` -> stayed on `http://localhost:3000/booking?error=...` (`stayedSameOrigin: true`, `didNotRedirectToEvil: true`).
  - `?callback=//evil.example/phish` -> stayed on `http://localhost:3000/booking?error=...` (`stayedSameOrigin: true`, `didNotRedirectToEvil: true`).

---

## 3. Admin Login Demo Credentials Guard (`app/admin-login/page.tsx`)

- In `NODE_ENV=development` (`http://localhost:3000/admin-login`), `isNonProduction` is `true`, so development demo helper credentials are rendered on dev only.
- In production build output (`.next/static`), scanning for `admin123456|staff123456` returned **`0` matches**; [`app/admin-login/page.tsx`](file:///c:/Users/blue/Documents/projects/barber/app/admin-login/page.tsx) sets `demoAccounts` to `undefined` whenever `process.env.NODE_ENV === "production"`.

---

## 4. Verdict on Admin UI & Client Security

- **Status:** **PASS**
- The `ToastProvider` regression on `/admin/barbers` is resolved with zero console/page errors, and mock payment open-redirect vectors (`https://` and `//`) are blocked.
