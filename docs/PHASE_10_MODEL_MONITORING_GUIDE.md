# RESQDISPATCH — Phase 10: AI Intelligence Validation, Accuracy & Operational Optimization
## Operational Model Monitoring & Governance Guide

**Document Version:** 1.0.0  
**Status:** COMPLETED & VERIFIED  
**Date:** November 2026  
**Audience:** System Administrators, Dispatch Controllers, Platform Reliability Engineers

---

## 1. Overview & Governance Principles

The RESQDISPATCH operational model monitoring framework ensures that algorithmic and intelligence components remain transparent, accountable, and fail-safe during live emergency dispatch operations.

### Governance Rules
1. **No Autonomous Financial or Security Alterations:** AI routines may never directly settle invoices, alter wallet balances, execute payouts, or expose customer arrival OTPs.
2. **Deterministic Fallbacks for All Services:** Every algorithmic component must declare and support an active `DETERMINISTIC_RULES` fallback policy.
3. **Continuous Data Partitioning:** Production telemetry must remain strictly isolated from simulated test suites (`is_simulated`).
4. **Transparent Quality Statuses:** Models must report their operational status honestly in the central registry.

---

## 2. Model Operational Lifecycle & Status Definitions

Each registered algorithmic component in `ai_model_metrics` transitions through standardized operational statuses based on empirical observation thresholds:

```
[ INSUFFICIENT_DATA ] ──(Observations >= 30)──> [ EVALUATED ]
                                                      │
                                          (Accuracy Degradation)
                                                      │
                                                      ▼
[ DISABLED ] <──────(Admin Override)──────── [ DEGRADED ]
      │
      └──────(Deterministic Fallback Active: DETERMINISTIC_RULES)
```

| Operational Status | Description | Trigger Condition | System Action |
| :--- | :--- | :--- | :--- |
| **`INSUFFICIENT_DATA`** | Fewer than 30 real production observations recorded. | Real observations $< 30$. | Component operates with warning badge; deterministic baseline metrics displayed. |
| **`EVALUATED`** | Statistically sufficient data with validated accuracy. | Real observations $\ge 30$, error within acceptable tolerances. | Standard production operation with live telemetry tracking. |
| **`DEGRADED`** | Measured error exceeds operational threshold (e.g., ETA MAE $> 5.0\text{ min}$). | MAE $> 5.0\text{ min}$ or WAPE $> 45\%$. | Triggers admin notification; enables dual-review mode. |
| **`DISABLED`** | Administratively turned off or unresolvable failure. | Explicit operator action or persistent service failure. | Immediately routes all dispatches to `DETERMINISTIC_RULES`. |

---

## 3. Registered Models & Fallback Specifications

| Model Identifier | Primary Technology | Performance Baseline | Deterministic Fallback Policy |
| :--- | :--- | :--- | :--- |
| `predictive_eta_multivariate` | Multi-Factor Parametric Heuristic | MAE: $1.04\text{ min}$, $p_{90}$: $1.0\text{ min}$ | **`DETERMINISTIC_RULES`**: Haversine straight-line distance calculated at $28\text{ km/h}$ fixed average speed plus a $5\text{ min}$ static buffer. |
| `sla_risk_logistic_heuristic` | Parametric Logistic Sigmoid | Precision: $100\%$, FPR: $0\%$ | **`DETERMINISTIC_RULES`**: Direct arithmetic comparison: If $(T_{\text{deadline}} - T_{\text{current}}) < 5\text{ min}$, flag SLA warning. |
| `technician_recommendation_ensemble` | Linear Multi-Objective Scoring | Workload StdDev: $1.12$, Acceptance: $87.5\%$ | **`DETERMINISTIC_RULES`**: Pure nearest-distance assignment among verified technicians active in category. |
| `demand_forecasting_holt_winters` | Statistical Time-Series Heuristic | WAPE: $31.2\%$ | **`DETERMINISTIC_RULES`**: Rolling 7-day historical moving average for identical weekday/hour slots. |
| `anomaly_detector_zscore_iqr` | Statistical Process Control | Duplicate Suppression: $100\%$ | **`DETERMINISTIC_RULES`**: Fixed static threshold: Alert if dispatch time $> 10\text{ min}$ or customer wait $> 45\text{ min}$. |

---

## 4. Anomaly Detection Duplicate Suppression & Review Protocol

To prevent alarm fatigue in the Admin Command Tower, operational anomalies utilize a 1-hour temporal deduplication filter:

### 4.1 Suppression Logic
When `recordOperationalAnomaly` is invoked:
1. Queries recent anomalies where `type == newAnomaly.type` and `entityId == newAnomaly.entityId`.
2. Checks whether an identical unacknowledged alert was logged within the last $60\text{ minutes}$.
3. If detected, the duplicate alert is suppressed and recorded in debug logs rather than re-flooding the operator notification feed.

### 4.2 Review Lifecycle
1. **`OPEN`:** Newly detected anomaly awaiting review.
2. **`ACKNOWLEDGED`:** Operator has reviewed the anomaly and attached investigation notes via `POST /api/admin/ai/anomalies/:id/acknowledge`.
3. **`RESOLVED`:** Corrective action completed (e.g., technician re-dispatched, hardware checked).
4. **`DISMISSED`:** Operator flags anomaly as a false positive or benign operational variance.

---

## 5. High-Impact Action Safety Protocols

The endpoint `POST /api/admin/ai/actions/validate` enforces automated guardrails prior to executing any proposed operational action:

### 5.1 Strictly Prohibited Actions (Automated Execution Blocked)
- `SETTLE_PAYMENT`: AI can never settle an invoice directly. Payments must be processed through Razorpay webhook signature verification or explicit human accountant settlement.
- `EXECUTE_PAYOUT`: AI cannot transfer funds to a technician's bank account.
- `MODIFY_LEDGER`: Direct balance changes without an underlying service transaction are rejected.
- `EXPOSE_OTP`: Security arrival OTP is confidential to the customer channel.

### 5.2 Actions Requiring Human Administrator Review (`requiresHumanApproval: true`)
- **Automated Reassignment:** Reassigning an en-route technician due to predicted SLA breach requires human approval (`MODERATE_DEFENSE` policy).
- **Technician Skill Tier Alteration:** Model-suggested skill adjustments must be confirmed by an operations supervisor.
- **Bulk Schedule Optimization:** Fleet schedule shifts require supervisor sign-off.

---

## 6. Admin Workspace Monitoring Operations

### 6.1 Inspecting Model Health
1. Open the RESQDISPATCH Admin Console (`/admin`).
2. Navigate to the **AI Workspace** tab and select the **Model Quality** sub-tab.
3. Review the live status badges, real vs simulated counts, and baseline comparisons.

### 6.2 Manual Model Registry Synchronization
To recompute metrics across historical records on demand:
- Click the **"Sync & Evaluate Registry"** button in the top right of the Model Quality tab.
- This invokes `POST /api/admin/ai/models/sync`, refreshing `ai_model_metrics` in Supabase PostgreSQL and updating all UI cards in real time.
