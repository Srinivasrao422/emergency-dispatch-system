# RESQDISPATCH — Phase 9: Field Operations, Workforce & Customer Support Workflow

**Document**: Field Operations, Workforce Management and Support Guide  
**System**: ResQDispatch Emergency Home Services Auto-Dispatch System  
**Date**: November 24, 2026  
**Status**: Standard Operating Procedure (SOP) & Technical Reference

---

## 1. Technician Shift & Availability Lifecycle

```mermaid
stateDiagram-v2
    [*] --> OFF_DUTY: Initial State
    OFF_DUTY --> ON_DUTY: Start Shift (POST /api/technicians/:id/shift/start)
    ON_DUTY --> ON_BREAK: Take Break (POST /api/technicians/:id/break/start)
    ON_BREAK --> ON_DUTY: Conclude Break (POST /api/technicians/:id/break/end)
    ON_DUTY --> OFF_DUTY: End Shift (POST /api/technicians/:id/shift/end)
    
    note right of ON_BREAK
      Specialist is excluded from
      automated dispatch candidate matching
    end note

    note right of OFF_DUTY
      Cannot end shift if active
      emergency job is ongoing (HTTP 400)
    end note
```

### Shift Rules:
1. **Starting Shift**:
   - A technician clicks "Start Shift" on the Field Console.
   - The backend creates a record in `technician_shifts`, sets `technician.shiftStatus = 'ON_DUTY'`, and updates `technician.isOnline = true`.
   - The technician is now included in auto-dispatch scoring.
2. **Operational Break**:
   - Technicians can take a temporary break for rest, meal, or vehicle fueling.
   - Sets `shiftStatus = 'ON_BREAK'` and records `breakStartedAt`.
   - The auto-dispatch engine (`dispatchEngine.findCandidates`) filters out any specialist whose status is `ON_BREAK` or `isOnBreak === true`.
3. **Ending Shift**:
   - Technicians click "End Shift" when their daily roster concludes.
   - **Active-Job Guard**: If the technician is assigned to an emergency that is not `completed` or `cancelled`, the server rejects the request:
     `HTTP 400: Cannot end shift: Specialist has an active emergency assignment (REQ-XXXX). Complete or reassign the incident first.`
   - Once cleared, the shift ends, calculates duration in minutes, and updates `isOnline = false`.

---

## 2. Emergency Materials & Spare-Part Inventory Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Tech as Technician
    participant FC as Field Console
    participant API as Express API
    participant Inv as Inventory Service
    participant DB as PostgreSQL (Prisma)

    Tech->>FC: Opens Step 5 "Parts & Materials"
    FC->>API: GET /api/inventory/items?category=Plumbing
    API->>Inv: Query in-stock items
    Inv->>FC: Returns SKU, name, unitPrice, availableStock
    Tech->>FC: Selects "PVC Pressure Pipe 1-inch" (Qty: 2)
    Tech->>FC: Clicks "Add Part to Job"
    FC->>API: POST /api/inventory/consume
    API->>Inv: Check stock >= 2 & verify non-negative guard
    Inv->>DB: Deduct stock quantity in inventory_items
    Inv->>DB: Create inventory_transactions audit record
    Inv->>DB: Upsert job_materials record
    Inv->>DB: Recalculate Invoice materialsFee & totalAmount
    Inv-->>FC: Returns updated materials & new invoice total (₹)
    FC-->>Tech: Displays updated invoice total immediately
```

### Warehouse Stock Controls:
- **Low Stock Threshold**: Each item has a configured `minThreshold` (e.g., 5 or 10 units). If `stockQuantity <= minThreshold`, a low-stock alert is raised in the Admin Dashboard.
- **Transactional Stock Adjustment**: Admins can restock inventory via `POST /api/inventory/adjust`. Every adjustment records the reason (`Central Warehouse Restock`, `Damaged Return`) and delta in `inventory_transactions`.
- **Financial Integration**: Material consumption updates the invoice `materialsFee` and increases `totalAmount`. Platform take-rate and technician earnings are preserved accurately.

---

## 3. Customer Complaints & 30-Day Workmanship Warranty

```mermaid
flowchart TD
    A["Completed Emergency Job"] --> B["30-Day Workmanship Warranty Active<br/>(warrantyExpiresAt = completedAt + 30 days)"]
    
    B --> C{"Customer Issue?"}
    
    C -- "Quality / Conduct / Billing Dispute" --> D["Submit Customer Complaint<br/>(POST /api/complaints)"]
    D --> E["Admin Complaints Desk Review"]
    E --> F["Status: OPEN -> IN_REVIEW -> RESOLVED"]
    
    C -- "Recurrence of Same Problem" --> G["Submit Warranty Claim<br/>(POST /api/warranty-claims)"]
    G --> H{"Duplicate Claim Check"}
    H -- "Already Pending" --> I["HTTP 400: Duplicate Claim Rejected"]
    H -- "New Valid Claim" --> J["Status: PENDING"]
    
    J --> K["Admin Warranty Review Desk"]
    K -- "Reject" --> L["Status: REJECTED (with admin notes)"]
    K -- "Approve" --> M["Status: APPROVED"]
    
    M --> N["Auto-Spawn Linked Follow-Up Emergency Dispatch:<br/>- ID: REQ-WARRANTY-XXXX<br/>- isWarrantyFollowUp: true<br/>- Customer Charges: ₹0.00 (Zero-Cost)<br/>- High Priority Dispatch to Specialist"]
```

### Warranty Rules:
1. **Eligibility**: Standard workmanship warranty is valid for 30 calendar days from the moment the original job was marked `completed`.
2. **Duplicate Prevention**: A customer cannot file multiple concurrent pending claims on the same emergency request.
3. **Zero-Cost Resolution**: When an admin approves a warranty claim, the system automatically spawns a zero-cost linked service request (`REQ-WARRANTY-XXXX`) that is immediately placed into the auto-dispatch candidate matching engine.
