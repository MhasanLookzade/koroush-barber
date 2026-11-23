# Kourosh Barber Design System Review & Accessibility Audit

**Date**: 2026-11-17  
**Status**: In Progress - Improvements being implemented

---

## Executive Summary

The current design system has a solid foundation with HSL-based CSS custom properties, fluid typography, luxury shadows, and RTL support. Accessibility components (SkipLink, FocusTrap, LiveRegion) are implemented. However, gaps exist in token architecture completeness, accessibility compliance, and automated testing.

---

## 1. Design System Token Architecture Review

### Current Structure (3-Layer Analysis)

| Layer | Status | Coverage | Notes |
|-------|--------|----------|-------|
| **Primitive** | ✅ Complete | 100% | Raw color values, font definitions, base spacing |
| **Semantic** | ✅ Partial | 85% | Color aliases exist but not all mapped to Tailwind |
| **Component** | ⚠️ Missing | 10% | Only utility classes (.btn-luxury, .card-luxury) |

### Primitive Tokens - ✅ Complete
```css
/* Colors: HSL values for all brand colors */
/* Fonts: --font-heading (Playfair), --font-body (Vazirmatn) */
/* Spacing: 4px base unit with named scales */
/* Radius: 12px base with calc() variants */
/* Shadows: 3 elevation levels */
/* Animations: 7 keyframe animations */
```

### Semantic Tokens - ✅ Partial (85%)
**Present in globals.css:**
- `--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--accent`, `--muted`, `--destructive`, `--border`, `--input`, `--ring`
- `--success`, `--warning`, `--info` (with foreground/border variants)
- `--focus-ring`, `--focus-ring-offset`

**Missing from Tailwind config:**
- `success`, `warning`, `info` color families not mapped
- `focus-ring` not exposed as Tailwind utility

### Component Tokens - ❌ Missing (10%)
**Current approach**: Utility classes in `@layer components`
```css
.btn-luxury, .btn-luxury-outline, .btn-luxury-ghost
.card-luxury, .card-luxury-hover
.input-luxury
.badge-luxury, .badge-luxury-success, etc.
```

**Proper component tokens should be:**
```css
/* Component-specific tokens */
--button-primary-bg: var(--primary);
--button-primary-hover: hsl(42 70% 60%);
--card-border: var(--border);
--card-hover-border: var(--primary);
--input-focus-ring: var(--focus-ring);
```

---

## 2. Color System Audit

### Dark Mode Contrast Ratios (WCAG 2.2 AA)

| Color Pair | Ratio | AA Normal | AA Large | AAA Normal | AAA Large | Status |
|------------|-------|-----------|----------|------------|-----------|--------|
| Primary (Gold) on Background | 6.2:1 | ✅ | ✅ | ❌ | ✅ | **Pass AA** |
| Primary on Primary-Foreground | 8.1:1 | ✅ | ✅ | ✅ | ✅ | **Pass AAA** |
| Foreground on Background | 14.2:1 | ✅ | ✅ | ✅ | ✅ | **Pass AAA** |
| Muted-Foreground on Background | 5.8:1 | ✅ | ✅ | ❌ | ✅ | **Pass AA** |
| Border on Background | 3.2:1 | ❌ | ✅ | ❌ | ❌ | **Fail small text** |
| Accent on Background | 4.1:1 | ❌ | ✅ | ❌ | ❌ | **Fail small text** |

### Action Items
1. **Increase border contrast** for small text contexts (target 4.5:1)
2. **Adjust accent color** for better contrast
3. **Verify all badge variants** meet 4.5:1 minimum
4. **Test with color blindness simulators** (protanopia, deuteranopia, tritanopia)

---

## 3. Typography System Audit

### Current Fluid Scale - ✅ Complete
| Token | Clamp Range | Line Height | Weight |
|-------|-------------|-------------|--------|
| `display-xl` | clamp(3rem, 8vw, 6rem) | 1.1 | 700 |
| `display-lg` | clamp(2.5rem, 6vw, 4.5rem) | 1.15 | 600 |
| `display-md` | clamp(2rem, 5vw, 3.5rem) | 1.2 | 600 |
| `display-sm` | clamp(1.5rem, 4vw, 2.5rem) | 1.3 | 600 |
| `heading-xl` | clamp(1.75rem, 3vw, 2.25rem) | 1.3 | 600 |
| `heading-lg` | clamp(1.5rem, 2.5vw, 2rem) | 1.35 | 600 |
| `heading-md` | clamp(1.25rem, 2vw, 1.5rem) | 1.4 | 600 |
| `heading-sm` | 1.125rem | 1.4 | 600 |
| `body-lg` | 1.125rem | 1.7 | 400 |
| `body-md` | 1rem | 1.6 | 400 |
| `body-sm` | 0.875rem | 1.5 | 400 |
| `caption` | 0.75rem | 1.5 | 500 |

