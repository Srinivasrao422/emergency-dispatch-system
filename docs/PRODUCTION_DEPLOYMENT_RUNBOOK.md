# RESQDISPATCH — Phase 11: Production Readiness, Security Validation & Real-User Pilot Preparation
## Production Deployment Runbook

**Document Version:** 1.0.0  
**Deployment Target:** Staging & Production Pilot  
**Date:** November 2026  
**Audience:** Platform Reliability Engineers, DevOps Engineers, Infrastructure Leads

---

## 1. Production Architecture Overview

```
[ Customer Mobile / Web ]    [ Technician Mobile / PWA ]    [ Admin Command Tower ]
           │                               │                                │
           └───────────────────────┬────────────────────────────────────────┘
                                   │ HTTPS / WSS
                                   ▼
                      [ Vercel CDN / Frontend Edge ]
                           (Static React 19 Bundle)
                                   │
                                   │ HTTPS Reverse Proxy
                                   ▼
                      [ Node.js + Express Backend ]
                     (Docker Container / Cloud Host)
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
[ Supabase PostgreSQL ]    [ OSRM Routing Engine ]     [ Razorpay Gateway ]
 (Prisma Connection Pool)   (Dedicated Microservice)      (Payment Sandbox)
```

---

## 2. Infrastructure Specifications & Hosting Recommendations

### 2.1 Frontend Hosting (Client)
- **Recommended Platform:** Vercel, Cloudflare Pages, or AWS S3 + CloudFront.
- **Framework Preset:** Vite / React.
- **Root Directory:** `emergency-dispatch-system/client`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables (Client):**
  - `VITE_API_URL`: `https://api.resqdispatch.com` (or production backend domain)
  - `VITE_SOCKET_URL`: `https://api.resqdispatch.com`

### 2.2 Backend Hosting (Server)
- **Recommended Platform:** Render, Fly.io, Railway, or AWS ECS Fargate (Docker-based).
- **Runtime:** Node.js 22 LTS or 20 LTS.
- **Scaling Baseline:** Minimum 2 instances with horizontal auto-scaling triggered at $70\%$ CPU utilization.
- **Health Check Path:** `GET /api/health` (HTTP 200 required for load balancer health probes).
- **Deep Health Check:** `GET /api/health/deep` (monitors DB latency, memory, connected WebSockets).

---

## 3. Environment Variable Configuration

### 3.1 Production Environment Variables Template (`.env.production`)

```ini
# ==============================================================================
# RESQDISPATCH — PRODUCTION ENVIRONMENT CONFIGURATION
# ==============================================================================

# Core Application Settings
NODE_ENV=production
PORT=5000
APP_NAME=ResQDispatch
APP_BASE_URL=https://app.resqdispatch.com

# Cryptographic & Administrative Secrets
JWT_SECRET=production_super_secret_cryptographic_jwt_key_min_64_characters_long!
ADMIN_KEY=production_admin_tower_secure_random_hex_key_2026

# Database Connectivity (Supabase PostgreSQL via Connection Pooler)
DATABASE_URL=postgresql://postgres.xxx:strong_password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&pool_timeout=20
DIRECT_URL=postgresql://postgres.xxx:strong_password@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres

# Security & CORS Allowlisting
CORS_ALLOWED_ORIGINS=https://app.resqdispatch.com,https://admin.resqdispatch.com,https://tech.resqdispatch.com
OTP_EXPIRY_MS=3600000

# Razorpay Payment Gateway (Test Mode for Pilot / Live for Full Commercial)
RAZORPAY_KEY_ID=rzp_test_YourRazorpayKeyHere
RAZORPAY_KEY_SECRET=YourRazorpaySecretHere
RAZORPAY_WEBHOOK_SECRET=YourWebhookSecretHere
RAZORPAY_CURRENCY=INR

# External Routing Provider
OSRM_BASE_URL=http://router.project-osrm.org
ROUTING_FALLBACK_FACTOR=1.35

# External Notifications (WhatsApp Cloud API / MSG91)
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
MSG91_AUTH_KEY=
MSG91_SENDER_ID=RESQDP

# Supabase Cloud Media Storage
SUPABASE_STORAGE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
```

---

## 4. Pre-Deployment Verification Checklist

Before triggering a production deployment:

1. [x] **Database Schema:** Confirm all Prisma migrations are applied non-destructively:
   ```powershell
   npx prisma migrate deploy
   ```
2. [x] **Automated Regression:** Execute full platform regression suite (all 12 phases passing):
   ```powershell
   node run-full-platform-regression.js
   ```
3. [x] **Client Production Build:** Verify clean Vite compilation without syntax or chunk errors:
   ```powershell
   npm run build
   ```
4. [x] **Health Check Endpoint:** Verify `/api/health` returns status `ok` and `/api/health/deep` reports `healthy`.
5. [x] **Secrets Hygiene:** Verify no passwords, API keys, or JWT secrets are hardcoded in git tracked files.

---

## 5. Deployment Execution & Zero-Downtime Rollback

### 5.1 Deployment Steps (Docker / Container)
```bash
# 1. Build and tag container image
docker build -t resqdispatch-backend:1.0.0 .

# 2. Run local container smoke test
docker run -p 5000:5000 --env-file .env.production resqdispatch-backend:1.0.0

# 3. Push to container registry
docker tag resqdispatch-backend:1.0.0 registry.resqdispatch.com/backend:1.0.0
docker push registry.resqdispatch.com/backend:1.0.0

# 4. Perform Rolling Update on ECS / Kubernetes / Render
# Ensures active WebSocket connections and en-route dispatches are not abruptly terminated.
```

### 5.2 Emergency Rollback Procedure
If a critical production defect is detected post-deployment:
1. **Immediate Traffic Rollback:** Revert load balancer routing to previous stable container tag (e.g. `resqdispatch-backend:0.9.8`).
2. **Frontend Rollback:** In Vercel / Cloudflare dashboard, click "Instant Rollback" to previous deployment hash (instantaneous, $< 2\text{ seconds}$).
3. **Database Safeguard:** Database migrations are strictly non-destructive (adding optional columns, never dropping existing columns). Reverting application containers requires zero database downtime or schema rollback.
4. **State Verification:** Invoke `/api/health/deep` to confirm in-memory state restoration and database connectivity.
