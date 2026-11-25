# ResQDispatch — Database Architecture Specification (Phase 1)

## 1. Overview & Architectural Philosophy

The **ResQDispatch** Emergency Home Services platform operates as a high-velocity, real-time logistics and dispatch coordination system. The core design philosophy for Phase 1 is **Incremental, Non-Destructive Modernization** via a **Dual-Mode Persistence Architecture**.

```mermaid
graph TD
    subgraph Client ["Frontend (React + Vite)"]
        UI[Emergency UI & Telemetry]
        SocketClient[Socket.io Real-Time Client]
    end

    subgraph Server ["Backend (Node.js + Express)"]
        Routes[Express REST API Endpoints]
        Engine[Auto-Dispatch Engine (30s TTL)]
        DBService[Dual-Mode Database Service Layer]
        MemState[(In-Memory State Fallback)]
    end

    subgraph Persistence ["PostgreSQL & Prisma"]
        PrismaORM[Prisma Client v6.4.0]
        Postgres[(PostgreSQL Database)]
    end

    UI -->|HTTP POST/PUT/GET| Routes
    SocketClient <-->|Events & Telemetry| Engine
    Routes --> Engine
    Routes --> DBService
    Engine --> DBService
    DBService -->|If Connected| PrismaORM
    DBService -->|If Offline / Fallback| MemState
    PrismaORM -->|SQL Queries / Pooled Conn| Postgres
```

### Key Pillars
1. **Zero Downtime / Zero Crashing**: PostgreSQL connectivity checks utilize a 2,500ms timeout probe (`verifyDatabaseConnection()`). If the PostgreSQL server is offline or unreachable, the system automatically falls back to in-memory state with zero unhandled exceptions.
2. **Strict Preservation of Existing Contracts**: All existing frontend API routes (`/api/requests`, `/api/technicians`, etc.) and Socket.io event signatures (`request_assigned`, `technician_location_update`, `emergency_broadcast`) remain 100% backward-compatible.
3. **Safe Real-Time Execution**: All database operations are invoked asynchronously and guarded with exception boundaries, ensuring that database I/O latency never blocks real-time dispatch timers, Haversine scoring loops, or Socket.io event emissions.

---

## 2. Relational Entity-Relationship Diagram (ERD)

The Prisma schema defines 7 core models reflecting real-world emergency dispatch operations:

```mermaid
erDiagram
    CUSTOMER ||--o{ SERVICE_REQUEST : places
    SERVICE_CATEGORY ||--o{ TECHNICIAN : classifies
    SERVICE_CATEGORY ||--o{ SERVICE_REQUEST : categorizes
    TECHNICIAN ||--o{ SERVICE_REQUEST : fulfills
    TECHNICIAN ||--o{ DISPATCH_ASSIGNMENT : receives
    SERVICE_REQUEST ||--o{ DISPATCH_ASSIGNMENT : cascades
    SERVICE_REQUEST ||--|| INVOICE : generates
    SERVICE_REQUEST ||--o{ SERVICE_HISTORY : logs

    CUSTOMER {
        string id PK
        string name
        string email UK
        string passwordHash
        string phone
        string address
        float latitude
        float longitude
        datetime createdAt
    }

    SERVICE_CATEGORY {
        string id PK
        string name
        string description
        string icon
        string badge
        float baseRate
        int slaMinutes
        int activeCount
    }

    TECHNICIAN {
        string id PK
        string name
        string email UK
        string passwordHash
        string role
        string phone
        string avatar
        string categoryId FK
        string categoryName
        float rating
        int reviewCount
        boolean isOnline
        string status
        float currentLat
        float currentLng
        string currentAddress
        float workingRadiusKm
        int completedJobsToday
        float walletBalance
        float earningsToday
        string activeRequestId
        string vehicleType
        string vehiclePlate
    }

    SERVICE_REQUEST {
        string id PK
        string customerId FK
        string customerName
        string customerPhone
        string categoryId FK
        string categoryName
        string priority
        string issueDescription
        string address
        float latitude
        float longitude
        string imageUrl
        string status
        string assignedTechnicianId FK
        datetime assignedAt
        datetime acceptedAt
        datetime enRouteAt
        datetime arrivedAt
        datetime workStartedAt
        datetime completedAt
        datetime cancelledAt
        string cancelReason
        string escalatedReason
        float distanceKm
        int etaMinutes
        float currentScore
        int timeoutRemaining
        string otp
        boolean otpVerified
        string resolutionNotes
        string partsUsed
        string beforePhoto
        string afterPhoto
        int rating
        string feedback
        datetime createdAt
        datetime updatedAt
    }

    DISPATCH_ASSIGNMENT {
        string id PK
        string requestId FK
        string technicianId FK
        string technicianName
        float score
        float distanceKm
        string outcome
        datetime assignedAt
    }

    INVOICE {
        string id PK
        string requestId FK,UK
        float inspectionFee
        float emergencyLabor
        float prioritySurcharge
        float totalAmount
        boolean isPaid
        string paymentMethod
        datetime paidAt
        datetime createdAt
    }

    SERVICE_HISTORY {
        string id PK
        string requestId FK
        string status
        string notes
        string updatedBy
        datetime timestamp
    }
```

