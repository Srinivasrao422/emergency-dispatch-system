# RESQDISPATCH — Phase 8: Integration Architecture & Data Flow

**System**: ResQDispatch Emergency Home Services Auto-Dispatch System  
**Document**: Phase 8 Real-World Integration Architecture & Security Boundaries  
**Date**: November 24, 2026  
**Status**: Active Production Standard

---

## 1. System Architecture Overview

Phase 8 introduces a dedicated **External Service Integration Layer** situated between the core ResQDispatch business logic engines and third-party external APIs:

```mermaid
flowchart TD
    Client["Client Devices\n(React 19 + Vite)"]
    API["Express API & Socket.IO\n(Backend Services)"]
    DB[("Supabase PostgreSQL\n(Prisma ORM)")]
    
    subgraph External_Integration_Layer ["External Integration Layer (Phase 8)"]
        PayService["Payment Service\n(Razorpay Gateway)"]
        NotifService["Notification Service\n(WhatsApp & MSG91)"]
        StorageService["Storage Service\n(Supabase Storage)"]
        RouteService["Routing Service\n(OSRM Engine)"]
    end
    
    subgraph Real_World_Providers ["External Real-World Providers"]
        RZP["Razorpay API & Webhooks"]
        WA["Meta WhatsApp Cloud API"]
        SMS["MSG91 Indian SMS"]
        SupaStore["Supabase S3 Buckets"]
        OSRM["Project OSRM Routing"]
    end

    Client <-->|REST & WebSockets| API
    API <--> DB
    API --> PayService
    API --> NotifService
    API --> StorageService
    API --> RouteService

    PayService <-->|HMAC SHA-256 / Orders| RZP
    NotifService -->|REST HTTPS| WA
    NotifService -->|DLT SMS| SMS
    StorageService <-->|Signed URLs / Uploads| SupaStore
    RouteService <-->|GeoJSON Route| OSRM
```

---

## 2. Integration Data Flows

### 2.1 Razorpay Payment Flow & Double-Entry Financial Segregation

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Browser)
    participant API as Backend (Express)
    participant DB as PostgreSQL Database
    participant RZP as Razorpay Gateway

    Customer->>API: POST /api/payments/razorpay/order { requestId }
    API->>DB: Fetch verified Invoice amount
    Note over API: Never trust client-side amount
    API->>RZP: Create Order (amount in paise)
    RZP-->>API: Return order_id
    API-->>Customer: Return order_id & amount
    Customer->>RZP: Launch Razorpay Checkout Modal
    RZP-->>Customer: Payment Success { payment_id, signature }
    Customer->>API: POST /api/payments/razorpay/verify
    Note over API: crypto.timingSafeEqual HMAC SHA-256 check
    API->>DB: Mark Invoice isPaid=true, record paymentId
    API->>DB: Insert PaymentTransaction record (SUCCESS)
    API->>Customer: Socket.IO emit 'payment_confirmed'
```

#### Financial Integrity Safeguards:
1. **Authoritative Amounts**: The payment gateway order is created solely from the backend invoice amount.
2. **Double-Payment Guard**: Invoices with `isPaid: true` automatically reject new order creation or verification attempts.
3. **Ledger Segregation**: Internal technician commissions and platform splits are stored in the double-entry accounting ledger. Bank payouts remain segregated until explicitly settled by administrative disbursement.

---

### 2.2 Dispatch Alert Data Flow & Security Redaction

```mermaid
sequenceDiagram
    autonumber
    participant Engine as Dispatch Engine
    participant Notif as Notification Service
    participant Audit as DB Audit Log
    participant WA as WhatsApp / MSG91

    Engine->>Notif: sendLifecycleNotification(event, request, recipient)
    Note over Notif: Check 30s Cooldown Cache
    alt Cooldown Active
        Notif-->>Engine: Suppress repeat alert
    else Cooldown Expired
        Note over Notif: Redact sensitive OTP code
        Note over Notif: Mask phone: +91 98****3210
        Notif->>WA: Send formatted template payload
        Notif->>Audit: Record in external_notifications table
    end
```

#### Security Redaction Guard:
- When a specialist is notified that an emergency request has arrived (`TECHNICIAN_ARRIVED`), the notification instructs the specialist to request the verbal arrival PIN from the customer.
- Under NO circumstance does the technician notification include the customer's PIN code.

---

### 2.3 Cloud Storage Architecture & Magic Bytes Gate

```mermaid
flowchart LR
    Upload["File Upload Request\n(multipart/form-data)"] --> MagicBytes["Binary Magic Bytes Check\n(JPEG, PNG, WebP)"]
    MagicBytes -->|Non-Image / Executable| Reject400["Reject HTTP 400\n(Invalid File Type)"]
    MagicBytes -->|Valid Binary| SizeCheck["Size Check\n(Photos <= 5MB, Sigs <= 1MB)"]
    SizeCheck -->|Oversized| RejectSize["Reject HTTP 400\n(File Too Large)"]
    SizeCheck -->|Valid Size| AuthCheck["Tenant Ownership Check\n(Assigned Technician Only)"]
    AuthCheck -->|Unauthorized| Reject403["Reject HTTP 403\n(Forbidden)"]
    AuthCheck -->|Authorized| CloudStorage["Supabase Storage / Local Uploads"]
    CloudStorage --> DBRecord["Create StorageFile DB Record"]
```

---

### 2.4 Road Routing & Calibrated Haversine Fallback

```mermaid
flowchart TD
    Req["Request Route\n(Origin, Destination)"] --> OSRM_Query["Query Project OSRM API\n/route/v1/driving/..."]
    OSRM_Query -->|Success 200| ParseRoute["Extract Driving Distance (km)\nExtract Duration (mins)\nExtract GeoJSON Polyline"]
    OSRM_Query -->|Network Fail / Timeout / Rate Limit| HaversineFallback["Haversine Formula\nDistance * 1.35 (Urban Tortuosity)\nETA based on 28 km/h speed"]
    ParseRoute --> Leaflet["Render Road Polyline on Leaflet Map"]
    HaversineFallback --> Leaflet
```

---

## 3. Database Schema Entity Relationship Diagram

```mermaid
erDiagram
    SERVICE_REQUEST ||--o{ INVOICE : generates
    INVOICE ||--o{ PAYMENT_TRANSACTION : contains
    SERVICE_REQUEST ||--o{ EXTERNAL_NOTIFICATION : triggers
    SERVICE_REQUEST ||--o{ STORAGE_FILE : attaches

    INVOICE {
        string id PK
        string requestId FK
        float totalAmount
        boolean isPaid
        string razorpayOrderId
        string razorpayPaymentId
        string razorpaySignature
        string refundId
        string refundStatus
    }

    PAYMENT_TRANSACTION {
        string id PK
        string invoiceId FK
        float amount
        string currency
        string gateway
        string orderId
        string paymentId
        string status
        string errorMessage
        datetime createdAt
    }

    EXTERNAL_NOTIFICATION {
        string id PK
        string recipient
        string recipientRole
        string channel
        string eventType
        string status
        datetime createdAt
    }

    STORAGE_FILE {
        string id PK
        string bucket
        string path
        string filename
        string mimeType
        int sizeBytes
        string uploaderId
        string requestId FK
        datetime createdAt
    }
```
