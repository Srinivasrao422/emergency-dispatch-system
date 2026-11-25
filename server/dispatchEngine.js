// Core Auto-Dispatch Engine with Multi-Factor Scoring, Proximity Re-Clustering & Live Demo Progression
import crypto from 'crypto';
import { geospatialService } from './services/geospatialService.js';

// Cryptographically Secure OTP Utilities (Phase 7 Closure)
export function generateSecureOTP() {
  return crypto.randomInt(1000, 10000).toString();
}

export function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

export function hashOTP(otp, salt) {
  return crypto.createHash('sha256').update(`${salt}:${otp}`).digest('hex');
}

export class DispatchEngine {
  constructor(io, state, dbService = null) {
    this.io = io;
    this.state = state;
    this.dbService = dbService;
    this.geospatialService = geospatialService;
    this.geospatial = geospatialService;
    this.activeTimers = new Map(); // requestId -> timer object
    this.activeSimulations = new Map(); // requestId -> interval object
    this.ACCEPTANCE_TIMEOUT_SEC = 30; // standard default

    // Configurable Dynamic Dispatch Policy
    this.policy = {
      preset: 'balanced',
      weights: {
        distance: 0.45,
        rating: 0.25,
        workload: 0.15,
        experience: 0.10,
        prioritySla: 0.05
      },
      maxRadiusKm: 25.0,
      timeouts: {
        CRITICAL: 20, // 20s for life-safety critical incidents
        HIGH: 30,     // 30s standard emergency
        MEDIUM: 45,   // 45s non-critical urgent
        STANDARD: 45
      },
      maxDispatchAttempts: 3,
      trafficMultiplier: 1.15
    };

    // Phase 7 Closure: Cryptographically Secure OTP Security Parameters
    this.OTP_EXPIRY_MS = parseInt(process.env.OTP_EXPIRY_MS, 10) || (60 * 60 * 1000); // 60 minutes
    this.OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 5; // 5 failed attempts lockout

    // Phase 8: Real-World Integrations (Payment, Notifications, Storage, Routing)
    this.paymentService = null;
    this.notificationService = null;
    this.storageService = null;
    this.routingService = null;
  }

  setIntegrationServices(services = {}) {
    if (services.paymentService) this.paymentService = services.paymentService;
    if (services.notificationService) this.notificationService = services.notificationService;
    if (services.storageService) this.storageService = services.storageService;
    if (services.routingService) this.routingService = services.routingService;
  }

  // Cryptographically Secure Request OTP Initialization
  initRequestOTP(request) {
    if (request.otpHash && request.otpSalt) return request;

    let rawOtp = request._customerOtp;
    if (!rawOtp && request.otp && typeof request.otp === 'string' && /^\d{4}$/.test(request.otp)) {
      rawOtp = request.otp;
    }
    if (!rawOtp) {
      rawOtp = generateSecureOTP();
    }

    const salt = generateSalt();
    const hash = hashOTP(rawOtp, salt);

    request.otpHash = hash;
    request.otpSalt = salt;
    request.otpExpiresAt = new Date(Date.now() + this.OTP_EXPIRY_MS).toISOString();
    request.otpFailedAttempts = 0;
    request.otpMaxAttempts = this.OTP_MAX_ATTEMPTS;
    request.otpLocked = false;
    request.otpVerified = false;
    request.otp = hash; // Store hash in PostgreSQL-compatible field
    request._customerOtp = rawOtp; // Retained exclusively in-memory for authorized customer channel

    return request;
  }

  // Data Sanitization: Strip Secret Hashing and Protect OTP from Public/Technician Leaks
  sanitizeRequest(reqObj, currentUser = null) {
    if (!reqObj) return reqObj;
    const copy = { ...reqObj };
    delete copy.otpHash;
    delete copy.otpSalt;

    const isOwningCustomer = currentUser &&
      currentUser.role === 'customer' &&
      currentUser.id === copy.customerId;

    if (!isOwningCustomer) {
      delete copy.otp;
      delete copy._customerOtp;
    } else {
      copy.otp = copy._customerOtp || copy.otp;
      delete copy._customerOtp;
    }
    return copy;
  }

  // Reset engine timers, simulations, and technician states to clean baseline
  reset() {
    for (const [id, timer] of this.activeTimers.entries()) {
      clearInterval(timer);
    }
    this.activeTimers.clear();

    for (const [id, sim] of this.activeSimulations.entries()) {
      clearInterval(sim);
    }
    this.activeSimulations.clear();

    if (this.state && this.state.technicians) {
      this.state.technicians.forEach((t) => {
        t.status = 'idle';
        t.activeRequestId = null;
        t.isOnline = true;
        t.completedJobsToday = 0;
        t.earningsToday = 0.0;
      });
    }
  }

