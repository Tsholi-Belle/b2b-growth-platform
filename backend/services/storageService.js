const fs = require('fs');
const path = require('path');

let firestore = null;
const isGcpConfigured = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;

if (isGcpConfigured) {
  try {
    const { Firestore } = require('@google-cloud/firestore');
    firestore = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID
    });
    console.log('[StorageService] Initialized Google Cloud Firestore (Free Tier mode)');
  } catch (e) {
    console.warn('[StorageService] Firestore library not installed or project unavailable, using local file storage fallback');
  }
}

/**
 * Save survey feedback with technical telemetry
 */
async function saveSurveyFeedback(surveyData) {
  const recordId = 'SURVEY-' + Date.now().toString(36).toUpperCase();
  const timestamp = new Date().toISOString();

  const fullRecord = {
    id: recordId,
    timestamp,
    ...surveyData
  };

  // 1. Save to Google Cloud Firestore if available
  if (firestore) {
    try {
      await firestore.collection('beta_surveys').doc(recordId).set(fullRecord);
      console.log(`[StorageService] Survey ${recordId} persisted to Google Cloud Firestore`);
      return { success: true, id: recordId, storage: 'firestore' };
    } catch (err) {
      console.error('[StorageService] Firestore write failed, writing to fallback:', err);
    }
  }

  // 2. Local JSON File Storage Fallback
  const fallbackDir = path.join(__dirname, '../data');
  if (!fs.existsSync(fallbackDir)) fs.mkdirSync(fallbackDir, { recursive: true });
  const fallbackFile = path.join(fallbackDir, 'surveys_store.json');
  
  let existing = [];
  if (fs.existsSync(fallbackFile)) {
    try { existing = JSON.parse(fs.readFileSync(fallbackFile, 'utf8')); } catch (e) {}
  }
  existing.push(fullRecord);
  fs.writeFileSync(fallbackFile, JSON.stringify(existing, null, 2));

  return { success: true, id: recordId, storage: 'local_file' };
}

module.exports = { saveSurveyFeedback };