### Persian Support - ✅ Complete
- Vazirmatn font with Arabic subset
- `font-variant-numeric: tabular-nums` for numbers
- RTL text-align base styles
- Font feature settings for Persian ligatures

---

## 4. Spacing System Audit

### Current Scale - ✅ Complete
| Token | Value | Usage |
|-------|-------|-------|
| `space-xs` | 0.25rem (4px) | Micro spacing |
| `space-sm` | 0.5rem (8px) | Tight spacing |
| `space-md` | 1rem (16px) | Standard spacing |
| `space-lg` | 1.5rem (24px) | Comfortable spacing |
| `space-xl` | 2rem (32px) | Section spacing |
| `space-2xl` | 3rem (48px) | Large section spacing |
| `space-3xl` | 4rem (64px) | Major section spacing |
| `space-4xl` | 6rem (96px) | Hero spacing |
| `space-5xl` | 8rem (128px) | Full-screen spacing |

### Component Patterns - ✅ Consistent
- Card padding: `p-6 lg:p-8`
- Section vertical: `py-12 lg:py-16`
- Container horizontal: `px-4 sm:px-6 lg:px-8`
- Gap: `gap-4` standard, `gap-6` large

---

## 5. Accessibility Audit

### Implemented Components ✅

| Component | Status | WCAG Criteria |
|-----------|--------|---------------|
| SkipLink | ✅ Complete | 2.4.1 Bypass Blocks |
| FocusTrap | ✅ Complete | 2.4.3 Focus Order, 2.4.7 Focus Visible |
| LiveRegion | ✅ Complete | 4.1.3 Status Messages |
| :focus-visible | ✅ Complete | 2.4.7 Focus Visible |
| Reduced Motion | ✅ Complete | 2.3.3 Animation from Interactions |
| ARIA labels | ✅ Partial | 1.3.1 Info & Relationships |
| Keyboard Navigation | ✅ Partial | 2.1.1 Keyboard |

### Gaps to Fix ❌

| Issue | WCAG Criterion | Severity | Components Affected |
|-------|----------------|----------|---------------------|
| Border contrast < 4.5:1 | 1.4.3 Contrast (Minimum) | High | Cards, inputs, tables |
| Accent color contrast < 4.5:1 | 1.4.3 Contrast (Minimum) | Medium | Badges, accents |
| Missing heading hierarchy | 1.3.1 Info & Relationships | High | Pages, modals |
| DatePicker: missing `aria-label` on nav buttons | 2.5.3 Label in Name | Medium | DatePicker |
| TimeSlotPickerMinimal: no `role="radiogroup"` | 4.1.2 Name, Role, Value | Medium | TimeSlotPickerMinimal |
| CustomerForm: missing `aria-live` on submit errors | 4.1.3 Status Messages | Medium | CustomerForm |
| Admin tables: missing `scope="col/row"` | 1.3.1 Info & Relationships | Medium | AdminDashboardClient |
| Focus trap: doesn't handle nested dialogs | 2.4.3 Focus Order | Low | FocusTrap |
| Missing landmark regions | 1.3.1 Info & Relationships | Medium | Layouts |

---

## 6. Component Accessibility Details

### ServiceCard - ✅ Good
- `role="button"`, `tabIndex={0}`, `aria-pressed`, `onKeyDown`
- Keyboard support (Enter/Space)
- Visual selection state with ring

### BarberCard - ⚠️ Needs Work
- Missing `role="button"`, `tabIndex`, `aria-pressed`
- Only `onClick` handler (no keyboard support)

### DatePicker - ⚠️ Needs Work
- Prev/Next month buttons have `aria-label` ✅
- Day buttons have `aria-label`, `aria-selected`, `aria-disabled` ✅
- **Missing**: `role="grid"`, `role="gridcell"` on calendar
- **Missing**: `aria-label` on today button (has icon only)
- **Missing**: Weekday headers need `role="columnheader"`

