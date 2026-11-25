# Emergency Home Services Auto-Dispatch System
## Product Requirements Document (PRD) & Technical Architecture Specification

**Project Collaboration:** Unified Mentor & Industry Reference Benchmark (Urban Company)  
**System Classification:** Real-Time Geolocation & Automated Dispatch Logistics Platform  
**Version:** 1.0.0 (Production Release)  

---

## 1. Executive Summary & Context

With the increasing demand for on-demand home services, customers expect fast and reliable emergency support for issues such as plumbing leaks, electrical failures, AC breakdowns, and appliance malfunctions. Traditional service dispatch methods often rely on manual assignment, phone coordination, and limited visibility into technician availability, resulting in delayed emergency response, inefficient technician routing, poor workforce utilization, and customer dissatisfaction. 

The **Emergency Home Services Auto-Dispatch System** is designed to automate technician assignment by identifying the fastest available technician based on real-time location and availability status. By integrating location tracking and smart routing logic, the system reduces response time, optimizes technician allocation, improves operational efficiency, enhances customer experience, and supports scalable service operations.

---

## 2. Problem Statement & Key Objectives

### 2.1 Problem Statement
Home service platforms routinely encounter the following bottlenecks:
- **Manual technician assignment**: Dispatchers manually calling around creates 15–40 minute delays.
- **Delayed emergency response**: Leaks flood apartments, electrical shorts create fires, AC failures cause health risks.
- **Poor tracking of technician availability**: Lack of live GPS telemetry leaves dispatchers guessing who is idle.
- **Inefficient routing**: Dispatches across heavy traffic without route optimization.
- **Customer dissatisfaction**: Absence of real-time map tracking and transparent ETAs.

### 2.2 Primary Objectives
1. **Automated Sub-15s Dispatch**: Instantly assign the nearest qualified, available technician.
2. **Reduced Emergency Response Time**: Optimize routes to achieve target arrival SLA.
3. **Automated Reassignment Cascading**: If an assigned technician fails to accept within 30 seconds, immediately reassign to the next candidate.
4. **Enhanced Customer Experience**: Live map visualization with animated technician travel and dynamic ETA.

---

## 3. Mathematical Formulation: Multi-Factor Auto-Dispatch Algorithm

Instead of naive nearest-neighbor matching, the auto-dispatch engine computes a composite multi-criteria penalty score \(S_i\) for all available technicians with matching skills within radius \(R_{\max}\):

$$S_i = w_d \cdot \left(\frac{d_i}{R_{\max}}\right) + w_r \cdot \left(\frac{5.0 - r_i}{4.0}\right) + w_w \cdot \left(\frac{J_i}{J_{\max}}\right) + w_t \cdot \gamma_{\text{traffic}}$$

Where:
- \(d_i\): Haversine distance from customer to technician \(i\).
- \(r_i\): Historical customer rating (\(1.0 \le r_i \le 5.0\)).
- \(J_i\): Completed jobs by technician today (workload balancing factor).
- \(\gamma_{\text{traffic}}\): Traffic factor coefficient.
- \(w_d = 0.50, w_r = 0.25, w_w = 0.15, w_t = 0.10\).

The technician with the minimum penalty score \(i^* = \arg\min S_i\) is selected for immediate dispatch.

---

## 4. Key Functional Modules & Interconnected Pages

1. **Authentication & Role Switcher**:
   - Customer, Technician, and Admin roles.
   - Quick 1-click test credentials for instant evaluation.
2. **Customer Emergency Request Module**:
   - Interactive category selection (Plumbing, Electrical, HVAC, Appliances, Gas, Structural).
   - Real-time location picker (GPS auto-detect + interactive map pin drop + address search).
   - Severity level (Critical, High, Standard) and problem notes.
3. **Real-Time Live Tracking Page**:
   - Interactive Leaflet map with pulsing emergency marker, live technician vehicle marker, and route polyline.
   - Dynamic ETA counter, distance countdown, status milestone timeline.
   - Customer SOS contact and post-completion star rating & feedback.
4. **Technician Command Center**:
   - Availability toggle (Online / Offline).
   - High-priority incoming dispatch alert with audio siren and 30-second acceptance countdown bar.
   - Progressive job workflow (`Start Navigation` -> `Arrived` -> `Start Repair` -> `Complete`).
5. **Admin Dispatch Command Tower**:
   - Live interactive fleet map with all technicians and active emergencies.
   - Real-time KPI metrics (Average dispatch time, response time, utilization rate, auto-dispatch accuracy).
   - Manual override controls to reassign or cancel jobs.
   - Emergency stress simulator to inject requests across the city.
6. **Service History & Audit Telemetry**:
   - Complete record of past emergencies with detailed audit timestamps.
   - Filter by date, status, category, and priority.
7. **Profile & Fleet Management**:
   - User profile, technician skills, working radius, and dispatch tuning parameters.

---

## 5. Technology Stack

- **Frontend**: React 19, Tailwind CSS, Lucide Icons, Leaflet Maps, Socket.io-client.
- **Backend**: Node.js, Express.js, Socket.io, RESTful APIs.
- **Database / Store**: In-Memory State Store with Seed Data & Persistence.
- **Real-Time Protocol**: WebSockets (Socket.io) with automatic fallback and reconnection.
- **Deployment**: Production-ready for Vercel, Render, AWS, or Railway.
