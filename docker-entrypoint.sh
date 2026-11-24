#!/bin/sh
set -e

echo "=================================================================="
echo "  KOROUSH BARBER — CONTAINER INITIALIZATION"
echo "=================================================================="

# 1. Ensure Database Schema is in sync
if [ -n "$DATABASE_URL" ]; then
  echo "=> [Koroush Barber] Syncing database schema with PostgreSQL..."
  node scripts/prepare-db.js || true
  npx prisma db push --skip-generate || true
fi

# 2. Provision baseline configuration (services, working hours, settings, admin)
# Note: prisma/seed.ts does NOT create any fake customer, appointment, or review records.
echo "=> [Koroush Barber] Ensuring baseline configuration exists..."
npx ts-node prisma/seed.ts || true

echo "=> [Koroush Barber] Launching Next.js server on port ${PORT:-3000}..."
exec node server.js
