#!/usr/bin/env bash
# ==============================================================================
# Koroush Barber — Production Database Backup Script
# Supports PostgreSQL (Docker/Host) and SQLite
# Usage: ./scripts/backup-db.sh
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "${BACKUP_DIR}"

# Load environment variables if .env exists
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs -0 2>/dev/null || true)
fi

DATABASE_URL="${DATABASE_URL:-file:./dev.db}"

echo "=========================================================="
echo " Starting Koroush Barber Database Backup at ${TIMESTAMP}"
echo "=========================================================="

if [[ "${DATABASE_URL}" == postgresql://* ]] || [[ "${DATABASE_URL}" == postgres://* ]]; then
  echo "=> Target: PostgreSQL database"
  BACKUP_FILE="${BACKUP_DIR}/koroush_backup_${TIMESTAMP}.sql.gz"

  # Dump and compress using pg_dump
  if command -v pg_dump >/dev/null 2>&1; then
    pg_dump --clean --if-exists --no-owner "${DATABASE_URL}" | gzip -9 > "${BACKUP_FILE}"
  elif command -v docker >/dev/null 2>&1 && docker ps | grep -q "koroush-postgres"; then
    echo "Using Docker container koroush-postgres to run pg_dump..."
    docker exec -t koroush-postgres pg_dump -U koroush_user -d koroush_barber --clean --if-exists --no-owner | gzip -9 > "${BACKUP_FILE}"
  else
    echo "Error: Neither pg_dump nor docker container koroush-postgres found!" >&2
    exit 1
  fi

  chmod 600 "${BACKUP_FILE}"
  FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "=> SUCCESS: PostgreSQL backup created at ${BACKUP_FILE} (${FILESIZE})"

elif [[ "${DATABASE_URL}" == file:* ]]; then
  SQLITE_PATH="${DATABASE_URL#file:}"
  # Remove relative prefix
  SQLITE_PATH="${SQLITE_PATH#./}"
  
  if [ ! -f "${SQLITE_PATH}" ]; then
    echo "Error: SQLite database file not found at ${SQLITE_PATH}" >&2
    exit 1
  fi

  BACKUP_FILE="${BACKUP_DIR}/koroush_sqlite_${TIMESTAMP}.db.gz"
  echo "=> Target: SQLite database (${SQLITE_PATH})"

  if command -v sqlite3 >/dev/null 2>&1; then
    # Safely perform an online vacuum/backup using sqlite3 CLI
    TMP_DUMP="${BACKUP_DIR}/tmp_${TIMESTAMP}.db"
    sqlite3 "${SQLITE_PATH}" ".backup '${TMP_DUMP}'"
    gzip -9 -c "${TMP_DUMP}" > "${BACKUP_FILE}"
    rm -f "${TMP_DUMP}"
  else
    # Fallback to copy and compress
    gzip -9 -c "${SQLITE_PATH}" > "${BACKUP_FILE}"
  fi

  chmod 600 "${BACKUP_FILE}"
  FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "=> SUCCESS: SQLite backup created at ${BACKUP_FILE} (${FILESIZE})"

else
  echo "Error: Unsupported DATABASE_URL format: ${DATABASE_URL}" >&2
  exit 1
fi

# Prune backups older than 30 days
echo "=> Pruning backups older than 30 days..."
find "${BACKUP_DIR}" -name "koroush_*" -type f -mtime +30 -delete 2>/dev/null || true
echo "=> Backup complete."
