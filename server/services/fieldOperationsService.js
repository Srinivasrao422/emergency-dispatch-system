/**
 * FieldOperationsService — Phase 9 Offline Operations & Technician Workforce Management
 * 
 * Provides:
 * - Offline draft synchronization with idempotency and state conflict detection
 * - Security guard: Never permits offline fabrication of critical status transitions (OTP, Completion, Payment)
 * - Technician Shift lifecycle: Start Shift, End Shift, Start Break, End Break
 * - Active-job conflict protection when ending shifts
 * - Working hours tracking and historical shift records
 */

export class FieldOperationsService {
  constructor(options = {}) {
    this.prisma = options.prisma || null;
    this.dispatchEngine = options.dispatchEngine || null;
    this.dbService = options.dbService || null;
    this.io = options.io || null;

    this.processedSyncKeys = new Set();
    this.inMemoryShifts = new Map(); // shiftId -> shiftObj
  }

  setDependencies({ prisma, dispatchEngine, dbService, io }) {
    if (prisma) this.prisma = prisma;
    if (dispatchEngine) this.dispatchEngine = dispatchEngine;
    if (dbService) this.dbService = dbService;
    if (io) this.io = io;
  }

  // =========================================================================
  // 1. TECHNICIAN SHIFT & AVAILABILITY MANAGEMENT
  // =========================================================================