  // 1. Haversine Distance Formula (km) via Geospatial Service
  calculateDistance(lat1, lon1, lat2, lon2) {
    return this.geospatialService.calculateDistance(lat1, lon1, lat2, lon2);
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  // Calculate dynamic ETA based on distance and priority via Geospatial Service
  calculateETA(distanceKm, priority = 'CRITICAL') {
    return this.geospatialService.calculateETA(distanceKm, priority, this.policy.trafficMultiplier);
  }

  // Retrieve current active dispatch policy
  getPolicy() {
    return { ...this.policy };
  }

  // Update dispatch policy parameters dynamically from Admin Tower or User Settings
  setPolicy(newPolicy) {
    if (newPolicy.weights) {
      this.policy.weights = { ...this.policy.weights, ...newPolicy.weights };
    }
    if (newPolicy.timeouts) {
      this.policy.timeouts = { ...this.policy.timeouts, ...newPolicy.timeouts };
    }
    if (newPolicy.maxRadiusKm !== undefined) {
      this.policy.maxRadiusKm = parseFloat(newPolicy.maxRadiusKm);
    }
    if (newPolicy.preset) {
      this.policy.preset = newPolicy.preset;
    }
    if (newPolicy.maxDispatchAttempts !== undefined) {
      this.policy.maxDispatchAttempts = parseInt(newPolicy.maxDispatchAttempts, 10);
    }
    if (newPolicy.trafficMultiplier !== undefined) {
      this.policy.trafficMultiplier = parseFloat(newPolicy.trafficMultiplier);
    }

    this.io.emit('dispatch_policy_updated', this.policy);
    console.log(`[Auto-Dispatch] ⚙️ Updated Dispatch Policy (Preset: ${this.policy.preset}):`, this.policy.weights);
    return this.policy;
  }

  // Ensure all specialists are stationed in the immediate local neighborhood (0.5 km to 2.8 km)
  reclusterTechniciansNearCustomer(customerLoc) {
    if (!customerLoc || !customerLoc.lat || !customerLoc.lng) return;

    // Check first technician's distance to customer location
    const sampleTech = this.state.technicians[0];
    const currentDist = sampleTech?.currentLocation?.lat
      ? this.calculateDistance(
          sampleTech.currentLocation.lat,
          sampleTech.currentLocation.lng,
          customerLoc.lat,
          customerLoc.lng
        )
      : 999;

    // If technicians are further than 6km (or from another country/city/state), re-cluster around customer
    if (currentDist > 6) {
      console.log(
        `[Auto-Dispatch] 📍 Re-clustering specialists in immediate vicinity of customer: (${customerLoc.lat.toFixed(4)}, ${customerLoc.lng.toFixed(4)})`
      );

      const offsets = [
        { dLat: 0.0055, dLng: 0.0042, area: 'North Precinct' },
        { dLat: -0.0062, dLng: 0.0065, area: 'East District' },
        { dLat: 0.0084, dLng: -0.0051, area: 'West Quarter' },
        { dLat: -0.0091, dLng: -0.0078, area: 'South Sector' },
        { dLat: 0.0118, dLng: 0.0074, area: 'Central Hub' },
        { dLat: -0.0135, dLng: 0.0049, area: 'Rapid Depot' }
      ];

      const baseAddress = (customerLoc.address || 'Local Urban Sector').split(',')[0];

      this.state.technicians.forEach((t, idx) => {
        const offset = offsets[idx % offsets.length];
        const newLat = parseFloat((customerLoc.lat + offset.dLat).toFixed(6));
        const newLng = parseFloat((customerLoc.lng + offset.dLng).toFixed(6));

        t.currentLocation = {
          lat: newLat,
          lng: newLng,
          address: `${baseAddress} • Station #${idx + 1} (${offset.area})`
        };
        t.lastLocationUpdate = new Date().toISOString();
      });

      this.io.emit('technicians_updated', this.state.technicians);
    }
  }

  // 2. Advanced Multi-Criteria Scoring Function
  // Formula: S = w_d * D_norm + w_r * R_norm + w_w * W_norm + w_e * E_norm + penalties
  calculateScore(tech, customerLoc, maxRadiusKm = null, priority = 'CRITICAL') {
    const radius = maxRadiusKm || tech.workingRadiusKm || this.policy.maxRadiusKm;
    const distance = this.calculateDistance(
      tech.currentLocation.lat,
      tech.currentLocation.lng,
      customerLoc.lat,
      customerLoc.lng
    );

    const normDist = Math.min(distance / radius, 1.0);
    const normRating = Math.max(0, (5.0 - (tech.rating || 4.5)) / 4.0);
    const normWorkload = Math.min((tech.completedJobsToday || 0) / 10.0, 1.0);
    const normExperience = Math.max(0, 1.0 - Math.min((tech.reviewCount || 0) / 50.0, 1.0));

    // Stale GPS location penalty (> 30 mins)
    const isStale = this.geospatialService.isLocationStale(tech.lastLocationUpdate, 30 * 60 * 1000);
    const stalePenalty = isStale ? 0.08 : 0.0;

    const weights = this.policy.weights;
    const rawScore =
      weights.distance * normDist +
      weights.rating * normRating +
      weights.workload * normWorkload +
      weights.experience * normExperience +
      stalePenalty;

    const eta = this.calculateETA(distance, priority);
    const bearing = this.geospatialService.calculateBearing(
      tech.currentLocation.lat,
      tech.currentLocation.lng,
      customerLoc.lat,
      customerLoc.lng
    );

    return {
      score: parseFloat(rawScore.toFixed(4)),
      distanceKm: distance,
      etaMinutes: eta,
      bearing,
      isStale,
      breakdown: {
        distanceNorm: parseFloat(normDist.toFixed(3)),
        ratingNorm: parseFloat(normRating.toFixed(3)),
        workloadNorm: parseFloat(normWorkload.toFixed(3)),
        experienceNorm: parseFloat(normExperience.toFixed(3))
      }
    };
  }

  // Find candidate technicians matching criteria, ranked by composite score
  findCandidates(request, excludedTechIds = []) {
    const priority = request.priority || 'CRITICAL';
    const policyMaxRadius = this.policy.maxRadiusKm;

    // Filter eligible specialists
    let matchingTechs = this.state.technicians.filter((t) => {
      if (t.category !== request.category) return false;
      if (!t.isOnline) return false;
      if (t.shiftStatus === 'OFF_DUTY' || t.shiftStatus === 'ON_BREAK' || t.isOnBreak) return false;
      if (t.isApproved === false) return false;
      if (t.status !== 'idle') return false;
      if (t.activeRequestId) return false;
      if (excludedTechIds.includes(t.id)) return false;
      return true;
    });

    // Score all matching specialists
    let scoredCandidates = matchingTechs.map((tech) => {
      const radius = tech.workingRadiusKm || policyMaxRadius;
      const scoreObj = this.calculateScore(tech, request.location, radius, priority);
      return {
        tech,
        ...scoreObj
      };
    });

    // Filter by working radius threshold
    let withinRadius = scoredCandidates.filter(
      (c) => c.distanceKm <= (c.tech.workingRadiusKm || policyMaxRadius)
    );

    // If all candidates are outside standard radius, fallback to nearest available candidate
    const finalPool = withinRadius.length > 0 ? withinRadius : scoredCandidates;

    // Lowest score = optimal nearest candidate
    finalPool.sort((a, b) => a.score - b.score);
    return finalPool;
  }

  // Return candidate evaluation list for a request (used by Admin Command Tower)
  getCandidatesForRequest(requestId) {
    const request = this.state.requests.find((r) => r.id === requestId);
    if (!request) return [];
    return this.findCandidates(request, []);
  }

  // 3. Auto-Dispatch Trigger with Priority-Aware Timeouts & Retry Limits
  autoDispatch(requestId, excludedTechIds = []) {
    const request = this.state.requests.find((r) => r.id === requestId);
    if (!request) return { success: false, reason: 'Request not found' };

    // Guard: Do not re-dispatch finalized requests
    if (['completed', 'cancelled'].includes(request.status)) {
      return { success: false, reason: 'Request is already finalized' };
    }

    // Check Max Dispatch Attempts (Cascading retry limit)
    const maxAttempts = this.policy.maxDispatchAttempts || 3;
    if (excludedTechIds.length >= maxAttempts) {
      console.warn(`[Auto-Dispatch] ⚠️ Max retry attempts (${maxAttempts}) reached for ${requestId}. Escalating.`);
      request.status = 'escalated';
      request.escalatedReason = `Maximum dispatch attempts (${maxAttempts}) reached without specialist acceptance.`;
      
      this.io.emit('request_escalated', {
        requestId: request.id,
        reason: request.escalatedReason,
        request
      });
      this.io.emit('request_updated', request);

      if (this.dbService) {
        this.dbService.updateRequest(request.id, {
          status: 'escalated',
          escalatedReason: request.escalatedReason
        }).catch(() => {});
      }

      return { success: false, reason: request.escalatedReason };
    }

    // Automatically align technician locations in immediate neighborhood of customer
    this.reclusterTechniciansNearCustomer(request.location);

    console.log(`[Auto-Dispatch] Processing request ${requestId} (Category: ${request.category}, Priority: ${request.priority || 'CRITICAL'})`);

    const candidates = this.findCandidates(request, excludedTechIds);

    if (candidates.length === 0) {
      console.warn(`[Auto-Dispatch] No available technicians found for ${requestId}`);
      request.status = 'escalated';
      request.escalatedReason =
        excludedTechIds.length > 0
          ? 'All candidate technicians declined or timed out.'
          : 'No online technicians currently match this category.';

      this.io.emit('request_escalated', {
        requestId: request.id,
        reason: request.escalatedReason,
        request
      });
      this.io.emit('request_updated', request);

      if (this.dbService) {
        this.dbService.updateRequest(request.id, {
          status: 'escalated',
          escalatedReason: request.escalatedReason
        }).catch(() => {});
      }

      return { success: false, reason: request.escalatedReason };
    }

    const bestCandidate = candidates[0];
    const tech = bestCandidate.tech;

    // Configurable timeout based on emergency priority
    const priority = request.priority || 'CRITICAL';
    const timeoutSec = this.policy.timeouts[priority] || this.ACCEPTANCE_TIMEOUT_SEC;

    console.log(
      `[Auto-Dispatch] Assigned ${tech.name} (Score: ${bestCandidate.score}, Dist: ${bestCandidate.distanceKm} km, ETA: ${bestCandidate.etaMinutes} min, TTL: ${timeoutSec}s)`
    );

    // Update state
    request.status = 'assigned';
    request.assignedTechnicianId = tech.id;
    request.assignedAt = new Date().toISOString();
    request.distanceKm = bestCandidate.distanceKm;
    request.etaMinutes = bestCandidate.etaMinutes;
    request.currentScore = bestCandidate.score;
    request.timeoutRemaining = timeoutSec;
    
    // Initialize cryptographically secure customer arrival OTP
    if (!request.otpHash) {
      this.initRequestOTP(request);
    }

    // Dynamic surge & SLA pricing calculation
    const baseLabor = priority === 'CRITICAL' ? 85.0 : priority === 'HIGH' ? 75.0 : 60.0;
    const prioritySurcharge = priority === 'CRITICAL' ? 30.0 : priority === 'HIGH' ? 20.0 : 10.0;
    const inspectionFee = 49.0;
    const totalAmount = inspectionFee + baseLabor + prioritySurcharge;

    request.invoice = {
      inspectionFee,
      emergencyLabor: baseLabor,
      prioritySurcharge,
      totalAmount,
      isPaid: false
    };

    tech.status = 'assigned';
    tech.activeRequestId = request.id;

    if (!request.dispatchAttempts) {
      request.dispatchAttempts = [];
    }

    const attempt = {
      technicianId: tech.id,
      technicianName: tech.name,
      score: bestCandidate.score,
      distanceKm: bestCandidate.distanceKm,
      assignedAt: request.assignedAt,
      outcome: 'pending'
    };
    request.dispatchAttempts.push(attempt);

    // Broadcast to WebSocket clients
    this.io.emit('dispatch_assigned', {
      requestId: request.id,
      technician: tech,
      distanceKm: bestCandidate.distanceKm,
      etaMinutes: bestCandidate.etaMinutes,
      score: bestCandidate.score,
      timeoutSeconds: timeoutSec,
      priority: request.priority
    });

    if (this.dbService) {
      this.dbService.updateRequest(request.id, {
        status: 'assigned',
        assignedTechnicianId: tech.id,
        assignedAt: request.assignedAt,
        distanceKm: bestCandidate.distanceKm,
        etaMinutes: bestCandidate.etaMinutes,
        currentScore: bestCandidate.score,
        timeoutRemaining: timeoutSec,
        otp: request.otp
      }).catch((err) => console.warn('[Dispatch] Update request warning:', err.message));

      this.dbService.recordAssignmentAttempt({
        requestId: request.id,
        technicianId: tech.id,
        technicianName: tech.name,
        score: bestCandidate.score,
        distanceKm: bestCandidate.distanceKm,
        outcome: 'pending',
        assignedAt: request.assignedAt
      }).catch((err) => console.warn('[Dispatch] Record attempt warning:', err.message));
    }

    this.io.emit('request_updated', request);
    this.io.emit('technicians_updated', this.state.technicians);

    // Start priority-specific TTL countdown
    this.startAcceptanceTimer(request.id, tech.id, excludedTechIds, timeoutSec);

    // Launch automated real-world demo lifecycle progression
    this.startAutomatedDemoProgression(request.id);

    return {
      success: true,
      technician: tech,
      score: bestCandidate.score,
      distanceKm: bestCandidate.distanceKm,
      etaMinutes: bestCandidate.etaMinutes
    };
  }

  // Configurable TTL Timer with Second-by-Second Heartbeat
  startAcceptanceTimer(requestId, technicianId, previousExcluded, initialSeconds = 30) {
    if (this.activeTimers.has(requestId)) {
      clearInterval(this.activeTimers.get(requestId));
    }

    let remainingSeconds = initialSeconds;

    const interval = setInterval(() => {
      remainingSeconds -= 1;

      const request = this.state.requests.find((r) => r.id === requestId);
      if (!request || request.status !== 'assigned') {
        clearInterval(interval);
        this.activeTimers.delete(requestId);
        return;
      }

      request.timeoutRemaining = remainingSeconds;
      this.io.emit('dispatch_countdown', {
        requestId,
        technicianId,
        remainingSeconds
      });

      if (remainingSeconds <= 0) {
        clearInterval(interval);
        this.activeTimers.delete(requestId);
        this.handleTimeout(requestId, technicianId, previousExcluded);
      }
    }, 1000);

    this.activeTimers.set(requestId, interval);
  }

  // Handle Technician Timeout (Auto-Reassignment Cascade)
  handleTimeout(requestId, technicianId, previousExcluded) {
    console.warn(`[Auto-Dispatch] ⏰ Technician ${technicianId} timed out on ${requestId}. Cascading...`);

    const request = this.state.requests.find((r) => r.id === requestId);
    const tech = this.state.technicians.find((t) => t.id === technicianId);

    if (tech && tech.status === 'assigned') {
      tech.status = 'idle';
      tech.activeRequestId = null;
    }

    if (request) {
      const currentAttempt = request.dispatchAttempts?.find(
        (a) => a.technicianId === technicianId && a.outcome === 'pending'
      );
      if (currentAttempt) {
        currentAttempt.outcome = 'timeout';
        currentAttempt.timedOutAt = new Date().toISOString();
      }

      if (this.dbService) {
        this.dbService.updateAssignmentOutcome(requestId, technicianId, 'timed_out').catch((err) => {
          console.warn('[Dispatch] Timeout outcome update warning:', err.message);
        });
      }

      const updatedExcluded = [...previousExcluded, technicianId];

      this.io.emit('dispatch_timeout', {
        requestId,
        technicianId,
        techName: tech?.name || 'Technician',
        nextAttempt: true
      });

      this.autoDispatch(requestId, updatedExcluded);
    }
  }

  // Technician accepts job with concurrency guards
  acceptJob(requestId, technicianId) {
    const request = this.state.requests.find((r) => r.id === requestId);
    const tech = this.state.technicians.find((t) => t.id === technicianId);

    if (!request || !tech) return { success: false, reason: 'Not found' };

    // Guard: Do not accept finalized requests
    if (['completed', 'cancelled'].includes(request.status)) {
      return { success: false, reason: 'Request is already finalized' };
    }

    // Concurrency Guard: Check request availability & assignment
    if (request.status !== 'assigned' || (request.assignedTechnicianId && request.assignedTechnicianId !== technicianId)) {
      return { success: false, reason: 'Request is no longer available for acceptance' };
    }

    // Concurrency Guard: Ensure technician does not already hold another conflicting active job
    if (tech.activeRequestId && tech.activeRequestId !== requestId) {
      const activeJob = this.state.requests.find((r) => r.id === tech.activeRequestId);
      if (activeJob && !['completed', 'cancelled'].includes(activeJob.status)) {
        return { success: false, reason: `Technician ${tech.name} already has an active ongoing assignment (${activeJob.id})` };
      }
    }

    if (this.activeTimers.has(requestId)) {
      clearInterval(this.activeTimers.get(requestId));
      this.activeTimers.delete(requestId);
    }

    request.status = 'accepted';
    request.acceptedAt = new Date().toISOString();
    request.timeoutRemaining = 0;

    tech.status = 'assigned';
    tech.activeRequestId = request.id;

    const currentAttempt = request.dispatchAttempts?.find(
      (a) => a.technicianId === technicianId && a.outcome === 'pending'
    );
    if (currentAttempt) {
      currentAttempt.outcome = 'accepted';
    }

    if (this.dbService) {
      this.dbService.updateRequest(request.id, {
        status: 'accepted',
        acceptedAt: request.acceptedAt
      }).catch((err) => console.warn('[Dispatch] DB update request warning:', err.message));

      this.dbService.updateTechnician(tech.id, {
        status: 'assigned',
        activeRequestId: request.id
      }).catch((err) => console.warn('[Dispatch] DB update technician warning:', err.message));

      this.dbService.updateAssignmentOutcome(request.id, tech.id, 'accepted').catch((err) => {
        console.warn('[Dispatch] Acceptance outcome update warning:', err.message);
      });
    }

    this.io.emit('request_updated', request);
    this.io.emit('technicians_updated', this.state.technicians);

    // Phase 8: Real External Notification
    if (this.notificationService && request.customerPhone) {
      this.notificationService.notify({
        event: 'TECHNICIAN_ACCEPTED',
        recipientPhone: request.customerPhone,
        recipientRole: 'customer',
        data: {
          requestId: request.id,
          technicianName: tech.name,
          categoryName: request.categoryName || request.category,
          etaMinutes: request.etaMinutes || 5
        }
      }).catch(() => {});
    }

    console.log(`[Auto-Dispatch] ✅ Technician ${tech.name} confirmed job ${requestId}`);
    return { success: true, request, technician: tech };
  }

  // Technician rejects
  rejectJob(requestId, technicianId, reason = 'Busy/Unavailable') {
    const request = this.state.requests.find((r) => r.id === requestId);
    const tech = this.state.technicians.find((t) => t.id === technicianId);

    if (!request || !tech) return { success: false, reason: 'Not found' };

    if (this.activeTimers.has(requestId)) {
      clearInterval(this.activeTimers.get(requestId));
      this.activeTimers.delete(requestId);
    }

    tech.status = 'idle';
    tech.activeRequestId = null;

    const currentAttempt = request.dispatchAttempts?.find(
      (a) => a.technicianId === technicianId && a.outcome === 'pending'
    );
    if (currentAttempt) {
      currentAttempt.outcome = 'rejected';
      currentAttempt.rejectionReason = reason;
    }

    if (this.dbService) {
      this.dbService.updateTechnician(tech.id, {
        status: 'idle',
        activeRequestId: null
      }).catch((err) => console.warn('[Dispatch] Decline update tech warning:', err.message));

      this.dbService.updateAssignmentOutcome(request.id, tech.id, 'declined', reason).catch((err) => {
        console.warn('[Dispatch] Decline outcome update warning:', err.message);
      });
    }

    const previousExcluded = request.dispatchAttempts?.map((a) => a.technicianId) || [technicianId];

    this.io.emit('technicians_updated', this.state.technicians);
    console.log(`[Auto-Dispatch] ❌ Technician ${tech.name} declined job ${requestId}. Reassigning...`);

    const dispatchResult = this.autoDispatch(requestId, previousExcluded);
    return {
      success: true,
      rejectedTechnicianId: tech.id,
      request,
      reassigned: Boolean(dispatchResult && dispatchResult.success),
      dispatchResult
    };
  }

  // 4. Technician Status Milestones & Live Simulation
  startNavigation(requestId, technicianId) {
    const request = this.state.requests.find((r) => r.id === requestId);
    const techId = technicianId || request?.assignedTechnicianId || (this.state.technicians.find(t => t.category === request?.category)?.id) || this.state.technicians[0]?.id;
    const tech = this.state.technicians.find((t) => t.id === techId) || this.state.technicians[0];

    if (!request || !tech) return { success: false, reason: 'Not found' };

    // Authorization & Status Guards (Phase 3)
    if (request.assignedTechnicianId && technicianId && request.assignedTechnicianId !== technicianId) {
      return { success: false, reason: 'Unauthorized: You are not assigned to this emergency' };
    }
    if (['completed', 'cancelled'].includes(request.status)) {
      return { success: false, reason: 'Request is already finalized' };
    }

    request.status = 'en_route';
    request.enRouteAt = new Date().toISOString();
    tech.status = 'en_route';

    this.io.emit('request_updated', request);
    this.io.emit('technicians_updated', this.state.technicians);

    // Phase 8: Real External Notification (Service Completed & Invoice Ready)
    if (this.notificationService && request.customerPhone) {
      this.notificationService.notify({
        event: 'SERVICE_COMPLETED',
        recipientPhone: request.customerPhone,
        recipientRole: 'customer',
        data: {
          requestId: request.id,
          technicianName: tech.name,
          totalAmount: request.invoice?.totalAmount || 149.0
        }
      }).catch(() => {});
    }

    if (this.dbService) {
      this.dbService.updateRequest(request.id, {
        status: 'en_route',
        enRouteAt: request.enRouteAt
      }).catch((err) => console.warn('[Dispatch] Nav update request warning:', err.message));
      this.dbService.updateTechnician(tech.id, {
        status: 'en_route'
      }).catch((err) => console.warn('[Dispatch] Nav update tech warning:', err.message));
    }

    // Start live GPS telemetry breadcrumb simulation towards customer
    this.startLiveLocationSimulation(request, tech);

    return { success: true, request, technician: tech };
  }

  // Simulated GPS Telemetry: updates coordinates smoothly towards customer with bearing and distance
  startLiveLocationSimulation(request, tech) {
    if (this.activeSimulations.has(request.id)) {
      clearInterval(this.activeSimulations.get(request.id));
    }

    const startLat = tech.currentLocation.lat;
    const startLng = tech.currentLocation.lng;
    const destLat = request.location.lat;
    const destLng = request.location.lng;

    const totalSteps = 7; // 7 fast realistic ticks (total ~8-9s)
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep += 1;
      const progress = Math.min(currentStep / totalSteps, 1.0);

      const jitterLat = (Math.random() - 0.5) * 0.0002;
      const jitterLng = (Math.random() - 0.5) * 0.0002;

      const newLat = parseFloat(
        (startLat + (destLat - startLat) * progress + (progress < 1 ? jitterLat : 0)).toFixed(6)
      );
      const newLng = parseFloat(
        (startLng + (destLng - startLng) * progress + (progress < 1 ? jitterLng : 0)).toFixed(6)
      );

      tech.currentLocation.lat = newLat;
      tech.currentLocation.lng = newLng;
      tech.lastLocationUpdate = new Date().toISOString();
      tech.heading = this.geospatialService.calculateBearing(newLat, newLng, destLat, destLng);

      const remainingDist = parseFloat(
        (this.calculateDistance(newLat, newLng, destLat, destLng) * (1 - progress * 0.9)).toFixed(2)
      );
      const remainingEta = Math.max(1, Math.ceil(4 * (1 - progress)));

      request.distanceKm = remainingDist;
      request.etaMinutes = remainingEta;

      const telemetryPayload = {
        requestId: request.id,
        technicianId: tech.id,
        coordinates: { lat: newLat, lng: newLng },
        heading: tech.heading,
        remainingDistanceKm: remainingDist,
        etaMinutes: remainingEta,
        progress: parseFloat((progress * 100).toFixed(1)),
        isStale: false,
        timestamp: tech.lastLocationUpdate
      };

      // Broadcast GPS telemetry breadcrumb (both legacy and new Phase 2 event)
      this.io.emit('location_updated', telemetryPayload);
      this.io.emit('technician_location_update', telemetryPayload);
      this.io.emit('technicians_updated', this.state.technicians);

      // Check arrival
      if (progress >= 1.0) {
        clearInterval(interval);
        this.activeSimulations.delete(request.id);
        this.markArrived(request.id, tech.id);
      }
    }, 1200);

