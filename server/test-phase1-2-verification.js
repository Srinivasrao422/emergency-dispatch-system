import http from 'http';
import { prisma, verifyDatabaseConnection } from './db/prisma.js';

async function safeDbQuery(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: data ? JSON.parse(data) : {} });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('   RESQDISPATCH — PHASE 1.2 BACKEND DATABASE INTEGRATION TESTS');
  console.log('===============================================================\n');

  // Ensure DB connection is verified and pooler active
  await verifyDatabaseConnection();

  // Reset server state to initial clean state with idle specialists
  await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/reset',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': 'admin123' }
  });

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  // 1. Startup & Live DB Sync Verification
  await test('Task 1: Verify PostgreSQL Connection & Startup Hydration', async () => {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/technicians',
      method: 'GET'
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.body.length !== 6) throw new Error(`Expected 6 specialists, got ${res.body.length}`);
    const dbTechs = await safeDbQuery(() => prisma.technician.count());
    if (dbTechs !== 6) throw new Error(`Expected 6 DB technicians, got ${dbTechs}`);
  });

  // 2. Customer & Request Creation in API & PostgreSQL
  let createdReqId = null;
  let assignedTechId = null;
  await test('Task 2: Customer Creation & Emergency Request Persistence in Supabase', async () => {
    const payload = {
      customerId: 'u_cust_1',
      customerName: 'Jane Doe',
      customerPhone: '+1 (555) 234-5678',
      category: 'plumbing',
      priority: 'CRITICAL',
      issueDescription: 'Main sewer line backup flooding basement bathroom',
      location: {
        address: '452 Broadway, SoHo, NY',
        lat: 40.7208,
        lng: -74.0007
      }
    };

    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/requests',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, payload);

    if (res.status !== 201 || !res.body.success) throw new Error(`Request creation failed: ${JSON.stringify(res.body)}`);
    createdReqId = res.body.request.id;
    assignedTechId = res.body.request.assignedTechnicianId;

    // Allow async DB writes to commit
    await new Promise((r) => setTimeout(r, 2000));

    // Verify row in PostgreSQL
    const dbRequest = await safeDbQuery(() =>
      prisma.serviceRequest.findUnique({
        where: { id: createdReqId },
        include: { invoice: true, dispatchAttempts: true }
      })
    );

    if (!dbRequest) throw new Error(`ServiceRequest ${createdReqId} not found in PostgreSQL!`);
    if (dbRequest.categoryId !== 'plumbing') throw new Error(`Category mismatch: ${dbRequest.categoryId}`);
    if (!dbRequest.invoice) throw new Error('Invoice was not created in PostgreSQL!');
    if (!dbRequest.dispatchAttempts || dbRequest.dispatchAttempts.length === 0) {
      throw new Error('Initial DispatchAssignment was not persisted in PostgreSQL!');
    }
  });

  // 3. Dispatch Assignment Outcome Persistence
  await test('Task 3: Technician Acceptance & Dispatch Assignment Outcome in Supabase', async () => {
    if (!createdReqId || !assignedTechId) throw new Error('Skipping: no active request or technician');

    // Check current status: if still 'assigned', call accept endpoint; if already auto-accepted by demo progression, proceed
    const currentReq = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/requests/${createdReqId}`,
      method: 'GET'
    });

    if (currentReq.body && currentReq.body.status === 'assigned') {
      const res = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: `/api/requests/${createdReqId}/accept`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { technicianId: assignedTechId });
      if (res.status !== 200 || !res.body.success) throw new Error(`Accept failed: ${JSON.stringify(res.body)}`);
    }

    // Allow async DB writes to flush
    await new Promise((r) => setTimeout(r, 1500));

    // Verify in PostgreSQL that outcome updated to 'accepted'
    const assignment = await safeDbQuery(() =>
      prisma.dispatchAssignment.findFirst({
        where: { requestId: createdReqId, technicianId: assignedTechId }
      })
    );

    if (!assignment) throw new Error('Assignment record missing in DB');
    if (assignment.outcome !== 'accepted') {
      throw new Error(`Expected outcome 'accepted', got '${assignment.outcome}'`);
    }

    // Verify technician status in PostgreSQL
    const dbTech = await safeDbQuery(() => prisma.technician.findUnique({ where: { id: assignedTechId } }));
    if (!['assigned', 'en_route', 'in_progress', 'idle'].includes(dbTech.status)) {
      throw new Error(`Unexpected tech status: '${dbTech.status}'`);
    }
  });

  // 4. Concurrency Guard Test: Reject unauthorized technician acceptance
  await test('Task 4: Concurrency Guard - Reject unauthorized or double acceptance', async () => {
    if (!createdReqId) throw new Error('Skipping: no active request');
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/requests/${createdReqId}/accept`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { technicianId: 't_elec_1' });

    if (res.status === 200 && res.body.success) {
      throw new Error('Concurrency guard failed: unauthorized technician was able to accept an accepted job!');
    }
  });

  // 5. GPS Navigation & OTP Arrival Verification
  await test('Task 5: GPS Navigation & Arrival OTP Verification', async () => {
    if (!createdReqId || !assignedTechId) throw new Error('Skipping');

    // Navigate
    await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/requests/${createdReqId}/navigate`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { technicianId: assignedTechId });

    // Arrived
    await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/requests/${createdReqId}/arrived`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { technicianId: assignedTechId });

    // Fetch OTP
    const getReq = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/requests/${createdReqId}`,
      method: 'GET'
    });
    const otp = getReq.body.otp;

    // Verify OTP
    const otpRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/requests/${createdReqId}/verify-otp`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { otp });

    if (!otpRes.body.success || !otpRes.body.request.otpVerified) {
      throw new Error('OTP verification failed');
    }
  });

  // 6. Complete Job & Service History Persistence in Supabase
  await test('Task 6: Job Completion & Service History Row Persistence in Supabase', async () => {
    if (!createdReqId || !assignedTechId) throw new Error('Skipping');

    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/requests/${createdReqId}/complete`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      technicianId: assignedTechId,
      notes: 'Cleared main drain obstruction using motorized auger. Flow restored.',
      partsUsed: 'High-Tensile Drain Cable, Bio-Clean Enzyme Treatment'
    });

    if (res.status !== 200 || !res.body.success) throw new Error(`Complete failed: ${JSON.stringify(res.body)}`);

    // Allow async DB write to flush
    let history = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise((r) => setTimeout(r, 1500));
      history = await safeDbQuery(() =>
        prisma.serviceHistory.findUnique({
          where: { requestId: createdReqId }
        })
      );
      if (history) break;
    }

    if (!history) throw new Error(`ServiceHistory record for ${createdReqId} was not created in PostgreSQL!`);
    if (history.status !== 'completed') throw new Error(`Expected history status 'completed', got ${history.status}`);
    if (!history.issueDescription.includes('sewer')) {
      throw new Error(`Unexpected issue description in history: ${history.issueDescription}`);
    }
  });

  // 7. Invoice Payment Settlement & ServiceHistory Sync
  await test('Task 7: Invoice Payment Settlement in Supabase', async () => {
    if (!createdReqId) throw new Error('Skipping');

    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/requests/${createdReqId}/pay`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { paymentMethod: 'Apple Pay' });

    if (res.status !== 200 || !res.body.success) throw new Error(`Payment failed: ${JSON.stringify(res.body)}`);

    // Allow async DB write to flush
    await new Promise((r) => setTimeout(r, 2000));

    // Check Invoice row in PostgreSQL
    const invoice = await safeDbQuery(() => prisma.invoice.findUnique({ where: { requestId: createdReqId } }));
    if (!invoice || !invoice.isPaid) throw new Error('Invoice in PostgreSQL is not marked as paid!');
    if (invoice.paymentMethod !== 'Apple Pay') throw new Error(`Expected Apple Pay, got ${invoice.paymentMethod}`);

    // Check ServiceHistory sync
    const history = await safeDbQuery(() => prisma.serviceHistory.findUnique({ where: { requestId: createdReqId } }));
    if (!history || !history.isPaid) throw new Error('ServiceHistory in PostgreSQL was not marked as isPaid!');
  });

  // 8. Rating Submission & Sync to Request, History, and Technician
  await test('Task 8: Customer 5-Star Rating Persistence & Aggregation', async () => {
    if (!createdReqId) throw new Error('Skipping');

    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/requests/${createdReqId}/rate`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { rating: 5, feedback: 'Outstanding emergency service! Solved the flood in under 30 minutes.' });

    if (res.status !== 200 || !res.body.success) throw new Error(`Rating failed: ${JSON.stringify(res.body)}`);

    // Allow async DB write to flush
    await new Promise((r) => setTimeout(r, 2000));

    // Check ServiceRequest rating in PostgreSQL with polling
    let req = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      req = await safeDbQuery(() => prisma.serviceRequest.findUnique({ where: { id: createdReqId } }));
      if (req && req.rating === 5) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!req || req.rating !== 5) throw new Error(`Expected request rating 5, got ${req?.rating}`);

    // Check ServiceHistory rating in PostgreSQL with retry
    let history = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      history = await safeDbQuery(() => prisma.serviceHistory.findUnique({ where: { requestId: createdReqId } }));
      if (history && history.rating === 5) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!history) throw new Error(`ServiceHistory record for ${createdReqId} missing!`);
    if (history.rating !== 5) throw new Error(`Expected history rating 5, got ${history.rating}`);
  });

  // 9. Concurrency / Terminal Guard: Re-dispatching completed job is blocked
  await test('Task 9: Terminal Status Guard - Reject auto-dispatch on completed job', async () => {
    if (!createdReqId) throw new Error('Skipping');
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/requests/${createdReqId}/advance`,
      method: 'POST'
    });
    if (!res.body.success || !res.body.message.includes('completed')) {
      throw new Error(`Expected already completed message, got: ${JSON.stringify(res.body)}`);
    }
  });

  // 10. Startup Hydration Verification: Confirm created request exists in memory
  await test('Task 10: State Hydration - Requests and Invoices Restored in Memory', async () => {
    if (!createdReqId) throw new Error('Skipping');
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/requests/${createdReqId}`,
      method: 'GET'
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.body.id !== createdReqId) throw new Error(`Expected ${createdReqId}, got ${res.body.id}`);
    if (res.body.status !== 'completed') throw new Error(`Expected status 'completed', got ${res.body.status}`);
    if (!res.body.invoice || !res.body.invoice.isPaid) throw new Error('Invoice not marked as paid in restored request');
  });

  console.log(`\n===============================================================`);
  console.log(`Phase 1.2 Database Integration Test Results: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
  console.log(`===============================================================\n`);

  await prisma.$disconnect();

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(async (err) => {
  console.error('Test runner fatal error:', err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
