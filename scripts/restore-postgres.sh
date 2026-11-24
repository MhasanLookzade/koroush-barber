#!/usr/bin/env bash
# ==============================================================================
# Koroush Barber — Production PostgreSQL Restore Script
# Domain: koroushbarber.ir
# Usage: sudo bash scripts/restore-postgres.sh <path-to-backup.sql.gz> [--force]
# ==============================================================================

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "❌ خطا: لطفاً مسیر فایل بکاپ فشرده را مشخص فرمایید."
  echo "راهنما: sudo bash scripts/restore-postgres.sh /path/to/backup.sql.gz [--force]"
  exit 1
fi

BACKUP_FILE="$1"
FORCE="${2:-}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ خطا: فایل بکاپ مورد نظر یافت نشد: ${BACKUP_FILE}" >&2
  exit 1
fi

# Test gzip archive integrity
if ! gzip -t "${BACKUP_FILE}" 2>/dev/null; then
  echo "❌ خطا: فایل بکاپ معتبر یا سالم نیست (gzip test failed): ${BACKUP_FILE}" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Source .env.production if present
ENV_FILE="${PROJECT_DIR}/.env.production"
if [ -f "${ENV_FILE}" ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' "${ENV_FILE}" | xargs -0 2>/dev/null || true)
fi

DB_USER="${DB_USER:-koroush_user}"
DB_NAME="${DB_NAME:-koroush_barber}"
CONTAINER_NAME="koroush-postgres"

echo "=========================================================="
echo "  Koroush Barber Database Restore Utility"
echo "  Target Database: ${DB_NAME} (PostgreSQL Container)"
echo "  Source Archive:  ${BACKUP_FILE}"
echo "=========================================================="

if [ "${FORCE}" != "--force" ]; then
  echo "⚠️  هشدار جدی: بازگردانی بکاپ تمام اطلاعات جاری پایگاه‌داده را بازنویسی خواهد کرد!"
  read -r -p "آیا از اجرای عملیات بازیابی اطمینان کامل دارید؟ [y/N] " response
  case "$response" in
    [yY][eE][sS]|[yY]) ;;
    *) echo "عملیات توسط کاربر متوقف شد."; exit 0 ;;
  esac
fi

# Verify container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "❌ خطا: کانتینر پایگاه‌داده '${CONTAINER_NAME}' در حال اجرا نیست!" >&2
  exit 1
fi

echo "=> [1/3] Terminating active database connections to ${DB_NAME}..."
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true

echo "=> [2/3] Restoring SQL dump into ${DB_NAME}..."
if gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
  echo "=> [3/3] Verifying restored schema..."
  TABLE_COUNT=$(docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
  echo "✅ SUCCESS: Database restored successfully. Found ${TABLE_COUNT} public tables."
else
  echo "❌ ERROR: Database restore process failed!" >&2
  exit 1
fi

echo "=> Database restore procedure finished successfully."
exit 0
