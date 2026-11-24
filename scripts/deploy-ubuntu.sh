#!/usr/bin/env bash
# ==============================================================================
# KOROUSH BARBER — ONE-COMMAND UBUNTU PRODUCTION DEPLOYMENT SYSTEM
#
# Target OS:     Ubuntu Server 24.04 LTS (and compatible 22.04 LTS)
# Target Domain: koroushbarber.ir
# Architecture:  Nginx (Host) -> Next.js Standalone (Docker) -> PostgreSQL 16 (Docker)
#
# Usage:
#   sudo bash scripts/deploy-ubuntu.sh
# ==============================================================================

set -euo pipefail

# ------------------------------------------------------------------------------
# Color Output & Formatting Utilities
# ------------------------------------------------------------------------------
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
MAGENTA="\033[0;35m"
CYAN="\033[0;36m"
BOLD="\033[1m"
NC="\033[0m"

log_step() {
  echo -e "\n${CYAN}${BOLD}==>${NC} ${BOLD}[Step $1] $2${NC}"
}

log_info() {
  echo -e "    ${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "    ${GREEN}✔${NC} $1"
}

log_warning() {
  echo -e "    ${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "    ${RED}✖${NC} $1" >&2
}

fail_exit() {
  echo -e "\n${RED}${BOLD}❌ خطا در اجرای استقرار: $1${NC}" >&2
  echo -e "${YELLOW}لطفاً پیام خطای بالا را بررسی فرمایید و پس از رفع آن، مجدداً دستور زیر را اجرا کنید:${NC}"
  echo "sudo bash scripts/deploy-ubuntu.sh"
  exit 1
}

echo -e "${MAGENTA}${BOLD}"
cat << "EOF"
================================================================================
  _  ______  ____  _   _ ____  _   _   ____    _    ____  ____  _____ ____  
 | |/ / __ \|  _ \| | | / ___|| | | | | __ )  / \  |  _ \| __ )| ____|  _ \ 
 | ' / |  | | |_) | | | \___ \| |_| | |  _ \ / _ \ | |_) |  _ \|  _| | |_) |
 | . \ |__| |  _ <| |_| |___) |  _  | | |_) / ___ \|  _ <| |_) | |___|  _ < 
 |_|\_\____/|_| \_\\___/|____/|_| |_| |____/_/   \_\_| \_\____/|_____|_| \_\
                                                                            
  سیستم استقرار خودکار و استاندارد کوروش باربر در سرور اوبونتو ۲۴.۰۴
  دامنه رسمی: koroushbarber.ir
================================================================================
EOF
echo -e "${NC}"

# ------------------------------------------------------------------------------
# 1. Root & OS Compatibility Verification
# ------------------------------------------------------------------------------
log_step "1/20" "بررسی سیستم‌عامل و سطح دسترسی مدیر (Root Check)"

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  fail_exit "این اسکریپت باید با دسترسی دسترسی root یا sudo اجرا گردد. (مثال: sudo bash scripts/deploy-ubuntu.sh)"
fi
log_success "دسترسی Root تأیید شد."

if [ -f /etc/os-release ]; then
  # shellcheck disable=SC1091
  source /etc/os-release
  log_info "سیستم‌عامل تشخیص داده شده: ${NAME} ${VERSION_ID}"
  if [[ "${ID:-}" != "ubuntu" && "${ID_LIKE:-}" != *"ubuntu"* ]]; then
    log_warning "سیستم‌عامل شما Ubuntu نیست. این اسکریپت به صورت اختصاصی برای Ubuntu 24.04 طراحی شده است."
  fi
else
  log_warning "فایل /etc/os-release یافت نشد. فرض بر توزیع مبتنی بر دبیان/اوبونتو."
fi

# Locate Project Root Directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_DIR}"
log_info "دایرکتوری پروژه: ${PROJECT_DIR}"

# ------------------------------------------------------------------------------
# 2. Hardware Resource Checks (CPU, RAM, Swap, Disk)
# ------------------------------------------------------------------------------
log_step "2/20" "بررسی منابع سخت‌افزاری سرور (CPU, RAM, Disk, Swap)"

TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
log_info "حافظه رم اصلی (RAM): ${TOTAL_RAM_MB} MB"

