#!/bin/sh
set -e

echo "=================================================================="
echo "  KOROUSH BARBER — PRODUCTION CONTAINER INITIALIZATION"
echo "=================================================================="

# 1. Apply version-controlled Prisma migrations safely
if [ -n "$DATABASE_URL" ]; then
  echo "=> [Koroush Barber] Deploying Prisma database migrations..."
  prisma migrate deploy || npx prisma migrate deploy
fi

# 2. Provision baseline business configuration & initial admin safely
# Does NOT create any fake customers, appointments, or reviews
echo "=> [Koroush Barber] Checking baseline configuration and admin..."
node scripts/seed-production.js

echo "=> [Koroush Barber] Launching Next.js production server on port ${PORT:-3000}..."
exec node server.js