---

## 3. Database Schema Models & Fields Specification

### 3.1 `Customer` (`customers`)
Represents residential and commercial users requesting emergency service.
- `id` (String, PK): Unique customer identifier (e.g., `u_cust_1`).
- `name` (String): Full name of customer.
- `email` (String, Unique): Contact and login email.
- `passwordHash` (String): Bcrypt salted hash (cost factor 10).
- `phone` (String): Emergency contact phone number.
- `address` (String): Default residential address.
- `latitude` / `longitude` (Float): Geospatial coordinates for emergency geolocation.
- `createdAt` / `updatedAt` (DateTime): Audit timestamps.

### 3.2 `ServiceCategory` (`service_categories`)
Represents emergency domains (Electrical, Plumbing, HVAC, Locksmith, Gas Leak, Roofing).
- `id` (String, PK): Slug identifier (`electrical`, `plumbing`, etc.).
- `name` (String): Human-readable name.
- `description` (String): Scope of emergency repairs.
- `icon` (String): Icon key for UI rendering.
- `badge` (String): SLA badge (e.g., `< 15m Response`).
- `baseRate` (Float): Minimum call-out fee.
- `slaMinutes` (Int): Emergency arrival SLA window.
- `activeCount` (Int): Number of active field incidents in category.

### 3.3 `Technician` (`technicians`)
Represents licensed field contractors and emergency rapid-response personnel.
- `id` (String, PK): Unique specialist identifier (`t_elec_1`, `t_plumb_1`, etc.).
- `name` (String): Full professional name.
- `email` (String, Unique): Technician login email.
- `passwordHash` (String): Bcrypt salted hash (`tech123` hashed in seed).
- `role` (String, Default: `technician`): Persona designation.
- `phone` (String): Mobile dispatch phone line.
- `avatar` (String): Verified photo URL.
- `categoryId` (String, FK): Foreign key referencing `ServiceCategory`.
- `rating` (Float): Algorithmic dispatch quality weight ($R$).
- `reviewCount` (Int): Historical completed review volume.
- `isOnline` (Boolean): Master duty toggle switch.
- `status` (String): `idle` | `assigned` | `en_route` | `in_progress` | `offline`.
- `currentLat` / `currentLng` (Float): Live GPS tracking coordinates.
- `workingRadiusKm` (Float): Geofence filter threshold ($R_{\max}$).
- `walletBalance` / `earningsToday` (Float): Financial ledger tracking.
- `activeRequestId` (String, Nullable): Currently bound emergency incident.
- Indexes: `[categoryId]`, `[isOnline, status]`.

### 3.4 `ServiceRequest` (`service_requests`)
The central entity for incident tracking, dispatching, and resolution.
- `id` (String, PK): Unique incident ticket (`REQ-xxxx`).
- `customerId` (String, FK): Requesting customer.
- `categoryId` (String, FK): Emergency trade required.
- `priority` (String): `CRITICAL` | `HIGH` | `MEDIUM` | `STANDARD`.
- `issueDescription` (String): Problem narrative reported by customer.
- `latitude` / `longitude` (Float): Incident site coordinates.
- `status` (String): `pending` | `assigned` | `accepted` | `en_route` | `arrived` | `in_progress` | `completed` | `cancelled` | `escalated`.
- `assignedTechnicianId` (String, FK, Nullable): Currently assigned specialist.
- `otp` (String, Nullable): 4-digit arrival security PIN.
- `otpVerified` (Boolean): Confirms technician physical on-site presence.
- `resolutionNotes` / `partsUsed` (String, Nullable): Post-repair technical summary.
- `beforePhoto` / `afterPhoto` (String, Nullable): Diagnostic photographic evidence.
- `rating` (Int, Nullable): Customer feedback score (1-5 stars).
- Indexes: `[status]`, `[categoryId]`, `[assignedTechnicianId]`.

