/**
 * ArchEngine AI — Route & Gateway Contract Smoke Tests
 * Run with: node backend/tests/test_routes.js
 */

const assert = require('assert');
const geminiGateway = require('../services/geminiGateway');
const AIRunService = require('../services/aiRunService');

async function runTests() {
  console.log('🧪 Starting ArchEngine AI Contract Tests...\n');

  // Test 1: Gemini Gateway Exports & Default Model
  console.log('Test 1: Gemini Gateway module configuration');
  assert.strictEqual(typeof geminiGateway.generateContent, 'function');
  assert.ok(geminiGateway.DEFAULT_MODEL);
  console.log(`  ✓ Default model configured: ${geminiGateway.DEFAULT_MODEL}`);

  // Test 2: AI Run Service Input Hashing
  console.log('Test 2: AIRunService input hashing');
  const sampleInput = "Sample RFP Document Text for ArchEngine AI";
  const hash1 = AIRunService.hashInput(sampleInput);
  const hash2 = AIRunService.hashInput(sampleInput);
  assert.strictEqual(hash1, hash2);
  assert.strictEqual(hash1.length, 32);
  console.log(`  ✓ Hashing deterministic and 32 chars: ${hash1}`);

  // Test 3: AIRunService Record Creation
  console.log('Test 3: AIRunService record creation');
  const runRecord = await AIRunService.recordRun({
    orgId: 'test-org-uuid',
    userId: 'test-user-uuid',
    workflow: 'proposal_generation',
    status: 'completed',
    model: 'gemini-2.5-flash',
    provider: 'vertex_ai',
    latencyMs: 345,
    validationStatus: 'passed'
  });
  assert.ok(runRecord.id);
  assert.strictEqual(runRecord.provider, 'vertex_ai');
  assert.strictEqual(runRecord.model, 'gemini-2.5-flash');
  console.log(`  ✓ AI Run record instantiated with ID: ${runRecord.id}`);

  // Test 4: GeminiGatewayError Taxonomy
  console.log('Test 4: Error taxonomy verification');
  const err = new geminiGateway.GeminiGatewayError('GEMINI_UPSTREAM_UNAVAILABLE', 'Upstream timeout');
  assert.strictEqual(err.code, 'GEMINI_UPSTREAM_UNAVAILABLE');
  console.log(`  ✓ Error code taxonomy verified: ${err.code}`);

  console.log('\n✅ All 4 contract unit tests PASSED successfully!');
}

runTests().catch(err => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
