const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const contactRoutes = require('../routes/contact');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/contact', contactRoutes);
  return app;
}

test('POST /api/contact/schedule validates required fields', async () => {
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/contact/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'REQUEST_INVALID');
  } finally {
    server.close();
  }
});

test('POST /api/contact/schedule rejects weekend scheduling', async () => {
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/contact/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test User',
        email: 'test@kalixara.com',
        scheduled_date: '2026-08-16', // Sunday
        scheduled_time: '10:00'
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'INVALID_SCHEDULE_DATE');
  } finally {
    server.close();
  }
});

test('POST /api/contact/schedule rejects out of bounds time (outside 09:00 - 16:00 SAST)', async () => {
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/contact/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test User',
        email: 'test@kalixara.com',
        scheduled_date: '2026-08-17', // Monday
        scheduled_time: '18:00'
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'INVALID_SCHEDULE_TIME');
  } finally {
    server.close();
  }
});

test('POST /api/contact/schedule succeeds on valid weekday date and SAST time slot', async () => {
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/contact/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Jane Smith',
        email: 'jane@acme.com',
        company_name: 'Acme Systems',
        scheduled_date: '2026-08-17', // Monday
        scheduled_time: '14:00',
        advisory_topic: 'Cloud Cost Optimization',
        message: 'Requesting cloud advisory'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.recipient_email, 'hello@kalixara.com');
    assert.ok(body.confirmation_id.startsWith('SCH-'));
    assert.strictEqual(body.details.scheduled_time, '14:00 SAST');
  } finally {
    server.close();
  }
});
