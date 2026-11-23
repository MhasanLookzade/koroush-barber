#!/usr/bin/env bash
# ==============================================================================
# Koroush Barber — Production Database Restore Script
# Supports PostgreSQL (Docker/Host) and SQLite
# Usage: ./scripts/restore-db.sh <path-to-backup-file.gz> [--force]
# ==============================================================================

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <path-to-backup-file.gz> [--force]" >&2
  exit 1
fi

BACKUP_FILE="$1"
FORCE="${2:-}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file '${BACKUP_FILE}' does not exist." >&2
  exit 1
fi

# Load environment variables if .env exists
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs -0 2>/dev/null || true)
fi

DATABASE_URL="${DATABASE_URL:-file:./dev.db}"

echo "=========================================================="
echo " Koroush Barber Database Restore"
echo " Target: ${DATABASE_URL}"
echo " Source: ${BACKUP_FILE}"
echo "=========================================================="

if [ "${FORCE}" != "--force" ]; then
  read -r -p "WARNING: Restoring will overwrite the current database! Are you sure? [y/N] " response
  case "$response" in
    [yY][eE][sS]|[yY]) ;;
    *) echo "Restore cancelled by user."; exit 0 ;;
  esac
fi

if [[ "${DATABASE_URL}" == postgresql://* ]] || [[ "${DATABASE_URL}" == postgres://* ]]; then
  echo "=> Restoring to PostgreSQL..."
  if command -v psql >/dev/null 2>&1; then
    gunzip -c "${BACKUP_FILE}" | psql "${DATABASE_URL}"
  elif command -v docker >/dev/null 2>&1 && docker ps | grep -q "koroush-postgres"; then
    gunzip -c "${BACKUP_FILE}" | docker exec -i koroush-postgres psql -U koroush_user -d koroush_barber
  else
    echo "Error: Neither psql nor docker container koroush-postgres found!" >&2
    exit 1
  fi
  echo "=> SUCCESS: PostgreSQL restored successfully."

elif [[ "${DATABASE_URL}" == file:* ]]; then
  SQLITE_PATH="${DATABASE_URL#file:}"
  SQLITE_PATH="${SQLITE_PATH#./}"
  
  echo "=> Restoring to SQLite at ${SQLITE_PATH}..."
  
  # Create a safety copy of current db if it exists
  if [ -f "${SQLITE_PATH}" ]; then
    cp "${SQLITE_PATH}" "${SQLITE_PATH}.bak.$(date +%s)"
  fi

  gunzip -c "${BACKUP_FILE}" > "${SQLITE_PATH}"
  echo "=> SUCCESS: SQLite restored successfully from ${BACKUP_FILE}."

else
  echo "Error: Unsupported DATABASE_URL format: ${DATABASE_URL}" >&2
  exit 1
fi

echo "=> Database restore procedure finished successfully."
