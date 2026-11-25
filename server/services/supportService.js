/**
 * SupportService — Phase 9 Customer Complaints & Service Warranty Management
 * 
 * Provides:
 * - Customer complaint submission and lifecycle tracking (OPEN -> IN_REVIEW -> RESOLVED / REOPENED)
 * - Multi-tenant customer ownership enforcement
 * - Service warranty eligibility calculation (standard 30-day workmanship warranty)
 * - Warranty claim submission with duplicate follow-up prevention
 * - Administrative claim review with automatic linked zero-cost follow-up dispatch
 * - Full audit records and notification dispatch
 */

export class SupportService {
  constructor(options = {}) {
    this.prisma = options.prisma || null;
    this.dispatchEngine = options.dispatchEngine || null;
    this.dbService = options.dbService || null;
    this.io = options.io || null;
    this.notificationService = options.notificationService || null;

    this.inMemoryComplaints = new Map(); // complaintId -> complaintObj
    this.inMemoryWarrantyClaims = new Map(); // claimId -> claimObj
  }

  setDependencies({ prisma, dispatchEngine, dbService, io, notificationService }) {
    if (prisma) this.prisma = prisma;
    if (dispatchEngine) this.dispatchEngine = dispatchEngine;
    if (dbService) this.dbService = dbService;
    if (io) this.io = io;
    if (notificationService) this.notificationService = notificationService;
  }

  // =========================================================================
  // 1. CUSTOMER COMPLAINTS MANAGEMENT
  // =========================================================================

