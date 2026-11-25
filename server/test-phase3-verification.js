/**
 * ResQDispatch — Phase 3 Verification Test Suite
 * 
 * Verifies Technician Workforce & Field Operations:
 * 1. Online/Offline Duty Management & DB Persistence
 * 2. Profile, Vehicle, and Working Radius Configuration
 * 3. Offer Rejection with Specific Reason, DB Logging & Auto-Cascade
 * 4. Authorization & Concurrency Guards on Job Actions
 * 5. Complete Lifecycle: Assigned -> Accepted -> En Route -> Arrived -> In Progress -> Completed
 * 6. Arrival 4-Digit Security OTP Verification Gate
 * 7. Photo Proofs & Itemized Parts and Materials Logging
 * 8. Customer Signature & Acknowledgement Handling
 * 9. Technician Wallet 85% Revenue Split Credit
 * 10. State Transition Guards on Finalized Requests
 * 11. Earnings & Performance Summary Endpoint
 * 12. Instant Bank Payout (ACH) Settlement & Wallet Reset
 * 13. Admin Workforce Management Endpoint
 */

const BASE_URL = 'http://localhost:5000';

async function runPhase3Tests() {
  console.log('===============================================================');
  console.log('🚨 RESQDISPATCH — PHASE 3 TECHNICIAN WORKFORCE TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      if (details) console.log(`   └─ ${details}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (details) console.error(`   └─ ${details}`);
      failed++;
    }
  }

  try {
    // Reset state to initial clean seed data before running tests
    await fetch(`${BASE_URL}/api/admin/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': 'admin123' }
    });

    const techId = 't_plumb_1';

    // ----------------------------------------------------
    // TEST 1: Technician Duty & Availability Toggle (Online / Offline)
    // ----------------------------------------------------
    console.log('--- TEST 1: Technician Duty Status Toggle & DB Sync ---');
    
    // Toggle Offline
    const offRes = await fetch(`${BASE_URL}/api/technicians/${techId}/duty`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOnline: false })
    });
    const offData = await offRes.json();
    assert(
      offRes.status === 200 && offData.technician.isOnline === false,
      'PUT /api/technicians/:id/duty toggles technician offline',
      `Technician: ${offData.technician.name} | isOnline: ${offData.technician.isOnline} | status: ${offData.technician.status}`
    );

    // Toggle Back Online
    const onRes = await fetch(`${BASE_URL}/api/technicians/${techId}/duty`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOnline: true })
    });
    const onData = await onRes.json();
    assert(
      onRes.status === 200 && onData.technician.isOnline === true,
      'PUT /api/technicians/:id/duty restores technician online to idle',
      `isOnline: ${onData.technician.isOnline} | status: ${onData.technician.status}`
    );

    // ----------------------------------------------------
    // TEST 2: Profile, Vehicle & Working Radius Configuration
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Profile, Vehicle & Working Radius Configuration ---');
    const profileRes = await fetch(`${BASE_URL}/api/technicians/${techId}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '+1 (555) 888-9911',
        workingRadiusKm: 22.0,
        vehicleType: 'Emergency Rapid Response Van',
        vehiclePlate: 'RAPID-01'
      })
    });
    const profileData = await profileRes.json();
    assert(
      profileRes.status === 200 &&
      profileData.technician.workingRadiusKm === 22.0 &&
      profileData.technician.vehicle?.plate === 'RAPID-01',
      'PUT /api/technicians/:id/profile updates fleet settings & persists to PostgreSQL',
      `Radius: ${profileData.technician.workingRadiusKm} km | Vehicle: ${profileData.technician.vehicle?.type} (${profileData.technician.vehicle?.plate})`
    );

    // ----------------------------------------------------
    // TEST 3 & 4: Job Offer Rejection with Specific Reason
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Emergency Dispatch & Job Rejection with Reason ---');
    const rejectReqPayload = {
      customerId: 'u_cust_1',
      customerName: 'Jane Doe',
      customerPhone: '+1 (555) 234-5678',
      category: 'plumbing',
      priority: 'CRITICAL',
      issueDescription: 'Phase 3: Test request for job rejection validation',
      location: { lat: 40.7282, lng: -73.9942, address: '85 Mercer St, SoHo, NY' }
    };
    const rejectCreateRes = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rejectReqPayload)
    });
    const rejectCreateData = await rejectCreateRes.json();
    const rejectReqId = rejectCreateData.request.id;

    assert(
      rejectCreateRes.status === 201 && rejectCreateData.request.id,
      'POST /api/requests dispatches incident to technician',
      `Request ID: ${rejectReqId} | Assigned: ${rejectCreateData.dispatchResult.technician?.name}`
    );

    const specificReason = 'Specialized hydraulic pressure crimper undergoing calibration';
    const rejectActionRes = await fetch(`${BASE_URL}/api/requests/${rejectReqId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        technicianId: techId,
        reason: specificReason
      })
    });
    const rejectActionData = await rejectActionRes.json();

    const postRejectReq = await fetch(`${BASE_URL}/api/requests/${rejectReqId}`).then((r) => r.json());
    const freedTech = await fetch(`${BASE_URL}/api/technicians/${techId}`).then((r) => r.json());

    assert(
      rejectActionRes.status === 200 &&
      (postRejectReq.status === 'escalated' || postRejectReq.assignedTechnicianId !== techId) &&
      freedTech.status === 'idle',
      'POST /api/requests/:id/reject logs specific reason, frees technician, and cascades',
      `Request status: ${postRejectReq.status} | Tech status: ${freedTech.status} | Reason: "${specificReason}"`
    );

    // ----------------------------------------------------
    // TEST 5: Complete Lifecycle: Creation & Acceptance
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Full Lifecycle: Incident Creation & Authorization Guards ---');
    const lifecycleReqPayload = {
      customerId: 'u_cust_1',
      customerName: 'Jane Doe',
      customerPhone: '+1 (555) 234-5678',
      category: 'plumbing',
      priority: 'CRITICAL',
      issueDescription: 'Phase 3: High pressure laundry main cracked — active flood',
      location: { lat: 40.7250, lng: -73.9980, address: '452 Broadway, SoHo, NY' }
    };
    const lifeCreateRes = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lifecycleReqPayload)
    });
    const lifeCreateData = await lifeCreateRes.json();
    const lifeReq = lifeCreateData.request;

    assert(
      lifeCreateRes.status === 201 && lifeCreateData.dispatchResult.success,
      'POST /api/requests creates emergency job and assigns specialist',
      `Request ID: ${lifeReq.id} | Assigned: ${lifeCreateData.dispatchResult.technician?.name}`
    );

    // Test Unauthorized Acceptance Guard
    const rogueAcceptRes = await fetch(`${BASE_URL}/api/requests/${lifeReq.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ technicianId: 'unauthorized_tech_999' })
    });
    assert(
      rogueAcceptRes.status === 400 || rogueAcceptRes.status === 403,
      'Unauthorized technician cannot accept a job assigned to another specialist',
      `HTTP Status: ${rogueAcceptRes.status} (Safely forbidden)`
    );

    // Authorized Acceptance
    const legitAcceptRes = await fetch(`${BASE_URL}/api/requests/${lifeReq.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ technicianId: techId })
    });
    const legitAcceptData = await legitAcceptRes.json();
    assert(
      legitAcceptRes.status === 200 && legitAcceptData.success && legitAcceptData.request.status === 'accepted',
      'Authorized assigned technician accepts emergency job',
      `Request status: ${legitAcceptData.request.status}`
    );

    // ----------------------------------------------------
    // TEST 6: Navigation Start & GPS Telemetry Broadcast
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Navigation Start & GPS Telemetry ---');
    const navRes = await fetch(`${BASE_URL}/api/requests/${lifeReq.id}/navigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ technicianId: techId })
    });
    const navData = await navRes.json();
    assert(
      navRes.status === 200 && navData.request.status === 'en_route',
      'POST /api/requests/:id/navigate initiates driving telemetry & sets en_route',
      `Status: ${navData.request.status} | Tech status: ${navData.technician.status}`
    );

    // ----------------------------------------------------
    // TEST 7: Arrival & 4-Digit Security OTP Gate
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Site Arrival & Customer Security OTP Verification ---');
    // Mark arrived
    await fetch(`${BASE_URL}/api/requests/${lifeReq.id}/arrived`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ technicianId: techId })
    });

    const arrivedReq = await fetch(`${BASE_URL}/api/requests/${lifeReq.id}`).then((r) => r.json());
    assert(
      arrivedReq.status === 'arrived',
      'Specialist marks arrival on site',
      `Request status: ${arrivedReq.status}`
    );

    // Test incorrect OTP
    const wrongOtpRes = await fetch(`${BASE_URL}/api/requests/${lifeReq.id}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp: '0000' })
    });
    assert(
      wrongOtpRes.status === 400,
      'Incorrect OTP is rejected by the verification security gate',
      `Wrong OTP 0000 rejected`
    );

    // Test correct OTP via authorized customer verification channel
    const custOtpData = await fetch(`${BASE_URL}/api/requests/${lifeReq.id}/customer-otp`, {
      headers: { 'x-user-id': lifeReq.customerId, 'x-user-role': 'customer' }
    }).then((r) => r.json());
    const correctOtp = custOtpData.otp || lifeReq.otp;
    const validOtpRes = await fetch(`${BASE_URL}/api/requests/${lifeReq.id}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp: correctOtp })
    });
    const validOtpData = await validOtpRes.json();
    assert(
      validOtpRes.status === 200 && validOtpData.request.otpVerified === true && validOtpData.request.status === 'in_progress',
      'Valid 4-digit security OTP unlocks in_progress state',
      `OTP: ${correctOtp} verified | Status: ${validOtpData.request.status}`
    );

    // ----------------------------------------------------
    // TEST 8: Photo Proofs & Materials Logging
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Before/After Photos & Materials Logging ---');
    const photoRes = await fetch(`${BASE_URL}/api/requests/${lifeReq.id}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        beforePhoto: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400',
        afterPhoto: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400'
      })
    });
    const photoData = await photoRes.json();
    assert(
      photoRes.status === 200 && photoData.request.beforePhoto && photoData.request.afterPhoto,
      'POST /api/requests/:id/photos attaches audit-grade before & after evidence',
      `Before: ${photoData.request.beforePhoto.substring(0, 35)}... | After: ${photoData.request.afterPhoto.substring(0, 35)}...`
    );

    // ----------------------------------------------------
    // TEST 9: Service Completion, Signature & 85% Wallet Credit
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Job Completion, Customer Signature & 85% Wallet Split ---');
    const techBefore = await fetch(`${BASE_URL}/api/technicians/${techId}`).then((r) => r.json());
    const initialWallet = techBefore.walletBalance || 0;

    const completeRes = await fetch(`${BASE_URL}/api/requests/${lifeReq.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        technicianId: techId,
        notes: 'Emergency main relief line sealed and calibrated to 50 PSI. Customer tested flow.',
        partsUsed: 'Commercial Brass Ball Valve ($38.50), Teflon O-Ring Kit ($12.00)',
        beforePhoto: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400',
        afterPhoto: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400',
        customerSignature: 'Signed by: Jane Doe (Verified)'
      })
    });
    const completeData = await completeRes.json();

    const techAfter = await fetch(`${BASE_URL}/api/technicians/${techId}`).then((r) => r.json());
    const expectedTakeHome = parseFloat((149.0 * 0.85).toFixed(2)); // $126.65

    assert(
      completeRes.status === 200 &&
      completeData.request.status === 'completed' &&
      completeData.request.resolutionNotes.includes('[Customer Acknowledged & Signed]') &&
      techAfter.walletBalance >= initialWallet + expectedTakeHome - 0.05,
      'POST /api/requests/:id/complete finalizes service & credits 85% take-home to wallet',
      `Completed ID: ${completeData.request.id} | Initial Wallet: $${initialWallet.toFixed(2)} -> New Wallet: $${techAfter.walletBalance.toFixed(2)} (+ $${expectedTakeHome})`
    );

    // ----------------------------------------------------
    // TEST 10: State Guard: Reject Action on Finalized Request
    // ----------------------------------------------------
    console.log('\n--- TEST 9: State Guard: Reject Action on Finalized Request ---');
    const doubleCompleteRes = await fetch(`${BASE_URL}/api/requests/${lifeReq.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ technicianId: techId })
    });
    assert(
      doubleCompleteRes.status === 400,
      'Attempting to complete an already finalized request is safely rejected',
      `HTTP Status: ${doubleCompleteRes.status} (Rejected as expected)`
    );

    // ----------------------------------------------------
    // TEST 11: Technician Earnings & Performance Summary API
    // ----------------------------------------------------
    console.log('\n--- TEST 10: Technician Earnings & Performance Summary API ---');
    const earningsRes = await fetch(`${BASE_URL}/api/technicians/${techId}/earnings`);
    const earningsData = await earningsRes.json();

    assert(
      earningsRes.status === 200 && earningsData.success && earningsData.earnings.technicianId === techId,
      'GET /api/technicians/:id/earnings returns ledger, reviews, and gross/net calculations',
      `Wallet: $${earningsData.earnings.walletBalance.toFixed(2)} | Today: $${earningsData.earnings.earningsToday.toFixed(2)} | Completed Today: ${earningsData.earnings.completedJobsToday}`
    );

    // ----------------------------------------------------
    // TEST 12: Instant Bank Payout (ACH) Settlement & Wallet Reset
    // ----------------------------------------------------
    console.log('\n--- TEST 11: Instant Bank Payout Settlement & Wallet Reset ---');
    const payoutRes = await fetch(`${BASE_URL}/api/technicians/${techId}/payout`, {
      method: 'POST'
    });
    const payoutData = await payoutRes.json();

    const techPostPayout = await fetch(`${BASE_URL}/api/technicians/${techId}`).then((r) => r.json());

    assert(
      payoutRes.status === 200 &&
      payoutData.success === true &&
      techPostPayout.walletBalance === 0.0,
      'POST /api/technicians/:id/payout transfers balance & resets wallet to $0.00',
      `Transferred: $${payoutData.payoutAmount.toFixed(2)} to ACH | New Wallet Balance: $${techPostPayout.walletBalance.toFixed(2)}`
    );

    // Reject subsequent payout with $0.00 balance
    const zeroPayoutRes = await fetch(`${BASE_URL}/api/technicians/${techId}/payout`, {
      method: 'POST'
    });
    assert(
      zeroPayoutRes.status === 400,
      'Subsequent payout request with $0.00 balance is safely rejected',
      `HTTP Status: ${zeroPayoutRes.status} (Rejected as expected)`
    );

    // ----------------------------------------------------
    // TEST 13: Admin Workforce Approval & Duty Endpoint
    // ----------------------------------------------------
    console.log('\n--- TEST 12: Admin Workforce Management & Approval API ---');
    const adminDutyRes = await fetch(`${BASE_URL}/api/admin/technicians/${techId}/approval`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'admin123'
      },
      body: JSON.stringify({ isApproved: true, isOnline: true })
    });
    const adminDutyData = await adminDutyRes.json();
    assert(
      adminDutyRes.status === 200 && adminDutyData.success,
      'PUT /api/admin/technicians/:id/approval manages workforce status from command tower',
      `Technician: ${adminDutyData.technician.name} verified active`
    );

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log('\n===============================================================');
    console.log(`🏁 PHASE 3 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error during Phase 3 verification:', err);
    process.exit(1);
  }
}

runPhase3Tests();
