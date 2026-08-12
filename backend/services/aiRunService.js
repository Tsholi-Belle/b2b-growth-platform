const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { APP_MODE } = require('../config/settings');

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Service for logging sanitized AI Run Evidence & enforcing trace durability (Phase 4).
 */
class AIRunService {
  /**
   * Computes full 64-character SHA-256 digest of input data for evidence identity.
   */
  static hashInput(input) {
    if (!input) return null;
    const str = typeof input === 'string' ? input : JSON.stringify(input);
    return crypto.createHash('sha256').update(str).digest('hex'); // Full 64 hex chars
  }

  /**
   * Initializes and persists a STARTED AI execution trace record before calling Gemini.
   * Fails closed in production if trace creation fails.
   */
  static async startRun({ orgId, userId, workflow = 'proposal_generation', model = 'gemini-2.5-flash', provider = 'vertex_ai', inputHash = null }) {
    const runId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    const runRecord = {
      id: runId,
      org_id: orgId || null,
      user_id: userId || null,
      workflow,
      status: 'started',
      model,
      provider,
      prompt_version: 'v3.0',
      schema_version: 'v3.0',
      started_at: startedAt,
      completed_at: null,
      latency_ms: 0,
      ai_call_count: 0,
      input_hash: inputHash,
      output_proposal_id: null,
      validation_status: 'pending',
      error_code: null,
      usage_json: null,
      steps_json: [],
      created_at: startedAt
    };

    const currentAppMode = process.env.APP_MODE || (process.env.NODE_ENV === 'production' ? 'production' : 'demo');

    if (supabase && orgId) {
      try {
        const { error } = await supabase.from('ai_runs').insert(runRecord);
        if (error) {
          console.warn('[AIRunService] Could not persist STARTED run trace to Supabase:', error.message);
          if (currentAppMode === 'production') {
            const err = new Error(`Failed to persist required AI run evidence trace: ${error.message}`);
            err.code = 'TRACE_PERSISTENCE_FAILED';
            throw err;
          }
        }
      } catch (err) {
        if (currentAppMode === 'production' || err.code === 'TRACE_PERSISTENCE_FAILED') {
          const traceErr = new Error(`Trace persistence failed: ${err.message}`);
          traceErr.code = 'TRACE_PERSISTENCE_FAILED';
          throw traceErr;
        }
        console.warn('[AIRunService] Supabase initial insert error:', err.message);
      }
    } else if (currentAppMode === 'production') {
      const err = new Error('Production mode requires Supabase database connection for AI run evidence tracing');
      err.code = 'TRACE_PERSISTENCE_FAILED';
      throw err;
    }

    return runRecord;
  }

  /**
   * Completes an AI execution trace with terminal status, latency, call count, and output proposal UUID.
   */
  static async completeRun({
    runId,
    status = 'completed',
    latencyMs = 0,
    aiCallCount = 1,
    outputProposalId = null,
    validationStatus = 'passed',
    errorCode = null,
    usage = null,
    steps = []
  }) {
    const completedAt = new Date().toISOString();

    // Verify outputProposalId is a valid UUID, otherwise do not attach non-UUID to database FK
    const validProposalUuid = (outputProposalId && typeof outputProposalId === 'string' && outputProposalId.length === 36 && !outputProposalId.startsWith('local-'))
      ? outputProposalId
      : null;

    const updates = {
      status,
      completed_at: completedAt,
      latency_ms: latencyMs,
      ai_call_count: aiCallCount,
      output_proposal_id: validProposalUuid,
      validation_status: validationStatus,
      error_code: errorCode,
      usage_json: usage ? JSON.parse(JSON.stringify(usage)) : null,
      steps_json: steps ? JSON.parse(JSON.stringify(steps)) : []
    };

    if (supabase && runId) {
      try {
        const { error } = await supabase.from('ai_runs').update(updates).eq('id', runId);
        if (error) {
          console.warn('[AIRunService] Could not update run trace in Supabase:', error.message);
        }
      } catch (err) {
        console.warn('[AIRunService] Supabase update error:', err.message);
      }
    }

    return { id: runId, ...updates };
  }

  /**
   * Backwards compatible single-call wrapper.
   */
  static async recordRun(params) {
    const run = await this.startRun({
      orgId: params.orgId,
      userId: params.userId,
      workflow: params.workflow,
      model: params.model,
      provider: params.provider,
      inputHash: params.inputHash
    });

    return await this.completeRun({
      runId: run.id,
      status: params.status,
      latencyMs: params.latencyMs,
      aiCallCount: params.aiCallCount,
      outputProposalId: params.outputProposalId,
      validationStatus: params.validationStatus,
      errorCode: params.errorCode,
      usage: params.usage,
      steps: params.steps
    });
  }
}

module.exports = AIRunService;
