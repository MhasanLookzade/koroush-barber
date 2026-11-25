# Phase 2 — Admin UI Fix Report (`/admin/barbers`)

- **Root Cause:** `app/(admin)/admin/barbers/AdminBarbersClient.tsx` called `useToast()` from `hooks/use-toast.tsx`, while `app/(admin)/layout.tsx` did not wrap routes in `ToastProviderComponent`.
- **Fix Applied:** Wrapped `AdminBarbersContent` inside `<ToastProviderComponent>` in `AdminBarbersClient.tsx` (narrowest component tree, zero duplication, zero impact on other admin pages).
- **Verified in Real Browser (Chromium 1440×900):**
  - Authenticated `OWNER` login -> `/admin/barbers` returned HTTP `200 OK`.
  - Barber list (`کوروش`) rendered cleanly.
  - Zero console or page errors (`0 []`).