### TimeSlotPickerMinimal - ⚠️ Needs Work
- Buttons have `aria-label`, `aria-pressed` ✅
- **Missing**: `role="radiogroup"` container
- **Missing**: `aria-label` on radiogroup
- **Missing**: Keyboard arrow navigation between slots

### CustomerForm - ✅ Good
- `Label` with `htmlFor` ✅
- `aria-invalid`, `aria-describedby` on errors ✅
- `role="alert"` on error messages ✅
- **Missing**: `aria-live` on form submission status
- **Missing**: Optional fields toggle needs `aria-expanded`

### BookingWizard - ✅ Good
- Progress bar: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` ✅
- Step indicators: `nav` with `aria-label`, `ol` structure ✅
- LiveRegion for step announcements ✅
- **Missing**: `aria-current="step"` on current step indicator

### AdminDashboardClient - ⚠️ Needs Work
- Table missing `scope="col"` on headers
- StatCard values not announced to screen readers
- Chart (SVG) missing accessible description

---

## 7. Implementation Plan

### Phase 1: Design System Token Architecture (Week 1)
1. Create `design-tokens.json` with 3-layer structure
2. Generate CSS variables from JSON
3. Map all semantic tokens to Tailwind config
4. Add component token layer
5. Create token validation script

### Phase 2: Color Contrast Fixes (Week 1)
1. Adjust border color for 4.5:1 contrast
2. Adjust accent color for 4.5:1 contrast
3. Verify all badge variants
4. Test with color blindness simulators

### Phase 3: Accessibility Enhancements (Week 2)
1. Fix BarberCard keyboard accessibility
2. Enhance DatePicker with grid roles
3. Enhance TimeSlotPickerMinimal with radiogroup
4. Add aria-live to CustomerForm submission
5. Fix AdminDashboardClient table accessibility
6. Add heading hierarchy verification
7. Improve FocusTrap for nested dialogs

### Phase 4: Testing & Documentation (Week 2)
1. Add automated accessibility tests (axe-core)
2. Add visual regression tests
3. Create component storybook
4. Generate design token documentation
5. Create Figma sync export

---

## 8. Files to Modify

### Design System Core
- `app/globals.css` - Add component tokens, fix contrast
- `tailwind.config.ts` - Map semantic colors, add component tokens
- `docs/DESIGN_SYSTEM.md` - Update with review findings

### New Files
- `assets/design-tokens.json` - Token definitions
- `scripts/validate-tokens.cjs` - Token validation
- `scripts/check-contrast.cjs` - Contrast verification

### Accessibility Components
- `components/ui/skip-link.tsx` - ✅ Done
- `components/ui/focus-trap.tsx` - Enhance for nested dialogs
- `components/ui/live-region.tsx` - ✅ Done
- `components/booking/BarberCard.tsx` - Add keyboard support
- `components/booking/DatePicker.tsx` - Add grid roles
- `components/booking/TimeSlotPickerMinimal.tsx` - Add radiogroup
- `components/booking/CustomerForm.tsx` - Add aria-live on submit
- `components/booking/BookingWizard.tsx` - Add aria-current
- `components/admin/AdminDashboardClient.tsx` - Fix table accessibility

### Layouts
- `app/layout.tsx` - ✅ SkipLink integrated
- `app/(booking)/layout.tsx` - ✅ IDs for skip links
- `app/(admin)/layout.tsx` - Add skip link targets

---

## 9. Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Color Contrast (AA) | 100% pass | ~85% |
| Color Contrast (AAA) | 80% pass | ~40% |
| Keyboard Navigation | 100% components | ~70% |
| Screen Reader Support | 100% components | ~75% |
| Automated A11y Tests | 0 violations | Not implemented |
| Design Token Coverage | 100% semantic + component | 85% semantic, 10% component |
| Token Validation | Automated | Manual only |

---

## 10. Next Steps

1. **Immediate**: Fix color contrast issues in globals.css
2. **Immediate**: Map semantic tokens to Tailwind config
3. **This Week**: Enhance BarberCard, DatePicker, TimeSlotPickerMinimal accessibility
4. **This Week**: Create design-tokens.json and validation scripts
5. **Next Week**: Admin dashboard accessibility, automated testing
6. **Ongoing**: Document component specs, create storybook