  /**
   * Starts a technician's active duty shift.
   */
  async startShift(technicianId, notes = '') {
    if (!technicianId) return { success: false, error: 'Technician ID is required.' };

    const tech = this.dispatchEngine?.state.technicians.find((t) => t.id === technicianId);
    if (!tech) return { success: false, error: `Technician ${technicianId} not found.` };

    // If already in an active shift, return existing status
    if (tech.shiftStatus === 'ON_DUTY' && tech.currentShiftId) {
      return {
        success: true,
        message: 'Shift is already active.',
        shiftId: tech.currentShiftId,
        shiftStatus: 'ON_DUTY',
        startedAt: tech.shiftStartedAt || new Date().toISOString()
      };
    }

    const shiftId = `shift_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startedAt = new Date();

    const shiftRecord = {
      id: shiftId,
      technicianId,
      technicianName: tech.name,
      shiftStatus: 'ON_DUTY',
      startedAt: startedAt.toISOString(),
      endedAt: null,
      totalDurationMinutes: null,
      breakCount: 0,
      totalBreakMinutes: 0,
      notes: notes || 'Regular emergency dispatch shift commenced.'
    };

    // Update in-memory technician state
    tech.shiftStatus = 'ON_DUTY';
    tech.isOnline = true;
    tech.status = tech.status === 'offline' ? 'idle' : tech.status;
    tech.isOnBreak = false;
    tech.breakStartedAt = null;
    tech.currentShiftId = shiftId;
    tech.shiftStartedAt = startedAt.toISOString();

    this.inMemoryShifts.set(shiftId, shiftRecord);

    // Persist to PostgreSQL if DB is connected
    if (this.prisma) {
      try {
        await this.prisma.technicianShift.create({
          data: {
            id: shiftId,
            technicianId,
            technicianName: tech.name,
            shiftStatus: 'ON_DUTY',
            startedAt,
            notes: shiftRecord.notes
          }
        });
        await this.prisma.technician.update({
          where: { id: technicianId },
          data: {
            shiftStatus: 'ON_DUTY',
            isOnline: true,
            currentShiftId: shiftId,
            isOnBreak: false,
            shiftStartedAt: startedAt
          }
        });
      } catch (err) {
        console.warn('[FieldOps] Warning persisting shift start to DB:', err.message);
      }
    }

    if (this.io) {
      this.io.emit('technician_shift_updated', { technicianId, shiftStatus: 'ON_DUTY', shiftId });
      this.io.emit('technicians_updated', this.dispatchEngine?.state.technicians);
    }

    return {
      success: true,
      shiftId,
      shiftStatus: 'ON_DUTY',
      startedAt: tech.shiftStartedAt,
      message: `Shift commenced for ${tech.name}. Technician is now eligible for emergency dispatches.`
    };
  }

  /**
   * Ends a technician's duty shift with active-job protection.
   */
  async endShift(technicianId, notes = '') {
    if (!technicianId) return { success: false, error: 'Technician ID is required.' };

    const tech = this.dispatchEngine?.state.technicians.find((t) => t.id === technicianId);
    if (!tech) return { success: false, error: `Technician ${technicianId} not found.` };

    // Active-Job Protection Guard: Cannot end shift while actively assigned to an ongoing emergency
    const activeJob = this.dispatchEngine?.state.requests.find(
      (r) =>
        r.assignedTechnicianId === technicianId &&
        ['assigned', 'accepted', 'en_route', 'arrived', 'in_progress'].includes(r.status)
    );

    if (activeJob) {
      return {
        success: false,
        error: `Cannot end shift: Specialist ${tech.name} has an active emergency assignment (${activeJob.id}). Complete or reassign the incident first.`,
        activeJobId: activeJob.id
      };
    }

    // If currently on break, end the break automatically
    if (tech.isOnBreak) {
      await this.endBreak(technicianId);
    }

    const endedAt = new Date();
    const shiftId = tech.currentShiftId;
    let durationMinutes = 0;

    if (shiftId) {
      const shift = this.inMemoryShifts.get(shiftId);
      if (shift) {
        shift.endedAt = endedAt.toISOString();
        shift.shiftStatus = 'OFF_DUTY';
        const startMs = new Date(shift.startedAt).getTime();
        durationMinutes = Math.max(1, Math.round((endedAt.getTime() - startMs) / 60000));
        shift.totalDurationMinutes = durationMinutes;
        if (notes) shift.notes = `${shift.notes || ''} | End Notes: ${notes}`;
      }

      if (this.prisma) {
        try {
          await this.prisma.technicianShift.update({
            where: { id: shiftId },
            data: {
              endedAt,
              shiftStatus: 'OFF_DUTY',
              totalDurationMinutes: durationMinutes,
              notes: notes || undefined
            }
          });
        } catch (err) {
          console.warn('[FieldOps] Warning ending shift in DB:', err.message);
        }
      }
    }

    // Update technician availability
    tech.shiftStatus = 'OFF_DUTY';
    tech.isOnline = false;
    tech.status = 'offline';
    tech.currentShiftId = null;
    tech.shiftStartedAt = null;
    tech.isOnBreak = false;
    tech.breakStartedAt = null;

    if (this.prisma) {
      try {
        await this.prisma.technician.update({
          where: { id: technicianId },
          data: {
            shiftStatus: 'OFF_DUTY',
            isOnline: false,
            status: 'offline',
            currentShiftId: null,
            shiftStartedAt: null,
            isOnBreak: false,
            breakStartedAt: null
          }
        });
      } catch (err) {
        console.warn('[FieldOps] Warning updating tech to OFF_DUTY in DB:', err.message);
      }
    }

    if (this.io) {
      this.io.emit('technician_shift_updated', { technicianId, shiftStatus: 'OFF_DUTY' });
      this.io.emit('technicians_updated', this.dispatchEngine?.state.technicians);
    }

    return {
      success: true,
      shiftStatus: 'OFF_DUTY',
      durationMinutes,
      message: `Shift ended for ${tech.name}. Technician is offline and excluded from auto-dispatch.`
    };
  }

  /**
   * Starts a temporary rest break for a technician.
   */
  async startBreak(technicianId) {
    if (!technicianId) return { success: false, error: 'Technician ID is required.' };

    const tech = this.dispatchEngine?.state.technicians.find((t) => t.id === technicianId);
    if (!tech) return { success: false, error: `Technician ${technicianId} not found.` };

    if (tech.shiftStatus === 'OFF_DUTY') {
      return { success: false, error: 'Cannot take a break when technician is off duty. Start a shift first.' };
    }

    if (tech.isOnBreak) {
      return { success: true, message: 'Technician is already on break.', breakStartedAt: tech.breakStartedAt };
    }

    // Check if actively navigating or on site
    const activeJob = this.dispatchEngine?.state.requests.find(
      (r) =>
        r.assignedTechnicianId === technicianId &&
        ['en_route', 'arrived', 'in_progress'].includes(r.status)
    );
    if (activeJob) {
      return {
        success: false,
        error: `Cannot take a break while active on emergency ${activeJob.id}. Complete the job first.`,
        activeJobId: activeJob.id
      };
    }

    const breakStartedAt = new Date().toISOString();
    tech.shiftStatus = 'ON_BREAK';
    tech.isOnBreak = true;
    tech.breakStartedAt = breakStartedAt;

    if (tech.currentShiftId) {
      const shift = this.inMemoryShifts.get(tech.currentShiftId);
      if (shift) shift.breakCount = (shift.breakCount || 0) + 1;

      if (this.prisma) {
        try {
          await this.prisma.technicianShift.update({
            where: { id: tech.currentShiftId },
            data: { breakCount: { increment: 1 } }
          });
        } catch (err) {
          console.warn('[FieldOps] Warning updating breakCount in DB:', err.message);
        }
      }
    }

    if (this.io) {
      this.io.emit('technician_shift_updated', { technicianId, shiftStatus: 'ON_BREAK', breakStartedAt });
      this.io.emit('technicians_updated', this.dispatchEngine?.state.technicians);
    }

    return {
      success: true,
      shiftStatus: 'ON_BREAK',
      breakStartedAt,
      message: `${tech.name} is now on break and temporarily excluded from new dispatch offers.`
    };
  }

  /**
   * Concludes a temporary break and returns technician to active on-duty status.
   */
  async endBreak(technicianId) {
    if (!technicianId) return { success: false, error: 'Technician ID is required.' };

    const tech = this.dispatchEngine?.state.technicians.find((t) => t.id === technicianId);
    if (!tech) return { success: false, error: `Technician ${technicianId} not found.` };

    if (!tech.isOnBreak) {
      return { success: true, message: 'Technician is not currently on break.' };
    }

    let breakMinutes = 0;
    if (tech.breakStartedAt) {
      const startMs = new Date(tech.breakStartedAt).getTime();
      breakMinutes = Math.max(1, Math.round((Date.now() - startMs) / 60000));
    }

    tech.shiftStatus = 'ON_DUTY';
    tech.isOnBreak = false;
    tech.breakStartedAt = null;

    if (tech.currentShiftId) {
      const shift = this.inMemoryShifts.get(tech.currentShiftId);
      if (shift) {
        shift.totalBreakMinutes = (shift.totalBreakMinutes || 0) + breakMinutes;
      }

      if (this.prisma) {
        try {
          await this.prisma.technicianShift.update({
            where: { id: tech.currentShiftId },
            data: { totalBreakMinutes: { increment: breakMinutes } }
          });
        } catch (err) {
          console.warn('[FieldOps] Warning updating break minutes in DB:', err.message);
        }
      }
    }

    if (this.io) {
      this.io.emit('technician_shift_updated', { technicianId, shiftStatus: 'ON_DUTY' });
      this.io.emit('technicians_updated', this.dispatchEngine?.state.technicians);
    }

    return {
      success: true,
      shiftStatus: 'ON_DUTY',
      breakMinutes,
      message: `${tech.name} concluded break and is now available for dispatches.`
    };
  }

  /**
   * Retrieves technician working hours history.
   */
  async getShiftHistory(technicianId) {
    if (!technicianId) return [];

    if (this.prisma) {
      try {
        const shifts = await this.prisma.technicianShift.findMany({
          where: { technicianId },
          orderBy: { startedAt: 'desc' },
          take: 20
        });
        if (shifts.length > 0) return shifts;
      } catch (err) {
        console.warn('[FieldOps] Warning querying shift history from DB:', err.message);
      }
    }

    // In-memory fallback
    return Array.from(this.inMemoryShifts.values())
      .filter((s) => s.technicianId === technicianId)
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  }

  // =========================================================================
  // 2. OFFLINE DRAFT SYNCHRONIZATION
  // =========================================================================

  /**
   * Synchronizes an offline-drafted job update from a technician's field device.
   * 
   * Strict Safety Restrictions:
   * - Cannot fabricate acceptance, arrival, OTP verification, completion, or payment offline.
   * - Validates active assignment ownership.
   * - Detects and rejects conflicting server states (e.g. reassigned or cancelled requests).
   * - Enforces idempotency via idempotencyKey.
   */
  async syncOfflineDraft({ technicianId, requestId, idempotencyKey, clientVersion = 1, draft = {} }) {
    if (!technicianId || !requestId) {
      return { success: false, error: 'technicianId and requestId are required for offline synchronization.' };
    }

    // 1. Idempotency Check
    const syncKey = idempotencyKey || `draft_${requestId}_${technicianId}_${clientVersion}`;
    if (this.processedSyncKeys.has(syncKey)) {
      return {
        success: true,
        message: 'Draft update already synchronized.',
        idempotent: true,
        requestId,
        syncedAt: new Date().toISOString()
      };
    }

    // 2. Retrieve authoritative request from memory or database
    let request = this.dispatchEngine?.state.requests.find((r) => r.id === requestId);
    if (!request && this.prisma) {
      request = await this.prisma.serviceRequest.findUnique({
        where: { id: requestId }
      });
    }

    if (!request) {
      return { success: false, error: `Emergency service request ${requestId} not found.`, code: 'REQUEST_NOT_FOUND' };
    }

    // 3. Ownership / Assignment Check
    if (request.assignedTechnicianId && request.assignedTechnicianId !== technicianId) {
      return {
        success: false,
        error: `Forbidden: Specialist ${technicianId} is not assigned to this emergency request.`,
        code: 'UNAUTHORIZED_TECHNICIAN'
      };
    }

    // 4. Server State Conflict Check
    if (['completed', 'cancelled'].includes(request.status)) {
      return {
        success: false,
        error: `Conflict: Incident ${requestId} is already ${request.status} on the server. Offline draft cannot overwrite finalized state.`,
        code: 'SERVER_STATE_CONFLICT',
        serverStatus: request.status
      };
    }

    // 5. Apply supported draft updates safely
    // Note: Critical transitions (OTP, arrived, in_progress, completed) are strictly excluded from offline fabrication.
    const updates = {};
    if (draft.resolutionNotes) {
      request.resolutionNotes = draft.resolutionNotes;
      updates.resolutionNotes = draft.resolutionNotes;
    }
    if (draft.checklist) {
      request.checklist = draft.checklist;
      updates.checklist = draft.checklist;
    }
    if (draft.beforePhoto) {
      request.beforePhoto = draft.beforePhoto;
      updates.beforePhoto = draft.beforePhoto;
    }
    if (draft.afterPhoto) {
      request.afterPhoto = draft.afterPhoto;
      updates.afterPhoto = draft.afterPhoto;
    }
    if (draft.partsUsed) {
      request.partsUsed = draft.partsUsed;
      updates.partsUsed = draft.partsUsed;
    }

    request.draftData = JSON.stringify({
      lastSyncedAt: new Date().toISOString(),
      clientVersion,
      syncKey,
      draft
    });
    updates.draftData = request.draftData;

    // Persist draft updates to PostgreSQL
    if (this.dbService) {
      await this.dbService.updateRequest(requestId, updates).catch((err) => {
        console.warn('[FieldOps] Warning updating DB draftData:', err.message);
      });
    }

    this.processedSyncKeys.add(syncKey);

    if (this.io) {
      this.io.emit('request_updated', request);
    }

    return {
      success: true,
      requestId,
      syncedAt: new Date().toISOString(),
      serverStatus: request.status,
      draftVersion: clientVersion,
      message: 'Offline field draft synchronized successfully with central dispatch.'
    };
  }
}

export const fieldOperationsService = new FieldOperationsService();
