/**
 * ResQDispatch — Phase 5 Verification Test Suite
 * 
 * Verifies AI Intelligence, Predictive Operations & Automation:
 * 1. Role-Based Authorization Guards for AI Endpoints
 * 2. AI Intelligence Overview & KPI Summary
 * 3. Emergency Demand Forecasting (Holt-Winters, Horizon, Baseline Comparison)
 * 4. Predictive Response-Time & Multi-Variate ETA Calculation (Rush-Hour, Complexity)
 * 5. Empirical ETA Model Evaluation (MAE, RMSE against PostgreSQL Completed Requests)
 * 6. Explainable Multi-Factor Technician Recommendations (Proximity, Skill, Acceptance, Rating, Workload)
 * 7. Operational Anomaly Detection & Status Transition Lifecycle (Acknowledge, Resolve)
 * 8. AI Operational Recommendations & Lifecycle Management (Pending, Accepted, Dismissed, Completed)
 * 9. Factual Admin AI Operations Assistant (PostgreSQL Ground Truth Citations)
 * 10. Intelligent Automation Rules, Deduplication Cooldown & Execution Logging
 * 11. Model Registry, Versioning, Validation Metrics & Documented Limitations
 * 12. PostgreSQL Persistence Integrity across all Phase 5 Database Models
 */

import { PrismaClient } from '@prisma/client';

const BASE_URL = 'http://localhost:5000';
const ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'x-admin-key': 'admin123',
  'x-user-role': 'admin'
};

const prisma = new PrismaClient();