    this.activeSimulations.set(request.id, interval);
  }

  markArrived(requestId, technicianId) {
    const request = this.state.requests.find((r) => r.id === requestId);
    const techId = technicianId || request?.assignedTechnicianId;
    const tech = this.state.technicians.find((t) => t.id === techId);

    if (!request || !tech) return;
    if (['completed', 'cancelled'].includes(request.status)) return;

    if (!request.otpHash) {
      this.initRequestOTP(request);
    }

    request.status = 'arrived';
    request.arrivedAt = new Date().toISOString();
    request.distanceKm = 0.0;
    request.etaMinutes = 0;
    tech.status = 'in_progress';

    // Broadcast Arrival without revealing confidential customer PIN to non-customer sockets
    this.io.emit('technician_arrived', {
      requestId: request.id,
      technician: tech,
      arrivedAt: request.arrivedAt
    });

    // Send private arrival notification with OTP only to the owning customer
    this.io.to(`customer_${request.customerId}`).emit('prompt_customer_otp', {
      requestId: request.id,
      otp: request._customerOtp,
      expiresAt: request.otpExpiresAt
    });

    this.io.emit('request_updated', this.sanitizeRequest(request));
    this.io.emit('technicians_updated', this.state.technicians);

    // Phase 8: Real External Notification (Customer Only - With Arrival OTP)
    if (this.notificationService && request.customerPhone) {
      this.notificationService.notify({
        event: 'TECHNICIAN_ARRIVED',
        recipientPhone: request.customerPhone,
        recipientRole: 'customer',
        data: {
          requestId: request.id,
          technicianName: tech.name,
          otp: request._customerOtp
        }
      }).catch(() => {});
    }

    if (this.dbService) {
      this.dbService.updateRequest(request.id, {
        status: 'arrived',
        arrivedAt: request.arrivedAt,
        distanceKm: 0.0,
        etaMinutes: 0,
        otp: request.otpHash || request.otp
      }).catch((err) => console.warn('[Dispatch] Arrival update request warning:', err.message));
      this.dbService.updateTechnician(tech.id, {
        status: 'in_progress'
      }).catch((err) => console.warn('[Dispatch] Arrival update tech warning:', err.message));
    }

    console.log(`[Auto-Dispatch] 📍 Specialist ${tech.name} arrived on site for ${requestId} (Hashed OTP verification required)`);
  }

  // 4-Digit Customer PIN Verification with Cryptographic Hashing, Expiry & Rate Limiting
  verifyOTP(requestId, enteredOtp, options = {}) {
    const request = this.state.requests.find((r) => r.id === requestId);
    if (!request) return { success: false, reason: 'Request not found' };

    // 1. Prevent reuse after successful verification
    if (request.otpVerified) {
      return { success: false, reason: 'Security PIN has already been verified and service is underway or completed.' };
    }

    // 2. Lockout protection against brute-force attacks
    if (request.otpLocked || (request.otpFailedAttempts >= (request.otpMaxAttempts || this.OTP_MAX_ATTEMPTS))) {
      return {
        success: false,
        reason: 'Maximum verification attempts exceeded. Verification locked for security. Please contact dispatch support.'
      };
    }

    // 3. Expiry check
    if (request.otpExpiresAt && new Date(request.otpExpiresAt).getTime() < Date.now()) {
      return {
        success: false,
        reason: 'Security PIN has expired. Customer must refresh verification code from tracking console.'
      };
    }

    // Ensure OTP hash is initialized
    if (!request.otpHash || !request.otpSalt) {
      this.initRequestOTP(request);
    }

    const entered = (enteredOtp || '').toString().trim();
    if (!entered || !/^\d{4}$/.test(entered)) {
      return { success: false, reason: 'Please enter a valid 4-digit numeric verification PIN.' };
    }

    // Verify against cryptographically secure SHA-256 hash using request-specific salt
    const computedHash = hashOTP(entered, request.otpSalt);
    const isMatch = (computedHash === request.otpHash) ||
                    (options.isTestMode && request._customerOtp && entered === request._customerOtp);

    if (isMatch) {
      request.otpVerified = true;
      request.otpVerifiedAt = new Date().toISOString();
      request.workStartedAt = new Date().toISOString();
      request.status = 'in_progress';
      delete request._customerOtp; // Permanently destroy in-memory raw OTP upon verification

      const tech = this.state.technicians.find((t) => t.id === request.assignedTechnicianId);
      if (tech) tech.status = 'in_progress';

      this.io.emit('request_updated', this.sanitizeRequest(request));
      this.io.emit('otp_verified', { requestId: request.id, success: true });

      if (this.dbService) {
        this.dbService.updateRequest(request.id, {
          status: 'in_progress',
          otpVerified: true,
          otp: request.otpHash,
          workStartedAt: request.workStartedAt
        }).catch((err) => console.warn('[Dispatch] OTP verify update request warning:', err.message));
      }

      console.log(`[Auto-Dispatch] 🔒 Customer PIN verified successfully for ${requestId}. Work in progress.`);
      return { success: true, request: this.sanitizeRequest(request), technician: tech };
    } else {
      request.otpFailedAttempts = (request.otpFailedAttempts || 0) + 1;
      const maxAttempts = request.otpMaxAttempts || this.OTP_MAX_ATTEMPTS;
      const remaining = Math.max(0, maxAttempts - request.otpFailedAttempts);
      if (remaining === 0) {
        request.otpLocked = true;
        console.warn(`[Auto-Dispatch] 🚨 Request ${requestId} OTP locked after ${maxAttempts} consecutive failed attempts.`);
      }

      console.warn(`[Auto-Dispatch] ⚠️ OTP mismatch for ${requestId}: ${remaining} attempt(s) remaining`);
      return {
        success: false,
        reason: remaining > 0
          ? `Invalid 4-digit verification PIN. ${remaining} attempt(s) remaining.`
          : 'Maximum verification attempts exceeded. Verification locked.'
      };
    }
  }

  startWork(requestId, technicianId) {
    const request = this.state.requests.find((r) => r.id === requestId);
    const techId = technicianId || request?.assignedTechnicianId || (this.state.technicians.find(t => t.category === request?.category)?.id) || this.state.technicians[0]?.id;
    const tech = this.state.technicians.find((t) => t.id === techId) || this.state.technicians[0];

    if (!request || !tech) return { success: false, reason: 'Not found' };

    // Enforce OTP verification before allowing work to start
    if (!request.otpVerified) {
      return { success: false, reason: 'Doorstep OTP verification required before commencement of service.' };
    }

    request.status = 'in_progress';
    request.workStartedAt = new Date().toISOString();
    tech.status = 'in_progress';

    this.io.emit('request_updated', this.sanitizeRequest(request));
    this.io.emit('technicians_updated', this.state.technicians);

    // Phase 8: Real External Notification (Customer - Service Started)
    if (this.notificationService && request.customerPhone) {
      this.notificationService.notify({
        event: 'SERVICE_STARTED',
        recipientPhone: request.customerPhone,
        recipientRole: 'customer',
        data: {
          requestId: request.id,
          technicianName: tech.name
        }
      }).catch(() => {});
    }

    if (this.dbService) {
      this.dbService.updateRequest(request.id, {
        status: 'in_progress',
        workStartedAt: request.workStartedAt
      }).catch((err) => console.warn('[Dispatch] Work start DB warning:', err.message));
      this.dbService.updateTechnician(tech.id, {
        status: 'in_progress'
      }).catch((err) => console.warn('[Dispatch] Tech work start DB warning:', err.message));
    }

    console.log(`[Auto-Dispatch] 🛠️ Active repair work initiated by ${tech.name} for ${requestId}`);
    return { success: true, request, technician: tech };
  }

  completeJob(requestId, technicianId, notes, partsUsed, beforePhoto, afterPhoto, customerSignature = null) {
    const request = this.state.requests.find((r) => r.id === requestId);
    const techId = technicianId || request?.assignedTechnicianId || (this.state.technicians.find(t => t.category === request?.category)?.id) || this.state.technicians[0]?.id;
    const tech = this.state.technicians.find((t) => t.id === techId) || this.state.technicians[0];

    if (!request || !tech) return { success: false, reason: 'Not found' };

    // Authorization & State Transition Guards (Phase 3)
    if (request.assignedTechnicianId && technicianId && request.assignedTechnicianId !== technicianId) {
      return { success: false, reason: 'Unauthorized: You are not assigned to this job' };
    }
    if (['completed', 'cancelled'].includes(request.status)) {
      return { success: false, reason: 'Job is already finalized' };
    }
    if (!['in_progress', 'arrived'].includes(request.status)) {
      return { success: false, reason: 'Invalid state transition: Job must be in progress or arrived' };
    }

    if (this.activeSimulations.has(requestId)) {
      clearInterval(this.activeSimulations.get(requestId));
      this.activeSimulations.delete(requestId);
    }

    request.status = 'completed';
    request.completedAt = new Date().toISOString();
    request.warrantyTerms = request.warrantyTerms || '30-Day Workmanship Warranty';
    request.warrantyExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    let fullNotes = notes || 'Emergency repair completed according to safety standards. System pressure tested and verified.';
    if (customerSignature) {
      request.customerSignature = customerSignature;
      if (!fullNotes.includes('[Customer Acknowledged & Signed]')) {
        fullNotes += ' [Customer Acknowledged & Signed]';
      }
    }
    request.resolutionNotes = fullNotes;
    request.partsUsed = partsUsed || 'Diagnostic Replacement Kit & Pressure Seal';
    request.beforePhoto = beforePhoto || request.beforePhoto || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400';
    request.afterPhoto = afterPhoto || request.afterPhoto || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400';

    tech.status = 'idle';
    tech.activeRequestId = null;
    tech.completedJobsToday = (tech.completedJobsToday || 0) + 1;

    // Ensure itemized invoice is created for completed incident
    if (!request.invoice) {
      const inspectionFee = 49.0;
      const emergencyLabor = 75.0;
      const prioritySurcharge = request.priority === 'CRITICAL' ? 25.0 : 15.0;
      request.invoice = {
        inspectionFee,
        emergencyLabor,
        prioritySurcharge,
        totalAmount: inspectionFee + emergencyLabor + prioritySurcharge,
        isPaid: false
      };
    }

    // Technician Wallet & 85/15 Payout Split (Phase 3 Benchmark)
    const totalAmount = request.invoice?.totalAmount || 149.0;
    const techTakeHome = parseFloat((totalAmount * 0.85).toFixed(2));
    tech.earningsToday = parseFloat(((tech.earningsToday || 0) + techTakeHome).toFixed(2));
    tech.walletBalance = parseFloat(((tech.walletBalance || 350.0) + techTakeHome).toFixed(2));

    this.io.emit('request_updated', request);
    this.io.emit('technicians_updated', this.state.technicians);

    // Phase 8: Real External Notification (Service Completed & Invoice Ready)
    if (this.notificationService && request.customerPhone) {
      this.notificationService.notify({
        event: 'SERVICE_COMPLETED',
        recipientPhone: request.customerPhone,
        recipientRole: 'customer',
        data: {
          requestId: request.id,
          technicianName: tech.name,
          totalAmount: request.invoice?.totalAmount || 149.0
        }
      }).catch(() => {});
    }

    if (this.dbService) {
      this.dbService.updateRequest(request.id, {
        status: 'completed',
        completedAt: request.completedAt,
        resolutionNotes: request.resolutionNotes,
        partsUsed: request.partsUsed,
        beforePhoto: request.beforePhoto,
        afterPhoto: request.afterPhoto
      }).catch((err) => console.warn('[Dispatch] Complete job DB update warning:', err.message));

      this.dbService.updateTechnician(tech.id, {
        status: 'idle',
        activeRequestId: null,
        walletBalance: tech.walletBalance,
        earningsToday: tech.earningsToday,
        completedJobsToday: tech.completedJobsToday
      }).catch((err) => console.warn('[Dispatch] Update technician idle DB warning:', err.message));

      this.dbService.recordServiceHistory({
        requestId: request.id,
        customerId: request.customerId || 'u_cust_1',
        technicianId: tech.id,
        categoryName: request.categoryName || request.category,
        issueDescription: request.issueDescription,
        status: 'completed',
        totalAmount: request.invoice?.totalAmount || 149.0,
        isPaid: request.invoice?.isPaid || false,
        rating: request.rating || null,
        feedback: request.feedback || null,
        completedAt: request.completedAt
      }).catch((err) => console.warn('[Dispatch] Record service history warning:', err.message));
    }

    console.log(`[Auto-Dispatch] 🎉 Job ${requestId} completed! Technician credited $${techTakeHome}. Invoice ready for settlement.`);
    return { success: true, request, technician: tech };
  }

  // 5. Automated Demo Lifecycle Progression
  startAutomatedDemoProgression(requestId) {
    if (process.env.NODE_ENV === 'test' || this.disableAutoProgression) return;
    // Stage 1: Auto-accept job after 2.5 seconds
    setTimeout(() => {
      const req = this.state.requests.find((r) => r.id === requestId);
      if (!req || req.status !== 'assigned') return;
      console.log(`[Demo Progression] Auto-accepting job ${requestId}...`);
      this.acceptJob(requestId, req.assignedTechnicianId);

      // Stage 2: Start GPS navigation after 2 seconds
      setTimeout(() => {
        const acceptReq = this.state.requests.find((r) => r.id === requestId);
        if (!acceptReq || acceptReq.status !== 'accepted') return;
        console.log(`[Demo Progression] Starting GPS navigation for ${requestId}...`);
        this.startNavigation(requestId, acceptReq.assignedTechnicianId);
      }, 2000);
    }, 2500);
  }

  // 6. Manual Fast-Forward to Next Milestone
  advanceNextMilestone(requestId) {
    const request = this.state.requests.find((r) => r.id === requestId);
    if (!request) return { success: false, reason: 'Request not found' };

    const techId = request.assignedTechnicianId;

    if (request.status === 'assigned') {
      return this.acceptJob(requestId, techId);
    } else if (request.status === 'accepted') {
      return this.startNavigation(requestId, techId);
    } else if (request.status === 'en_route') {
      if (this.activeSimulations.has(requestId)) {
        clearInterval(this.activeSimulations.get(requestId));
        this.activeSimulations.delete(requestId);
      }
      this.markArrived(requestId, techId);
      return { success: true, request };
    } else if (request.status === 'arrived') {
      return this.verifyOTP(requestId, request._customerOtp, { isTestMode: true });
    } else if (request.status === 'in_progress') {
      return this.completeJob(
        requestId,
        techId,
        'Diagnostic inspection passed. Emergency fault remediated and line tested.',
        'Standard Replacement Kit'
      );
    }

    return { success: true, message: 'Already completed', request };
  }

  // Admin Manual Override with Re-scoring
  manualReassign(requestId, targetTechnicianId) {
    const request = this.state.requests.find((r) => r.id === requestId);
    const targetTech = this.state.technicians.find((t) => t.id === targetTechnicianId);

    if (!request || !targetTech) return { success: false, reason: 'Request or technician not found' };

    // Guard: Do not reassign completed or cancelled requests
    if (['completed', 'cancelled'].includes(request.status)) {
      return { success: false, reason: 'Cannot reassign a completed or cancelled request' };
    }

    // Concurrency Guard: Ensure target specialist does not have another active conflicting job
    if (targetTech.activeRequestId && targetTech.activeRequestId !== requestId) {
      const activeJob = this.state.requests.find((r) => r.id === targetTech.activeRequestId);
      if (activeJob && !['completed', 'cancelled'].includes(activeJob.status)) {
        return { success: false, reason: `Technician ${targetTech.name} already has an active ongoing assignment (${activeJob.id})` };
      }
    }

    if (this.activeTimers.has(requestId)) {
      clearInterval(this.activeTimers.get(requestId));
      this.activeTimers.delete(requestId);
    }
    if (this.activeSimulations.has(requestId)) {
      clearInterval(this.activeSimulations.get(requestId));
      this.activeSimulations.delete(requestId);
    }

    if (request.assignedTechnicianId) {
      const oldTech = this.state.technicians.find((t) => t.id === request.assignedTechnicianId);
      if (oldTech && oldTech.activeRequestId === requestId) {
        oldTech.status = 'idle';
        oldTech.activeRequestId = null;
      }
    }

    const { distanceKm, etaMinutes, score } = this.calculateScore(targetTech, request.location, null, request.priority);

    request.status = 'assigned';
    request.assignedTechnicianId = targetTech.id;
    request.assignedAt = new Date().toISOString();
    request.distanceKm = distanceKm;
    request.etaMinutes = etaMinutes;
    request.currentScore = score;
    request.timeoutRemaining = this.policy.timeouts[request.priority || 'CRITICAL'] || this.ACCEPTANCE_TIMEOUT_SEC;

    targetTech.status = 'assigned';
    targetTech.activeRequestId = request.id;

    if (!request.otpHash) {
      this.initRequestOTP(request);
    }

    if (!request.dispatchAttempts) request.dispatchAttempts = [];
    request.dispatchAttempts.push({
      technicianId: targetTech.id,
      technicianName: targetTech.name,
      score,
      distanceKm,
      assignedAt: request.assignedAt,
      outcome: 'pending'
    });

    this.io.emit('request_updated', this.sanitizeRequest(request));
    this.io.emit('technicians_updated', this.state.technicians);

    // Phase 8: Real External Notification (Customer - Reassigned)
    if (this.notificationService && request.customerPhone) {
      this.notificationService.notify({
        event: 'TECHNICIAN_ASSIGNED',
        recipientPhone: request.customerPhone,
        recipientRole: 'customer',
        data: {
          requestId: request.id,
          technicianName: targetTech.name
        }
      }).catch(() => {});
    }

    if (this.dbService) {
      this.dbService.updateRequest(request.id, {
        status: 'assigned',
        assignedTechnicianId: targetTech.id,
        assignedAt: request.assignedAt,
        distanceKm,
        etaMinutes,
        currentScore: score,
        timeoutRemaining: request.timeoutRemaining
      }).catch((err) => console.warn('[Dispatch] Manual reassign update request warning:', err.message));

      this.dbService.updateTechnician(targetTech.id, {
        status: 'assigned',
        activeRequestId: request.id
      }).catch((err) => console.warn('[Dispatch] Manual reassign update tech warning:', err.message));

      this.dbService.recordAssignmentAttempt({
        requestId: request.id,
        technicianId: targetTech.id,
        technicianName: targetTech.name,
        score,
        distanceKm,
        outcome: 'pending',
        assignedAt: request.assignedAt
      }).catch((err) => console.warn('[Dispatch] Manual reassign record attempt warning:', err.message));
    }

    this.startAcceptanceTimer(request.id, targetTech.id, [], request.timeoutRemaining);
    this.startAutomatedDemoProgression(request.id);

    console.log(`[Auto-Dispatch] 👮 Admin manually assigned ${targetTech.name} to ${requestId}`);
    return { success: true, request, technician: targetTech };
  }
}
