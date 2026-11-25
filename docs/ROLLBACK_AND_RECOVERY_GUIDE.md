# RESQDISPATCH — ROLLBACK & DISASTER RECOVERY RUNBOOK

**System:** ResQDispatch Emergency Home Services Auto-Dispatch System  
**Target Audience:** DevOps Engineers, Site Reliability Engineers (SRE), On-Call Technical Leads  
**Classification:** Mission-Critical Standard Operating Procedure (SOP)  
**Last Updated:** November 2026  

---

## 1. Incident Severity Classification & Escalation Matrix

When an operational incident occurs, the on-call engineer must classify the incident immediately:

| Severity | Definition | Response SLA | Target RTO | Target RPO | Example Scenario |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Core emergency dispatch failure; database unreachable; total system outage. | < 5 minutes | < 15 minutes | < 5 minutes | Database pool exhaustion; server crash-loop; TLS certificate expiry. |
| **SEV-2 (Major)** | Core service operational but degraded; telemetry or AI predictor failure. | < 15 minutes | < 1 hour | < 15 minutes | Socket.IO room disconnects; AI inference latency > 3s; rate limiter blocking valid IPs. |
| **SEV-3 (Minor)** | Non-critical component degraded; customer experience largely unaffected. | < 2 hours | < 4 hours | N/A | Admin dashboard metric chart rendering bug; export CSV failure. |

---

## 2. Disaster Recovery Targets (RTO & RPO)

- **Recovery Time Objective (RTO):** `< 15 minutes` for complete service restoration in SEV-1 incidents.
- **Recovery Point Objective (RPO):** `< 5 minutes` of maximum acceptable data loss, guaranteed by Supabase PostgreSQL Point-in-Time Recovery (PITR) with continuous write-ahead logging (WAL).

---

## 3. Application Version Rollback Runbook

### 3.1 Vercel Frontend Instant Rollback (< 60 Seconds)

If a newly deployed frontend build contains visual bugs, broken routing, or JavaScript exceptions:

1. Navigate to the **Vercel Dashboard** > **resqdispatch** > **Deployments**.
2. Identify the last known stable deployment (labeled *Production* prior to the release).
3. Click the three dots (`...`) next to the stable deployment and select **Instant Rollback (Promote to Production)**.
4. Verify the active production URL:
   ```bash
   curl -I https://resqdispatch.com
   ```
5. Confirm HTTP `200 OK` and inspect browser console in staging for error resolution.

---

### 3.2 Docker Container Backend Rollback (< 3 Minutes)

If the Node.js backend container fails health checks or exhibits uncaught exceptions:

1. **Inspect Running Service & Check Container Logs:**
   ```bash
   docker logs --tail 100 -f resqdispatch-backend
   ```
2. **Revert to Previous Docker Image Tag:**
   ```bash
   # Stop the degraded container
   docker stop resqdispatch-backend
   
   # Run the previous stable release tag (e.g., v1.5.0)
   docker run -d \
     --name resqdispatch-backend-stable \
     --restart always \
     -p 5000:5000 \
     --env-file /etc/resqdispatch/server.env \
     resqdispatch/backend:v1.5.0
     
   # Remove the failed container
   docker rm resqdispatch-backend
   docker rename resqdispatch-backend-stable resqdispatch-backend
   ```
3. **Verify Health Endpoint:**
   ```bash
   curl http://localhost:5000/api/health/deep
   ```
   *Expected Response:* `{"status":"healthy","database":{"status":"connected"}}`

---

### 3.3 Git-Based VM Rollback (< 5 Minutes)

When running directly on an Ubuntu/Debian Cloud VM via PM2:

```bash
cd /opt/resqdispatch/server

# Revert to previous release tag or commit
git fetch --all --tags
git checkout tags/v1.5.0 -b rollback-v1.5.0

# Install dependencies if lockfile changed
npm ci --only=production

# Re-generate Prisma Client
npx prisma generate

# Graceful reload zero-downtime PM2 cluster
pm2 reload resqdispatch-server --update-env

# Monitor PM2 logs
pm2 logs resqdispatch-server --lines 50
```

---

## 4. Database Disaster Recovery & Migration Rollbacks

### 4.1 Reversing Failed Prisma Migrations

If a schema migration (`prisma migrate deploy`) fails or introduces unintended database locks:

1. **Identify the Migration State:**
   ```bash
   npx prisma migrate status
   ```
2. **Mark Failed Migration as Rolled Back in Prisma Schema Table:**
   ```bash
   # Mark the migration as rolled back so Prisma will not re-attempt execution
   npx prisma migrate resolve --rolled-back "20261121_broken_migration"
   ```
3. **Apply Compensating Reverse SQL:**
   If the migration created incomplete tables or broken constraints, execute the compensating reverse SQL script via Supabase SQL Editor:
   ```sql
   -- Example: Reverting an index or table
   DROP INDEX IF EXISTS idx_service_request_customer_created;
   ```
4. **Re-sync Application State:**
   ```bash
   npx prisma generate
   ```

---

### 4.2 Restoring from Supabase Point-in-Time Recovery (PITR)

If accidental data corruption, unauthorized bulk deletion, or logical corruption occurs:

