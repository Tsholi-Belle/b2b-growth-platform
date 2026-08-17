const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const feedbackRoutes = require('../routes/feedback');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/feedback', feedbackRoutes);
  return app;
}

test('POST /api/feedback/survey requires rating', async () => {
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/feedback/survey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error);
  } finally {
    server.close();
  }
});

test('POST /api/feedback/survey records feedback with technical context', async () => {
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/feedback/survey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating: 5,
        user_role: 'Lead Cloud Architect',
        optimizer_feedback: 'Multi-cloud comparison is very accurate.',
        proposal_feedback: 'Loved the win probability grade.',
        feature_requests: 'Add Terraform HCL exports',
        technical_context: {
          userAgent: 'Mozilla/5.0 Test Browser',
          platform: 'MacIntel',
          screenResolution: '1920x1080',
          activeTab: 'optimizer',
          currency: 'ZAR'
        }
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.ok(body.survey_id.startsWith('SURVEY-'));
  } finally {
    server.close();
  }
});
