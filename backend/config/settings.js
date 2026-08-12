/**
 * Configuration and Environment Settings Manager for ArchEngine AI.
 * Validates mode-specific configuration and enforces fail-closed semantics for production.
 */

const APP_MODE = process.env.APP_MODE || (process.env.NODE_ENV === 'production' ? 'production' : 'demo');
const PORT = parseInt(process.env.PORT || '3001', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8888';

const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || '';
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const GOOGLE_GENAI_USE_VERTEXAI = process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true' || !!process.env.GOOGLE_CLOUD_PROJECT;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Validates environment settings based on application mode.
 * Throws an explicit error if critical settings are missing in production mode.
 */
function validateSettings() {
  if (APP_MODE === 'production') {
    const missing = [];
    if (!GOOGLE_CLOUD_PROJECT) missing.push('GOOGLE_CLOUD_PROJECT');
    if (!GOOGLE_CLOUD_LOCATION) missing.push('GOOGLE_CLOUD_LOCATION');
    if (!SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');

    if (missing.length > 0) {
      throw new Error(`[SettingsValidation] PRODUCTION MODE CONFIGURATION ERROR: Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  return {
    appMode: APP_MODE,
    port: PORT,
    frontendUrl: FRONTEND_URL,
    vertex: {
      useVertex: GOOGLE_GENAI_USE_VERTEXAI,
      project: GOOGLE_CLOUD_PROJECT,
      location: GOOGLE_CLOUD_LOCATION,
      model: GEMINI_MODEL
    },
    supabase: {
      url: SUPABASE_URL,
      serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY
    }
  };
}

module.exports = {
  APP_MODE,
  PORT,
  FRONTEND_URL,
  GOOGLE_CLOUD_PROJECT,
  GOOGLE_CLOUD_LOCATION,
  GOOGLE_GENAI_USE_VERTEXAI,
  GEMINI_MODEL,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  validateSettings
};
