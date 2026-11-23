# Koroush Barber (آرایشگاه کوروش) — Production Deployment & Operations Guide

> **Target Market**: Iran (fa-IR)  
> **Stack**: Next.js 14 (App Router, Standalone), Prisma ORM, PostgreSQL 16 (or SQLite for single-node), Docker Compose, Tailwind CSS  
> **Integrations**: ZarinPal Payment Gateway, Kavenegar SMS Gateway

---

## 1. Infrastructure Architecture

For high availability and minimal latency for Iranian domestic visitors, host the application on a Linux VPS situated within domestic data centers (e.g., Afranet, Asiatech, Pars Online) or a European provider with clean routing to Iran (e.g., Hetzner), paired with an Iranian CDN edge (such as ArvanCloud or Cloudflare with SNI bypass).

```mermaid
flowchart TD
    Client["Customer Mobile / Desktop (Iran)"] --> CDN["CDN / Reverse Proxy (Caddy / Nginx / ArvanCloud)"]
    CDN -->|Port 443 / HTTPS| App["Next.js 14 Standalone Container (Port 3000)"]
    App -->|Prisma Connection Pool| DB[("PostgreSQL 16 Database")]
    App -->|REST API (HTTPS)| ZarinPal["ZarinPal Gateway (zarinpal.com)"]
    App -->|REST API (HTTPS)| Kavenegar["Kavenegar SMS API (api.kavenegar.com)"]
```

---

## 2. Server Prerequisites

On a clean Ubuntu 22.04 / 24.04 LTS server:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker & Docker Compose Plugin
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

---

## 3. Deployment Procedure (Docker Compose)

### Step 1: Clone Repository & Configure Environment

```bash
git clone https://github.com/your-org/koroush-barber.git /opt/koroush-barber
cd /opt/koroush-barber

# Copy environment template
cp .env.example .env
```

### Step 2: Configure Production Secrets

Edit `.env` and configure production parameters:

```bash
nano .env
```

Key variables to update:
```dotenv
# App Domain
NEXT_PUBLIC_APP_URL="https://koroushbarber.ir"

# Strong Random Secrets (Generate with: openssl rand -hex 32)
ADMIN_JWT_SECRET="e93b4f62d85a1098..."
NEXTAUTH_SECRET="e93b4f62d85a1098..."

# PostgreSQL Credentials
DB_USER="koroush_user"
DB_PASSWORD="SuperSecurePostgresPassword2026!"
DB_NAME="koroush_barber"

# Payment Gateway (ZarinPal Live)
PAYMENT_GATEWAY="ZARINPAL"
ZARINPAL_MERCHANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
ZARINPAL_SANDBOX="false"

# Iranian SMS Provider (Kavenegar)
SMS_PROVIDER="KAVENEGAR"
KAVENEGAR_API_KEY="YourKavenegarApiKeyHere"
KAVENEGAR_SENDER="10008663"
KAVENEGAR_OTP_TEMPLATE="koroush-verify"

# Initial Database Seed (set true on initial launch, then false)
SEED_DATABASE="true"
```

### Step 3: Build & Launch Containers

```bash
docker compose up -d --build
```

Monitor logs during initialization:
```bash
docker compose logs -f app
```

Verify health check:
```bash
curl -I http://localhost:3000/api/health
# Returns HTTP 200 with {"status":"ok","db":"connected","time":"..."}
```

---

## 4. HTTPS & Reverse Proxy Configuration

### Option A: Caddy Server (Recommended — Automatic SSL & HTTP/3)

Install Caddy:
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Create `/etc/caddy/Caddyfile`:
```caddy
koroushbarber.ir, www.koroushbarber.ir {
    encode gzip zstd

    # Security headers
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Proxy to Docker container
    reverse_proxy localhost:3000
}
```

Reload Caddy:
```bash
sudo systemctl reload caddy
```

### Option B: Nginx with Let's Encrypt / Certbot

Create `/etc/nginx/sites-available/koroushbarber.ir`:
```nginx
server {
    listen 80;
    server_name koroushbarber.ir www.koroushbarber.ir;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name koroushbarber.ir www.koroushbarber.ir;

    ssl_certificate /etc/letsencrypt/live/koroushbarber.ir/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/koroushbarber.ir/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/koroushbarber.ir /etc/nginx/sites-enabled/
sudo certbot --nginx -d koroushbarber.ir -d www.koroushbarber.ir
sudo systemctl restart nginx
```

---

## 5. Live Iranian Provider Provisioning Checklist

### A. ZarinPal Gateway Checklist
1. **Merchant Verification**: Sign into [ZarinPal Merchant Panel](https://next.zarinpal.com) and ensure the merchant account is verified (احراز هویت طلایی).
2. **Merchant ID**: Obtain the 36-character UUID from your active gateway in the panel.
3. **Callback URL**: Ensure the public URL set in `.env` (`NEXT_PUBLIC_APP_URL`) matches your registered domain. Callbacks resolve to `https://koroushbarber.ir/api/booking/callback`.
4. **IP Whitelisting**: If IP whitelisting is enabled in ZarinPal, add your server's static outbound IP.
5. **Currency Alignment**: All internal prices are in **Toman (تومان)**. The gateway provider automatically translates amounts to **Rials (x10)** when calling ZarinPal API.

### B. Kavenegar SMS Gateway Checklist
1. **API Key**: Retrieve your API key from Kavenegar dashboard.
2. **OTP Lookup Template (الگوی اعتبارسنجی)**:
   - Create a template named `koroush-verify` in Kavenegar console.
   - Text format: `کد تایید ورود به کوروش باربر: %token%`
   - Test that it sends in under 5 seconds (bypasses blacklist/بلک‌لیست مخابراتی).
3. **Dedicated Sender Line**: Ensure `KAVENEGAR_SENDER` is configured with your 1000/9000 service line for booking confirmation and reminder SMS messages.

---

## 6. Database Operations & Backups

### Automated Backup Script
Run automated backups using `scripts/backup-db.sh`:
```bash
chmod +x ./scripts/backup-db.sh ./scripts/restore-db.sh
./scripts/backup-db.sh
```
This produces a gzip-compressed dump in `./backups/` and automatically prunes backups older than 30 days.

### Configure Nightly Cron Job
Set up a daily cron task at 03:00 AM Tehran Time (23:30 UTC):
```bash
crontab -e
```
Add:
```cron
30 23 * * * /opt/koroush-barber/scripts/backup-db.sh >> /var/log/koroush-backup.log 2>&1
```

### Database Restoration Procedure
In case of server migration or recovery:
```bash
./scripts/restore-db.sh ./backups/koroush_backup_YYYYMMDD_HHMMSS.sql.gz
```

---

## 7. Admin Bootstrap & Security Hardening

1. **Default Credentials**:
   - Initial OWNER account: `admin` / `admin123456`
   - Initial STAFF account: `staff` / `staff123456`
2. **Change Passwords Immediately**:
   - Log in at `https://koroushbarber.ir/admin-login`.
   - Update admin credentials in the database or admin settings.
3. **Admin URL Protection**:
   - The `/admin/*` routes are protected via Next.js Edge Middleware and return `X-Robots-Tag: noindex, nofollow, noarchive`.
   - Optional: Restrict `/admin*` and `/api/admin/*` access in Caddy/Nginx to specific management IP addresses.

---

## 8. Verification & Acceptance Testing

Before directing live traffic to the application, run the automated acceptance test suite:

```bash
npm run test:acceptance
```
Expected output:
```
✔ All 25/25 automated acceptance scenarios passed (Exit Code 0).
```
