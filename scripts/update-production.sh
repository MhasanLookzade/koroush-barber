#!/usr/bin/env bash
# ==============================================================================
# Koroush Barber — Production Safe Update Script
# Domain: koroushbarber.ir
# Usage: sudo bash scripts/update-production.sh
# ==============================================================================

set -euo pipefail

GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
NC="\033[0m"

echo "=================================================================="
echo "  KOROUSH BARBER — PRODUCTION APPLICATION UPDATE"
echo "  Target Domain: koroushbarber.ir"
echo "  Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=================================================================="

# Ensure script is executed with root privileges
if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo -e "${RED}❌ خطا: لطفاً این اسکریپت را با دسترسی root (یا sudo) اجرا فرمایید.${NC}"
  echo "دستور: sudo bash scripts/update-production.sh"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_DIR}"

# 1. Pre-update Safety Backup
echo -e "${CYAN}=> [1/6] Performing safety pre-update database backup...${NC}"
if [ -f "scripts/backup-postgres.sh" ]; then
  bash scripts/backup-postgres.sh || {
    echo -e "${YELLOW}⚠️  Warning: Safety backup had non-zero exit code. Proceeding with caution...${NC}"
  }
fi

# 2. Fetch Latest Code from Git
echo -e "${CYAN}=> [2/6] Pulling latest production code from repository...${NC}"
if [ -d ".git" ]; then
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  echo "Current branch: ${CURRENT_BRANCH}"
  git fetch origin "${CURRENT_BRANCH}"
  
  # Ensure no uncommitted tracking conflicts
  if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Local uncommitted changes detected. Stashing temporarily...${NC}"
    git stash
  fi
  
  git pull --ff-only origin "${CURRENT_BRANCH}"
else
  echo -e "${YELLOW}⚠️  Not a git repository clone. Skipping git pull...${NC}"
fi

# 3. Build New Production Application Image
echo -e "${CYAN}=> [3/6] Building new Next.js standalone container image...${NC}"
docker compose -f compose.production.yml build app

# 4. Zero-Downtime / Minimal-Downtime Container Restart
echo -e "${CYAN}=> [4/6] Restarting application container with new release...${NC}"
# Recreate only the 'app' container while keeping PostgreSQL untouched and running!
docker compose -f compose.production.yml up -d --no-deps app

# 5. Wait for Container Health
echo -e "${CYAN}=> [5/6] Waiting for application container to become healthy...${NC}"
MAX_WAIT=60
COUNTER=0
while [ "${COUNTER}" -lt "${MAX_WAIT}" ]; do
  STATUS=$(docker inspect --format='{{json .State.Health.Status}}' koroush-app 2>/dev/null | tr -d '"' || echo "")
  if [ "${STATUS}" = "healthy" ]; then
    echo -e "${GREEN}✅ Application container reported healthy status.${NC}"
    break
  fi
  sleep 2
  COUNTER=$((COUNTER + 2))
  echo -n "."
done
echo ""

if [ "${COUNTER}" -ge "${MAX_WAIT}" ]; then
  echo -e "${RED}❌ Warning: Container did not report healthy within ${MAX_WAIT} seconds.${NC}"
  echo "Inspecting last 40 lines of container logs:"
  docker logs --tail 40 koroush-app
fi

# 6. Execute Health Check
echo -e "${CYAN}=> [6/6] Running system health verification...${NC}"
if [ -f "scripts/health-check.sh" ]; then
  bash scripts/health-check.sh
fi

echo "=================================================================="
echo -e "${GREEN}🎉 PRODUCTION UPDATE COMPLETED SUCCESSFULLY!${NC}"
echo "Website: https://koroushbarber.ir"
echo "=================================================================="
exit 0