  /**
   * Submits a customer complaint against an eligible completed or cancelled request.
   */
  async submitComplaint({ requestId, customerId, category, description, evidenceUrl = null }) {
    if (!requestId || !customerId || !description) {
      return { success: false, error: 'requestId, customerId, and description are required.' };
    }

    // Retrieve request
    let request = this.dispatchEngine?.state.requests.find((r) => r.id === requestId);
    if (!request && this.prisma) {
      request = await this.prisma.serviceRequest.findUnique({ where: { id: requestId } });
    }

    if (!request) {
      return { success: false, error: `Service request ${requestId} not found.` };
    }

    // Customer multi-tenant ownership check
    if (request.customerId && customerId !== 'u_admin_1' && request.customerId !== customerId) {
      return { success: false, error: 'Forbidden: You cannot submit a complaint for another customer service request.' };
    }

    // Eligibility check: Request must be finalized
    if (!['completed', 'cancelled'].includes(request.status)) {
      return {
        success: false,
        error: `Complaints can only be registered for completed or finalized jobs (Current status: ${request.status}).`
      };
    }

    const validCategories = ['WORKMANSHIP', 'BILLING_ISSUE', 'TECHNICIAN_CONDUCT', 'DELAY', 'DAMAGE', 'OTHER'];
    const chosenCategory = validCategories.includes(category) ? category : 'WORKMANSHIP';

    const complaintId = `cmp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date();

    const complaint = {
      id: complaintId,
      requestId,
      customerId,
      customerName: request.customerName || 'Emergency Customer',
      category: chosenCategory,
      description,
      evidenceUrl,
      status: 'OPEN',
      assignedAdminId: null,
      resolutionNotes: null,
      resolvedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    this.inMemoryComplaints.set(complaintId, complaint);

    // Persist to PostgreSQL
    if (this.prisma) {
      try {
        await this.prisma.customerComplaint.create({
          data: {
            id: complaintId,
            requestId,
            customerId,
            customerName: complaint.customerName,
            category: chosenCategory,
            description,
            evidenceUrl,
            status: 'OPEN',
            createdAt: now
          }
        });
      } catch (err) {
        console.warn('[Support] Warning creating complaint in DB:', err.message);
      }
    }

    if (this.io) {
      this.io.emit('complaint_created', complaint);
      this.io.emit('admin_notification', {
        type: 'CUSTOMER_COMPLAINT',
        title: `Customer Complaint Registered (${chosenCategory})`,
        message: `${complaint.customerName} filed a complaint regarding job ${requestId}: "${description.slice(0, 80)}..."`,
        severity: 'warning',
        requestId
      });
    }

    return {
      success: true,
      complaint,
      message: 'Complaint submitted successfully. Our support desk has been alerted for administrative review.'
    };
  }

  /**
   * Retrieves customer complaints with role-based filtering.
   */
  async getComplaints({ customerId = null, status = null, requestId = null } = {}) {
    let complaints = [];

    if (this.prisma) {
      try {
        const where = {};
        if (customerId && customerId !== 'u_admin_1') where.customerId = customerId;
        if (status && status !== 'ALL') where.status = status;
        if (requestId) where.requestId = requestId;

        const dbComplaints = await this.prisma.customerComplaint.findMany({
          where,
          orderBy: { createdAt: 'desc' }
        });
        if (dbComplaints.length > 0) complaints = dbComplaints;
      } catch (err) {
        console.warn('[Support] DB query fallback to memory:', err.message);
      }
    }

    if (complaints.length === 0) {
      complaints = Array.from(this.inMemoryComplaints.values());
      if (customerId && customerId !== 'u_admin_1') {
        complaints = complaints.filter((c) => c.customerId === customerId);
      }
      if (status && status !== 'ALL') {
        complaints = complaints.filter((c) => c.status === status);
      }
      if (requestId) {
        complaints = complaints.filter((c) => c.requestId === requestId);
      }
      complaints.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return complaints;
  }

  /**
   * Updates complaint status (OPEN -> IN_REVIEW -> RESOLVED / REOPENED).
   */
  async updateComplaintStatus({ complaintId, status, resolutionNotes = '', assignedAdminId = 'u_admin_1' }) {
    if (!complaintId || !status) {
      return { success: false, error: 'complaintId and status are required.' };
    }

    const validStatuses = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REOPENED'];
    if (!validStatuses.includes(status)) {
      return { success: false, error: `Invalid complaint status: ${status}. Expected one of: ${validStatuses.join(', ')}` };
    }

    let complaint = this.inMemoryComplaints.get(complaintId);
    if (!complaint && this.prisma) {
      complaint = await this.prisma.customerComplaint.findUnique({ where: { id: complaintId } });
    }

    if (!complaint) {
      return { success: false, error: `Complaint ${complaintId} not found.` };
    }

    const resolvedAt = status === 'RESOLVED' ? new Date().toISOString() : null;

    complaint.status = status;
    complaint.assignedAdminId = assignedAdminId;
    if (resolutionNotes) complaint.resolutionNotes = resolutionNotes;
    if (resolvedAt) complaint.resolvedAt = resolvedAt;
    complaint.updatedAt = new Date().toISOString();

    this.inMemoryComplaints.set(complaintId, complaint);

    // Persist to PostgreSQL
    if (this.prisma) {
      try {
        await this.prisma.customerComplaint.update({
          where: { id: complaintId },
          data: {
            status,
            assignedAdminId,
            resolutionNotes: resolutionNotes || undefined,
            resolvedAt: resolvedAt ? new Date(resolvedAt) : null
          }
        });
      } catch (err) {
        console.warn('[Support] Warning updating complaint in DB:', err.message);
      }
    }

    if (this.io) {
      this.io.emit('complaint_updated', complaint);
    }

    return {
      success: true,
      complaint,
      message: `Complaint ${complaintId} updated to status: ${status}.`
    };
  }

  // =========================================================================
  // 2. SERVICE WARRANTY MANAGEMENT
  // =========================================================================

  /**
   * Calculates warranty eligibility for a completed service request.
   */
  async getWarrantyStatus(requestId, customerId = null) {
    if (!requestId) return { isEligible: false, error: 'Request ID is required.' };

    let request = this.dispatchEngine?.state.requests.find((r) => r.id === requestId);
    if (!request && this.prisma) {
      request = await this.prisma.serviceRequest.findUnique({ where: { id: requestId } });
    }

    if (!request) {
      return { isEligible: false, error: `Request ${requestId} not found.` };
    }

    // Ownership check
    if (customerId && customerId !== 'u_admin_1' && request.customerId && request.customerId !== customerId) {
      return { isEligible: false, error: 'Forbidden: You cannot inspect warranty status for another customer request.' };
    }

    if (request.status !== 'completed') {
      return {
        isEligible: false,
        reason: `Warranty is only applicable after emergency service completion (Current status: ${request.status}).`,
        warrantyTerms: '30-Day Workmanship Warranty'
      };
    }

    // Standard 30-Day Workmanship Warranty calculation
    const completedTimestamp = new Date(request.completedAt || request.createdAt).getTime();
    const warrantyDurationMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    const expiresAt = new Date(completedTimestamp + warrantyDurationMs);
    const now = Date.now();
    const isEligible = now <= expiresAt.getTime();
    const remainingDays = Math.max(0, Math.ceil((expiresAt.getTime() - now) / (24 * 60 * 60 * 1000)));

    return {
      isEligible,
      warrantyTerms: request.warrantyTerms || '30-Day Workmanship Warranty',
      warrantyExpiresAt: expiresAt.toISOString(),
      remainingDays,
      completedAt: request.completedAt,
      reason: isEligible
        ? `Covered under 30-Day Workmanship Warranty (${remainingDays} days remaining).`
        : 'Warranty period of 30 days has expired for this completed service.'
    };
  }

  /**
   * Submits a warranty claim with duplicate follow-up prevention.
   */
  async submitWarrantyClaim({ requestId, customerId, claimReason }) {
    if (!requestId || !customerId || !claimReason) {
      return { success: false, error: 'requestId, customerId, and claimReason are required.' };
    }

    // 1. Check warranty eligibility
    const warrantyStatus = await this.getWarrantyStatus(requestId, customerId);
    if (!warrantyStatus.isEligible) {
      return {
        success: false,
        error: `Ineligible for warranty: ${warrantyStatus.reason || 'Warranty is not valid.'}`,
        warrantyStatus
      };
    }

    // 2. Duplicate follow-up prevention guard:
    // A request cannot have multiple concurrent active warranty claims
    const existingClaim = Array.from(this.inMemoryWarrantyClaims.values()).find(
      (c) => c.requestId === requestId && ['PENDING', 'APPROVED'].includes(c.status)
    );

    if (existingClaim) {
      return {
        success: false,
        error: `Duplicate claim rejected: A warranty claim (${existingClaim.id}) is already ${existingClaim.status} for service request ${requestId}.`,
        existingClaimId: existingClaim.id,
        status: existingClaim.status
      };
    }

    let request = this.dispatchEngine?.state.requests.find((r) => r.id === requestId);
    if (!request && this.prisma) {
      request = await this.prisma.serviceRequest.findUnique({ where: { id: requestId } });
    }

    const claimId = `wcl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date();

    const claim = {
      id: claimId,
      requestId,
      customerId,
      customerName: request?.customerName || 'Emergency Customer',
      warrantyTerms: warrantyStatus.warrantyTerms,
      warrantyExpiresAt: warrantyStatus.warrantyExpiresAt,
      claimReason,
      status: 'PENDING',
      adminNotes: null,
      followUpRequestId: null,
      resolvedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    this.inMemoryWarrantyClaims.set(claimId, claim);

    // Persist to PostgreSQL
    if (this.prisma) {
      try {
        await this.prisma.warrantyClaim.create({
          data: {
            id: claimId,
            requestId,
            customerId,
            customerName: claim.customerName,
            warrantyTerms: claim.warrantyTerms,
            warrantyExpiresAt: new Date(claim.warrantyExpiresAt),
            claimReason,
            status: 'PENDING',
            createdAt: now
          }
        });
      } catch (err) {
        console.warn('[Support] Warning creating warranty claim in DB:', err.message);
      }
    }

    if (this.io) {
      this.io.emit('warranty_claim_submitted', claim);
      this.io.emit('admin_notification', {
        type: 'WARRANTY_CLAIM',
        title: 'New Service Warranty Claim Filed',
        message: `${claim.customerName} submitted a warranty claim for ${requestId}: "${claimReason.slice(0, 80)}..."`,
        severity: 'warning',
        requestId
      });
    }

    return {
      success: true,
      claim,
      message: 'Warranty claim submitted successfully. Administrator review is underway.'
    };
  }

  /**
   * Reviews warranty claim: APPROVED claims spawn linked follow-up emergency dispatches.
   */
  async reviewWarrantyClaim({ claimId, status, adminNotes = '', assignedAdminId = 'u_admin_1' }) {
    if (!claimId || !status) {
      return { success: false, error: 'claimId and status are required.' };
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return { success: false, error: 'Status must be either APPROVED or REJECTED.' };
    }

    let claim = this.inMemoryWarrantyClaims.get(claimId);
    if (!claim && this.prisma) {
      claim = await this.prisma.warrantyClaim.findUnique({ where: { id: claimId } });
    }

    if (!claim) {
      return { success: false, error: `Warranty claim ${claimId} not found.` };
    }

    if (claim.status !== 'PENDING') {
      return { success: false, error: `Claim has already been reviewed (Current status: ${claim.status}).` };
    }

    let followUpRequestId = null;

    // If APPROVED, spawn linked follow-up emergency request with ₹0 fee
    if (status === 'APPROVED' && this.dispatchEngine) {
      const originalRequest = this.dispatchEngine.state.requests.find((r) => r.id === claim.requestId);
      followUpRequestId = `REQ-WARRANTY-${Date.now().toString().slice(-4)}`;

      const followUpRequest = {
        id: followUpRequestId,
        customerId: claim.customerId,
        customerName: claim.customerName,
        customerPhone: originalRequest?.customerPhone || '+91 98765 43210',
        category: originalRequest?.category || 'Plumbing',
        categoryName: originalRequest?.categoryName || 'Plumbing & Water Line Repairs',
        priority: 'HIGH',
        issueDescription: `[WARRANTY FOLLOW-UP for ${claim.requestId}]: ${claim.claimReason}`,
        location: originalRequest?.location || { lat: 16.3512, lng: 81.0452, address: 'Gudlavalleru, AP' },
        status: 'pending',
        assignedTechnicianId: null,
        assignedAt: null,
        acceptedAt: null,
        enRouteAt: null,
        arrivedAt: null,
        workStartedAt: null,
        completedAt: null,
        cancelledAt: null,
        createdAt: new Date().toISOString(),
        isWarrantyFollowUp: true,
        parentRequestId: claim.requestId,
        invoice: {
          inspectionFee: 0.0,
          emergencyLabor: 0.0,
          prioritySurcharge: 0.0,
          totalAmount: 0.0,
          isPaid: true,
          paymentMethod: 'WARRANTY_COVERED'
        }
      };

      // Add to dispatch engine state and trigger dispatch
      this.dispatchEngine.state.requests.unshift(followUpRequest);
      if (this.dispatchEngine.autoDispatch) {
        this.dispatchEngine.autoDispatch(followUpRequestId);
      }

      if (this.io) {
        this.io.emit('request_created', followUpRequest);
      }
    }

    const resolvedAt = new Date().toISOString();
    claim.status = status;
    claim.adminNotes = adminNotes;
    claim.followUpRequestId = followUpRequestId;
    claim.resolvedAt = resolvedAt;
    claim.updatedAt = resolvedAt;

    this.inMemoryWarrantyClaims.set(claimId, claim);

    // Persist to PostgreSQL
    if (this.prisma) {
      try {
        await this.prisma.warrantyClaim.update({
          where: { id: claimId },
          data: {
            status,
            adminNotes,
            followUpRequestId,
            resolvedAt: new Date(resolvedAt)
          }
        });
      } catch (err) {
        console.warn('[Support] Warning updating warranty claim in DB:', err.message);
      }
    }

    if (this.io) {
      this.io.emit('warranty_claim_reviewed', claim);
    }

    return {
      success: true,
      claim,
      followUpRequestId,
      message:
        status === 'APPROVED'
          ? `Warranty claim approved! Created zero-cost follow-up dispatch ${followUpRequestId}.`
          : 'Warranty claim rejected with documented reason.'
    };
  }

  /**
   * Retrieves all warranty claims.
   */
  async getWarrantyClaims({ customerId = null, status = null } = {}) {
    let claims = [];

    if (this.prisma) {
      try {
        const where = {};
        if (customerId && customerId !== 'u_admin_1') where.customerId = customerId;
        if (status && status !== 'ALL') where.status = status;

        const dbClaims = await this.prisma.warrantyClaim.findMany({
          where,
          orderBy: { createdAt: 'desc' }
        });
        if (dbClaims.length > 0) claims = dbClaims;
      } catch (err) {
        console.warn('[Support] DB query fallback to memory:', err.message);
      }
    }

    if (claims.length === 0) {
      claims = Array.from(this.inMemoryWarrantyClaims.values());
      if (customerId && customerId !== 'u_admin_1') {
        claims = claims.filter((c) => c.customerId === customerId);
      }
      if (status && status !== 'ALL') {
        claims = claims.filter((c) => c.status === status);
      }
      claims.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return claims;
  }
}

export const supportService = new SupportService();