### 3.5 `DispatchAssignment` (`dispatch_assignments`)
Audit log of every auto-dispatch candidate evaluation and acceptance attempt.
- `id` (String, PK): Auto-generated UUID.
- `requestId` (String, FK): Incident ID.
- `technicianId` (String, FK): Candidate evaluated.
- `score` (Float): Composite algorithmic score ($S = w_d D_{\text{norm}} + w_r (1 - R_{\text{norm}}) + \dots$).
- `distanceKm` (Float): Haversine distance at dispatch time.
- `outcome` (String): `pending` | `accepted` | `declined` | `timed_out` | `cancelled`.
- `assignedAt` (DateTime): Timestamp of offer issuance.

### 3.6 `Invoice` (`invoices`)
Financial billing record linked one-to-one with an emergency service request.
- `id` (String, PK): Auto-generated UUID.
- `requestId` (String, FK, Unique): Bound emergency incident.
- `inspectionFee` / `emergencyLabor` / `prioritySurcharge` / `totalAmount` (Float): Itemized breakdown.
- `isPaid` (Boolean): Settlement status.
- `paymentMethod` (String, Nullable): e.g., `Apple Pay`, `Credit Card`, `Direct Wallet`.
- `paidAt` (DateTime, Nullable): Timestamp of payment clearance.

### 3.7 `ServiceHistory` (`service_histories`)
Immutable chronological telemetry log tracking state transitions.
- `id` (String, PK): Auto-generated UUID.
- `requestId` (String, FK): Target request.
- `status` (String): State reached.
- `notes` (String, Nullable): Transition context or error logs.
- `updatedBy` (String): Identity triggering transition (`system`, `technician`, `customer`, `admin`).
- `timestamp` (DateTime): High-resolution transition time.

---

## 4. Environment & Connection Configuration

Configuration is managed via `emergency-dispatch-system/server/.env` using Prisma-standard connection strings:

```env
# PostgreSQL Connection URL
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/resqdispatch?schema=public"

# Application Environment
PORT=5000
NODE_ENV=development
```

A sanitized template is provided in `emergency-dispatch-system/server/.env.example`.

---

## 5. Migration & Seed Operations

### 5.1 Validation & Client Generation
```bash
# Validate Prisma schema syntax and model relations
cd emergency-dispatch-system/server
npx prisma validate

# Generate type-safe Prisma client
npx prisma generate
```

### 5.2 Database Migration (When PostgreSQL is running)
```bash
# Apply schema changes via Prisma Migrate
cd emergency-dispatch-system/server
npx prisma migrate dev --name init_resqdispatch_schema
```

### 5.3 Idempotent Seeding
The database seed script (`prisma/seed.js`) uses atomic `upsert` queries. It can be run repeatedly without duplicating records or corrupting existing data:
```bash
cd emergency-dispatch-system/server
npm run prisma:seed
```
Seeded entities include:
- 6 standard service categories (Electrical, Plumbing, HVAC, Locksmith, Gas Leak, Roofing)
- 1 standard verified customer profile (`Jane Doe`, with bcrypt hashed password `cust123`)
- 6 emergency specialists with verified credentials, vehicles, geofence radius, and bcrypt hashed passwords (`tech123`)

---

## 6. Known Limitations & Phase 2 Transition

1. **Dual-Mode Graceful Fallback**: When PostgreSQL is offline, all reads and writes seamlessly route through the battle-tested in-memory store. Once PostgreSQL is provisioned and reachable at `DATABASE_URL`, the server automatically connects, hydrates state, and writes all records to PostgreSQL without requiring application code changes.
2. **Session Persistence**: Authentication currently validates against in-memory user objects and bcrypt-hashed records. Production JWT / session cookies are scheduled for subsequent architectural phases.
3. **Geospatial Queries**: Coordinates are currently stored as paired `latitude` / `longitude` Float columns with Haversine formula calculation in the dispatch engine. Future enhancements may integrate PostgreSQL `PostGIS` extension for native bounding polygon queries.
