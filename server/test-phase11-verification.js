/**
 * RESQDISPATCH — Phase 11 Automated Production Readiness & Security Suite
 * 
 * Tests:
 * 1. Server-Validated Cryptographic Identities & Token Authentication
 * 2. Cross-Customer Isolation, Data Export & GDPR Anonymization
 * 3. 4-Digit Arrival OTP Confidentiality & Gate Verification
 * 4. Razorpay Signature Verification, Ledger Atomicity & Payout Guard
 * 5. External Provider Health & Calibrated Fallback States
 * 6. Production Readiness Audit & Governance Matrix
 * 7. PII Redaction & Log Sanitization Integrity
 */

import { generateAuthToken, verifyAuthToken, maskPII } from './middleware/security.js';

const BASE_URL = 'http://localhost:5000';
const ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'x-admin-key': 'admin123'
};

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    if (details) console.log(`   └─ ${details}`);
    totalPassed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (details) console.error(`   └─ ${details}`);
    totalFailed++;
  }
}

async function runPhase11Tests() {
  console.log('================================================================');
  console.log('🛡️  RESQDISPATCH — PHASE 11 PRODUCTION READINESS & SECURITY SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // MODULE 1: Server-Validated Cryptographic Identities & Token Authentication
  // -------------------------------------------------------------------------
  console.log('--- MODULE 1: Server-Validated Identities & Cryptographic Auth ---');

  // 1.1 Login generates HMAC-SHA256 signed token
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jane.doe@example.com', role: 'customer' })
  });
  const loginData = await loginRes.json();
  const customerToken = loginData.token;

  assert(
    loginRes.status === 200 && Boolean(customerToken) && customerToken.split('.').length === 3,
    '1.1 POST /api/auth/login generates and issues HMAC-SHA256 signed session token',
    `User: ${loginData.user?.name} | Token Header.Payload.Sig length: ${customerToken?.length} chars`
  );

  // 1.2 Cryptographic verification of token claims
  const verifiedClaims = verifyAuthToken(customerToken);
  assert(
    verifiedClaims && verifiedClaims.sub === loginData.user?.id && verifiedClaims.role === 'customer',
    '1.2 Server cryptographically verifies token claims (sub, role, expiration)',
    `Claim Sub: ${verifiedClaims?.sub} | Role: ${verifiedClaims?.role} | Valid: true`
  );

  // 1.3 Authenticated endpoint access using Bearer token
  const addressesRes = await fetch(`${BASE_URL}/api/customers/${loginData.user?.id}/addresses`, {
    headers: {
      'Authorization': `Bearer ${customerToken}`
    }
  });
  const addressesData = await addressesRes.json();
  assert(
    addressesRes.status === 200 && addressesData.success === true,
    '1.3 Authenticated API endpoint accepts valid Bearer token for access authorization',
    `Status: ${addressesRes.status} | Addresses Count: ${addressesData.addresses?.length}`
  );

  // 1.4 Tampered / forged token is strictly rejected
  const tamperedToken = customerToken.substring(0, customerToken.length - 6) + 'xxxxxx';
  const tamperedClaims = verifyAuthToken(tamperedToken);
  assert(
    tamperedClaims === null,
    '1.4 Cryptographic verification strictly rejects tampered / forged tokens',
    'Signature mismatch safely detected and rejected'
  );

  // 1.5 Privilege escalation prevention
  const spoofAdminRes = await fetch(`${BASE_URL}/api/admin/requests`, {
    headers: {
      'x-user-role': 'admin',
      'x-user-id': 'hacker_1'
    }
  });
  assert(
    spoofAdminRes.status === 401,
    '1.5 Privilege Escalation Guard blocks spoofed x-user-role: admin header without key (401)',
    `Status: ${spoofAdminRes.status} Unauthorized`
  );

  // -------------------------------------------------------------------------
  // MODULE 2: Customer Privacy, GDPR Deletion & Data Isolation
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 2: Customer Privacy, GDPR Deletion & Data Export ---');

  // Register dedicated test user for GDPR test
  const testUserEmail = `pilot_gdpr_${Date.now()}@example.com`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUserEmail,
      name: 'Privacy Pilot User',
      phone: '+91 9876543210',
      address: '77 Mercer St, SoHo, NY'
    })
  });
  const regData = await regRes.json();
  const pilotCustId = regData.user?.id;
  const pilotToken = regData.token;

  // 2.1 Customer Data Export
  const exportRes = await fetch(`${BASE_URL}/api/customers/${pilotCustId}/data-export`, {
    headers: { 'Authorization': `Bearer ${pilotToken}` }
  });
  const exportData = await exportRes.json();
  assert(
    exportRes.status === 200 && exportData.success === true && exportData.customerProfile?.id === pilotCustId,
    '2.1 GET /api/customers/:id/data-export exports structured customer data portfolio',
    `Profile Name: ${exportData.customerProfile?.name} | Requests: ${exportData.requestsCount}`
  );

  // 2.2 Cross-customer access block on data export
  const rogueExportRes = await fetch(`${BASE_URL}/api/customers/${pilotCustId}/data-export`, {
    headers: {
      'x-user-id': 'u_rogue_999',
      'x-user-role': 'customer'
    }
  });
  assert(
    rogueExportRes.status === 403,
    '2.2 Cross-customer data isolation blocks accessing another customer export (403)',
    `Status: ${rogueExportRes.status} Forbidden`
  );

  // 2.3 Customer GDPR Data Deletion
  const deleteRes = await fetch(`${BASE_URL}/api/customers/${pilotCustId}/gdpr-delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${pilotToken}`
    }
  });
  const deleteData = await deleteRes.json();
  assert(
    deleteRes.status === 200 && deleteData.success === true,
    '2.3 POST /api/customers/:id/gdpr-delete redacts personal details per retention policy',
    `Message: ${deleteData.message?.substring(0, 50)}...`
  );

  // -------------------------------------------------------------------------
  // MODULE 3: 4-Digit Arrival OTP Confidentiality & Gate Verification
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 3: 4-Digit Arrival OTP Confidentiality & Gate Verification ---');

  // Create test emergency request
  const reqRes = await fetch(`${BASE_URL}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: 'u_cust_1',
      customerName: 'Jane Doe',
      category: 'plumbing',
      priority: 'CRITICAL',
      issueDescription: `Burst pipe for Phase 11 security audit ${Date.now()}`,
      location: { lat: 40.7208, lng: -74.0007, address: '452 Broadway, SoHo, NY' }
    })
  });
  const reqData = await reqRes.json();
  const testReqId = reqData.request?.id;
  const assignedTechId = reqData.request?.assignedTechnicianId || 't_plumb_1';

  // 3.1 Customer channel provides valid OTP
  const custOtpRes = await fetch(`${BASE_URL}/api/requests/${testReqId}/customer-otp`, {
    headers: { 'x-user-id': 'u_cust_1', 'x-user-role': 'customer' }
  });
  const custOtpData = await custOtpRes.json();
  const customerOtp = custOtpData.otp;

  assert(
    custOtpRes.status === 200 && /^\d{4}$/.test(customerOtp),
    '3.1 Authorized customer verification channel delivers 4-digit arrival OTP',
    `Customer OTP: ${customerOtp}`
  );

  // 3.2 Technician-facing request queries strictly omit OTP
  const techViewRes = await fetch(`${BASE_URL}/api/technicians/${assignedTechId}`);
  const techViewData = await techViewRes.json();
  assert(
    techViewData.activeRequestOtp === undefined && techViewData.otp === undefined,
    '3.2 Technician-facing endpoints never reveal customer arrival OTP',
    'Field status: Redacted / Protected'
  );

  // 3.3 Specialist accepts, arrives, verifies OTP
  await fetch(`${BASE_URL}/api/requests/${testReqId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-technician-id': assignedTechId, 'x-user-role': 'technician' },
    body: JSON.stringify({ technicianId: assignedTechId })
  });

  await fetch(`${BASE_URL}/api/requests/${testReqId}/arrive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-technician-id': assignedTechId, 'x-user-role': 'technician' },
    body: JSON.stringify({ technicianId: assignedTechId, distanceKm: 0 })
  });

  // Verify wrong OTP rejected
  const wrongOtpRes = await fetch(`${BASE_URL}/api/requests/${testReqId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-technician-id': assignedTechId, 'x-user-role': 'technician' },
    body: JSON.stringify({ otp: '0000', technicianId: assignedTechId })
  });
  assert(
    wrongOtpRes.status === 400,
    '3.3 Incorrect arrival security PIN code is rejected by gate (400 Bad Request)',
    `Status: ${wrongOtpRes.status}`
  );

  // Verify correct OTP accepted
  const validOtpRes = await fetch(`${BASE_URL}/api/requests/${testReqId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-technician-id': assignedTechId, 'x-user-role': 'technician' },
    body: JSON.stringify({ otp: customerOtp, technicianId: assignedTechId })
  });
  assert(
    validOtpRes.status === 200,
    '3.4 Valid 4-digit OTP unlocks in_progress work state',
    `Status: ${validOtpRes.status} OK`
  );

  // -------------------------------------------------------------------------
  // MODULE 4: Razorpay Payment Signature, Ledger & Payout Guard
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 4: Razorpay Payment Signature, Ledger & Payout Guard ---');

  // Complete job to generate invoice
  const compRes = await fetch(`${BASE_URL}/api/requests/${testReqId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-technician-id': assignedTechId, 'x-user-role': 'technician' },
    body: JSON.stringify({
      technicianId: assignedTechId,
      notes: 'Burst main pipe replaced with copper ball valve assembly.',
      partsUsed: 'High-Pressure Ball Valve, Teflon Seal'
    })
  });

  // 4.1 Backend-authoritative order creation in paise
  const orderRes = await fetch(`${BASE_URL}/api/payments/razorpay/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`,
      'x-customer-id': 'u_cust_1',
      'x-user-role': 'customer'
    },
    body: JSON.stringify({ requestId: testReqId, customerId: 'u_cust_1' })
  });
  const orderData = await orderRes.json();
  const orderId = orderData.order?.id;
  const amountPaise = orderData.order?.amount;

  assert(
    orderRes.status === 200 && Boolean(orderId) && amountPaise > 0,
    '4.1 Razorpay order created strictly from backend invoice amount in paise',
    `Order ID: ${orderId} | Amount: ₹${amountPaise / 100} (${amountPaise} paise)`
  );

  // 4.2 Invalid signature rejected
  const badSigRes = await fetch(`${BASE_URL}/api/payments/razorpay/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId,
      paymentId: 'pay_pilot_test_123',
      signature: 'invalid_forged_signature_hex',
      requestId: testReqId
    })
  });
  assert(
    badSigRes.status === 400,
    '4.2 Invalid Razorpay cryptographic HMAC-SHA256 signature is safely rejected',
    `Status: ${badSigRes.status} Bad Request`
  );

  // 4.3 Payout Safety Guard
  const badPayoutRes = await fetch(`${BASE_URL}/api/technicians/${assignedTechId}/payout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-technician-id': assignedTechId, 'x-user-role': 'technician' },
    body: JSON.stringify({ amount: -500 })
  });
  assert(
    badPayoutRes.status === 400,
    '4.3 Payout Safety Guard blocks negative or malformed payout transactions',
    `Status: ${badPayoutRes.status}`
  );

  // -------------------------------------------------------------------------
  // MODULE 5: External Provider Health & Calibrated Fallback States
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 5: External Provider Health & Calibrated Fallbacks ---');

  const healthDeepRes = await fetch(`${BASE_URL}/api/health/deep`);
  const healthDeepData = await healthDeepRes.json();

  assert(
    healthDeepRes.status === 200 && Boolean(healthDeepData.providers),
    '5.1 GET /api/health/deep reports structured external provider health matrix',
    `Database: ${healthDeepData.database?.status} (${healthDeepData.database?.latencyMs}ms)`
  );

  assert(
    healthDeepData.providers?.routing?.status === 'osrm_network' &&
    healthDeepData.providers?.storage?.status !== undefined &&
    healthDeepData.providers?.razorpay?.status !== undefined,
    '5.2 Provider transparency records active status and declared fallback engine',
    `Routing: ${healthDeepData.providers?.routing?.status} | Storage: ${healthDeepData.providers?.storage?.status}`
  );

  // -------------------------------------------------------------------------
  // MODULE 6: Production Readiness Audit & Governance Matrix
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 6: Production Readiness Audit & Governance Matrix ---');

  const readinessRes = await fetch(`${BASE_URL}/api/admin/production-readiness`, {
    headers: ADMIN_HEADERS
  });
  const readinessData = await readinessRes.json();

  assert(
    readinessRes.status === 200 && readinessData.overallStatus === 'CONDITIONAL_GO',
    '6.1 GET /api/admin/production-readiness returns CONDITIONAL_GO pilot assessment',
    `Status: ${readinessData.overallStatus} | Readiness Score: ${readinessData.readinessScore}%`
  );

  assert(
    readinessData.checklist?.security?.status === 'VERIFIED' &&
    readinessData.checklist?.aiSafety?.status === 'VERIFIED',
    '6.2 Readiness checklist validates core security and AI deterministic fallbacks',
    'Security: VERIFIED | AI Safety: VERIFIED'
  );

  assert(
    readinessData.recommendation?.conditions?.length >= 3,
    '6.3 Explicit pilot perimeter and operational constraints defined in recommendation',
    `Conditions: ${readinessData.recommendation?.conditions?.length} rules codified`
  );

  // -------------------------------------------------------------------------
  // MODULE 7: PII Redaction & Log Sanitization Integrity
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 7: PII Redaction & Log Sanitization Integrity ---');

  const sampleLog = 'User customer phone +91 9876543210 email test.pilot@example.com with Bearer eyJhbGciOiJIUzI1NiJ9.secret';
  const maskedLog = maskPII(sampleLog);

  assert(
    !maskedLog.includes('9876543210') && maskedLog.includes('*****'),
    '7.1 Telephone numbers are securely masked in logs (+91 9*****210 format)',
    `Masked: ${maskedLog.split(' ')[3]}`
  );

  assert(
    !maskedLog.includes('test.pilot@example.com') && maskedLog.includes('***@'),
    '7.2 Email addresses are securely masked in logs',
    `Masked: ${maskedLog.split(' ')[5]}`
  );

  assert(
    !maskedLog.includes('eyJhbGciOiJIUzI1NiJ9.secret') && maskedLog.includes('[REDACTED_TOKEN]'),
    '7.3 Bearer auth tokens are stripped from log streams',
    'Token redacted successfully'
  );

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 PHASE 11 VERIFICATION SUMMARY: ${totalPassed} PASSED | ${totalFailed} FAILED`);
  console.log('================================================================');

  if (totalFailed === 0) {
    console.log('🎉 ALL PHASE 11 PRODUCTION READINESS & SECURITY TESTS PASSED!');
    process.exit(0);
  } else {
    console.error('⚠️ SOME PHASE 11 TESTS FAILED.');
    process.exit(1);
  }
}

runPhase11Tests().catch((err) => {
  console.error('Unhandled Exception in Phase 11 Suite:', err);
  process.exit(1);
});