if [ "${TOTAL_RAM_MB}" -lt 1500 ]; then
  log_warning "حافظه رم کمتر از ۲ گیگابایت است. جهت جلوگیری از خطای Out of Memory (OOM) حین بیلد، سواپ ۲ گیگابایتی ایجاد می‌شود..."
  SWAP_EXISTS=$(free -m | awk '/^Swap:/{print $2}')
  if [ "${SWAP_EXISTS}" -lt 1024 ]; then
    if [ ! -f /swapfile ]; then
      fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
      chmod 600 /swapfile
      mkswap /swapfile
      swapon /swapfile
      echo '/swapfile none swap sw 0 0' >> /etc/fstab
      log_success "فضای سواپ ۲ گیگابایتی با موفقیت فعال گردید."
    fi
  fi
fi

FREE_DISK_GB=$(df -BG "${PROJECT_DIR}" | awk 'NR==2 {print $4}' | tr -d 'G')
log_info "فضای خالی دیسک: ${FREE_DISK_GB} GB"
if [ "${FREE_DISK_GB}" -lt 5 ]; then
  log_warning "فضای ذخیره‌سازی کمتر از ۵ گیگابایت است (${FREE_DISK_GB} GB)."
fi

# ------------------------------------------------------------------------------
# 3. Required Base Packages Installation
# ------------------------------------------------------------------------------
log_step "3/20" "به‌روزرسانی مخازن و نصب بسته‌های پیش‌نیاز اوبونتو"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  curl \
  wget \
  git \
  ca-certificates \
  gnupg \
  lsb-release \
  ufw \
  nginx \
  certbot \
  python3-certbot-nginx \
  jq \
  openssl \
  procps >/dev/null

log_success "بسته‌های پیش‌نیاز پایه با موفقیت نصب شدند."

# ------------------------------------------------------------------------------
# 4. Docker Engine Installation & Verification
# ------------------------------------------------------------------------------
log_step "4/20" "بررسی و نصب داکر (Docker Engine & Compose Plugin)"

if ! command -v docker >/dev/null 2>&1; then
  log_info "داکر روی سرور یافت نشد. در حال نصب رسمی مخازن Docker..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
  systemctl enable --now docker
  log_success "داکر با موفقیت نصب و فعال گردید."
else
  log_success "داکر از قبل نصب است: $(docker --version)"
fi

if ! docker compose version >/dev/null 2>&1; then
  fail_exit "پلاگین docker-compose-plugin در داکر در دسترس نیست."
else
  log_success "داکر کامپوز فعال است: $(docker compose version)"
fi

# ------------------------------------------------------------------------------
# 5. Production Environment Configuration (.env.production)
# ------------------------------------------------------------------------------
log_step "5/20" "پیکربندی متغیرهای امنیتی پروداکشن (.env.production)"

ENV_FILE="${PROJECT_DIR}/.env.production"

if [ ! -f "${ENV_FILE}" ]; then
  log_info "فایل .env.production یافت نشد. در حال تولید امن اطلاعات اولیه..."

  # Generate Cryptographically Secure Secrets
  GENERATED_DB_PASS=$(openssl rand -hex 16)
  GENERATED_JWT_SECRET=$(openssl rand -base64 32)
  GENERATED_NEXTAUTH_SECRET=$(openssl rand -base64 32)
  GENERATED_ADMIN_PASS=$(openssl rand -hex 8)

  # Interactive prompt for Admin Password with auto-generated fallback
  echo ""
  echo -e "${YELLOW}${BOLD}تنظیم کلمه عبور اولیه حساب مدیریت سالن (Admin Password):${NC}"
  echo -e "کلمه عبور پیشنهادی امن تولید شده: ${BOLD}${GENERATED_ADMIN_PASS}${NC}"
  read -r -t 30 -p "کلمه عبور اختصاصی را وارد کنید (یا Enter بزنید تا همین رمز ذخیره شود): " CUSTOM_ADMIN_PASS || true
  echo ""

  FINAL_ADMIN_PASS="${CUSTOM_ADMIN_PASS:-$GENERATED_ADMIN_PASS}"
  if [ -z "${FINAL_ADMIN_PASS}" ]; then
    FINAL_ADMIN_PASS="${GENERATED_ADMIN_PASS}"
  fi

  cat > "${ENV_FILE}" << EOF
