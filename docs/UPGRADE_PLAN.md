# ResQDispatch — Emergency Home Services Auto-Dispatch System
# Master Engineering Upgrade & Production Roadmap

**Document Status**: **Awaiting Stakeholder Approval**  
**Engineering Policy**: **PLANNING ONLY. Do not implement upgrades until formal approval is granted.**  
**Project Objective**: Transform ResQDispatch from a high-performing interactive prototype into a hardened, horizontally scalable, production-grade emergency dispatch platform.  

---

## 1. Upgrade Phase Overview

```mermaid
flowchart TD
    subgraph Phase 1: Foundation & Security [Immediate Priority - Estimated: 1-2 Weeks]
        P1A[Database Persistence: PostgreSQL + Prisma OR MongoDB + Mongoose]
        P1B[Cryptographic Authentication: JWT + Bcrypt + HttpOnly Cookies]
        P1C[Security Middleware: Helmet + Rate Limiting + Strict CORS]
        P1D[Input Validation: Zod Schema Validation]
    end

    subgraph Phase 2: Media & Cloud Storage [Estimated: 1 Week]
        P2A[Cloudflare R2 / AWS S3 Presigned URLs]
        P2B[Decouple Base64 from Node.js RAM & WebSocket Payloads]
        P2C[Image Optimization & Thumbnails]
    end

    subgraph Phase 3: Live External Integrations [Estimated: 2 Weeks]
        P3A[Stripe Connect / Razorpay Live Payment Gateway]
        P3B[Twilio SMS & WhatsApp Doorstep OTP Alerts]
        P3C[Mapbox / Google Maps Distance Matrix Routing]
    end

    subgraph Phase 4: Scalability & DevOps [Estimated: 1-2 Weeks]
        P4A[Socket.io Redis Pub/Sub Adapter for Horizontal Clustering]
        P4B[Docker & Docker Compose Containerization]
        P4C[GitHub Actions CI/CD Pipeline & Automated Tests]
    end

    Phase 1 --> Phase 2
    Phase 2 --> Phase 3
    Phase 3 --> Phase 4
```

---

## 2. Detailed Phase 1 Plan: Foundation & Security Hardening (Recommended Immediate Next Step)

### 2.1 Database Integration & Data Model Persistence
- **Technology Choice**: **PostgreSQL** with **Prisma ORM** (or **MongoDB** with **Mongoose**).
- **Core Entities to Model**:
  1. `User`: `id`, `email` (unique), `passwordHash`, `role` (`CUSTOMER`, `TECHNICIAN`, `ADMIN`), `name`, `phone`, `avatarUrl`, `address`, `coordinates`.
  2. `TechnicianProfile`: `userId` (1:1), `category`, `rating`, `reviewCount`, `isOnline`, `status` (`IDLE`, `ASSIGNED`, `EN_ROUTE`, `WORKING`), `currentLocation`, `walletBalance`, `earningsToday`, `vehicleType`, `vehiclePlate`.
  3. `EmergencyRequest`: `id` (`REQ-XXXX`), `customerId`, `category`, `priority`, `issueDescription`, `location`, `status`, `assignedTechnicianId`, `otp`, `otpVerified`, `invoiceId`, `beforePhotoUrl`, `afterPhotoUrl`, `resolutionNotes`, `partsUsed`.
  4. `Invoice`: `requestId` (1:1), `inspectionFee`, `emergencyLabor`, `prioritySurcharge`, `totalAmount`, `isPaid`, `paidAt`, `paymentMethod`.
  5. `DispatchAttempt`: `requestId`, `technicianId`, `score`, `distanceKm`, `outcome` (`PENDING`, `ACCEPTED`, `REJECTED`, `TIMEOUT`), `timestamp`.
- **Preservation Strategy**: Seed initial database tables with existing 6 specialist profiles and 6 service categories from `mockData.js`, ensuring zero visual disruption to current UI components.

### 2.2 Production Authentication & Cryptographic Session Security
- **Credential Storage**: Hash passwords using **bcryptjs** (12 rounds) or **Argon2id**.
- **Token Strategy**:
  - Issue cryptographically signed Access Tokens (15-minute expiry) and Refresh Tokens (7-day expiry) stored in `HttpOnly`, `SameSite=Strict`, `Secure` cookies.
  - Implement Express middleware:
    - `requireAuth`: Validates JWT claims and attaches authenticated user entity to `req.user`.
    - `requireRole(['admin', 'technician'])`: Enforces server-side authorization boundaries.
