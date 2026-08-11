const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Service for logging sanitized AI Run Evidence (R4 requirement).
 * Stores metadata, model execution metrics, latency, and status.
 */
class AIRunService {
  /**
   * Computes a safe SHA-256 hash of input data for tracing without storing raw prompt content.
   */
  static hashInput(input) {
    if (!input) return null;
    const str = typeof input === 'string' ? input : JSON.stringify(input);
    return crypto.createHash('sha256').update(str).digest('hex').substring(0, 32);
  }

  /**
   * Creates a sanitized record of an AI execution run.
   */
  static async recordRun({
    orgId,
    userId,
    workflow = 'proposal_generation',
    status = 'completed',
    model = 'gemini-2.5-flash',
    provider = 'vertex_ai',
    promptVersion = 'v1.0',
    schemaVersion = 'v1.0',
    startedAt = new Date(),
    completedAt = new Date(),
    latencyMs = 0,
    aiCallCount = 1,
    inputHash = null,
    outputProposalId = null,
    validationStatus = 'passed',
    errorCode = null,
    usage = null,
    steps = null
  }) {
    const runRecord = {
      id: crypto.randomUUID(),
      org_id: orgId || null,
      user_id: userId || null,
      workflow,
      status,
      model,
      provider,
      prompt_version: promptVersion,
      schema_version: schemaVersion,
      started_at: startedAt,
      completed_at: completedAt,
      latency_ms: latencyMs,
      ai_call_count: aiCallCount,
      input_hash: inputHash,
      output_proposal_id: outputProposalId,
      validation_status: validationStatus,
      error_code: errorCode,
      usage_json: usage ? JSON.parse(JSON.stringify(usage)) : null,
      steps_json: steps ? JSON.parse(JSON.stringify(steps)) : null,
      created_at: new Date().toISOString()
    };

    if (supabase && orgId) {
      try {
        const { error } = await supabase.from('ai_runs').insert(runRecord);
        if (error) {
          console.warn('[AIRunService] Could not persist run to Supabase:', error.message);
        }
      } catch (err) {
        console.warn('[AIRunService] Supabase insert error:', err.message);
      }
    }

    return runRecord;
  }
}

module.exports = AIRunService;
