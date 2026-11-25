import { execSync } from 'child_process';

const testSuites = [
  { name: 'Phase 1: Database Architecture', script: 'test-phase1-validation.js' },
  { name: 'Phase 1.2: Schema Integrity', script: 'test-phase1-2-verification.js' },
  { name: 'Phase 2: Authentication & RBAC', script: 'test-phase2-verification.js' },
  { name: 'Phase 3: Dispatch Engine & Matching', script: 'test-phase3-verification.js' },
  { name: 'Phase 4: Telemetry & Socket.IO GPS', script: 'test-phase4-verification.js' },
  { name: 'Phase 5: Predictive ETA & SLA Risk', script: 'test-phase5-verification.js' },
  { name: 'Phase 6: Admin AI Workspace & Copilot', script: 'test-phase6-verification.js' },
  { name: 'Phase 7: End-to-End Reliability & OTP', script: 'test-phase7-verification.js' },
  { name: 'Phase 8: External Integrations', script: 'test-phase8-verification.js' },
  { name: 'Phase 9: Field Operations & Offline Sync', script: 'test-phase9-verification.js' },
  { name: 'Phase 10: AI Intelligence Validation', script: 'test-phase10-verification.js' },
  { name: 'Phase 11: Production Readiness & Security', script: 'test-phase11-verification.js' }
];

console.log('================================================================');
console.log('🏁 RUNNING FULL PLATFORM REGRESSION ACROSS ALL 12 PHASES');
console.log('================================================================\n');

let totalSuitesPassed = 0;

for (const suite of testSuites) {
  process.stdout.write(`⏳ Running ${suite.name} (${suite.script})... `);
  try {
    const output = execSync(`node ${suite.script}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    console.log('✅ PASSED');
    totalSuitesPassed++;
  } catch (err) {
    console.log('❌ FAILED');
    console.error(err.stdout || err.stderr || err.message);
    process.exit(1);
  }
}

console.log('\n================================================================');
console.log(`🎉 ALL ${totalSuitesPassed} / ${testSuites.length} TEST SUITES PASSED WITH 100% REGRESSION INTEGRITY!`);
console.log('================================================================');
