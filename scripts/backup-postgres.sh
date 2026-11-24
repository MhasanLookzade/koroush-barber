#!/usr/bin/env bash
# ==============================================================================
# Koroush Barber — Production PostgreSQL Automated Backup Script
# Domain: koroushbarber.ir
# Usage: sudo bash scripts/backup-postgres.sh
# ==============================================================================

set -euo pipefail

# Directory where backups are stored
BACKUP_DIR="${BACKUP_DIR:-/var/backups/koroush-barber}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/koroush_pg_backup_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
  echo "$msg"
  echo "$msg" >> "${LOG_FILE}"
}

log "=========================================================="
log " Starting Koroush Barber PostgreSQL Backup: ${TIMESTAMP}"
log "=========================================================="

# Locate project directory
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

# Verify container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  log "❌ ERROR: PostgreSQL container '${CONTAINER_NAME}' is not running!"
  exit 1
fi

log "=> Dumping database '${DB_NAME}' from container '${CONTAINER_NAME}'..."

# Perform pg_dump inside container and pipe through gzip
if docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists --no-owner | gzip -9 > "${BACKUP_FILE}"; then
  # Verify archive integrity
  if gzip -t "${BACKUP_FILE}" 2>/dev/null; then
    chmod 600 "${BACKUP_FILE}"
    FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    log "✅ SUCCESS: Backup created successfully at ${BACKUP_FILE} (${FILESIZE})"
  else
    log "❌ ERROR: Corrupted backup archive created: ${BACKUP_FILE}"
    rm -f "${BACKUP_FILE}"
    exit 1
  fi
else
  log "❌ ERROR: pg_dump command failed!"
  rm -f "${BACKUP_FILE}"
  exit 1
fi

# Rotate backups older than RETENTION_DAYS
log "=> Rotating backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR}..."
find "${BACKUP_DIR}" -name "koroush_pg_backup_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -exec rm -f {} \; 2>/dev/null || true

log "=> Backup completed successfully."
exit 0
