# RESQDISPATCH — Phase 11: Production Readiness, Security Validation & Real-User Pilot Preparation
## Real-Device End-to-End Operational Verification Checklist

**Document Version:** 1.0.0  
**Verification Date:** November 2026  
**Audience:** QA Leads, Field Supervisors, Pilot Test Operators  
**Standard:** Zero Fabricated Claims (Every test modality recorded transparently)

---

## 1. Testing Modality Definitions

To maintain absolute integrity, every operational scenario in this checklist discloses its exact testing modality:
- **Automated Test (`AUTO`):** Verified via deterministic Node.js automated test suites executing against backend endpoints and PostgreSQL.
- **Browser Simulation (`BROWSER_SIM`):** Executed in desktop browser (Chrome/Edge/Firefox) with simulated network throttling, GPS emulation, or responsive viewport scaling.
- **Sandbox Service (`SANDBOX`):** Verified using external provider sandbox / test mode environments (e.g. Razorpay Test Sandbox, OSRM Public Routing API).
- **Physical Mobile Device (`DEVICE`):** Executed on physical handheld hardware (iOS Safari / Android Chrome PWA) with live cellular data, camera, and device GPS sensors.

---

## 2. 16 Core Operational Scenarios Matrix

| Scenario # | Operational Workflow | Primary Actors | Verification Modality | Observed Operational Outcome | Status |
| :---: | :--- | :--- | :---: | :--- | :---: |
| **1** | **Customer Registration & Auth** | Customer | `AUTO` + `BROWSER_SIM` | Customer account registered; receives cryptographically signed Bearer token. | **PASS** |
| **2** | **Real Emergency Service Booking** | Customer | `AUTO` + `BROWSER_SIM` | Emergency request created (`REQ-xxxx`); auto-dispatch engine selects specialist in $< 5\text{s}$. | **PASS** |
| **3** | **Specialist Notification & Acceptance** | Technician | `AUTO` + `BROWSER_SIM` | Specialist dashboard sounds dispatch offer chime; modal displays accept/reject timer (25s). | **PASS** |
| **4** | **Device GPS & Telemetry Breadcrumbs** | Technician | `AUTO` + `BROWSER_SIM` | Specialist clicks "Start Navigation"; live GPS coordinates streamed at 3s intervals via Socket.IO. | **PASS** |
| **5** | **Road Route & ETA Display** | Customer & Tech | `AUTO` + `SANDBOX` | Real road network geometry (OSRM) rendered on Leaflet map; live ETA updated. | **PASS** |
| **6** | **Technician Arrival on Site** | Technician | `AUTO` + `BROWSER_SIM` | Distance to target $< 50\text{m}$; specialist marks "Arrived On Site"; status shifts to `arrived`. | **PASS** |
| **7** | **Customer-Only Arrival OTP Gate** | Cust & Tech | `AUTO` + `BROWSER_SIM` | Customer views 4-digit PIN in app; specialist enters PIN; verified by cryptographic hash. | **PASS** |
| **8** | **Field Safety Checklist** | Technician | `AUTO` + `BROWSER_SIM` | Pre-work hazard assessment completed (power isolated, PPE worn, water shutoff located). | **PASS** |
| **9** | **Photo Evidence Upload** | Technician | `AUTO` + `BROWSER_SIM` | Before/after photos uploaded; magic bytes validated; stored in secure authenticated storage. | **PASS** |
| **10** | **Material Consumption & Itemized Invoice** | Technician | `AUTO` + `BROWSER_SIM` | Spare parts selected from catalog; stock deducted; invoice recalculated with itemized parts fee. | **PASS** |
| **11** | **Customer Signature Capture** | Cust & Tech | `AUTO` + `BROWSER_SIM` | Customer signs completion pad on specialist device; vector signature attached to incident. | **PASS** |
| **12** | **Razorpay Test Payment** | Customer | `AUTO` + `SANDBOX` | Razorpay Checkout modal launches; test UPI/Card payment verified via HMAC-SHA256 signature. | **PASS** |
| **13** | **Service Completion & History** | Cust & Tech | `AUTO` + `BROWSER_SIM` | Incident closed; double-entry ledger entries logged; invoice visible in customer service history. | **PASS** |
| **14** | **Customer Complaint & 30-Day Warranty** | Customer | `AUTO` + `BROWSER_SIM` | Customer lodges complaint or warranty claim within 30 days; admin approves zero-cost re-dispatch. | **PASS** |
| **15** | **Offline Technician Drafting & Sync** | Technician | `AUTO` + `BROWSER_SIM` | Specialist loses connection; drafts notes/photos locally in IndexedDB; auto-syncs upon reconnect. | **PASS** |
| **16** | **Admin Command Tower Oversight** | Dispatcher | `AUTO` + `BROWSER_SIM` | Admin monitors live dispatch map, specialist statuses, SLA risk, and ledger balances in real-time. | **PASS** |

---

## 3. Physical Device Field Test Verification Protocol

Prior to admitting real paying customers to the pilot, field supervisors must execute a 2-person walk-through trial with physical hardware:

### Prerequisites
- Device A (Customer): iOS 16+ (iPhone Safari) or Android 12+ (Chrome) with cellular data active.
- Device B (Specialist): Android 12+ (Chrome PWA) or iOS with Camera & Location permissions granted.
- Work Area: Defined pilot zone (e.g., Manhattan SoHo perimeter, within 1 km walking distance).

### Step-by-Step Field Validation Script
1. Customer on Device A opens `https://app.resqdispatch.com` and taps **"Emergency Plumbing"**.
2. Specialist on Device B opens `https://tech.resqdispatch.com` and sets shift status to **"ON DUTY"**.
3. Customer submits emergency incident; specialist receives sound vibration and taps **"Accept Job"**.
4. Specialist walks toward incident location; customer verifies blue vehicle marker moving along street map.
5. Specialist arrives; customer provides 4-digit arrival PIN displayed on their screen.
6. Specialist enters PIN to unlock work order; completes repair checklist and uploads before/after photos using device camera.
7. Customer inspects itemized bill, signs completion pad with finger, and completes payment in Razorpay sandbox.
8. Customer receives receipt; specialist wallet confirms credited earnings ($85\%$).
