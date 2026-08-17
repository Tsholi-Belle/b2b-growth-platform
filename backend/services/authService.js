const crypto = require('crypto');

// In-memory / persistent store seam for users, tokens, and MFA secrets
const usersDb = new Map();
const tokensDb = new Map();
const mfaSecretsDb = new Map();

/**
 * Hash password securely with salt using PBKDF2
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored salt:hash
 */
function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
}

/**
 * Generate a 32-character base32 secret for Google MFA / Authenticator
 */
function generateMFASecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.randomBytes(20);
  let secret = '';
  for (let i = 0; i < bytes.length; i++) {
    secret += chars[bytes[i] % 32];
  }
  return secret;
}

/**
 * RFC 6238 TOTP generator (HMAC-SHA1) compatible with Google Authenticator
 */
function generateTOTP(secret, timeStep = 30) {
  const base32Lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (let i = 0; i < secret.length; i++) {
    const val = base32Lookup.indexOf(secret.charAt(i).toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  const key = Buffer.from(bytes);

  const epoch = Math.floor(Date.now() / 1000);
  const time = Math.floor(epoch / timeStep);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(time));

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(timeBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0xf;
  const code = ((digest[offset] & 0x7f) << 24) |
               ((digest[offset + 1] & 0xff) << 16) |
               ((digest[offset + 2] & 0xff) << 8) |
               (digest[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

/**
 * Verify Google Authenticator 6-digit code with +/- 1 time-step tolerance (90s window)
 */
function verifyGoogleMFACode(secret, code) {
  if (!secret || !code) return false;
  const cleanCode = code.toString().trim();
  const currentEpoch = Math.floor(Date.now() / 1000);
  
  // Test current step, previous step (-30s), and next step (+30s) to absorb clock skew
  for (let offset = -1; offset <= 1; offset++) {
    const testEpoch = currentEpoch + (offset * 30);
    const time = Math.floor(testEpoch / 30);
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(time));

    const base32Lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (let i = 0; i < secret.length; i++) {
      const val = base32Lookup.indexOf(secret.charAt(i).toUpperCase());
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substr(i, 8), 2));
    }
    const key = Buffer.from(bytes);

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(timeBuffer);
    const digest = hmac.digest();
    const off = digest[digest.length - 1] & 0xf;
    const computedCode = (((digest[off] & 0x7f) << 24) |
                          ((digest[off + 1] & 0xff) << 16) |
                          ((digest[off + 2] & 0xff) << 8) |
                          (digest[off + 3] & 0xff)) % 1000000;
    
    if (computedCode.toString().padStart(6, '0') === cleanCode) {
      return true;
    }
  }
  return false;
}

/**
 * Register user and create email verification token
 */
async function registerUser({ email, password, fullName, organisationName }) {
  const normalizedEmail = email.toLowerCase().trim();
  if (usersDb.has(normalizedEmail)) {
    throw new Error('User already exists with this email address');
  }

  const userId = 'USR-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  const passwordHash = hashPassword(password);
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const tokenExpiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 Hours

  const userRecord = {
    userId,
    email: normalizedEmail,
    fullName: fullName || 'Enterprise User',
    organisationName: organisationName || 'Default Org',
    passwordHash,
    isEmailVerified: false,
    mfaEnabled: false,
    mfaSecret: null,
    regionDataResidency: 'africa-south1 (South Africa)',
    createdAt: new Date().toISOString()
  };

  usersDb.set(normalizedEmail, userRecord);
  tokensDb.set(verificationToken, {
    email: normalizedEmail,
    expiresAt: tokenExpiresAt
  });

  // Simulated Email Dispatch Notice to hello@kalixara.com & user
  console.log(`[EmailService] Verification email dispatched to ${normalizedEmail} with token: ${verificationToken}`);
  console.log(`[EmailService] Copy notification routed to hello@kalixara.com`);

  return {
    success: true,
    userId,
    email: normalizedEmail,
    verificationToken,
    message: 'Registration successful. Verification email sent.'
  };
}

/**
 * Verify email with token
 */
function verifyEmailToken(token) {
  if (!tokensDb.has(token)) {
    return { success: false, error: 'Invalid or expired verification token' };
  }

  const tokenData = tokensDb.get(token);
  if (Date.now() > tokenData.expiresAt) {
    tokensDb.delete(token);
    return { success: false, error: 'Verification token has expired' };
  }

  const user = usersDb.get(tokenData.email);
  if (user) {
    user.isEmailVerified = true;
    usersDb.set(tokenData.email, user);
  }

  tokensDb.delete(token);
  return { success: true, message: 'Email successfully verified. You may now log in.' };
}

/**
 * Setup Google MFA for user
 */
function setupGoogleMFA(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const secret = generateMFASecret();
  const issuer = 'ArchEngine Solutions (South Africa)';
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(normalizedEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

  mfaSecretsDb.set(normalizedEmail, secret);

  return {
    secret,
    otpauthUrl,
    qrCodePlaceholderUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`
  };
}

/**
 * Verify and enable Google MFA
 */
function confirmGoogleMFASetup(email, code) {
  const normalizedEmail = email.toLowerCase().trim();
  const secret = mfaSecretsDb.get(normalizedEmail);
  if (!secret) return { success: false, error: 'No pending MFA setup found for this account' };

  const isValid = verifyGoogleMFACode(secret, code);
  if (!isValid) return { success: false, error: 'Invalid 6-digit Google Authenticator code' };

  const user = usersDb.get(normalizedEmail);
  if (user) {
    user.mfaEnabled = true;
    user.mfaSecret = secret;
    usersDb.set(normalizedEmail, user);
  }

  return { success: true, message: 'Google MFA successfully activated' };
}

/**
 * Authenticate login
 */
function loginUser({ email, password, mfaCode }) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = usersDb.get(normalizedEmail);
  if (!user) return { success: false, error: 'Invalid email or password' };

  if (!verifyPassword(password, user.passwordHash)) {
    return { success: false, error: 'Invalid email or password' };
  }

  if (!user.isEmailVerified) {
    return { success: false, requireEmailVerification: true, error: 'Please verify your email address before logging in' };
  }

  if (user.mfaEnabled) {
    if (!mfaCode) {
      return { success: false, requireMFA: true, message: 'Google MFA code required' };
    }
    const isValidMFA = verifyGoogleMFACode(user.mfaSecret, mfaCode);
    if (!isValidMFA) {
      return { success: false, requireMFA: true, error: 'Invalid 6-digit Google MFA code' };
    }
  }

  return {
    success: true,
    user: {
      userId: user.userId,
      email: user.email,
      fullName: user.fullName,
      organisationName: user.organisationName,
      mfaEnabled: user.mfaEnabled,
      regionDataResidency: user.regionDataResidency
    }
  };
}

/**
 * Get user for POPIA data export
 */
function getUserForPOPIAExport(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = usersDb.get(normalizedEmail);
  if (!user) return null;

  return {
    user_id: user.userId,
    email: user.email,
    full_name: user.fullName,
    organisation: user.organisationName,
    created_at: user.createdAt,
    email_verified: user.isEmailVerified,
    data_residency_jurisdiction: 'South Africa (POPIA Section 72 Compliant, Region: africa-south1)',
    data_protection_officer_contact: 'hello@kalixara.com',
    security_safeguards: 'AES-256 at Rest, TLS 1.3 in Transit, Zero-Retention AI Inference'
  };
}

/**
 * Delete user for POPIA Section 23 deletion request
 */
function deleteUserPOPIA(email) {
  const normalizedEmail = email.toLowerCase().trim();
  if (!usersDb.has(normalizedEmail)) return false;
  usersDb.delete(normalizedEmail);
  mfaSecretsDb.delete(normalizedEmail);
  console.log(`[POPIA] User record permanently deleted for: ${normalizedEmail}`);
  return true;
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateMFASecret,
  generateTOTP,
  verifyGoogleMFACode,
  registerUser,
  verifyEmailToken,
  setupGoogleMFA,
  confirmGoogleMFASetup,
  loginUser,
  getUserForPOPIAExport,
  deleteUserPOPIA
};