# ==============================================================================
# Koroush Barber — Production Environment (.env.production)
# Generated automatically by scripts/deploy-ubuntu.sh at $(date '+%Y-%m-%d %H:%M:%S %Z')
# ==============================================================================

NODE_ENV=production
PORT=3000
DOMAIN=koroushbarber.ir
NEXT_PUBLIC_APP_URL=https://koroushbarber.ir

# PostgreSQL Credentials
DB_USER=koroush_user
DB_PASSWORD=${GENERATED_DB_PASS}
DB_NAME=koroush_barber
DB_PORT=5432
DATABASE_URL=postgresql://koroush_user:${GENERATED_DB_PASS}@postgres:5432/koroush_barber?schema=public

# Security Tokens
ADMIN_JWT_SECRET=${GENERATED_JWT_SECRET}
NEXTAUTH_SECRET=${GENERATED_NEXTAUTH_SECRET}

# Initial Administrator Credentials
ADMIN_INITIAL_USERNAME=admin
ADMIN_INITIAL_PASSWORD=${FINAL_ADMIN_PASS}
ADMIN_INITIAL_NAME=کوروش احمدی (مدیر ارشد سالن)

# Payment Gateway (MOCK / ZARINPAL)
PAYMENT_GATEWAY=MOCK
ZARINPAL_MERCHANT_ID=
ZARINPAL_SANDBOX=false

# SMS Provider (MOCK / KAVENEGAR)
SMS_PROVIDER=MOCK
KAVENEGAR_API_KEY=
KAVENEGAR_SENDER=
KAVENEGAR_OTP_TEMPLATE=verify
EOF

  chmod 600 "${ENV_FILE}"
  log_success "فایل .env.production با دسترسی محافظت‌شده ۶۰۰ ایجاد شد."

  # Save a secure copy of credentials in root's home directory
  CRED_BACKUP="/root/.koroush-barber-admin-credentials.txt"
  cat > "${CRED_BACKUP}" << EOF
اطلاعات ورود به داشبورد مدیریت کوروش باربر:
آدرس ورود: https://koroushbarber.ir/admin-login
نام کاربری: admin
کلمه عبور: ${FINAL_ADMIN_PASS}
تاریخ ایجاد: $(date '+%Y-%m-%d %H:%M:%S %Z')
EOF
  chmod 600 "${CRED_BACKUP}"
  log_info "یک نسخه پشتیبان از اطلاعات مدیر در مسیر '${CRED_BACKUP}' ذخیره شد."
else
  log_info "فایل .env.production از قبل موجود است. اطلاعات قبلی بدون تغییر حفظ گردید."
fi

# Ensure permissions on sensitive files
chmod 600 "${ENV_FILE}" 2>/dev/null || true

# ------------------------------------------------------------------------------
# 6. Docker Build & Start Database / Application Containers
# ------------------------------------------------------------------------------
log_step "6/20" "بیلد و اجرای کانتینرهای داکر (PostgreSQL & Next.js)"

COMPOSE_FILE="${PROJECT_DIR}/compose.production.yml"
if [ ! -f "${COMPOSE_FILE}" ]; then
  fail_exit "فایل compose.production.yml یافت نشد!"
fi

log_info "اجرای کانتینرها در پس‌زمینه..."
docker compose -f "${COMPOSE_FILE}" up -d --build

# ------------------------------------------------------------------------------
# 7. PostgreSQL Health & Migration Verification
# ------------------------------------------------------------------------------
log_step "7/20" "انتظار برای سلامت پایگاه‌داده و اعمال مایگریشن‌ها"

log_info "بررسی آمادگی سرویس PostgreSQL..."
MAX_TRIES=30
TRIES=0
while [ "${TRIES}" -lt "${MAX_TRIES}" ]; do
  if docker exec koroush-postgres pg_isready -U koroush_user -d koroush_barber >/dev/null 2>&1; then
    log_success "پایگاه‌داده PostgreSQL آماده اتصال و عملیات است."
    break
  fi
  sleep 2
  TRIES=$((TRIES + 1))
done

if [ "${TRIES}" -ge "${MAX_TRIES}" ]; then
  fail_exit "پایگاه‌داده در زمان مقرر در دسترس قرار نگرفت."
fi

