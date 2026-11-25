# 09 — Dependency & Technology Assessment

## 1. Manifest Summary (`package.json`)
- **Framework:** `next@14.2.15`, `react@^18.3.1`, `react-dom@^18.3.1`
- **ORM / DB:** `prisma@^5.21.1`, `@prisma/client@^5.21.1`
- **Auth / Crypto:** `bcryptjs@^3.0.3`, `@types/bcryptjs@^2.4.6`, built-in Node `crypto` & Web Crypto
- **Validation & Forms:** `zod@^3.23.8`, `react-hook-form@^7.53.1`, `@hookform/resolvers@^3.9.1`
- **UI & Charts:** `tailwindcss@^3.4.14`, `@radix-ui/*`, `lucide-react@^0.453.0`, `framer-motion@^14.14.0`, `recharts@^2.13.0`, `sonner@^1.5.0`, `next-themes@^0.3.0`, `date-fns@^4.1.0`
- **Tooling / Testing:** `typescript@^5.6.3`, `eslint@^8.57.1`, `eslint-config-next@14.2.15`, `playwright@^1.65.1`, `ts-node@^10.9.2`

## 2. Observations & Recommendations
1. **Next.js `14.2.15`:** Pinning an exact older 14.2 patch (`14.2.15`) misses subsequent 14.2.x security & stability patches. Evaluate upgrading to the latest patched Next.js 14.2.x (or 15.x) release after testing. (No automatic upgrade performed per audit rules.)
2. **ESLint Configuration Missing (`OPS-001`):** `eslint` and `eslint-config-next` are installed, yet no `.eslintrc.json` exists, causing `npm run lint` to prompt interactively and fail.
3. **Self-Hosted Fonts (`Estedad`, `Vazirmatn`):** Both carry **SIL Open Font License 1.1** (`OFL.txt` stored in `public/fonts/`), zero licensing risk for commercial deployment.
4. **External Registry Audit:** Not executed against external npm registry to obey strict no-external-data-transmission rules; local dependency lockfile (`package-lock.json`, 295 KB) is intact.
