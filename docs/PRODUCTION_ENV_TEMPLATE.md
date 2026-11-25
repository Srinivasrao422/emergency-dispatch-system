# RESQDISPATCH — PRODUCTION ENVIRONMENT CONFIGURATION TEMPLATE

**System:** ResQDispatch Emergency Home Services Auto-Dispatch System  
**Target Environment:** Staging & Production Deployment  
**Document Classification:** Security & Operations Reference  
**Last Updated:** November 2026  

---

## 1. Overview & Security Protocols

This document defines the complete environment variable specification for deploying **ResQDispatch** across production and staging environments. 

> [!CAUTION]
> **Zero-Trust Credential Policy:**
> - Never commit `.env`, `.env.production`, or real secret keys to source control.
> - Ensure `.env*` patterns are strictly maintained in `.gitignore`.
> - Utilize a dedicated Secret Management service (e.g., AWS Secrets Manager, HashiCorp Vault, Vercel Environment Variables, or Doppler) in production.
> - Rotate all cryptographic keys (`ADMIN_KEY`, `JWT_SECRET`, database passwords) on a regular 90-day cadence.

---

## 2. Server Environment Variables (`server/.env`)

Below is the exhaustive reference template for the Node.js/Express backend server:

```dotenv
# ==============================================================================
# RESQDISPATCH BACKEND PRODUCTION ENVIRONMENT SPECIFICATION
# Copy this file to .env in your production environment and supply live secrets.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. APPLICATION CORE & RUNTIME
# ------------------------------------------------------------------------------
# Node.js execution mode ('production', 'staging', or 'development')
# In 'production', verbose stack traces and raw SQL error messages are strictly masked.
NODE_ENV=production

# Network port for HTTP and Socket.IO server
PORT=5000

# Host binding address ('0.0.0.0' binds to all network interfaces for containerization)
HOST=0.0.0.0

# Base URL of the backend API (used for absolute URL generation and webhooks)
SERVER_BASE_URL=https://api.resqdispatch.com

# ------------------------------------------------------------------------------
# 2. POSTGRESQL & PRISMA ORM PERSISTENCE
# ------------------------------------------------------------------------------
# Primary Connection String: Pooled connection via Supabase PgBouncer (Transaction mode)
# Must include connection pooling parameters:
#   - sslmode=require (Mandatory SSL in production)
#   - connection_limit=10 (Max concurrent clients per Node process)
#   - pool_timeout=20 (Seconds to wait for a pool connection before timeout)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[STRONG_DB_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require&connection_limit=10&pool_timeout=20"

# Direct Connection String: Unpooled direct session connection to PostgreSQL (Port 5432)
# Required exclusively by Prisma CLI for running schema migrations (prisma migrate deploy)
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[STRONG_DB_PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"

# ------------------------------------------------------------------------------
# 3. SECURITY & CRYPTOGRAPHY
# ------------------------------------------------------------------------------
# Master Administrative API Key for Command Tower access (passed via x-admin-key header)
# Minimum requirement: 64-character high-entropy hexadecimal or alphanumeric string
# Generate via: openssl rand -hex 32
ADMIN_KEY=sec_prod_live_9f8b4c2a1e0d3f6b8a7c5e9d2b4a6f8c1e3d5a7b9c0e2f4a6b8d0e2f4a6b8d0e

# JSON Web Token Secret (used for signing session tokens and technician auth)
# Minimum requirement: 64-character high-entropy secret
# Generate via: openssl rand -base64 48
JWT_SECRET=c2VjcmV0X3Byb2RfdmFsaWRfand0X2hpZ2hfZW50cm9weV82NF9ieXRlc19zdHJpbmdfZXhhbXBsZQ==
JWT_EXPIRATION=24h

# Cross-Origin Resource Sharing (CORS) Allowlist
# Comma-separated list of fully-qualified origins permitted to query the API
CORS_ALLOWED_ORIGINS=https://resqdispatch.com,https://admin.resqdispatch.com,https://resqdispatch.vercel.app

# ------------------------------------------------------------------------------
# 4. TRAFFIC CONTROL & RATE LIMITING
# ------------------------------------------------------------------------------
# General API Sliding Window Rate Limiter
RATE_LIMIT_API_WINDOW_MS=900000     # 15 minutes in milliseconds
RATE_LIMIT_API_MAX=300              # Maximum requests per client IP per window

# Authentication & Admin Endpoint Rate Limiter (Brute-force protection)
RATE_LIMIT_AUTH_WINDOW_MS=900000    # 15 minutes in milliseconds
RATE_LIMIT_AUTH_MAX=25              # Maximum auth attempts per client IP per window

# Emergency Dispatch Creation Rate Limiter (Flood protection)
RATE_LIMIT_DISPATCH_WINDOW_MS=60000 # 1 minute
RATE_LIMIT_DISPATCH_MAX=10          # Maximum emergency submissions per minute per IP

# ------------------------------------------------------------------------------
# 5. SOCKET.IO REAL-TIME CONFIGURATION
# ------------------------------------------------------------------------------
# Heartbeat ping timeout in milliseconds (detects dropped technician mobile connections)
SOCKET_PING_TIMEOUT=20000

# Heartbeat ping interval in milliseconds
SOCKET_PING_INTERVAL=25000

# Strict CORS origin for WebSocket handshakes
SOCKET_CORS_ORIGIN=https://resqdispatch.com,https://admin.resqdispatch.com,https://resqdispatch.vercel.app

# ------------------------------------------------------------------------------
# 6. ARTIFICIAL INTELLIGENCE & MACHINE LEARNING
# ------------------------------------------------------------------------------
# Inference Engine Mode: 'heuristic' (Built-in deterministic ML) or 'hybrid_llm'
AI_INFERENCE_ENGINE=heuristic

# Optional External LLM API Provider for generative customer summaries ('openai', 'gemini', 'anthropic')
AI_PROVIDER=none
AI_API_KEY=

# Model identifier if external LLM provider is active
AI_MODEL_ID=gemini-1.5-pro

# Confidence threshold for auto-dispatch acceptance (0.0 to 1.0)
AI_AUTO_DISPATCH_CONFIDENCE_THRESHOLD=0.85

# ------------------------------------------------------------------------------
# 7. FINANCIAL LEDGER & PAYMENT GATEWAY INTEGRATION
# ------------------------------------------------------------------------------
# Note: ResQDispatch features an internal double-entry ledger for wallet accounting.
# For live card/UPI settlement, configure external payment gateway credentials:
PAYMENT_GATEWAY_PROVIDER=razorpay   # Options: 'razorpay', 'stripe', 'mock'
PAYMENT_GATEWAY_ENV=production      # 'sandbox' or 'production'

# Razorpay / Stripe Public & Secret Keys (Leave empty for internal ledger mode)
PAYMENT_GATEWAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx
PAYMENT_GATEWAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYMENT_GATEWAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Currency standard
SYSTEM_CURRENCY=INR
CURRENCY_SYMBOL=₹

# ------------------------------------------------------------------------------
# 8. GEOSPATIAL & TELEPHONY NOTIFICATIONS
# ------------------------------------------------------------------------------
# Map Tile Provider URL template (OpenStreetMap or Mapbox)
MAP_TILE_PROVIDER_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png

# Optional Mapbox Access Token for high-res satellite / terrain maps
MAPBOX_ACCESS_TOKEN=

# SMS / WhatsApp Notification Gateway (e.g., Twilio, MSG91) for emergency alerts
SMS_GATEWAY_ENABLED=false
SMS_GATEWAY_API_KEY=
SMS_SENDER_ID=RESQDP
```