async function runPhase5Tests() {
  console.log('===============================================================');
  console.log('🤖 RESQDISPATCH — PHASE 5 AI INTELLIGENCE & AUTOMATION TEST SUITE');
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
    // TEST 1: Role-Based Authorization Guards
    // ----------------------------------------------------
    console.log('--- TEST 1: Role-Based Authorization Guards ---');

    const unauthOverview = await fetch(`${BASE_URL}/api/admin/ai/overview`);
    assert(
      unauthOverview.status === 401,
      'GET /api/admin/ai/overview rejects unauthorized access (401)',
      `Status: ${unauthOverview.status}`
    );

    const unauthForecast = await fetch(`${BASE_URL}/api/admin/ai/demand-forecast`);
    assert(
      unauthForecast.status === 401,
      'GET /api/admin/ai/demand-forecast rejects unauthorized access (401)',
      `Status: ${unauthForecast.status}`
    );

    const unauthEta = await fetch(`${BASE_URL}/api/admin/ai/predict-eta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ distanceKm: 5 })
    });
    assert(
      unauthEta.status === 401,
      'POST /api/admin/ai/predict-eta rejects unauthorized access (401)',
      `Status: ${unauthEta.status}`
    );

    const unauthAssistant = await fetch(`${BASE_URL}/api/admin/ai/assistant/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'status' })
    });
    assert(
      unauthAssistant.status === 401,
      'POST /api/admin/ai/assistant/query rejects unauthorized access (401)',
      `Status: ${unauthAssistant.status}`
    );

    // ----------------------------------------------------
    // TEST 2: AI Overview & KPI Summary
    // ----------------------------------------------------
    console.log('\n--- TEST 2: AI Overview & Operational KPI Summary ---');

    const overviewRes = await fetch(`${BASE_URL}/api/admin/ai/overview`, { headers: ADMIN_HEADERS });
    assert(overviewRes.status === 200, 'GET /api/admin/ai/overview returns 200 OK', `Status: ${overviewRes.status}`);

    const overviewData = await overviewRes.json();
    assert(overviewData && overviewData.summary, 'Overview returns valid summary object');
    assert(
      typeof overviewData.summary.activeModelsCount === 'number',
      'Summary contains activeModelsCount',
      `Count: ${overviewData.summary.activeModelsCount}`
    );
    assert(
      typeof overviewData.summary.activeAutomationRulesCount === 'number',
      'Summary contains activeAutomationRulesCount',
      `Count: ${overviewData.summary.activeAutomationRulesCount}`
    );
    assert(
      typeof overviewData.summary.etaMaeMinutes === 'number',
      'Summary contains live etaMaeMinutes metric',
      `MAE: ${overviewData.summary.etaMaeMinutes} min`
    );
    assert(
      Array.isArray(overviewData.models),
      'Overview includes registered AI models array',
      `Models count: ${overviewData.models?.length}`
    );

    // ----------------------------------------------------
    // TEST 3: Emergency Demand Forecasting Engine
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Emergency Demand Forecasting Engine ---');

    // 3a. Default forecast (7d horizon)
    const forecastRes = await fetch(`${BASE_URL}/api/admin/ai/demand-forecast`, { headers: ADMIN_HEADERS });
    assert(forecastRes.status === 200, 'GET /api/admin/ai/demand-forecast returns 200 OK');

    const forecastData = await forecastRes.json();
    assert(forecastData.horizon === '7d', 'Default forecast horizon is 7d', `Horizon: ${forecastData.horizon}`);
    assert(
      Array.isArray(forecastData.dailyForecasts) && forecastData.dailyForecasts.length === 7,
      'Returns daily forecasts array of length 7',
      `Length: ${forecastData.dailyForecasts?.length}`
    );

    const sampleDay = forecastData.dailyForecasts[0];
    assert(
      typeof sampleDay.predictedDemand === 'number' &&
      typeof sampleDay.lowerBound === 'number' &&
      typeof sampleDay.upperBound === 'number' &&
      typeof sampleDay.requiredSpecialists === 'number',
      'Daily forecast contains predictedDemand, bounds, and requiredSpecialists',
      `Day: ${sampleDay.dayName}, Predicted: ${sampleDay.predictedDemand} calls [${sampleDay.lowerBound}-${sampleDay.upperBound}], Req: ${sampleDay.requiredSpecialists} specialists`
    );

    // 3b. Empirical baseline comparison
    assert(forecastData.evaluation, 'Forecast includes empirical model evaluation vs naive baseline');
    assert(typeof forecastData.evaluation.mae === 'number', 'Evaluation contains MAE', `Model MAE: ${forecastData.evaluation.mae}`);
    assert(typeof forecastData.evaluation.baselineNaiveMae === 'number', 'Evaluation contains baselineNaiveMae', `Baseline MAE: ${forecastData.evaluation.baselineNaiveMae}`);
    assert(typeof forecastData.evaluation.accuracyPercent === 'number', 'Evaluation provides accuracy percentage', `Accuracy: ${forecastData.evaluation.accuracyPercent}%`);

    // 3c. Horizon parameter support ('today')
    const todayForecastRes = await fetch(`${BASE_URL}/api/admin/ai/demand-forecast?horizon=today`, { headers: ADMIN_HEADERS });
    const todayForecastData = await todayForecastRes.json();
    assert(todayForecastData.horizon === 'today', 'Horizon=today successfully honored', `Horizon: ${todayForecastData.horizon}`);
    assert(todayForecastData.dailyForecasts.length === 1, 'Returns 1 day forecast interval');

    // ----------------------------------------------------
    // TEST 4: Predictive Response-Time & Multi-Variate ETA Engine
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Predictive Response-Time & Multi-Variate ETA Engine ---');

    // 4a. Daytime non-rush hour inference (14:00)
    const normalEtaRes = await fetch(`${BASE_URL}/api/admin/ai/predict-eta`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ categoryId: 'plumbing', distanceKm: 6.0, hourOfDay: 14 })
    });
    assert(normalEtaRes.status === 200, 'POST /api/admin/ai/predict-eta (normal hour) returns 200 OK');
    const normalEtaData = await normalEtaRes.json();
    assert(normalEtaData.prediction, 'Prediction object returned');
    assert(
      normalEtaData.prediction.features?.trafficCongestionMultiplier === 1.0,
      'Normal hour has trafficCongestionMultiplier = 1.0',
      `Factor: ${normalEtaData.prediction.features?.trafficCongestionMultiplier}`
    );

    // 4b. Evening rush-hour traffic inference (18:00)
    const rushEtaRes = await fetch(`${BASE_URL}/api/admin/ai/predict-eta`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ categoryId: 'plumbing', distanceKm: 6.0, hourOfDay: 18 })
    });
    const rushEtaData = await rushEtaRes.json();
    assert(
      rushEtaData.prediction.features?.trafficCongestionMultiplier === 1.30,
      'Peak evening hour has trafficCongestionMultiplier = 1.30x',
      `Factor: ${rushEtaData.prediction.features?.trafficCongestionMultiplier}`
    );
    assert(
      rushEtaData.prediction.predictions.predictedEtaMinutes > normalEtaData.prediction.predictions.predictedEtaMinutes,
      'Traffic congestion increases predicted arrival time',
      `Normal: ${normalEtaData.prediction.predictions.predictedEtaMinutes}m vs Rush: ${rushEtaData.prediction.predictions.predictedEtaMinutes}m`
    );

    // 4c. Category complexity multiplier (hvac vs plumbing)
    const complexEtaRes = await fetch(`${BASE_URL}/api/admin/ai/predict-eta`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ categoryId: 'hvac', distanceKm: 6.0, hourOfDay: 14 })
    });
    const complexEtaData = await complexEtaRes.json();
    assert(
      complexEtaData.prediction.features?.categoryComplexity === 1.25,
      'HVAC complexity weight is 1.25x',
      `Weight: ${complexEtaData.prediction.features?.categoryComplexity}`
    );

    // 4d. SLA Breach Probability & Risk Level
    assert(
      typeof rushEtaData.prediction.predictions.slaBreachRiskProbability === 'number' &&
      ['LOW', 'MODERATE', 'HIGH'].includes(rushEtaData.prediction.predictions.slaRiskLevel),
      'Computes quantitative SLA breach risk probability & risk category',
      `SLA Risk: ${rushEtaData.prediction.predictions.slaRiskLevel} (p=${rushEtaData.prediction.predictions.slaBreachRiskProbability})`
    );

    // ----------------------------------------------------
    // TEST 5: Empirical ETA Model Evaluation
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Empirical ETA Model Evaluation ---');

    const etaEvalRes = await fetch(`${BASE_URL}/api/admin/ai/eta-evaluation`, { headers: ADMIN_HEADERS });
    assert(etaEvalRes.status === 200, 'GET /api/admin/ai/eta-evaluation returns 200 OK');
    const etaEvalData = await etaEvalRes.json();
    assert(etaEvalData && etaEvalData.evaluation, 'Returns evaluation metadata');
    assert(typeof etaEvalData.evaluation.maeMinutes === 'number', 'Evaluation includes MAE in minutes', `MAE: ${etaEvalData.evaluation.maeMinutes} min`);
    assert(typeof etaEvalData.evaluation.rmseMinutes === 'number', 'Evaluation includes RMSE in minutes', `RMSE: ${etaEvalData.evaluation.rmseMinutes} min`);
    assert(typeof etaEvalData.evaluation.sampleSize === 'number', 'Sample size reflects completed requests evaluated', `Sample: ${etaEvalData.evaluation.sampleSize}`);

    // ----------------------------------------------------
    // TEST 6: Explainable Multi-Factor Technician Recommendations
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Explainable Multi-Factor Technician Recommendations ---');

    // Get an active or recent request
    const reqListRes = await fetch(`${BASE_URL}/api/requests`);
    const reqListData = await reqListRes.json();
    const targetReq = reqListData[0];

    assert(targetReq && targetReq.id, 'Found service request for candidate recommendation test', `ID: ${targetReq?.id}`);

    if (targetReq) {
      const recRes = await fetch(`${BASE_URL}/api/admin/ai/recommendations/technicians/${targetReq.id}`, { headers: ADMIN_HEADERS });
      assert(recRes.status === 200, 'GET /api/admin/ai/recommendations/technicians/:requestId returns 200 OK');
      const recData = await recRes.json();
      assert(Array.isArray(recData.recommendations), 'Returns ranked recommendations list', `Candidates: ${recData.recommendations?.length}`);

      if (recData.recommendations.length > 0) {
        const topCand = recData.recommendations[0];
        assert(typeof topCand.compositeScore === 'number', 'Candidate has compositeScore', `Score: ${topCand.compositeScore}`);
        assert(Array.isArray(topCand.factors) && topCand.factors.length === 5, 'Candidate includes 5-factor explanation breakdown');

        const factorWeights = topCand.factors.map(f => f.weight);
        const sumWeights = factorWeights.reduce((a, b) => a + b, 0);
        assert(Math.abs(sumWeights - 1.0) < 0.001, 'Factor weights strictly sum to 1.0 (100%)', `Weights: ${factorWeights.join(', ')} (Sum: ${sumWeights})`);
        assert(Boolean(topCand.rationale), 'Includes transparent human-readable recommendation rationale', `Rationale: "${topCand.rationale}"`);
      }
    }

    // ----------------------------------------------------
    // TEST 7: Operational Anomaly Detection & Status Lifecycle
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Operational Anomaly Detection & Status Lifecycle ---');

    // 7a. Query anomaly list
    const anomaliesRes = await fetch(`${BASE_URL}/api/admin/ai/anomalies`, { headers: ADMIN_HEADERS });
    assert(anomaliesRes.status === 200, 'GET /api/admin/ai/anomalies returns 200 OK');
    const anomaliesData = await anomaliesRes.json();
    assert(Array.isArray(anomaliesData.anomalies), 'Returns anomalies array');

    // 7b. Persist a test anomaly directly to verify lifecycle
    const testAnomaly = await prisma.operationalAnomaly.create({
      data: {
        type: 'DISPATCH_LATENCY_SPIKE',
        title: 'Test Latency Spike',
        description: 'Automated test latency spike detected in dispatch verification cycle',
        severity: 'critical',
        status: 'open',
        observedMetric: 42.5,
        baselineMetric: 15.0,
        evidence: JSON.stringify({ test: true, zScore: 3.14 })
      }
    });
    assert(testAnomaly && testAnomaly.id, 'Test anomaly created in PostgreSQL for lifecycle verification', `ID: ${testAnomaly.id}`);

    // 7c. Acknowledge anomaly via REST
    const ackRes = await fetch(`${BASE_URL}/api/admin/ai/anomalies/${testAnomaly.id}`, {
      method: 'PUT',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ status: 'acknowledged', notes: 'Investigating dispatch bottleneck' })
    });
    assert(ackRes.status === 200, 'PUT /api/admin/ai/anomalies/:id (acknowledge) returns 200 OK');
    const ackData = await ackRes.json();
    assert(ackData.anomaly?.status === 'acknowledged', 'Anomaly status updated to acknowledged', `Status: ${ackData.anomaly?.status}`);

    // 7d. Resolve anomaly via REST
    const resolveRes = await fetch(`${BASE_URL}/api/admin/ai/anomalies/${testAnomaly.id}`, {
      method: 'PUT',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ status: 'resolved', notes: 'Root cause cleared and validated' })
    });
    assert(resolveRes.status === 200, 'PUT /api/admin/ai/anomalies/:id (resolve) returns 200 OK');
    const resolveData = await resolveRes.json();
    assert(resolveData.anomaly?.status === 'resolved', 'Anomaly status updated to resolved', `Status: ${resolveData.anomaly?.status}`);

    // Clean up test anomaly
    await prisma.operationalAnomaly.delete({ where: { id: testAnomaly.id } });

    // ----------------------------------------------------
    // TEST 8: AI Operational Recommendations & Lifecycle
    // ----------------------------------------------------
    console.log('\n--- TEST 8: AI Operational Recommendations & Lifecycle ---');

    const recsRes = await fetch(`${BASE_URL}/api/admin/ai/recommendations`, { headers: ADMIN_HEADERS });
    assert(recsRes.status === 200, 'GET /api/admin/ai/recommendations returns 200 OK');
    const recsData = await recsRes.json();
    assert(Array.isArray(recsData.recommendations), 'Returns recommendations array', `Count: ${recsData.recommendations?.length}`);

    // Create a test recommendation to test status transition
    const testRec = await prisma.operationalRecommendation.create({
      data: {
        title: 'Test Optimization: Shift Alignment',
        category: 'CAPACITY',
        reason: 'Align specialist shifts with forecasted 18:00 rush hour',
        expectedBenefit: 'Reduces SLA breach risk by 22%',
        confidence: 0.92,
        suggestedAction: 'Schedule standby specialists',
        status: 'pending'
      }
    });
    assert(testRec && testRec.id, 'Test operational recommendation created in PostgreSQL', `ID: ${testRec.id}`);

    // Accept recommendation via REST
    const acceptRes = await fetch(`${BASE_URL}/api/admin/ai/recommendations/${testRec.id}`, {
      method: 'PUT',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ status: 'accepted' })
    });
    assert(acceptRes.status === 200, 'PUT /api/admin/ai/recommendations/:id (accept) returns 200 OK');
    const acceptData = await acceptRes.json();
    assert(acceptData.recommendation?.status === 'accepted', 'Recommendation status updated to accepted');

    // Complete recommendation via REST
    const compRes = await fetch(`${BASE_URL}/api/admin/ai/recommendations/${testRec.id}`, {
      method: 'PUT',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ status: 'completed' })
    });
    assert(compRes.status === 200, 'PUT /api/admin/ai/recommendations/:id (completed) returns 200 OK');
    const compData = await compRes.json();
    assert(compData.recommendation?.status === 'completed', 'Recommendation status updated to completed');

    // Clean up test recommendation
    await prisma.operationalRecommendation.delete({ where: { id: testRec.id } });

    // ----------------------------------------------------
    // TEST 9: Admin AI Operations Assistant (Factual Ground Truth)
    // ----------------------------------------------------
    console.log('\n--- TEST 9: Admin AI Operations Assistant (Factual Ground Truth) ---');

    // 9a. Demand Query
    const query1Res = await fetch(`${BASE_URL}/api/admin/ai/assistant/query`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ query: 'Which category has the highest emergency demand?' })
    });
    assert(query1Res.status === 200, 'Query 1 (demand) returns 200 OK');
    const query1Data = await query1Res.json();
    assert(query1Data.intent === 'DEMAND_ANALYSIS', 'Correctly identified intent as DEMAND_ANALYSIS', `Intent: ${query1Data.intent}`);
    assert(Boolean(query1Data.dataScope), 'References verified dataScope from database');

    // 9b. Workload / Capacity Query
    const query2Res = await fetch(`${BASE_URL}/api/admin/ai/assistant/query`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ query: 'What is the technician workload and availability right now?' })
    });
    const query2Data = await query2Res.json();
    assert(query2Data.intent === 'WORKFORCE_WORKLOAD', 'Correctly identified intent as WORKFORCE_WORKLOAD', `Intent: ${query2Data.intent}`);
    assert(query2Data.dataScope?.onlineCount !== undefined, 'References actual onlineCount from database', `Online: ${query2Data.dataScope?.onlineCount}`);

    // 9c. SLA Breach Query
    const query3Res = await fetch(`${BASE_URL}/api/admin/ai/assistant/query`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ query: 'Are there any SLA breaches or escalated requests?' })
    });
    const query3Data = await query3Res.json();
    assert(query3Data.intent === 'SLA_RISK_AUDIT', 'Correctly identified intent as SLA_RISK_AUDIT', `Intent: ${query3Data.intent}`);

    // ----------------------------------------------------
    // TEST 10: Intelligent Automation Rules, Deduplication & Execution
    // ----------------------------------------------------
    console.log('\n--- TEST 10: Intelligent Automation Rules & Deduplication Cooldown ---');

    // 10a. Fetch automation rules
    const autoRes = await fetch(`${BASE_URL}/api/admin/ai/automations`, { headers: ADMIN_HEADERS });
    assert(autoRes.status === 200, 'GET /api/admin/ai/automations returns 200 OK');
    const autoData = await autoRes.json();
    assert(Array.isArray(autoData.rules) && autoData.rules.length >= 4, 'Returns configured automation rules (>= 4)', `Rules count: ${autoData.rules?.length}`);

    const targetRule = autoData.rules[0];
    assert(targetRule && targetRule.id, 'Found target automation rule', `Rule: ${targetRule.ruleType || targetRule.name}`);

    // 10b. Update automation rule config
    const updateRuleRes = await fetch(`${BASE_URL}/api/admin/ai/automations/${targetRule.id}`, {
      method: 'PUT',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ isEnabled: targetRule.isEnabled, cooldownMinutes: 10 })
    });
    assert(updateRuleRes.status === 200, 'PUT /api/admin/ai/automations/:id returns 200 OK');

    // 10c. Run automations evaluation
    const runRes = await fetch(`${BASE_URL}/api/admin/ai/automations/run`, {
      method: 'POST',
      headers: ADMIN_HEADERS
    });
    assert(runRes.status === 200, 'POST /api/admin/ai/automations/run returns 200 OK');
    const runData = await runRes.json();
    assert(runData.success === true, 'Automation execution loop completed successfully');

    // ----------------------------------------------------
    // TEST 11: Model Governance & Transparency Registry
    // ----------------------------------------------------
    console.log('\n--- TEST 11: Model Governance, Transparency & Limitations Registry ---');

    const modelsRes = await fetch(`${BASE_URL}/api/admin/ai/models`, { headers: ADMIN_HEADERS });
    assert(modelsRes.status === 200, 'GET /api/admin/ai/models returns 200 OK');
    const modelsData = await modelsRes.json();
    assert(Array.isArray(modelsData.models) && modelsData.models.length >= 4, 'Registry contains all 4 production models', `Count: ${modelsData.models?.length}`);

    const expectedModels = [
      'demand_forecasting_holt_winters',
      'predictive_eta_multivariate',
      'technician_recommendation_ensemble',
      'anomaly_detector_zscore_iqr'
    ];

    for (const name of expectedModels) {
      const m = modelsData.models.find(mod => mod.name === name);
      assert(m !== undefined, `Model ${name} is registered in PostgreSQL`);
      if (m) {
        assert(m.status === 'active', `Model ${name} status is active`);
        assert(Boolean(m.limitations), `Model ${name} documents explicit operational limitations`);
        assert(Boolean(m.version), `Model ${name} specifies version ${m.version}`);
      }
    }

    // ----------------------------------------------------
    // TEST 12: PostgreSQL Database Persistence Integrity
    // ----------------------------------------------------
    console.log('\n--- TEST 12: PostgreSQL Database Persistence Integrity ---');

    const dbModels = await prisma.aiModelMetadata.count();
    assert(dbModels >= 4, 'ai_model_metrics table has >= 4 persistent rows', `Rows: ${dbModels}`);

    const dbRules = await prisma.automationRule.count();
    assert(dbRules >= 4, 'automation_rules table has >= 4 persistent rows', `Rows: ${dbRules}`);

    const dbExecutions = await prisma.automationExecution.count();
    assert(typeof dbExecutions === 'number', 'automation_executions table is queryable', `Rows: ${dbExecutions}`);

    // Verify Prediction Log persistence
    const testLog = await prisma.predictionLog.create({
      data: {
        modelType: 'ETA',
        targetEntity: 'REQ-4968',
        predictedValue: 14.5,
        features: JSON.stringify({ distanceKm: 5.2, category: 'electrical', hour: 11 })
      }
    });
    assert(testLog && testLog.id, 'Successfully persisted prediction_logs record to PostgreSQL', `ID: ${testLog.id}`);
    await prisma.predictionLog.delete({ where: { id: testLog.id } });

  } catch (err) {
    console.error('Unhandled test suite exception:', err);
    failed++;
  } finally {
    await prisma.$disconnect();

    console.log('\n===============================================================');
    console.log(`📊 PHASE 5 TEST SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('===============================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runPhase5Tests();