1. Log in to the **Supabase Cloud Dashboard** > Project **ResQDispatch**.
2. Navigate to **Database** > **Backups** > **Point in Time**.
3. Select the timestamp immediately preceding the incident (e.g., `2026-11-21 21:40:00 UTC`).
4. Click **Restore to New Project** (or **In-Place Restore** if supported on enterprise plan).
5. Update `DATABASE_URL` in the server environment variables with the restored instance connection string.
6. Restart backend instances to initiate automatic memory cache rehydration:
   ```bash
   pm2 restart resqdispatch-server
   ```

---

### 4.3 Manual Database Backup & Restoration (`pg_dump` / `pg_restore`)

#### Creating an Immediate Snapshot:
```bash
# Export full database schema and data
pg_dump "postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require" \
  -F c -b -v -f /backups/resqdispatch_manual_$(date +%Y%m%d_%H%M%S).dump
```

#### Restoring from Snapshot:
```bash
# Terminate active client connections to avoid locks
psql "postgresql://..." -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'postgres' AND pid <> pg_backend_pid();"

# Restore using pg_restore
pg_restore -v --clean --no-acl --no-owner -d \
  "postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require" \
  /backups/resqdispatch_manual_20261121_210000.dump
```

---

## 5. In-Memory State & Cache Rehydration Runbook

ResQDispatch utilizes a resilient hybrid architecture where PostgreSQL acts as the single source of truth, and Node.js in-memory structures cache active requests for sub-millisecond dispatch calculations.

When the server restarts or recovers from a crash:
1. `server.js` calls `initializeDatabase()`.
2. Active records are queried from PostgreSQL:
   ```javascript
   // Automatically loads customers, service requests, and technicians
   await initializeDatabase();
   ```
3. If in-memory state ever becomes desynchronized without restarting:
   ```bash
   # Trigger emergency state resynchronization via Admin API
   curl -X POST https://api.resqdispatch.com/api/admin/reset \
     -H "x-admin-key: $ADMIN_KEY" \
     -H "Content-Type: application/json"
   ```
   *Expected Response:* `{"success":true,"message":"Application state successfully reset to seed data"}`

---

## 6. Socket.IO Mass Reconnection Handling

Following an upstream network hiccup or backend restart, hundreds of connected technician and customer clients will attempt reconnection simultaneously.

### Protection Mechanisms in Place:
1. **Exponential Backoff:** The client-side Socket.IO client includes built-in randomized reconnection delays (`reconnectionDelay: 1000`, `reconnectionDelayMax: 5000`, `randomizationFactor: 0.5`).
2. **Room Guard Security:** Handshake authentication ensures unauthenticated sockets are dropped before allocating memory.
3. **Sliding Window Throttling:** Handshake rate limiting limits connection bursts to prevent connection flooding.

---

## 7. Incident Triage Runbooks for Common Failure Scenarios

### Scenario A: Supabase Connection Pool Exhaustion (`P1001` / `P2024`)

**Symptoms:**
- Log entries show: `Can't reach database server at aws-0-...` or `Timed out fetching a new connection from the connection pool`.
- Deep health check returns: `{"status":"degraded","database":{"status":"disconnected"}}`.

**Immediate Resolution Steps:**
1. Verify if `connection_limit` is configured in `DATABASE_URL`. If unset, Prisma opens unlimited connections per Node process.
2. Ensure connection string has:
   ```
   ?sslmode=require&connection_limit=10&pool_timeout=20
   ```
3. Inspect active connections on Supabase:
   ```sql
   SELECT count(*), state FROM pg_stat_activity GROUP BY state;
   ```
4. If orphaned connections exist, terminate idle connections:
   ```sql
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE state = 'idle' AND state_change < current_timestamp - INTERVAL '5 minutes';
   ```
5. Restart backend Node process.

---

### Scenario B: High Route Latency or Memory Leak (OOM)

**Symptoms:**
- `GET /api/metrics/performance` reports p95 latency > 2000ms.
- Memory usage exceeds 90% in PM2 / Docker.

**Immediate Resolution Steps:**
1. Check metrics endpoint:
   ```bash
   curl -H "x-admin-key: $ADMIN_KEY" https://api.resqdispatch.com/api/metrics/performance
   ```
2. Identify slow routes in `slowestRoutes` output.
3. Inspect Node.js garbage collection and memory usage:
   ```bash
   curl https://api.resqdispatch.com/api/health
   # Inspect "memory" object: heapUsed vs heapTotal
   ```
4. Perform rolling restart of Node worker cluster:
   ```bash
   pm2 reload resqdispatch-server
   ```

---

## 8. Post-Mortem Template

Following resolution of any SEV-1 or SEV-2 incident, complete the post-mortem report within 24 hours:

```markdown
# INCIDENT POST-MORTEM: [INCIDENT-TITLE]

**Date & Time:** [ISO 8601 Timestamp]  
**Severity:** [SEV-1 / SEV-2]  
**Lead Responder:** [Engineer Name]  
**Downtime Duration:** [X minutes]  
**Customer Impact:** [e.g., 14 emergency dispatches delayed by 3.5 minutes]  

### 1. Root Cause Analysis (5 Whys)
- Why did the outage occur?
- Why did monitoring not detect it sooner?
- Why was the mitigation delayed?

### 2. Timeline of Events
- HH:MM - First alert triggered.
- HH:MM - Responder acknowledged incident.
- HH:MM - Rollback executed.
- HH:MM - Deep health checks verified green.

### 3. Action Items & Preventative Measures
- [ ] Action Item 1 (Owner: SRE)
- [ ] Action Item 2 (Owner: Backend)
```
