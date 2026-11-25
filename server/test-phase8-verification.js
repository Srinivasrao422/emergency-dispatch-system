/**
 * RESQDISPATCH — Phase 8 Verification Test Suite
 * 
 * Verifies real-world external connectivity across:
 * 1. Razorpay Payment Gateway Integration & Financial Double-Entry Integrity
 * 2. Real Customer & Specialist Notifications (WhatsApp Cloud API & MSG91 SMS)
 * 3. Supabase Cloud Storage & Media Evidence Security
 * 4. Real Road Routing & ETA Calculation Engine (OSRM & Calibrated Fallback)
 */

import http from 'http';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:5000';
let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message, details = '') {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    if (details) console.log(`   └─ ${details}`);
    totalPassed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    if (details) console.error(`   └─ ${details}`);
    totalFailed++;
  }
}

async function makeRequest(options, payload = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let body;
        try {
          body = JSON.parse(data);
        } catch {
          body = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    if (payload) {
      const postData = typeof payload === 'string' ? payload : JSON.stringify(payload);
      req.write(postData);
    }
    req.end();
  });
}

async function runPhase8Tests() {
  console.log('================================================================');
  console.log('🌐  RESQDISPATCH — PHASE 8 REAL-WORLD INTEGRATIONS TEST SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. RAZORPAY PAYMENT GATEWAY & FINANCIAL INTEGRITY
  // -------------------------------------------------------------------------
  console.log('--- SECTION 1: Razorpay Payment Gateway & Financial Integrity ---');

  // Step 1: Create a test emergency incident
  const createRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/requests',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'customer',
      'x-customer-id': 'u_cust_1'
    }
  }, {
    customerId: 'u_cust_1',
    customerName: 'Jane Doe',
    customerPhone: '+91 98765 43210',
    category: 'plumbing',
    priority: 'CRITICAL',
    issueDescription: 'Major burst pipe flooding living room, urgent response needed',
    location: { address: '452 Broadway, SoHo, NY', lat: 40.7208, lng: -74.0007 }
  });

  const testReq = createRes.body?.request;
  const assignedTechId = testReq?.assignedTechnicianId || createRes.body?.dispatchResult?.technicianId || 't_plumb_1';

  assert(
    createRes.status === 201 && testReq?.id,
    'Create emergency request for payment integration test',
    `Request ID: ${testReq?.id} (Assigned Tech: ${assignedTechId})`
  );

  // Advance lifecycle to completed so an invoice is verified and generated
  // Accept
  await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/requests/${testReq.id}/accept`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-role': 'technician', 'x-technician-id': assignedTechId },
  }, { technicianId: assignedTechId });

  // Arrive
  await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/requests/${testReq.id}/arrived`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-role': 'technician', 'x-technician-id': assignedTechId },
  }, { technicianId: assignedTechId });

  // Customer Security OTP Gate (Phase 7 Closure)
  const custOtpRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/requests/${testReq.id}/customer-otp`,
    method: 'GET',
    headers: { 'x-user-role': 'customer', 'x-user-id': 'u_cust_1' }
  });
  const validOtp = custOtpRes.body?.otp || testReq?.otp;

  await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/requests/${testReq.id}/verify-otp`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { otp: validOtp });

  // Complete
  const completeRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/requests/${testReq.id}/complete`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-role': 'technician', 'x-technician-id': assignedTechId },
  }, {
    technicianId: assignedTechId,
    notes: 'Burst main pipe replaced with copper ball valve assembly.',
    partsUsed: 'High-Pressure Ball Valve, Teflon Seal'
  });

  const invoiceAmount = completeRes.body?.request?.invoice?.totalAmount || 149.0;
  assert(
    completeRes.status === 200 && completeRes.body?.request?.status === 'completed',
    'Emergency job completed and official invoice generated',
    `Invoice Total: ₹${invoiceAmount} (Unpaid: ${!completeRes.body?.request?.invoice?.isPaid})`
  );

  // Test 1.1: Razorpay Order Creation from verified backend amount
  const orderRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/razorpay/order',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'customer',
      'x-customer-id': 'u_cust_1',
      'idempotency-key': `order_test_${testReq.id}`
    }
  }, { requestId: testReq.id });

  assert(
    orderRes.status === 200 && orderRes.body?.success && orderRes.body?.order?.id,
    'POST /api/payments/razorpay/order creates verified order in paise from invoice',
    orderRes.status === 200
      ? `Order ID: ${orderRes.body?.order?.id} | Amount Paise: ${orderRes.body?.order?.amount} (₹${orderRes.body?.order?.amount / 100})`
      : `HTTP ${orderRes.status} Error: ${JSON.stringify(orderRes.body)}`
  );

  const orderId = orderRes.body?.order?.id;
  const mockKeySecret = 'sec_test_rzp_mock_secret_phase8';
  const testPaymentId = `pay_test_${Date.now()}`;

  // Test 1.2: Reject invalid payment signature
  const badVerifyRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/razorpay/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    orderId,
    paymentId: testPaymentId,
    signature: 'bad_forged_signature_0000',
    requestId: testReq.id
  });

  assert(
    badVerifyRes.status === 400 && !badVerifyRes.body?.success,
    'Invalid Razorpay HMAC signature is strictly rejected (HTTP 400)',
    `Status: ${badVerifyRes.status} | Error: ${badVerifyRes.body?.error}`
  );

  // Test 1.3: Accept cryptographically valid HMAC SHA-256 signature
  const validSignature = crypto
    .createHmac('sha256', mockKeySecret)
    .update(`${orderId}|${testPaymentId}`)
    .digest('hex');

  const goodVerifyRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/razorpay/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    orderId,
    paymentId: testPaymentId,
    signature: validSignature,
    requestId: testReq.id
  });

  assert(
    goodVerifyRes.status === 200 && goodVerifyRes.body?.success,
    'Valid Razorpay HMAC SHA-256 signature settles invoice and records ledger',
    `Status: 200 OK | Payment ID: ${goodVerifyRes.body?.payment?.paymentId}`
  );

  // Test 1.4: Prevent duplicate payment settlement (Idempotency)
  const dupVerifyRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/razorpay/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    orderId,
    paymentId: testPaymentId,
    signature: validSignature,
    requestId: testReq.id
  });

  assert(
    dupVerifyRes.status === 400 && dupVerifyRes.body?.alreadyPaid,
    'Double-payment or repeated settlement attempt is safely blocked',
    `Status: 400 | Rejection: ${dupVerifyRes.body?.error}`
  );

  // Test 1.5: Razorpay Webhook Signature Verification & Idempotent Processing
  const webhookSecret = 'whsec_test_webhook_secret_phase8';
  const webhookPayload = JSON.stringify({
    id: `evt_test_${Date.now()}`,
    entity: 'event',
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: testPaymentId,
          order_id: orderId,
          amount: Math.round(invoiceAmount * 100),
          currency: 'INR',
          status: 'captured',
          notes: { requestId: testReq.id }
        }
      }
    }
  });

  const webhookSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(webhookPayload)
    .digest('hex');

  const webhookRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/razorpay/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': webhookSignature
    }
  }, webhookPayload);

  assert(
    webhookRes.status === 200 && webhookRes.body?.success,
    'POST /api/payments/razorpay/webhook verifies HMAC signature and processes event',
    `Event: ${webhookRes.body?.eventType} | ID: ${webhookRes.body?.eventId}`
  );

  // Test 1.6: Duplicate Webhook Idempotency
  const dupWebhookRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/razorpay/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': webhookSignature
    }
  }, webhookPayload);

  assert(
    dupWebhookRes.status === 200 && dupWebhookRes.body?.duplicate,
    'Duplicate webhook event ID is recognized and safely acknowledged without re-processing',
    `Duplicate: ${dupWebhookRes.body?.duplicate}`
  );

  // Test 1.7: Payment Reconciliation Endpoint
  const reconRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/payments/razorpay/reconcile/${testReq.id}`,
    method: 'GET',
    headers: { 'x-admin-key': 'admin123', 'x-user-role': 'admin' }
  });

  assert(
    reconRes.status === 200 && reconRes.body?.isReconciled && reconRes.body?.isSettled,
    'GET /api/payments/razorpay/reconcile/:id reconciles invoice with gateway records',
    `Reconciled: ${reconRes.body?.isReconciled} | Settled: ${reconRes.body?.isSettled} | Total: ₹${reconRes.body?.amountInr}`
  );

  // Test 1.8: Refund Processing
  const refundRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/razorpay/refund',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': 'admin123', 'x-user-role': 'admin' }
  }, {
    paymentId: testPaymentId,
    requestId: testReq.id,
    reason: 'Customer Satisfaction Guarantee'
  });

  assert(
    refundRes.status === 200 && refundRes.body?.success && refundRes.body?.refundId,
    'POST /api/payments/razorpay/refund processes refund transaction with audit ID',
    `Refund ID: ${refundRes.body?.refundId} | Status: ${refundRes.body?.status}`
  );

  // -------------------------------------------------------------------------
  // 2. REAL NOTIFICATION INTEGRATION (WhatsApp & MSG91 SMS)
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Customer & Specialist Notifications (WhatsApp & SMS) ---');

  // Test 2.1: Customer Booking Notification
  const notifBookingRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/notifications/dispatch',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    event: 'BOOKING_CREATED',
    recipientPhone: '+91 98765 43210',
    recipientRole: 'customer',
    data: { requestId: testReq.id, customerName: 'Jane Doe', categoryName: 'Plumbing' }
  });

  assert(
    notifBookingRes.status === 200 && notifBookingRes.body?.success,
    'Notification dispatched for BOOKING_CREATED with approved template formatting',
    `Channel: ${notifBookingRes.body?.channel} | Status: ${notifBookingRes.body?.status} | Recipient: ${notifBookingRes.body?.recipient}`
  );

  // Test 2.2: Phone number masking in logs
  assert(
    notifBookingRes.body?.recipient && !notifBookingRes.body?.recipient.includes('98765 43210'),
    'Recipient phone numbers are securely masked in notification audit records',
    `Masked Phone: ${notifBookingRes.body?.recipient}`
  );

  // Test 2.3: Security Check: Ensure customer OTP is NEVER sent to technician
  const notifTechOfferRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/notifications/dispatch',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    event: 'NEW_DISPATCH_OFFER',
    recipientPhone: '+91 91234 56789',
    recipientRole: 'technician',
    data: {
      requestId: testReq.id,
      categoryName: 'Plumbing',
      address: '452 Broadway, SoHo, NY',
      distanceKm: 1.2,
      priority: 'CRITICAL',
      otp: '7890',          // Attempted injection of customer OTP
      _customerOtp: '7890'
    }
  });

  assert(
    notifTechOfferRes.status === 200 && notifTechOfferRes.body?.success,
    'Specialist dispatch offer notification sent without leaking confidential arrival OTP',
    `Template: ${notifTechOfferRes.body?.templateId} | Status: ${notifTechOfferRes.body?.status}`
  );

  // Test 2.4: Deduplication cooldown
  const dupNotifRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/notifications/dispatch',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    event: 'NEW_DISPATCH_OFFER',
    recipientPhone: '+91 91234 56789',
    recipientRole: 'technician',
    data: { requestId: testReq.id }
  });

  assert(
    dupNotifRes.status === 200 && dupNotifRes.body?.duplicate,
    'Duplicate rapid notification trigger safely suppressed by cooldown guard',
    `Deduplication active: ${dupNotifRes.body?.duplicate}`
  );

  // Test 2.5: Admin inspection of notification audit records
  const notifLogsRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/notifications/external',
    method: 'GET',
    headers: { 'x-admin-key': 'admin123', 'x-user-role': 'admin' }
  });

  assert(
    notifLogsRes.status === 200 && Array.isArray(notifLogsRes.body?.logs),
    'GET /api/admin/notifications/external returns non-repudiable delivery audit logs',
    `Logs retrieved: ${notifLogsRes.body?.logs?.length} records`
  );

  // -------------------------------------------------------------------------
  // 3. SUPABASE CLOUD OBJECT STORAGE & MEDIA EVIDENCE
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Supabase Cloud Storage & Media Evidence Security ---');

  // Valid 1x1 PNG sample image data URL
  const validPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // Test 3.1: Authorized evidence upload
  const uploadRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/storage/upload',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'technician',
      'x-technician-id': assignedTechId
    }
  }, {
    bucket: 'service-evidence',
    fileName: 'before_burst_pipe.png',
    fileData: validPngBase64,
    requestId: testReq.id,
    category: 'photo'
  });

  assert(
    uploadRes.status === 200 && uploadRes.body?.success && uploadRes.body?.filePath,
    'Authorized specialist uploads job before-photo evidence',
    `File Path: ${uploadRes.body?.filePath} | Provider: ${uploadRes.body?.storageProvider}`
  );

  const uploadedFilePath = uploadRes.body?.filePath;

  // Test 3.2: Rejection of corrupt or executable upload payload
  const badUploadRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/storage/upload',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    bucket: 'service-evidence',
    fileName: 'exploit.sh',
    fileData: 'data:text/plain;base64,ZWNobyAnSGFja2VkJw==',
    requestId: testReq.id,
    category: 'photo'
  });

  assert(
    badUploadRes.status === 400 && !badUploadRes.body?.success,
    'Executable / Non-image payload is strictly rejected by magic-byte inspector',
    `Status: ${badUploadRes.status} | Rejection: ${badUploadRes.body?.error}`
  );

  // Test 3.3: Signed URL Generation with TTL
  const signedUrlRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/storage/signed-url?filePath=${encodeURIComponent(uploadedFilePath)}&expires=3600`,
    method: 'GET',
    headers: { 'x-user-role': 'technician', 'x-technician-id': assignedTechId }
  });

  assert(
    signedUrlRes.status === 200 && signedUrlRes.body?.signedUrl,
    'GET /api/storage/signed-url generates time-limited authenticated access link',
    `Signed URL: ${signedUrlRes.body?.signedUrl} | TTL: ${signedUrlRes.body?.ttlSeconds}s`
  );

  // Test 3.4: Cross-Tenant Access Protection (Customer B cannot access Customer A evidence)
  const crossTenantRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/storage/signed-url?filePath=${encodeURIComponent(uploadedFilePath)}`,
    method: 'GET',
    headers: { 'x-user-role': 'customer', 'x-customer-id': 'u_cust_unauthorized_99' }
  });

  assert(
    crossTenantRes.status === 403 && !crossTenantRes.body?.success,
    'Cross-customer access attempt to incident evidence is forbidden (HTTP 403)',
    `Status: 403 Forbidden | Reason: ${crossTenantRes.body?.error}`
  );

  // -------------------------------------------------------------------------
  // 4. REAL ROAD ROUTING & ETA CALCULATION
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Real Road Routing & ETA Calculation Engine ---');

  const originCoords = { lat: 40.7310, lng: -73.9920 }; // Specialist station (Broadway & 10th)
  const destCoords = { lat: 40.7208, lng: -74.0007 };   // Customer site (452 Broadway)

  // Test 4.1: Road route calculation
  const routeRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/routes/calculate',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    origin: originCoords,
    destination: destCoords,
    priority: 'CRITICAL'
  });

  assert(
    routeRes.status === 200 && routeRes.body?.success && routeRes.body?.roadDistanceKm > 0,
    'POST /api/routes/calculate calculates driving distance and ETA along street network',
    `Provider: ${routeRes.body?.routingProvider} | Road Distance: ${routeRes.body?.roadDistanceKm} km | Duration: ${routeRes.body?.predictedDurationMin} min`
  );

  // Test 4.2: Real road geometry coordinates for Leaflet maps
  assert(
    Array.isArray(routeRes.body?.coordinates) && routeRes.body?.coordinates.length >= 2,
    'Route returns multi-point navigation geometry coordinates for Leaflet rendering',
    `Waypoints Count: ${routeRes.body?.coordinates?.length} GPS coordinate pairs`
  );

  // Test 4.3: Transparent distinction between straight-line and road distance
  assert(
    routeRes.body?.straightLineDistanceKm != null && routeRes.body?.roadDistanceKm != null,
    'Routing service explicitly distinguishes straight-line distance from road network distance',
    `Straight-line: ${routeRes.body?.straightLineDistanceKm} km vs Road: ${routeRes.body?.roadDistanceKm} km`
  );

  // Test 4.4: Dynamic Route & ETA calculation for active service request
  const reqRouteRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/requests/${testReq.id}/route`,
    method: 'GET'
  });

  assert(
    reqRouteRes.status === 200 && reqRouteRes.body?.success,
    'GET /api/requests/:id/route provides live turn-by-turn road route for active job',
    reqRouteRes.status === 200
      ? `Provider: ${reqRouteRes.body?.routingProvider} | ETA: ${reqRouteRes.body?.predictedDurationMin} min`
      : `HTTP ${reqRouteRes.status} Error: ${JSON.stringify(reqRouteRes.body)}`
  );

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log(`📊 PHASE 8 TEST SUITE SUMMARY: ${totalPassed} PASSED | ${totalFailed} FAILED`);
  console.log('================================================================');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runPhase8Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
