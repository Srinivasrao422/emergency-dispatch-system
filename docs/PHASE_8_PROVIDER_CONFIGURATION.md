# RESQDISPATCH — Phase 8: External Provider Configuration Guide

**System**: ResQDispatch Emergency Home Services Auto-Dispatch System  
**Document**: External Integration & API Provider Configuration Reference  
**Date**: November 24, 2026  
**Status**: Active Production Standard

---

## 1. Overview

This document details the configuration parameters, environment variables, authentication protocols, and fail-safe fallback modes for the four external services integrated into ResQDispatch during Phase 8:
1. **Razorpay Payments Gateway** (Indian Online Transactions)
2. **Meta WhatsApp Business Cloud API & MSG91 SMS** (Multi-Channel Dispatch Alerts)
3. **Supabase Cloud Storage** (Encrypted Media & Document Buckets)
4. **OSRM & Google Routes API** (Road Network Navigation & ETA Calculation)

---

## 2. Environment Variables Configuration

To enable live external connectivity in staging or production, define the following variables in the backend `.env` file:

```env
# ================================================================
# 1. RAZORPAY PAYMENT GATEWAY
# ================================================================
RAZORPAY_KEY_ID="rzp_test_your_key_id_here"
RAZORPAY_KEY_SECRET="your_razorpay_key_secret_here"
RAZORPAY_WEBHOOK_SECRET="your_razorpay_webhook_secret_here"

# ================================================================
# 2. MULTI-CHANNEL DISPATCH NOTIFICATIONS
# ================================================================
# WhatsApp Business Cloud API (Meta for Developers)
WHATSAPP_PHONE_NUMBER_ID="your_whatsapp_phone_number_id"
WHATSAPP_ACCESS_TOKEN="your_meta_system_user_token"

# MSG91 Indian SMS Gateway (DLT Approved)
MSG91_AUTH_KEY="your_msg91_auth_key"
MSG91_SENDER_ID="RESQDP"
MSG91_TEMPLATE_ID="your_dlt_approved_template_id"

# ================================================================
# 3. SUPABASE CLOUD STORAGE
# ================================================================
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_SERVICE_KEY="your_supabase_service_role_key"
SUPABASE_STORAGE_BUCKET_EVIDENCE="service-evidence"
SUPABASE_STORAGE_BUCKET_SIGNATURES="signatures"
SUPABASE_STORAGE_BUCKET_DOCS="technician-documents"

# ================================================================
# 4. ROAD ROUTING & ETA ENGINE
# ================================================================
OSRM_ROUTING_URL="https://router.project-osrm.org"
GOOGLE_MAPS_API_KEY="" # Optional high-precision traffic fallback
```

---

## 3. Provider Integration Specifications

### 3.1 Razorpay Payment Gateway

#### Configuration Details:
- **API Endpoint**: `https://api.razorpay.com/v1`
- **Supported Payment Modes**: UPI (Google Pay, PhonePe, Paytm), Credit Cards, Debit Cards, NetBanking, Razorpay Wallet.
- **Currency**: `INR` (Indian Rupee), transmitted as `paise` (1 INR = 100 paise).
- **Webhook Endpoint**: `POST /api/payments/razorpay/webhook`
- **Webhook Events to Subscribe**:
  - `payment.captured`
  - `payment.failed`
  - `refund.processed`

#### Fallback & Sandbox Mode:
When `RAZORPAY_KEY_ID` or `RAZORPAY_KEY_SECRET` are not defined:
- The system automatically activates **Mock Sandbox Gateway Mode**.
- Orders are initialized with mock identifiers (`order_mock_<hex>`).
- Signature verification validates using the local sandbox secret.
- Test suites run 100% offline without network dependencies.

---

### 3.2 WhatsApp Business Cloud API & MSG91 SMS

#### WhatsApp Cloud API Details:
- **API Endpoint**: `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`
- **Authentication**: Bearer token via `WHATSAPP_ACCESS_TOKEN`.
- **Approved Template Format**:
  - `emergency_dispatch_alert`
  - Variables: `{{1}}` (Customer Name), `{{2}}` (Request ID), `{{3}}` (Specialist Name), `{{4}}` (ETA).

#### MSG91 SMS Details:
- **API Endpoint**: `https://api.msg91.com/api/v5/flow/`
- **Authentication**: Header `authkey: ${MSG91_AUTH_KEY}`.
- **DLT Entity Registration**: Mandatory under Indian TRAI regulations.

#### Fallback Mode:
When API keys are unset:
- Notification payloads are validated, masked for privacy, and logged into the `external_notifications` PostgreSQL table.
- Notification status is marked as `unverified_no_credentials`.
- System operation continues normally without hanging or crashing.

---

### 3.3 Supabase Cloud Storage

#### Bucket Setup Instructions:
In the Supabase Dashboard, create three storage buckets:
1. `service-evidence`: Private bucket. Max file size: 5MB. Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`.
2. `signatures`: Private bucket. Max file size: 1MB. Allowed MIME types: `image/png`, `image/jpeg`.
3. `technician-documents`: Private bucket. Max file size: 10MB. Allowed MIME types: `image/jpeg`, `image/png`, `application/pdf`.

#### Storage Fallback Mode:
When `SUPABASE_SERVICE_KEY` is not present:
- The backend automatically stores files in the local filesystem directory:  
  `emergency-dispatch-system/server/uploads/`
- Full binary magic bytes verification and size checks remain strictly enforced.
- Files are served via local signed URL routes.

---

### 3.4 Road-Based Routing & ETA Engine

#### Primary Engine:
- **Provider**: OpenStreetMap / Project OSRM Public API.
- **Endpoint**: `https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson`
- **Features**: Road-accurate distance, predicted drive duration, and complete turn-by-turn coordinate arrays.

#### Fallback Engine:
- **Algorithm**: Great Circle Haversine Distance × 1.35 (Urban Tortuosity Multiplier).
- **Speed Assumption**: 28 km/h emergency average urban speed.
- Activates automatically on DNS failure, HTTP 429 rate limit, or network timeout.
