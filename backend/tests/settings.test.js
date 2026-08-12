const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

test('settings module exports expected defaults', () => {
  const settings = require('../config/settings');
  assert.ok(settings.APP_MODE);
  assert.ok(typeof settings.validateSettings === 'function');
});

test('validateSettings throws error in production mode if required variables are missing', () => {
  const originalMode = process.env.APP_MODE;
  const originalProject = process.env.GOOGLE_CLOUD_PROJECT;
  
  process.env.APP_MODE = 'production';
  delete process.env.GOOGLE_CLOUD_PROJECT;
  delete process.env.SUPABASE_URL;

  // Clear module cache to re-evaluate module constants
  delete require.cache[require.resolve('../config/settings')];
  const settings = require('../config/settings');

  assert.throws(() => {
    settings.validateSettings();
  }, /PRODUCTION MODE CONFIGURATION ERROR/);

  // Restore env
  if (originalMode) process.env.APP_MODE = originalMode;
  else delete process.env.APP_MODE;
  if (originalProject) process.env.GOOGLE_CLOUD_PROJECT = originalProject;
});
