#!/usr/bin/env bash
# ==============================================================================
# Koroush Barber — Production Comprehensive Health Check Script
# Domain: koroushbarber.ir
# Usage: bash scripts/health-check.sh [--verbose]
# ==============================================================================

set -uo pipefail

VERBOSE="${1:-}"

GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
NC="\033[0m"

pass() {
  echo -e "  [${GREEN}PASS${NC}] $1"
}

fail() {
  echo -e "  [${RED}FAIL${NC}] $1"
}

warn() {
  echo -e "  [${YELLOW}WARN${NC}] $1"
}

info() {
  echo -e "  [${CYAN}INFO${NC}] $1"
}

echo "=================================================================="
echo "  KOROUSH BARBER — PRODUCTION SYSTEM HEALTH CHECK"
echo "  Date: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=================================================================="

FAILED=0

# ------------------------------------------------------------------------------
# 1. Docker Daemon Status
# ------------------------------------------------------------------------------
echo "📌 Check 1: Docker Daemon Status"
if systemctl is-active --quiet docker 2>/dev/null || docker info >/dev/null 2>&1; then
  pass "Docker daemon is active and running."
else
  fail "Docker daemon is NOT running!"
  FAILED=$((FAILED + 1))
fi

# ------------------------------------------------------------------------------
# 2. PostgreSQL Container Status & Readiness
# ------------------------------------------------------------------------------
echo "📌 Check 2: PostgreSQL Database Container"
if docker ps --format '{{.Names}}' | grep -q "^koroush-postgres$"; then
  pass "Container 'koroush-postgres' is running."

  # Test database connectivity
  if docker exec koroush-postgres pg_isready -U koroush_user -d koroush_barber >/dev/null 2>&1; then
    pass "PostgreSQL database 'koroush_barber' is accepting connections."
  else
    fail "PostgreSQL 'pg_isready' check failed!"
    FAILED=$((FAILED + 1))
  fi

  # Check table presence
  TABLE_COUNT=$(docker exec koroush-postgres psql -U koroush_user -d koroush_barber -t -c \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")
  if [ "${TABLE_COUNT}" -ge 5 ]; then
    pass "Database schema initialized (${TABLE_COUNT} public tables found)."
  else
    fail "Database schema incomplete (${TABLE_COUNT} tables found)."
    FAILED=$((FAILED + 1))
  fi
else
  fail "Container 'koroush-postgres' is not running!"
  FAILED=$((FAILED + 1))
fi

# ------------------------------------------------------------------------------
# 3. Next.js Application Container Status
# ------------------------------------------------------------------------------
echo "📌 Check 3: Next.js Application Container"
if docker ps --format '{{.Names}}' | grep -q "^koroush-app$"; then
  pass "Container 'koroush-app' is running."

  # Inspect internal healthcheck status
  HEALTH_STATUS=$(docker inspect --format='{{json .State.Health.Status}}' koroush-app 2>/dev/null | tr -d '"' || echo "unknown")
  if [ "${HEALTH_STATUS}" = "healthy" ]; then
    pass "Container internal healthcheck is reporting: healthy."
  elif [ "${HEALTH_STATUS}" = "starting" ]; then
    warn "Container internal healthcheck is currently starting up."
  else
    warn "Container health status is: ${HEALTH_STATUS}"
  fi
else
  fail "Container 'koroush-app' is not running!"
  FAILED=$((FAILED + 1))
fi

# ------------------------------------------------------------------------------
# 4. Next.js Internal HTTP Endpoints (127.0.0.1:3000)
# ------------------------------------------------------------------------------
echo "📌 Check 4: Local Application Endpoints"
# Check /api/health
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health 2>/dev/null || echo "000")
if [ "${HEALTH_CODE}" -eq 200 ]; then
  pass "Endpoint GET /api/health returned HTTP 200 OK."
else
  fail "Endpoint GET /api/health returned HTTP ${HEALTH_CODE} (Expected: 200)."
  FAILED=$((FAILED + 1))
fi

# Check Homepage
HOME_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null || echo "000")
if [ "${HOME_CODE}" -eq 200 ]; then
  pass "Homepage GET / returned HTTP 200 OK."
else
  fail "Homepage GET / returned HTTP ${HOME_CODE} (Expected: 200)."
  FAILED=$((FAILED + 1))
fi

# Check Admin Login Page
ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/admin-login 2>/dev/null || echo "000")
if [ "${ADMIN_CODE}" -eq 200 ]; then
  pass "Admin Login page GET /admin-login returned HTTP 200 OK."
else
  fail "Admin Login page returned HTTP ${ADMIN_CODE} (Expected: 200)."
  FAILED=$((FAILED + 1))
fi

# Check Booking Services API
SERVICES_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/booking/services 2>/dev/null || echo "000")
if [ "${SERVICES_CODE}" -eq 200 ]; then
  pass "Services API GET /api/booking/services returned HTTP 200 OK."
else
  fail "Services API returned HTTP ${SERVICES_CODE} (Expected: 200)."
  FAILED=$((FAILED + 1))
fi

# ------------------------------------------------------------------------------
# 5. Nginx Reverse Proxy Service
# ------------------------------------------------------------------------------
echo "📌 Check 5: Host Nginx Web Server"
if command -v nginx >/dev/null 2>&1; then
  if systemctl is-active --quiet nginx 2>/dev/null; then
    pass "Nginx systemd service is active."

    # Validate Nginx configuration syntax
    if nginx -t >/dev/null 2>&1; then
      pass "Nginx configuration syntax validation: OK."
    else
      fail "Nginx configuration has syntax errors (run 'nginx -t')."
      FAILED=$((FAILED + 1))
    fi
  else
    warn "Nginx is installed but not active."
  fi
else
  info "Nginx is not installed directly on this host environment."
fi

# ------------------------------------------------------------------------------
# 6. Domain & Public SSL Status
# ------------------------------------------------------------------------------
echo "📌 Check 6: Domain & SSL Verification (koroushbarber.ir)"
DOMAIN="koroushbarber.ir"
RESOLVED_IP=$(getent ahosts "${DOMAIN}" 2>/dev/null | awk '{print $1}' | head -n 1 || echo "")

if [ -n "${RESOLVED_IP}" ]; then
  pass "Domain '${DOMAIN}' resolves to: ${RESOLVED_IP}"
  
  # Check HTTPS response if SSL is active
  HTTPS_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "https://${DOMAIN}/" 2>/dev/null || echo "000")
  if [ "${HTTPS_CODE}" -eq 200 ] || [ "${HTTPS_CODE}" -eq 301 ] || [ "${HTTPS_CODE}" -eq 308 ]; then
    pass "Public HTTPS probe to https://${DOMAIN}/ returned HTTP ${HTTPS_CODE}."
  else
    warn "Public HTTPS probe to https://${DOMAIN}/ returned HTTP ${HTTPS_CODE} (Certificate or DNS pending)."
  fi
else
  warn "Domain '${DOMAIN}' is not yet resolving in public DNS (Configure A record)."
fi

# ------------------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------------------
echo "=================================================================="
if [ "${FAILED}" -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL CORE PRODUCTION HEALTH CHECKS PASSED SUCCESSFULLY!${NC}"
  exit 0
else
  echo -e "${RED}❌ HEALTH CHECK FAILED: ${FAILED} critical checks did not pass.${NC}"
  exit 1
fi
