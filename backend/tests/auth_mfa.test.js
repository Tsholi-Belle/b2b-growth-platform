const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const authRoutes = require('../routes/auth');
const { generateTOTP, generateMFASecret, verifyGoogleMFACode } = require('../services/authService');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
}

test('POST /api/auth/signup registers user and returns verification token', async () => {
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'founder@kalixara.com',
        password: 'SuperSecretPassword123!',
        fullName: 'Thabo Mokoena',
        organisationName: 'Kalixara Solutions SA'
      })
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.verificationToken);
    assert.strictEqual(data.email, 'founder@kalixara.com');
  } finally {
    server.close();
  }
});

test('POST /api/auth/verify-email validates token', async () => {
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    // Signup first
    const signupRes = await fetch(`http://localhost:${port}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'verify-test@kalixara.com',
        password: 'PassWord456!',
        fullName: 'Sarah Jenkins',
        organisationName: 'Cloud Corp'
      })
    });
    const signupData = await signupRes.json();
    const token = signupData.verificationToken;

    // Verify token
    const verifyRes = await fetch(`http://localhost:${port}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    assert.strictEqual(verifyRes.status, 200);
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyData.success, true);
  } finally {
    server.close();
  }
});

test('Google MFA (TOTP RFC 6238) secret generation & code validation', async () => {
  const secret = generateMFASecret();
  assert.strictEqual(typeof secret, 'string');
  assert.ok(secret.length >= 16);

  // Generate current valid 6-digit TOTP
  const code = generateTOTP(secret);
  assert.match(code, /^\d{6}$/);

  // Verify code
  const isValid = verifyGoogleMFACode(secret, code);
  assert.strictEqual(isValid, true);

  // Reject invalid code
  const isInvalid = verifyGoogleMFACode(secret, '000000');
  // Unless by rare coincidence 000000 is current code, verify false
  if (code !== '000000') {
    assert.strictEqual(isInvalid, false);
  }
});

test('GET /api/auth/agents returns ArchEngine 5-Agent Suite', async () => {
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/auth/agents`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.agents.length, 5);
    assert.strictEqual(data.agents[0].id, 'agent_1_scraper');
    assert.strictEqual(data.agents[2].id, 'agent_3_proposal');
  } finally {
    server.close();
  }
});
