const express = require('express');
const router = express.Router();
const {
  registerUser,
  verifyEmailToken,
  setupGoogleMFA,
  confirmGoogleMFASetup,
  loginUser,
  getUserForPOPIAExport,
  deleteUserPOPIA
} = require('../services/authService');
const { getAgentGallery, executeGuardedAgent } = require('../services/agentSuiteService');
const { evaluateInputGuardrails } = require('../services/guardrailsService');

/**
 * POST /api/auth/signup
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName, organisationName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Safety guardrail on user profile input
    const guardrailCheck = evaluateInputGuardrails({ fullName, organisationName });
    if (!guardrailCheck.allowed) {
      return res.status(400).json({ error: guardrailCheck.reason });
    }

    const result = await registerUser({ email, password, fullName, organisationName });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

/**
 * POST /api/auth/verify-email
 */
router.post('/verify-email', (req, res) => {
  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  const result = verifyEmailToken(token);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.status(200).json(result);
});

/**
 * POST /api/auth/mfa/setup
 */
router.post('/mfa/setup', (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email is required to setup MFA' });
  }

  const result = setupGoogleMFA(email);
  res.status(200).json({
    status: 'success',
    secret: result.secret,
    otpauthUrl: result.otpauthUrl,
    qrCodeUrl: result.qrCodePlaceholderUrl,
    message: 'Scan the QR code with Google Authenticator or enter the secret key manually.'
  });
});

/**
 * POST /api/auth/mfa/verify
 */
router.post('/mfa/verify', (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and 6-digit MFA code are required' });
  }

  const result = confirmGoogleMFASetup(email, code);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.status(200).json(result);
});

/**
 * POST /api/auth/login
 */
router.post('/login', (req, res) => {
  const { email, password, mfaCode } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const result = loginUser({ email, password, mfaCode });
  if (!result.success) {
    return res.status(401).json(result);
  }
  res.status(200).json(result);
});

/**
 * GET /api/auth/agents
 * Gallery of ArchEngine AI agents
 */
router.get('/agents', (req, res) => {
  res.status(200).json({
    agents: getAgentGallery()
  });
});

/**
 * POST /api/auth/agents/:id/execute
 */
router.post('/agents/:id/execute', async (req, res) => {
  try {
    const result = await executeGuardedAgent(req.params.id, req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/popia-export
 */
router.get('/popia-export', (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ error: 'Email query param required for POPIA export' });
  }
  const data = getUserForPOPIAExport(email);
  if (!data) {
    return res.status(404).json({ error: 'User record not found' });
  }
  res.status(200).json(data);
});

/**
 * DELETE /api/auth/popia-delete
 */
router.delete('/popia-delete', (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email is required for POPIA deletion' });
  }
  const success = deleteUserPOPIA(email);
  if (!success) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.status(200).json({
    success: true,
    message: 'User data permanently deleted under POPIA Section 23 right to erasure.'
  });
});

module.exports = router;
