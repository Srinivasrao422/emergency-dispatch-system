import http from 'http';

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
  console.log('--- Phase 1: Verification & E2E Validation Tests ---');
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

  // Test 1: Categories API
  await test('GET /api/categories returns 6 service categories', async () => {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/categories',
      method: 'GET'
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.body) || res.body.length < 6) throw new Error(`Expected at least 6 categories, got ${res.body.length}`);
  });

  // Test 2: Technicians API
  await test('GET /api/technicians returns specialists with required fields', async () => {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/technicians',
      method: 'GET'
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.body) || res.body.length < 6) throw new Error(`Expected at least 6 technicians`);
    const tech = res.body[0];
    if (!tech.id || !tech.name || !tech.category) throw new Error('Technician missing key attributes');
  });

  // Test 3: Emergency Request Creation & Immediate Auto-Dispatch Trigger
  let createdReqId = null;
  await test('POST /api/requests creates request and triggers dispatch scoring', async () => {
    const payload = {
      customerId: 'u_cust_1',
      customerName: 'Jane Doe',
      customerPhone: '+1 (555) 234-5678',
      category: 'electrical',
      priority: 'CRITICAL',
      issueDescription: 'Breaker panel sparking intermittently with faint ozone smell',
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

    if (res.status !== 201) throw new Error(`Expected 201 Created, got ${res.status} (${JSON.stringify(res.body)})`);
    if (!res.body.success || !res.body.request) throw new Error('Expected success: true and request object');
    createdReqId = res.body.request.id;
    if (!createdReqId.startsWith('REQ-')) throw new Error(`Invalid request ID format: ${createdReqId}`);
    if (!res.body.request.otp) throw new Error('Expected 4-digit verification OTP to be generated');
  });

  // Test 4: Request Retrieval
  await test(`GET /api/requests/:id returns created emergency request`, async () => {
    if (!createdReqId) throw new Error('Skipping: no created request ID');
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/requests/${createdReqId}`,
      method: 'GET'
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.body.id !== createdReqId) throw new Error(`ID mismatch: expected ${createdReqId}, got ${res.body.id}`);
  });

  // Test 5: Verify OTP Lifecycle
  await test(`POST /api/requests/:id/verify-otp validates arrival PIN`, async () => {
    if (!createdReqId) throw new Error('Skipping: no created request ID');
    const getRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/requests/${createdReqId}`,
      method: 'GET'
    });
    const otp = getRes.body.otp;
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/requests/${createdReqId}/verify-otp`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { otp });
    if (res.status !== 200 || !res.body.success || !res.body.request.otpVerified) {
      throw new Error(`OTP validation failed: ${JSON.stringify(res.body)}`);
    }
  });

  // Test 6: Complete Job with resolution notes
  await test(`POST /api/requests/:id/complete resolves emergency lifecycle`, async () => {
    if (!createdReqId) throw new Error('Skipping: no created request ID');
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/requests/${createdReqId}/complete`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      resolutionNotes: 'Tightened loose busbar connection and replaced faulty 20A circuit breaker.',
      partsUsed: 'Siemens 20A Single Pole Breaker, 10AWG Copper Pigtail'
    });
    if (res.status !== 200 || !res.body.success) throw new Error(`Complete failed: ${JSON.stringify(res.body)}`);
    if (res.body.request.status !== 'completed') throw new Error(`Expected status 'completed', got ${res.body.request.status}`);
  });

  // Test 7: Settle Invoice Payment
  await test(`POST /api/requests/:id/pay settles invoice`, async () => {
    if (!createdReqId) throw new Error('Skipping: no created request ID');
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/requests/${createdReqId}/pay`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { paymentMethod: 'Apple Pay' });
    if (res.status !== 200 || !res.body.success) throw new Error(`Payment failed: ${JSON.stringify(res.body)}`);
    if (!res.body.request.invoice || !res.body.request.invoice.isPaid) throw new Error('Invoice not marked as paid');
  });

  // Test 8: Rate Service & Feedback
  await test(`POST /api/requests/:id/rate updates customer rating and feedback`, async () => {
    if (!createdReqId) throw new Error('Skipping: no created request ID');
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/requests/${createdReqId}/rate`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { rating: 5, feedback: 'Dave arrived in 8 minutes and fixed the sparking breaker immediately! Lifesaver.' });
    if (res.status !== 200 || !res.body.success) throw new Error(`Rating failed: ${JSON.stringify(res.body)}`);
    if (res.body.request.rating !== 5) throw new Error('Rating not updated on request');
  });

  // Test 9: Toggle Technician Online/Offline Duty
  await test(`PUT /api/technicians/:id/toggle-online switches duty status`, async () => {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/technicians/t_elec_1/toggle-online',
      method: 'PUT'
    });
    if (res.status !== 200 || !res.body.success) throw new Error(`Toggle failed: ${JSON.stringify(res.body)}`);
    // Toggle back to online
    await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/technicians/t_elec_1/toggle-online',
      method: 'PUT'
    });
  });

  // Test 10: Admin CSV Export
  await test('GET /api/admin/reports/csv returns valid CSV format', async () => {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/reports/csv',
      method: 'GET',
      headers: { 'x-admin-key': 'admin123' }
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (typeof res.body !== 'string' || !res.body.includes('Request_ID,Created_At,Customer_Name')) {
      throw new Error(`CSV output did not contain expected CSV header line: ${res.body.slice(0, 100)}`);
    }
  });

  console.log(`\n=============================================`);
  console.log(`Phase 1 Test Results: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
  console.log(`=============================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