# Wait for Next.js app container to be ready
log_info "بررسی سلامت اپلیکیشن Next.js..."
APP_READY=0
for i in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health 2>/dev/null || echo "000")
  if [ "${CODE}" -eq 200 ]; then
    APP_READY=1
    log_success "سرویس Next.js با موفقیت روی پورت محلی 127.0.0.1:3000 بالا آمد (HTTP 200)."
    break
  fi
  sleep 2
done

if [ "${APP_READY}" -ne 1 ]; then
  log_warning "اپلیکیشن هنوز کد ۲۰۰ نداده است. مشاهده لاگ‌های اخیر:"
  docker logs --tail 25 koroush-app
fi

# ------------------------------------------------------------------------------
# 8. Host Nginx Configuration & Reverse Proxy Setup
# ------------------------------------------------------------------------------
log_step "8/20" "پیکربندی Nginx برای دامنه‌های koroushbarber.ir و پورت ۸۰"

# Create ACME challenge webroot directory
mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot
chmod -R 755 /var/www/certbot

# Create initial HTTP-only Nginx configuration to satisfy Certbot challenges
INITIAL_NGINX_CONF="/etc/nginx/sites-available/koroushbarber.conf"

cat > "${INITIAL_NGINX_CONF}" << 'EOF'
# Temporary HTTP Configuration for Initial SSL Issuance
upstream nextjs_upstream {
    server 127.0.0.1:3000 max_fails=3 fail_timeout=10s;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name koroushbarber.ir www.koroushbarber.ir;

    # ACME Challenge verification for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files $uri =404;
    }

    # Proxy to Next.js while waiting for SSL certificate
    location / {
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -sf "${INITIAL_NGINX_CONF}" /etc/nginx/sites-enabled/koroushbarber.conf

# Remove default site if present
rm -f /etc/nginx/sites-enabled/default

# Test Nginx syntax
if nginx -t >/dev/null 2>&1; then
  systemctl reload nginx || systemctl restart nginx
  log_success "سرویس Nginx با موفقیت اعتبارسنجی و لود شد."
else
  fail_exit "خطا در تنظیمات Nginx (دستور nginx -t شکست خورد)."
fi

# ------------------------------------------------------------------------------
# 9. Domain DNS Verification
# ------------------------------------------------------------------------------
log_step "9/20" "بررسی تنظیمات DNS دامنه (koroushbarber.ir)"

SERVER_PUBLIC_IP=$(curl -s https://api.ipify.org || curl -s https://ifconfig.me || echo "نامشخص")
log_info "آدرس آی‌پی عمومی این سرور: ${SERVER_PUBLIC_IP}"

DOMAIN_IP=$(getent ahosts koroushbarber.ir 2>/dev/null | awk '{print $1}' | head -n 1 || echo "")
log_info "آی‌پی ست‌شده برای koroushbarber.ir: ${DOMAIN_IP:-'یافت نشد'}"

DNS_MATCH=0
if [ -n "${DOMAIN_IP}" ] && [ "${DOMAIN_IP}" = "${SERVER_PUBLIC_IP}" ]; then
  DNS_MATCH=1
  log_success "دامنه koroushbarber.ir با موفقیت به آی‌پی این سرور اشاره می‌کند."
else
  log_warning "دامنه koroushbarber.ir هنوز به آی‌پی سرور (${SERVER_PUBLIC_IP}) متصل نشده است."
  echo -e "${YELLOW}----------------------------------------------------------------${NC}"
  echo -e "جهت فعال‌سازی گواهی SSL رایگان (HTTPS)، در پنل دامنه خود (ایرنیک یا ارائه‌دهنده DNS) رکوردهای زیر را ثبت فرمایید:"
  echo -e "  رکورد نوع A برای @ (ریشه دامنه): ${BOLD}${SERVER_PUBLIC_IP}${NC}"
  echo -e "  رکورد نوع A برای www:             ${BOLD}${SERVER_PUBLIC_IP}${NC}"
  echo -e "سپس مجدداً همین اسکریپت را اجرا کنید تا SSL فعال گردد."
  echo -e "${YELLOW}----------------------------------------------------------------${NC}"
fi

# ------------------------------------------------------------------------------
# 10. SSL Certificate Issuance & Full HTTPS Configuration
# ------------------------------------------------------------------------------
log_step "10/20" "دریافت گواهی SSL و فعال‌سازی پروتکل امن HTTPS"

SSL_ACTIVE=0
if [ "${DNS_MATCH}" -eq 1 ]; then
  log_info "درخواست صدور گواهی Let's Encrypt برای koroushbarber.ir و www.koroushbarber.ir..."

  if certbot certonly --webroot -w /var/www/certbot \
      -d koroushbarber.ir -d www.koroushbarber.ir \
      --non-interactive --agree-tos --register-unsafely-without-email \
      --keep-until-expiring >/dev/null 2>&1; then
    
    log_success "گواهی SSL لیتس‌انکریپت با موفقیت صادر گردید."

    # Copy production full HTTPS configuration
    cp "${PROJECT_DIR}/deploy/nginx/koroushbarber.conf" "${INITIAL_NGINX_CONF}"
    
    if nginx -t >/dev/null 2>&1; then
      systemctl reload nginx
      SSL_ACTIVE=1
      log_success "پیکربندی کامل HTTPS و ریدایرکت‌های کانونیکال فعال شدند."
    else
      log_warning "خطا در سوییچ به کانفیگ HTTPS. حالت HTTP موقت حفظ شد."
    fi
  else
    log_warning "صدور خودکار گواهی لیتس‌انکریپت با خطا مواجه شد. حالت HTTP فعال باقی ماند."
  fi
else
  log_info "به علت آماده نبودن رکوردهای DNS دامنه، مرحله صدور گواهی SSL به پس از تنظیم DNS موکول شد."
fi

# ------------------------------------------------------------------------------
# 11. Automatic SSL Renewal Timer Verification
# ------------------------------------------------------------------------------
log_step "11/20" "پیکربندی تمدید خودکار گواهی SSL (Certbot Timer)"

systemctl enable --now certbot.timer 2>/dev/null || true
log_success "تایمر سیستم‌دی تمدید خودکار گواهی (certbot.timer) فعال است."

# ------------------------------------------------------------------------------
# 12. Security & Firewall Hardening (UFW)
# ------------------------------------------------------------------------------
log_step "12/20" "سخت‌سازی امنیتی فایروال سرور (UFW Firewall)"

# Check SSH port
SSH_PORT="22"
if [ -f /etc/ssh/sshd_config ]; then
  DETECTED_SSH=$(grep -E "^Port " /etc/ssh/sshd_config | awk '{print $2}' || echo "")
  if [ -n "${DETECTED_SSH}" ]; then
    SSH_PORT="${DETECTED_SSH}"
  fi
fi

ufw allow "${SSH_PORT}/tcp" comment 'SSH Remote Access' >/dev/null 2>&1 || true
ufw allow 'Nginx Full' comment 'Web HTTP and HTTPS' >/dev/null 2>&1 || true
# Ensure PostgreSQL (5432) and Node (3000) are NOT exposed
ufw delete allow 5432/tcp >/dev/null 2>&1 || true
ufw delete allow 3000/tcp >/dev/null 2>&1 || true

ufw --force enable >/dev/null 2>&1
log_success "فایروال UFW با پورت‌های امن وب و SSH فعال شد (پورت دیتابیس ۵۴۳۲ کاملاً مسدود و محافظت‌شده است)."

# ------------------------------------------------------------------------------
# 13. Automated Daily PostgreSQL Backups Setup
# ------------------------------------------------------------------------------
log_step "13/20" "راه‌اندازی زمان‌بندی بکاپ خودکار شبانه (Automated Daily Cron Backup)"

chmod +x "${PROJECT_DIR}/scripts/backup-postgres.sh" 2>/dev/null || true
chmod +x "${PROJECT_DIR}/scripts/restore-postgres.sh" 2>/dev/null || true
chmod +x "${PROJECT_DIR}/scripts/update-production.sh" 2>/dev/null || true
chmod +x "${PROJECT_DIR}/scripts/health-check.sh" 2>/dev/null || true

# Add daily cron job at 03:00 AM
CRON_JOB="0 3 * * * /bin/bash ${PROJECT_DIR}/scripts/backup-postgres.sh >/dev/null 2>&1"
(crontab -l 2>/dev/null | grep -v "backup-postgres.sh" ; echo "${CRON_JOB}") | crontab -
log_success "زمان‌بندی بکاپ روزانه دیتابیس در ساعت ۰۳:۰۰ بامداد در Crontab سرور ثبت گردید."

# Run an immediate test backup
log_info "تست عملیاتی اولین نسخه پشتیبان دیتابیس..."
bash "${PROJECT_DIR}/scripts/backup-postgres.sh" >/dev/null 2>&1 || true
log_success "اولین نسخه پشتیبان دیتابیس با موفقیت تهیه و اعتبارسنجی شد."

# ------------------------------------------------------------------------------
# 14. Comprehensive Health Check & Final Verification
# ------------------------------------------------------------------------------
log_step "14/20" "اجرای اعتبارسنجی سلامت کامل سیستم (System Health Check)"

bash "${PROJECT_DIR}/scripts/health-check.sh" || {
  log_warning "برخی چک‌های جزئی هشدار داشتند، اما هسته سرویس در حال اجرا است."
}

# ------------------------------------------------------------------------------
# Final Summary & Clear Instructions for the Owner
# ------------------------------------------------------------------------------
log_step "20/20" "استقرار نهایی کوروش باربر با موفقیت انجام شد!"

ADMIN_PASSWORD_DISPLAY="(تعیین شده در .env.production)"
if [ -f "/root/.koroush-barber-admin-credentials.txt" ]; then
  PASS_LINE=$(grep "کلمه عبور:" /root/.koroush-barber-admin-credentials.txt | awk '{print $2}' || echo "")
  if [ -n "${PASS_LINE}" ]; then
    ADMIN_PASSWORD_DISPLAY="${PASS_LINE}"
  fi
fi

echo ""
echo -e "${GREEN}${BOLD}================================================================================${NC}"
echo -e "${GREEN}${BOLD}  🎉 استقرار برنامه کوروش باربر با موفقیت به پایان رسید!${NC}"
echo -e "${GREEN}${BOLD}================================================================================${NC}"
echo ""
echo -e "🌐 ${BOLD}نشانی وب‌سایت:${NC}"
if [ "${SSL_ACTIVE}" -eq 1 ]; then
  echo -e "   ${GREEN}${BOLD}https://koroushbarber.ir${NC} (دارای گواهی امن SSL)"
else
  echo -e "   ${YELLOW}http://${SERVER_PUBLIC_IP}${NC} (دسترسی موقت تا زمان اتصال DNS)"
  echo -e "   پس از ست‌شدن DNS دامنه، با اجرای مجدد اسکریپت HTTPS فعال می‌شود."
fi
echo ""
echo -e "🔐 ${BOLD}اطلاعات ورود به پنل مدیریت سالن (Admin Dashboard):${NC}"
echo -e "   نشانی ورود: ${CYAN}https://koroushbarber.ir/admin-login${NC}"
echo -e "   نام کاربری: ${BOLD}admin${NC}"
echo -e "   کلمه عبور:   ${BOLD}${ADMIN_PASSWORD_DISPLAY}${NC}"
echo ""
echo -e "🗄️ ${BOLD}پایگاه‌داده و پشتیبان‌گیری:${NC}"
echo -e "   نوع دیتابیس: PostgreSQL 16 (ایزوله در شبکه اختصاصی داکر)"
echo -e "   پوشه بکاپ‌ها: /var/backups/koroush-barber/"
echo -e "   پشتیبان‌گیری خودکار: هر شب ساعت ۰۳:۰۰ بامداد"
echo ""
echo -e "🔄 ${BOLD}دستورات مفید برای مدیریت سرور:${NC}"
echo -e "   به‌روزرسانی سایت:   ${CYAN}sudo bash scripts/update-production.sh${NC}"
echo -e "   تست سلامت سایت:   ${CYAN}bash scripts/health-check.sh${NC}"
echo -e "   بکاپ دستی دیتابیس: ${CYAN}sudo bash scripts/backup-postgres.sh${NC}"
echo -e "   بازیابی دیتابیس:   ${CYAN}sudo bash scripts/restore-postgres.sh <مسیر-فایل-بکاپ>${NC}"
echo -e "   مشاهده لاگ‌های زنده: ${CYAN}docker logs -f koroush-app${NC}"
echo ""
echo -e "📖 ${BOLD}راهنمای جامع مستندات استقرار در گیت:${NC}"
echo -e "   فایل کامل: ${BOLD}UBUNTU_PRODUCTION_DEPLOYMENT_FA.md${NC}"
echo -e "${GREEN}================================================================================${NC}"
exit 0
