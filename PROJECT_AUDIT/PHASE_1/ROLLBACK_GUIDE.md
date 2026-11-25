# Phase 1 — Rollback Guide

## Git Rollback
A backup branch `backup/pre-phase-1` was created prior to any Phase 1 edits at commit `ae409d4` (`main`).

To revert all Phase 1 changes immediately:
```bash
git checkout main
# Or reset the Phase 1 branch back to pre-Phase-1 state:
git checkout fix/phase-1-auth-session-security
git reset --hard backup/pre-phase-1
```

## Operational Notes
- No database schema migrations were executed in Phase 1.
- Existing customer records, appointments, and admin accounts are untouched.
- Any customer holding an old unsigned `customer_auth` cookie will receive HTTP `401` and simply log in again to receive a signed session token.
