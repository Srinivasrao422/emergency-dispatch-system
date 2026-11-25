# RESQDISPATCH — PRODUCTION DEPLOYMENT GUIDE

**System:** ResQDispatch Emergency Home Services Auto-Dispatch System  
**Target Environment:** Production (Containerized Docker / Cloud VM / Supabase / Vercel)  
**Document Classification:** Standard Operating Procedure (SOP)  
**Date:** November 2026  

---

## 1. System Topology & Architecture

ResQDispatch utilizes a modern decoupled three-tier architecture optimized for high availability, low-latency Socket.IO telemetry, and resilient database persistence:

```
┌────────────────────────────────────────────────────────┐
│                   DNS & CDN (Cloudflare)               │
└───────────────────────────┬────────────────────────────┘
                            │ (HTTPS / WSS)
             ┌──────────────┴──────────────┐
             │                             │
┌────────────▼───────────┐    ┌────────────▼───────────┐
│     Client Frontend    │    │      Backend Server    │
│  React 19 + Vite (SPA) │    │   Node.js 22+ / Express │
│  Hosted on Vercel/CDN  │    │  Socket.IO Real-Time   │
└────────────────────────┘    └────────────┬───────────┘
                                           │
                                ┌──────────┴──────────┐
                                │                     │
                     ┌──────────▼──────────┐ ┌────────▼──────────┐
                     │ Supabase PostgreSQL │ │ AI Registry &     │
                     │  (Session & Pooler) │ │ Telemetry Engine  │
                     └─────────────────────┘ └───────────────────┘
```

---

## 2. Prerequisites & Server Requirements

### Minimum Infrastructure Specifications
- **Operating System:** Ubuntu 22.04 LTS / Debian 12 / Alpine Linux (or Windows Server 2022)
- **CPU:** 2 vCPUs minimum (4 vCPUs recommended for surge traffic > 500 concurrent connections)
- **RAM:** 2 GB minimum (4 GB recommended for AI forecasting and Socket.IO connection tables)
- **Disk:** 20 GB SSD
- **Runtime:** Node.js v20 LTS or v22 LTS, npm v10+
- **Database:** Supabase Managed PostgreSQL v15+ (with PgBouncer connection pooler)

---

## 3. Step-by-Step Production Deployment Procedure

### Step 1: Clone Repository & Setup Filesystem
```bash
git clone https://github.com/resqdispatch/resqdispatch.git /opt/resqdispatch
cd /opt/resqdispatch/emergency-dispatch-system
```

### Step 2: Install Backend Dependencies & Generate Prisma Client
```bash
cd server
npm ci --omit=dev
npx prisma generate
```

### Step 3: Run Database Migrations
Verify that the database schema is up-to-date against the Supabase PostgreSQL cluster:
```bash
npx prisma db push
```

### Step 4: Seed Initial Data (First-Time Setup Only)
```bash
node prisma/seed.js
```

### Step 5: Build Production Client Assets
```bash
cd ../client
npm ci
npm run build
```
The compiled SPA bundle will be output to `client/dist`. The backend Express server automatically serves this static directory in production mode when `GET *` requests are received.

### Step 6: Configure Environment Variables
Copy and populate the production `.env` configuration in `server/.env`:
```bash
cp .env.example .env
nano .env
```
Ensure all required keys are populated (see [PRODUCTION_ENV_TEMPLATE.md](file:///C:/Users/dell/OneDrive/Desktop/CodeGuard%20AI%20(2)/docs/PRODUCTION_ENV_TEMPLATE.md)):
- `PORT=5000`
- `NODE_ENV=production`
- `DATABASE_URL="postgresql://<user>:<password>@<pooler-host>:5432/<dbname>?connection_limit=5&pool_timeout=20"`
- `ADMIN_KEY="<strong-random-admin-secret>"`
- `CORS_ALLOWED_ORIGINS="https://app.resqdispatch.com,https://admin.resqdispatch.com"`

---

## 4. Production Process Management (PM2)

In production environments, Node.js applications should be managed by a process manager such as **PM2** to handle automatic restarts, clustering, and log rotation.

### 4.1 Install PM2
```bash
npm install -g pm2
```

### 4.2 Start Application
Create an `ecosystem.config.cjs` file in `server/`:
```javascript
module.exports = {
  apps: [
    {
      name: 'resq-dispatch-api',
      script: 'server.js',
      instances: 1, // Single instance preserves in-memory cache and Socket.IO cluster consistency
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
```

Start the service:
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## 5. Reverse Proxy Configuration (Nginx)

Place Nginx in front of Node.js for SSL/TLS termination, HTTP/2 multiplexing, and WebSocket proxying:

```nginx
# /etc/nginx/sites-available/resqdispatch.conf

map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name app.resqdispatch.com api.resqdispatch.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.resqdispatch.com api.resqdispatch.com;

    ssl_certificate /etc/letsencrypt/live/app.resqdispatch.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.resqdispatch.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Test and reload Nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. Docker Containerization (Alternative Deployment)

To deploy using Docker, create `Dockerfile` in `server/`:
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY . .
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000
USER node
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t resqdispatch-api:latest .
docker run -d --name resq-api -p 5000:5000 --env-file .env resqdispatch-api:latest
```

---

## 7. Health Check & Validation Verification

After deployment, immediately verify health and readiness:

```bash
# 1. Liveness Probe
curl -i https://api.resqdispatch.com/api/health
# Expected: HTTP 200 {"status":"ok","uptimeSeconds":...}

# 2. Deep Readiness Probe (Verifies PostgreSQL & Memory)
curl -i https://api.resqdispatch.com/api/health/deep
# Expected: HTTP 200 {"status":"healthy","database":{"status":"healthy",...}}

# 3. Security Headers Verification
curl -I https://api.resqdispatch.com/api/health
# Confirm presence of:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: default-src 'self'...
# Absence of: X-Powered-By

# 4. Performance Telemetry
curl -i https://api.resqdispatch.com/api/metrics/performance -H "x-admin-key: <YOUR_ADMIN_KEY>"
# Expected: HTTP 200 with route-level latency report
```