---

## 3. Client Environment Variables (`client/.env.production`)

Below is the configuration required during Vite build time for the React frontend:

```dotenv
# ==============================================================================
# RESQDISPATCH CLIENT PRODUCTION BUILD SPECIFICATION
# All variables exposed to Vite client-side bundle MUST start with VITE_
# ==============================================================================

# Backend REST API endpoint URL
VITE_API_URL=https://api.resqdispatch.com

# Backend Socket.IO real-time telemetry endpoint URL
VITE_SOCKET_URL=https://api.resqdispatch.com

# Default Map Center Coordinates (Delhi NCR: Lat 28.6139, Lng 77.2090)
VITE_MAP_DEFAULT_LAT=28.6139
VITE_MAP_DEFAULT_LNG=77.2090
VITE_MAP_DEFAULT_ZOOM=12

# Environment Identifier
VITE_APP_ENV=production

# Feature Flags
VITE_ENABLE_AI_PREDICTOR=true
VITE_ENABLE_HEATMAP_OVERLAY=true
VITE_ENABLE_STREET_VIEW=false
```

---

## 4. Environment-by-Environment Matrix

| Variable | Development (Local) | Staging | Production |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `development` | `staging` | `production` |
| `PORT` | `5000` | `5000` | `5000` or Cloud `$PORT` |
| `DATABASE_URL` | Local PG / Supabase Dev | Supabase Staging Pooler | Supabase Prod Pooler (`connection_limit=10`) |
| `DIRECT_URL` | Local PG / Supabase Dev | Supabase Staging (5432) | Supabase Prod (5432) |
| `ADMIN_KEY` | `admin123` | `stg_sec_...` | High-Entropy 64-char Hex |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | `https://staging.resqdispatch.com` | `https://resqdispatch.com,...` |
| `RATE_LIMIT_API_MAX` | `1000` | `500` | `300` |
| `RATE_LIMIT_AUTH_MAX` | `100` | `50` | `25` |
| `AI_INFERENCE_ENGINE` | `heuristic` | `heuristic` | `heuristic` / `hybrid_llm` |
| `PAYMENT_GATEWAY_ENV` | `mock` | `sandbox` | `production` |

---

## 5. Security & Validation Checklist Before Startup

Before executing `npm run start` or deploying Docker containers, run this automated verification checklist:

- [ ] **Check 1: Masked Logs** — Confirm `NODE_ENV=production` so stack traces are masked.
- [ ] **Check 2: Entropy Validation** — Confirm `ADMIN_KEY` is not the default `admin123` or empty.
- [ ] **Check 3: Pooler Parameters** — Verify `DATABASE_URL` includes `connection_limit` and `pool_timeout`.
- [ ] **Check 4: CORS Isolation** — Ensure `CORS_ALLOWED_ORIGINS` does not contain `*` (wildcard).
- [ ] **Check 5: Health Check Probe** — Execute `curl https://api.resqdispatch.com/api/health` to confirm `status: "healthy"`.
