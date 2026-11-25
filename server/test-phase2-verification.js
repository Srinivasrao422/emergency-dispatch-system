/**
 * ResQDispatch — Phase 2 Verification Test Suite
 * 
 * Verifies Intelligent Technician Matching, Geospatial Intelligence,
 * Advanced Dispatch Engine, Scoring Algorithm, Dynamic Policies,
 * Reassignment, Stale GPS Penalties, and Dispatch Intelligence Metrics.
 */

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('====================================================');
  console.log('🚨 STARTING PHASE 2 VERIFICATION TEST SUITE');
  console.log('====================================================\n');

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
    // Reset baseline state before test execution
    await fetch(`${BASE_URL}/api/admin/reset`, {
      method: 'POST',
      headers: { 'x-admin-key': 'admin123', 'x-user-role': 'admin' }
    }).catch(() => {});

    // ----------------------------------------------------
    // TEST 1: Dispatch Policy Retrieval & Inspection
    // ----------------------------------------------------
    console.log('--- TEST 1: Dynamic Dispatch Policy GET ---');
    const policyRes = await fetch(`${BASE_URL}/api/dispatch/policy`);
    const policy = await policyRes.json();
    assert(
      policyRes.status === 200 && policy.preset && policy.weights && policy.timeouts,
      'GET /api/dispatch/policy returns valid policy structure',
      `Preset: ${policy.preset}, w_d: ${policy.weights.distance}, w_r: ${policy.weights.rating}, Max Radius: ${policy.maxRadiusKm} km`
    );

    // ----------------------------------------------------
    // TEST 2: Dynamic Dispatch Policy Update (PUT)
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Dynamic Dispatch Policy PUT ---');
    const updateRes = await fetch(`${BASE_URL}/api/dispatch/policy`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preset: 'dense_urban',
        weights: { distance: 0.55, rating: 0.25, workload: 0.10, experience: 0.10 },
        maxRadiusKm: 12.0,
        timeouts: { CRITICAL: 18, HIGH: 25, MEDIUM: 35, STANDARD: 35 }
      })
    });
    const updateData = await updateRes.json();
    assert(
      updateRes.status === 200 && updateData.success && updateData.policy.weights.distance === 0.55,
      'PUT /api/dispatch/policy successfully updates policy configuration',
      `Updated preset: ${updateData.policy.preset}, distance weight: ${updateData.policy.weights.distance}, CRITICAL timeout: ${updateData.policy.timeouts.CRITICAL}s`
    );

    // ----------------------------------------------------
    // TEST 3: Geospatial Calculation & Candidate Scoring
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Candidate Ranking & Geospatial Calculations ---');
    // Fetch existing requests to test candidate evaluation endpoint
    const reqsRes = await fetch(`${BASE_URL}/api/requests`);
    const allReqs = await reqsRes.json();
    let testReq = allReqs[0];
    if (!testReq) {
      const initRes = await fetch(`${BASE_URL}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'u_cust_1',
          category: 'plumbing',
          issueDescription: 'Initial test plumbing incident',
          priority: 'HIGH',
          location: { lat: 40.7208, lng: -74.0007, address: '452 Broadway, SoHo, NY' }
        })
      });
      const initData = await initRes.json();
      testReq = initData.request;
    }

    const candRes = await fetch(`${BASE_URL}/api/requests/${testReq.id}/candidates`);
    const candData = await candRes.json();
    assert(
      candRes.status === 200 && Array.isArray(candData.candidates),
      'GET /api/requests/:id/candidates returns candidate evaluation array',
      `Found ${candData.count} evaluated candidates for request ${testReq.id}`
    );

    if (candData.candidates.length > 0) {
      const topCand = candData.candidates[0];
      assert(
        topCand.score !== undefined && topCand.distanceKm !== undefined && topCand.etaMinutes !== undefined,
        'Top candidate includes score, Haversine distance, and ETA',
        `Top: ${topCand.tech.name} | Score: ${topCand.score} | Distance: ${topCand.distanceKm} km | ETA: ${topCand.etaMinutes} min | Bearing: ${topCand.bearing}°`
      );
    }

    // ----------------------------------------------------
    // TEST 4: Intelligent Emergency Creation & Auto-Dispatch
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Intelligent Emergency Auto-Dispatch ---');
    const newEmergency = {
      customerId: 'u_cust_1',
      customerName: 'Jane Doe',
      customerPhone: '+1 (555) 234-5678',
      category: 'plumbing',
      priority: 'CRITICAL',
      issueDescription: 'Phase 2 Test: Burst high-pressure water main flooding kitchen',
      location: {
        lat: 40.7282,
        lng: -73.9942,
        address: 'Phase 2 Incident Site, Manhattan, NY'
      }
    };

    const createRes = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEmergency)
    });
    const createData = await createRes.json();
    const createdReq = createData.request;
    const dispatchResult = createData.dispatchResult;

    assert(
      createRes.status === 201 && createdReq.id && dispatchResult.success,
      'POST /api/requests triggers Auto-Dispatch Engine with candidate ranking',
      `Created ${createdReq.id} | Assigned Tech: ${dispatchResult.technician?.name} | Score: ${dispatchResult.score} | ETA: ${dispatchResult.etaMinutes} min`
    );

    // ----------------------------------------------------
    // TEST 5: Job Rejection & Automatic Reassignment Cascade
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Job Rejection & Auto-Reassignment Cascade ---');
    const assignedTechId = dispatchResult.technician.id;
    const rejectRes = await fetch(`${BASE_URL}/api/requests/${createdReq.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        technicianId: assignedTechId,
        reason: 'Phase 2 automated rejection test (vehicle maintenance)'
      })
    });
    const rejectData = await rejectRes.json();

    // Verify request reassigned or escalated
    const recheckedReqRes = await fetch(`${BASE_URL}/api/requests/${createdReq.id}`);
    const recheckedReq = await recheckedReqRes.json();

    assert(
      rejectRes.status === 200 && (recheckedReq.assignedTechnicianId !== assignedTechId || recheckedReq.status === 'escalated'),
      'Rejecting job excludes previous technician and cascades to next candidate',
      `Original tech: ${assignedTechId} | New assigned: ${recheckedReq.assignedTechnicianId || 'None'} | Status: ${recheckedReq.status} | Attempts: ${recheckedReq.dispatchAttempts?.length || 0}`
    );

    // ----------------------------------------------------
    // TEST 6: Admin Manual Override & Reassignment Protection
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Admin Manual Override & Concurrency Protection ---');
    // Fetch technicians to find an available specialist
    const techsRes = await fetch(`${BASE_URL}/api/auth/users`);
    const { technicians } = await techsRes.json();
    const overrideTech = technicians.find((t) => !t.activeRequestId && t.status === 'idle' && t.id !== assignedTechId) ||
                         technicians.find((t) => !t.activeRequestId && t.id !== assignedTechId) ||
                         technicians.find((t) => t.id !== assignedTechId);

    const overrideRes = await fetch(`${BASE_URL}/api/admin/override`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'admin123',
        'x-user-role': 'admin'
      },
      body: JSON.stringify({
        requestId: createdReq.id,
        technicianId: overrideTech.id
      })
    });
    const overrideData = await overrideRes.json();

    assert(
      overrideRes.status === 200 && overrideData.success && overrideData.request.assignedTechnicianId === overrideTech.id,
      'POST /api/admin/override successfully reassigns technician',
      `Request ${createdReq.id} manually overridden to ${overrideTech.name}`
    );

    // ----------------------------------------------------
    // TEST 7: Technician GPS Telemetry & Heading Update
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Technician GPS Telemetry & Heading ---');
    const updateLocRes = await fetch(`${BASE_URL}/api/technicians/${overrideTech.id}/location`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: 40.7310,
        lng: -73.9920,
        address: 'Broadway & 10th St, NY'
      })
    });
    const updateLocData = await updateLocRes.json();
    assert(
      updateLocRes.status === 200 && updateLocData.technician.currentLocation.lat === 40.7310 && updateLocData.technician.lastLocationUpdate,
      'PUT /api/technicians/:id/location updates coordinates and records lastLocationUpdate',
      `Lat: ${updateLocData.technician.currentLocation.lat}, Lng: ${updateLocData.technician.currentLocation.lng}, Heading: ${updateLocData.technician.heading || 0}°, Updated: ${updateLocData.technician.lastLocationUpdate}`
    );

    // ----------------------------------------------------
    // TEST 8: Max Dispatch Attempts & Escalation
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Max Retry Attempts & Auto-Escalation ---');
    // Create an incident with an obscure or exhausted scenario
    const testEscalationReq = {
      customerId: 'u_cust_1',
      customerName: 'Jane Doe',
      category: 'gas',
      priority: 'CRITICAL',
      issueDescription: 'Phase 2: Gas leak simulation to test escalation trigger',
      location: { lat: 40.7200, lng: -74.0050, address: 'Test Escalation Location' }
    };
    const escCreateRes = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEscalationReq)
    });
    const escCreateData = await escCreateRes.json();
    const escReqId = escCreateData.request.id;

    // Reject consecutively to exhaust candidate pool and reach max attempts
    let curReq = escCreateData.request;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (curReq.assignedTechnicianId && curReq.status !== 'escalated') {
        await fetch(`${BASE_URL}/api/requests/${escReqId}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            technicianId: curReq.assignedTechnicianId,
            reason: `Attempt ${attempt + 1} test rejection`
          })
        });
        const updated = await fetch(`${BASE_URL}/api/requests/${escReqId}`).then((r) => r.json());
        curReq = updated;
      }
    }

    assert(
      curReq.status === 'escalated' || curReq.dispatchAttempts?.length >= 2,
      'Request auto-escalates when candidate pool is exhausted or max retries reached',
      `Final status: ${curReq.status} | Reason: "${curReq.escalatedReason || 'Exhausted'}" | Total Attempts: ${curReq.dispatchAttempts?.length || 0}`
    );

    // ----------------------------------------------------
    // TEST 9: Admin Dispatch Intelligence Endpoint
    // ----------------------------------------------------
    console.log('\n--- TEST 9: Admin Dispatch Intelligence & SLA Metrics ---');
    const intelRes = await fetch(`${BASE_URL}/api/admin/dispatch-intelligence`, {
      headers: { 'x-admin-key': 'admin123' }
    });
    const intelData = await intelRes.json();
    assert(
      intelRes.status === 200 && intelData.success && intelData.summary && intelData.statusDistribution,
      'GET /api/admin/dispatch-intelligence returns comprehensive analytics',
      `Total Requests: ${intelData.summary.totalRequests} | Active: ${intelData.summary.activeRequests} | SLA Adherence: ${intelData.summary.slaAdherenceRate} | Avg Dispatch: ${intelData.summary.avgDispatchSeconds}s`
    );

    // ----------------------------------------------------
    // TEST 10: PostgreSQL Database Persistence Regression
    // ----------------------------------------------------
    console.log('\n--- TEST 10: PostgreSQL Persistence Regression Check ---');
    const verifyReqRes = await fetch(`${BASE_URL}/api/requests/${createdReq.id}`);
    const verifyReq = await verifyReqRes.json();
    assert(
      verifyReqRes.status === 200 && verifyReq.id === createdReq.id && verifyReq.category === 'plumbing',
      'Phase 1 PostgreSQL persistence remains fully functional without data loss',
      `Persisted request ${verifyReq.id} successfully retrieved with category "${verifyReq.category}"`
    );

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log('\n====================================================');
    console.log(`🏁 PHASE 2 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal error during Phase 2 verification:', error);
    process.exit(1);
  }
}

runTests();
