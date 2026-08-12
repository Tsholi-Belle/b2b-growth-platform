const test = require('node:test');
const assert = require('node:assert');
const AIRunService = require('../services/aiRunService');

test('hashInput returns full 64-character SHA-256 digest', () => {
  const hash = AIRunService.hashInput('Sample RFP Document Text');
  assert.strictEqual(hash.length, 64, 'Input hash must be full 64 hex characters');
  assert.match(hash, /^[a-f0-9]{64}$/i);
});

test('startRun in production mode throws TRACE_PERSISTENCE_FAILED if Supabase is missing', async () => {
  const originalMode = process.env.APP_MODE;
  process.env.APP_MODE = 'production';

  await assert.rejects(async () => {
    await AIRunService.startRun({
      orgId: 'org-12345',
      userId: 'user-12345'
    });
  }, (err) => {
    assert.strictEqual(err.code, 'TRACE_PERSISTENCE_FAILED');
    return true;
  });

  if (originalMode) process.env.APP_MODE = originalMode;
  else delete process.env.APP_MODE;
});

test('completeRun filters out local- non-UUID proposal IDs', async () => {
  const completed = await AIRunService.completeRun({
    runId: '550e8400-e29b-41d4-a716-446655440000',
    outputProposalId: 'local-1739000000'
  });

  assert.strictEqual(completed.output_proposal_id, null, 'Non-UUID output_proposal_id must be sanitized to null');
});

test('completeRun accepts valid UUID proposal ID', async () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  const completed = await AIRunService.completeRun({
    runId: '550e8400-e29b-41d4-a716-446655440000',
    outputProposalId: validUuid
  });

  assert.strictEqual(completed.output_proposal_id, validUuid);
});
