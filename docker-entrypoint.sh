#!/bin/sh
set -e

echo "=> [Koroush Barber] Starting container initialization..."

# Run DB prepare and push schema
if [ -n "$DATABASE_URL" ]; then
  echo "=> [Koroush Barber] Ensuring database schema is synced..."
  node scripts/prepare-db.js || true
  npx prisma db push --skip-generate || true
fi

# If SEED_DATABASE is set to "true", run database seed
if [ "$SEED_DATABASE" = "true" ]; then
  echo "=> [Koroush Barber] Running database seed..."
  npx ts-node prisma/seed.ts || true
fi

echo "=> [Koroush Barber] Launching Next.js server on port ${PORT:-3000}..."
exec node server.js