- **Frontend Refactor**: Update `AppContext.jsx` to communicate with `/api/auth/login` and `/api/auth/me` without breaking the current persona switcher UX.

### 2.3 API Hardening & Middleware Stack
- **Rate Limiting**:
  - Global API: 120 requests / minute per IP.
  - OTP Verification (`/api/requests/:id/verify-otp`): Maximum 5 attempts per 10 minutes per request.
  - Emergency Creation: 5 requests / 15 minutes per customer account to prevent malicious ticket flooding.
- **Security Headers**: Install and configure `helmet()` to enforce Content Security Policy, HSTS, and X-Content-Type-Options.
- **CORS Configuration**: Restrict allowed origins to production domains via `process.env.ALLOWED_ORIGINS`.
- **Request Validation**: Implement **Zod** schemas for every mutation endpoint (`POST /api/requests`, `POST /api/requests/:id/verify-otp`, `POST /api/technicians/:id/payout`).

---

## 3. Phase 2 Plan: Production Cloud Media Storage

- **Problem in Current Code**: Photos are encoded as Base64 strings, requiring a 50MB body parser limit and storing raw image bytes directly in RAM.
- **Proposed Solution**:
  1. Client requests a presigned upload URL from `/api/uploads/presigned-url`.
  2. Server generates a signed PUT URL for AWS S3 or Cloudflare R2 bucket.
  3. Client uploads image binary directly to the object store.
  4. Client submits public CDN URL (`https://cdn.resqdispatch.com/...`) to `/api/requests/:id/photos`.
  5. Express body parser limit is safely lowered from `50mb` back to standard `100kb`.

---

## 4. Phase 3 Plan: Live Production Integrations

### 4.1 Payment Gateway (Stripe Connect / Razorpay)
- Replace mock settlement in `PaymentModal.jsx` with **Stripe Elements**:
  - Customer completes payment via PaymentIntent.
  - Server verifies webhook signature (`payment_intent.succeeded`) before updating invoice status to `PAID`.
  - Automatic split payout: 85% instantly transferred to technician's connected Stripe Express account; 15% platform commission retained.

### 4.2 Automated SMS & WhatsApp Alerts (Twilio API)
- On emergency dispatch: Send automated WhatsApp/SMS message to customer containing real-time tracking link and the **4-digit doorstep security OTP**.
- On dispatch timeout: Send high-priority SMS alert to technician device.

### 4.3 Real-World Geospatial Map Routing
- Supplement OpenStreetMap with **Mapbox Directions API** or **Google Maps Distance Matrix**:
  - Provide true road-network distance and live traffic congestion adjustments instead of straight-line Haversine approximations.

---

## 5. Phase 4 Plan: Distributed Clustering & Containerization

- **Socket.io Redis Adapter**: Install `@socket.io/redis-adapter` to allow horizontal multi-instance node scaling behind an AWS Application Load Balancer or Render cluster.
- **Dockerization**:
  - Multi-stage `Dockerfile` for Vite frontend compilation and static asset serving.
  - Production Node.js server container running non-root `node` process.
  - `docker-compose.yml` orchestrating PostgreSQL, Redis, and ResQDispatch server.
- **CI/CD Pipeline**: GitHub Actions workflow running `npm run lint`, `npm run build`, and automated integration test suites on every pull request.

---

## 6. Risk Assessment & Preservation Matrix

| Risk Factor | Impact | Mitigation Strategy |
| :--- | :---: | :--- |
| **Breaking Demo Auto-Pilot** | High | Keep `startAutomatedDemoProgression()` and `advanceNextMilestone()` intact as a switchable "Evaluation Mode" in settings. |
| **Component Disruption** | Medium | Maintain identical response JSON contracts in API routes so frontend pages (`LiveTrackingPage`, `AdminDashboard`) require zero redesign. |
| **Database Migration Downtime** | Low | Implement seeding scripts that automatically populate initial categories, specialists, and seed users upon container initialization. |

---

## 7. Explicit Architecture Checkpoint

> [!CAUTION]
> **AUDITOR CHECKPOINT: DO NOT IMPLEMENT UPGRADES AUTOMATICALLY.**  
> Under the strict instructions of this audit, no code modifications have been made.  
> Review the five generated audit reports in `docs/` and grant approval before initiating Phase 1 implementation.
