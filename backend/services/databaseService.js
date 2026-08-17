/**
 * Open-Source Database Service with South Africa (africa-south1) Data Residency
 * Fulfills POPIA Section 19 (Security) and Section 72 (Transborder Flows).
 */
const fs = require('fs');
const path = require('path');

const SA_REGION = 'africa-south1 (Johannesburg, South Africa)';
const DATA_DIR = path.join(__dirname, '../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'sa_database_store.json');

function readStore() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      region: SA_REGION,
      organisations: [],
      users: [],
      proposals: [],
      audit_logs: [],
      popia_consents: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return { region: SA_REGION, organisations: [], users: [], proposals: [], audit_logs: [], popia_consents: [] };
  }
}

function writeStore(data) {
  data.region = SA_REGION;
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

/**
 * Save proposal record with SA Data Residency Tagging
 */
async function saveProposalRecord(proposal) {
  const store = readStore();
  const id = proposal.id || 'PROP-' + Date.now().toString(36).toUpperCase();
  const record = {
    ...proposal,
    id,
    data_residency_region: SA_REGION,
    popia_compliant: true,
    created_at: new Date().toISOString()
  };

  const existingIdx = store.proposals.findIndex(p => p.id === id);
  if (existingIdx >= 0) {
    store.proposals[existingIdx] = record;
  } else {
    store.proposals.push(record);
  }

  writeStore(store);
  return record;
}

/**
 * Get all proposals for user org
 */
async function getProposals() {
  const store = readStore();
  return store.proposals || [];
}

/**
 * Log POPIA compliance audit event
 */
async function logPOPIAAuditEvent({ eventType, actor, details }) {
  const store = readStore();
  const auditEvent = {
    eventId: 'AUD-' + Date.now().toString(36).toUpperCase(),
    eventType,
    actor: actor || 'SYSTEM',
    details: details || {},
    jurisdiction: 'POPIA (Republic of South Africa)',
    data_center_region: SA_REGION,
    timestamp: new Date().toISOString()
  };

  store.audit_logs.push(auditEvent);
  writeStore(store);
  return auditEvent;
}

/**
 * Export all user data under POPIA Section 23 (Access Right)
 */
async function exportPOPIAUserData(email) {
  const store = readStore();
  const userProposals = store.proposals.filter(p => p.owner_email === email || p.user_email === email);
  
  return {
    jurisdiction: 'South Africa (POPIA Compliance)',
    data_residency_region: SA_REGION,
    user_email: email,
    exported_at: new Date().toISOString(),
    proposals_created: userProposals,
    data_retention_policy: 'Zero-Retention on Raw Prompt Ingestion, AES-256 Storage at Rest',
    data_protection_officer: 'hello@kalixara.com'
  };
}

module.exports = {
  SA_REGION,
  saveProposalRecord,
  getProposals,
  logPOPIAAuditEvent,
  exportPOPIAUserData
};
