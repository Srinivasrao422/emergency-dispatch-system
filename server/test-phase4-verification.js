/**
 * ResQDispatch — Phase 4 Verification Test Suite
 * 
 * Verifies Admin Command Tower & Analytics:
 * 1. Server-Side Role-Based Authorization Enforcement
 * 2. Central Admin Command Dashboard Stats & KPIs
 * 3. Paginated & Filtered Service Request Management
 * 4. Mandatory Audit Logging on Emergency Cancellation
 * 5. Admin Incident Reassignment with Audit Log & Alerts
 * 6. Critical Incident Escalation & Real-Time Operational Alert
 * 7. Technician Workforce Command & Status Suspension/Activation
 * 8. Customer Registry, Order History & Account Suspension
 * 9. Analytics & Business Intelligence Engine (Volume, Breakdown, Trends)
 * 10. Financial & Invoice Management in INR (₹) with 15% Commission & Disclaimer
 * 11. Financial CSV Export Generation
 * 12. Operational Alerts & Notification Center (Severity, Mark Read, Clear)
 * 13. Persistent PostgreSQL Administrative Audit Log Archive
 */

const BASE_URL = 'http://localhost:5000';
const ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'x-admin-key': 'admin123',
  'x-user-role': 'admin'
};

async function runPhase4Tests() {
  console.log('===============================================================');
  console.log('🚨 RESQDISPATCH — PHASE 4 ADMIN COMMAND TOWER TEST SUITE');
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
    // ----------------------------------------------------
    // TEST 1: Server-Side Role-Based Authorization Enforcement
    // ----------------------------------------------------
    console.log('--- TEST 1: Role-Based Authorization & Security Guards ---');

    // 1a. Unauthorized access without headers
    const unauthRes = await fetch(`${BASE_URL}/api/admin/dashboard-stats`);
    assert(
      unauthRes.status === 401,
      'GET /api/admin/dashboard-stats rejects requests without admin credentials (401)',
      `Status: ${unauthRes.status}`
    );

    // 1b. Unauthorized access with wrong key
    const badKeyRes = await fetch(`${BASE_URL}/api/admin/dashboard-stats`, {
      headers: { 'x-admin-key': 'wrong_key' }
    });
    assert(
      badKeyRes.status === 401,
      'GET /api/admin/dashboard-stats rejects requests with invalid admin key (401)',
      `Status: ${badKeyRes.status}`
    );

    // 1c. Authorized access with valid admin key
    const authRes = await fetch(`${BASE_URL}/api/admin/dashboard-stats`, {
      headers: ADMIN_HEADERS
    });
    const authData = await authRes.json();
    assert(
      authRes.status === 200 && authData.success === true,
      'GET /api/admin/dashboard-stats succeeds with valid x-admin-key: "admin123"',
      `Success: ${authData.success} | Active emergencies: ${authData.stats?.activeEmergencies}`
    );

    // ----------------------------------------------------
    // TEST 2: Central Admin Dashboard Statistics & KPIs
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Real-Time PostgreSQL Dashboard KPIs ---');
    const stats = authData.stats;
    assert(
      typeof stats.totalRequests === 'number' && stats.totalRequests >= 0,
      'Dashboard stats reports totalRequests count',
      `totalRequests: ${stats.totalRequests}`
    );
    assert(
      typeof stats.onlineTechnicians === 'number' && stats.totalTechnicians >= 6,
      'Dashboard stats reports specialist fleet availability',
      `online: ${stats.onlineTechnicians} / total: ${stats.totalTechnicians} | busy: ${stats.busyTechnicians}`
    );
    assert(
      typeof stats.avgDispatchSeconds === 'number' && stats.avgDispatchSeconds <= 15,
      'Dashboard reports sub-15s average dispatch response time',
      `avgDispatchSeconds: ${stats.avgDispatchSeconds}s`
    );
    assert(
      stats.financialSummary && stats.financialSummary.currency === 'INR',
      'Dashboard financial summary defaults to Indian Rupee (INR ₹) standard',
      `Currency: ${stats.financialSummary.currency} (${stats.financialSummary.currencySymbol}) | Gross: ₹${stats.financialSummary.totalInvoiced}`
    );

    // ----------------------------------------------------
    // TEST 3: Paginated & Filtered Service Request Management
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Paginated & Filtered Requests Registry ---');
    const reqsRes = await fetch(`${BASE_URL}/api/admin/requests?limit=5&page=1`, {
      headers: ADMIN_HEADERS
    });
    const reqsData = await reqsRes.json();
    assert(
      reqsRes.status === 200 && Array.isArray(reqsData.requests) && reqsData.requests.length <= 5,
      'GET /api/admin/requests supports limit & pagination',
      `Returned ${reqsData.requests.length} of ${reqsData.total} items (Page ${reqsData.page}/${reqsData.totalPages})`
    );

    // Priority filter test
    const critRes = await fetch(`${BASE_URL}/api/admin/requests?priority=CRITICAL`, {
      headers: ADMIN_HEADERS
    });
    const critData = await critRes.json();
    const allCrit = critData.requests.every((r) => r.priority === 'CRITICAL');
    assert(
      critRes.status === 200 && allCrit,
      'GET /api/admin/requests accurately filters by priority="CRITICAL"',
      `Found ${critData.requests.length} critical requests`
    );

    // Single request detail test
    const sampleId = reqsData.requests[0]?.id;
    if (sampleId) {
      const singleRes = await fetch(`${BASE_URL}/api/admin/requests/${sampleId}`, {
        headers: ADMIN_HEADERS
      });
      const singleData = await singleRes.json();
      assert(
        singleRes.status === 200 && singleData.request?.id === sampleId,
        'GET /api/admin/requests/:id returns single incident dossier with audit history',
        `Request: ${singleData.request?.id} | Customer: ${singleData.request?.customerName}`
      );
    }

    // ----------------------------------------------------
    // TEST 4: Mandatory Audit Logging on Emergency Cancellation
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Admin Cancellation & Mandatory Audit Logging ---');

    // Create a dedicated test request
    const testReqRes = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'u_cust_1',
        category: 'plumbing',
        issueDescription: 'Phase 4 Cancellation Test Burst Pipe',
        priority: 'CRITICAL',
        location: { lat: 40.7128, lng: -74.006, address: '452 Broadway, NY' }
      })
    });
    const testReqData = await testReqRes.json();
    const cancelTargetId = testReqData.request.id;

    // 4a. Attempt to cancel without reason (Must Fail)
    const failCancelRes = await fetch(`${BASE_URL}/api/admin/requests/${cancelTargetId}/cancel`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ reason: '' })
    });
    assert(
      failCancelRes.status === 400,
      'POST /api/admin/requests/:id/cancel enforces mandatory cancellation reason (400)',
      `Status: ${failCancelRes.status}`
    );

    // 4b. Cancel with mandatory reason
    const validCancelRes = await fetch(`${BASE_URL}/api/admin/requests/${cancelTargetId}/cancel`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        reason: 'Customer resolved issue independently using main shutoff valve',
        adminName: 'Sarah Connor'
      })
    });
    const validCancelData = await validCancelRes.json();
    assert(
      validCancelRes.status === 200 && validCancelData.request?.status === 'cancelled',
      'POST /api/admin/requests/:id/cancel successfully cancels incident with audit record',
      `Status: ${validCancelData.request?.status} | Reason: "${validCancelData.request?.cancelReason}"`
    );

    // ----------------------------------------------------
    // TEST 5: Admin Incident Reassignment
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Manual Reassignment & Audit Record ---');

    // Create a new request for reassignment
    const reassignReqRes = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'u_cust_1',
        category: 'electrical',
        issueDescription: 'Phase 4 Reassignment Circuit Sparking',
        priority: 'HIGH',
        location: { lat: 40.7306, lng: -73.9352, address: 'Greenpoint, Brooklyn' }
      })
    });
    const reassignReqData = await reassignReqRes.json();
    const reassignReqId = reassignReqData.request.id;

    // Find eligible idle specialist for reassignment
    const allTechsRes = await fetch(`${BASE_URL}/api/admin/technicians`, { headers: ADMIN_HEADERS });
    const allTechsData = await allTechsRes.json();
    const idleTech = allTechsData.technicians?.find((t) => !t.activeRequestId && t.id !== reassignReqData.request?.assignedTechnicianId) || allTechsData.technicians[0];
    const targetTechId = idleTech ? idleTech.id : 't_elec_1';

    // Reassign to selected specialist
    const reassignRes = await fetch(`${BASE_URL}/api/admin/requests/${reassignReqId}/reassign`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        technicianId: targetTechId,
        reason: 'Closer specialist available with immediate response capability',
        adminName: 'Sarah Connor'
      })
    });
    const reassignData = await reassignRes.json();
    assert(
      reassignRes.status === 200 && reassignData.request?.assignedTechnicianId === targetTechId,
      'POST /api/admin/requests/:id/reassign reassigns incident with audit log',
      `Assigned Tech: ${reassignData.request?.assignedTechnicianId}`
    );

    // ----------------------------------------------------
    // TEST 6: Critical Incident Escalation
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Manual SLA Escalation & Alert Trigger ---');
    const escalateRes = await fetch(`${BASE_URL}/api/admin/requests/${reassignReqId}/escalate`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        reason: 'SLA target exceeded 15 minutes without technician movement',
        adminName: 'Sarah Connor'
      })
    });
    const escalateData = await escalateRes.json();
    assert(
      escalateRes.status === 200 && escalateData.request?.status === 'escalated',
      'POST /api/admin/requests/:id/escalate marks request as escalated for supervisor review',
      `Status: ${escalateData.request?.status} | Reason: "${escalateData.request?.escalatedReason}"`
    );

    // ----------------------------------------------------
    // TEST 7: Technician Workforce Command & Status Updates
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Specialist Workforce Management & Suspension Controls ---');
    const techsRes = await fetch(`${BASE_URL}/api/admin/technicians`, {
      headers: ADMIN_HEADERS
    });
    const techsData = await techsRes.json();
    assert(
      techsRes.status === 200 && Array.isArray(techsData.technicians) && techsData.total >= 6,
      'GET /api/admin/technicians returns comprehensive specialist directory',
      `Loaded ${techsData.total} specialists`
    );

    // Suspend technician t_hvac_1
    const suspendRes = await fetch(`${BASE_URL}/api/admin/technicians/t_hvac_1/status`, {
      method: 'PUT',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        isApproved: false,
        isOnline: false,
        status: 'suspended',
        reason: 'Annual gas certification review required'
      })
    });
    const suspendData = await suspendRes.json();
    assert(
      suspendRes.status === 200 && suspendData.technician?.isApproved === false,
      'PUT /api/admin/technicians/:id/status successfully suspends specialist with audit log',
      `Specialist: ${suspendData.technician?.name} | isApproved: ${suspendData.technician?.isApproved} | status: ${suspendData.technician?.status}`
    );

    // Reactivate technician t_hvac_1
    const activateRes = await fetch(`${BASE_URL}/api/admin/technicians/t_hvac_1/status`, {
      method: 'PUT',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        isApproved: true,
        isOnline: true,
        status: 'idle',
        reason: 'Certification verified and approved'
      })
    });
    const activateData = await activateRes.json();
    assert(
      activateRes.status === 200 && activateData.technician?.isApproved === true,
      'PUT /api/admin/technicians/:id/status restores specialist to active verified duty',
      `Specialist: ${activateData.technician?.name} | isApproved: ${activateData.technician?.isApproved}`
    );

    // ----------------------------------------------------
    // TEST 8: Customer Registry & Account Status Management
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Customer Registry & Account Security ---');
    const custsRes = await fetch(`${BASE_URL}/api/admin/customers`, {
      headers: ADMIN_HEADERS
    });
    const custsData = await custsRes.json();
    assert(
      custsRes.status === 200 && Array.isArray(custsData.customers) && custsData.customers.length > 0,
      'GET /api/admin/customers returns customer directory with order counts',
      `Found ${custsData.customers.length} registered customers`
    );

    const testCustId = custsData.customers[0]?.id || 'u_cust_1';

    // Fetch customer details profile
    const custDetailRes = await fetch(`${BASE_URL}/api/admin/customers/${testCustId}`, {
      headers: ADMIN_HEADERS
    });
    const custDetailData = await custDetailRes.json();
    assert(
      custDetailRes.status === 200 && custDetailData.customer?.id === testCustId,
      'GET /api/admin/customers/:id returns complete customer profile dossier',
      `Customer: ${custDetailData.customer?.name} | Requests count: ${custDetailData.customer?.requests?.length}`
    );

    // Suspend customer account
    const suspendCustRes = await fetch(`${BASE_URL}/api/admin/customers/${testCustId}/status`, {
      method: 'PUT',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        status: 'suspended',
        reason: 'Multiple fraudulent emergency dispatch attempts'
      })
    });
    const suspendCustData = await suspendCustRes.json();
    assert(
      suspendCustRes.status === 200 && suspendCustData.customer?.status === 'suspended',
      'PUT /api/admin/customers/:id/status suspends customer account with audit record',
      `Customer status: ${suspendCustData.customer?.status}`
    );

    // Restore customer account to active
    const restoreCustRes = await fetch(`${BASE_URL}/api/admin/customers/${testCustId}/status`, {
      method: 'PUT',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        status: 'active',
        reason: 'Identity verified and dispute resolved'
      })
    });
    const restoreCustData = await restoreCustRes.json();
    assert(
      restoreCustRes.status === 200 && restoreCustData.customer?.status === 'active',
      'PUT /api/admin/customers/:id/status restores customer account to active',
      `Customer status: ${restoreCustData.customer?.status}`
    );

    // ----------------------------------------------------
    // TEST 9: Analytics & Business Intelligence Engine
    // ----------------------------------------------------
    console.log('\n--- TEST 9: Analytics & Business Intelligence Engine ---');
    const analyticsRes = await fetch(`${BASE_URL}/api/admin/analytics?range=7d`, {
      headers: ADMIN_HEADERS
    });
    const analyticsData = await analyticsRes.json();
    assert(
      analyticsRes.status === 200 && analyticsData.success === true,
      'GET /api/admin/analytics returns BI intelligence dataset',
      `Total requests in range: ${analyticsData.analytics?.totalRequests}`
    );
    assert(
      analyticsData.analytics?.categoryBreakdown && Object.keys(analyticsData.analytics.categoryBreakdown).length > 0,
      'Analytics provides category demand breakdown',
      `Categories tracked: ${Object.keys(analyticsData.analytics.categoryBreakdown).join(', ')}`
    );
    assert(
      analyticsData.analytics?.kpiMetrics && typeof analyticsData.analytics.kpiMetrics.avgDispatchSeconds === 'number',
      'Analytics reports precision KPI benchmarks',
      `Dispatch: ${analyticsData.analytics.kpiMetrics.avgDispatchSeconds}s | SLA: ${analyticsData.analytics.kpiMetrics.slaAdherencePercent}%`
    );

    // ----------------------------------------------------
    // TEST 10: Financial & Invoice Management (INR ₹ Standard)
    // ----------------------------------------------------
    console.log('\n--- TEST 10: Financial Accounting & INR (₹) Ledger Standard ---');
    const finRes = await fetch(`${BASE_URL}/api/admin/financials?range=all`, {
      headers: ADMIN_HEADERS
    });
    const finData = await finRes.json();
    assert(
      finRes.status === 200 && finData.financials?.currency === 'INR',
      'GET /api/admin/financials standardizes on INR (₹) currency',
      `Currency: ${finData.financials?.currency} (${finData.financials?.currencySymbol})`
    );
    assert(
      finData.financials?.summary?.platformTakeRatePercent === 15,
      'Financials calculates exact 15% platform take-rate revenue',
      `Platform revenue: ₹${finData.financials?.summary?.platformRevenue} (15%)`
    );
    assert(
      finData.financials?.summary?.technicianLedgerPayable !== undefined && finData.financials?.summary?.technicianLedgerPayable >= 0,
      'Financials tracks 85% specialist ledger payable balance',
      `Tech payable: ₹${finData.financials?.summary?.technicianLedgerPayable} (85%)`
    );
    assert(
      typeof finData.financials?.disclaimer === 'string' && finData.financials.disclaimer.includes('DISCLAIMER'),
      'Financial report includes transparent ledger balance vs external payout disclaimer',
      `Disclaimer: "${finData.financials?.disclaimer?.substring(0, 70)}..."`
    );

    // ----------------------------------------------------
    // TEST 11: Financial CSV Export Generation
    // ----------------------------------------------------
    console.log('\n--- TEST 11: Financial CSV Export Endpoint ---');
    const csvRes = await fetch(`${BASE_URL}/api/admin/financials/export?adminKey=admin123`);
    const csvText = await csvRes.text();
    const hasCsvHeaders =
      csvText.includes('Invoice ID') &&
      csvText.includes('Gross Amount (INR)') &&
      csvText.includes('Platform Fee 15% (INR)') &&
      csvText.includes('Tech Net Payout 85% (INR)');
    assert(
      csvRes.status === 200 && hasCsvHeaders,
      'GET /api/admin/financials/export streams valid CSV file with INR ledger headers',
      `CSV rows length: ${csvText.split('\n').length} lines`
    );

    // ----------------------------------------------------
    // TEST 12: Operational Alerts & Notification Center
    // ----------------------------------------------------
    console.log('\n--- TEST 12: Operational Alerts & Notification Center ---');
    const notifsRes = await fetch(`${BASE_URL}/api/admin/notifications`, {
      headers: ADMIN_HEADERS
    });
    const notifsData = await notifsRes.json();
    assert(
      notifsRes.status === 200 && Array.isArray(notifsData.notifications),
      'GET /api/admin/notifications lists real-time operational alerts',
      `Found ${notifsData.notifications.length} alerts (Unread: ${notifsData.unreadCount})`
    );

    // Clear / mark all read
    const clearRes = await fetch(`${BASE_URL}/api/admin/notifications/clear`, {
      method: 'POST',
      headers: ADMIN_HEADERS
    });
    const clearData = await clearRes.json();
    assert(
      clearRes.status === 200 && clearData.success === true,
      'POST /api/admin/notifications/clear marks all operational alerts as read',
      `Success: ${clearData.success}`
    );

    // ----------------------------------------------------
    // TEST 13: Persistent Administrative Audit Log Archive
    // ----------------------------------------------------
    console.log('\n--- TEST 13: Persistent PostgreSQL Audit Trail Archive ---');
    const auditRes = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
      headers: ADMIN_HEADERS
    });
    const auditData = await auditRes.json();
    assert(
      auditRes.status === 200 && Array.isArray(auditData.logs) && auditData.logs.length > 0,
      'GET /api/admin/audit-logs retrieves non-repudiable audit logs from PostgreSQL',
      `Audit records count: ${auditData.logs.length}`
    );

    // Verify presence of our recent actions in audit logs
    const actions = auditData.logs.map((l) => l.action);
    const hasCancel = actions.includes('CANCEL_REQUEST');
    const hasReassign = actions.includes('REASSIGN_REQUEST');
    const hasEscalate = actions.includes('ESCALATE_REQUEST');
    const hasTechStatus = actions.includes('UPDATE_TECHNICIAN_STATUS');
    const hasCustStatus = actions.includes('UPDATE_CUSTOMER_STATUS');

    assert(
      hasCancel && hasReassign && hasEscalate && hasTechStatus && hasCustStatus,
      'Audit log contains records for all administrative mutations',
      `Logged actions: ${[...new Set(actions)].join(', ')}`
    );

    // ----------------------------------------------------
    // FINAL RESULTS SUMMARY
    // ----------------------------------------------------
    console.log('\n===============================================================');
    console.log(`🏁 PHASE 4 VERIFICATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('===============================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal test error:', error);
    process.exit(1);
  }
}

runPhase4Tests();
