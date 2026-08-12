const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createClient } = require('@supabase/supabase-js');
const geminiGateway = require('../services/geminiGateway');
const AIRunService = require('../services/aiRunService');

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// All routes here are protected
router.use(authMiddleware);

/**
const ProposalService = require('../services/proposalService');

/**
 * POST /api/proposals/generate
 * Generates a schema-bound RFP proposal using ProposalService, Gemini Gateway & AIRunService
 */
router.post('/generate', async (req, res) => {
  const startedAt = new Date();
  const orgId = req.user ? req.user.org_id : null;
  const userId = req.user ? req.user.id : null;

  try {
    const body = req.body || {};
    const inputHash = AIRunService.hashInput(body.rfp_text || (body.rfp && body.rfp.text) || '');

    // 1. Persist STARTED AI trace record before Gemini execution (fails closed in production)
    const initialRun = await AIRunService.startRun({
      orgId,
      userId,
      workflow: 'proposal_generation',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      provider: 'vertex_ai',
      inputHash
    });

    // 2. Execute schema-bound proposal generation
    const result = await ProposalService.generateProposal(body);

    const complianceFlags = {
      passed: result.auditScore >= 80,
      audit_decision: result.auditDecision,
      issues_found: result.auditIssues.length,
      win_probability_grade: result.winProbability >= 85 ? 'A' : result.winProbability >= 70 ? 'B' : 'C'
    };

    let proposal = {
      id: 'local-' + Date.now(),
      user_id: userId,
      org_id: orgId,
      rfp_title: result.title,
      rfp_source: result.source,
      rfp_raw_text: result.rfpText,
      proposal_content: result.proposalContent,
      status: result.auditDecision === 'PASS' ? 'audited' : 'manual_review',
      audit_score: result.auditScore,
      win_probability: result.winProbability,
      compliance_flags: complianceFlags,
      created_at: new Date().toISOString()
    };

    let persistedProposalUuid = null;

    // Save proposal to Supabase if DB configured
    if (supabase && orgId) {
      try {
        const { data: dbProposal, error: dbError } = await supabase
          .from('proposals')
          .insert({
            user_id: userId,
            org_id: orgId,
            rfp_title: result.title,
            rfp_source: result.source,
            rfp_raw_text: result.rfpText,
            proposal_content: result.proposalContent,
            status: proposal.status,
            audit_score: result.auditScore,
            win_probability: result.winProbability,
            compliance_flags: complianceFlags
          })
          .select()
          .single();

        if (dbError) {
          if (process.env.APP_MODE === 'production') {
            const err = new Error(`Failed to persist proposal to database: ${dbError.message}`);
            err.code = 'PROPOSAL_PERSISTENCE_FAILED';
            throw err;
          }
        } else if (dbProposal) {
          proposal = dbProposal;
          persistedProposalUuid = dbProposal.id;
          await supabase.from('usage_events').insert({
            user_id: userId,
            org_id: orgId,
            event_type: 'proposal_generated',
            metadata: { proposal_id: proposal.id },
            credits_used: 1
          });
        }
      } catch (dbErr) {
        if (process.env.APP_MODE === 'production' || dbErr.code === 'PROPOSAL_PERSISTENCE_FAILED') {
          await AIRunService.completeRun({
            runId: initialRun.id,
            status: 'failed',
            latencyMs: Date.now() - startedAt,
            errorCode: 'PROPOSAL_PERSISTENCE_FAILED'
          });
          const propErr = new Error(`Proposal persistence failed: ${dbErr.message}`);
          propErr.code = 'PROPOSAL_PERSISTENCE_FAILED';
          throw propErr;
        }
        console.warn('[ProposalsRoute] Could not persist proposal to Supabase:', dbErr.message);
      }
    } else if (process.env.APP_MODE === 'production') {
      const err = new Error('Production mode requires Supabase database connection for proposal persistence');
      err.code = 'PROPOSAL_PERSISTENCE_FAILED';
      throw err;
    }

    // 3. Complete AI Run Evidence Trace
    const completedRun = await AIRunService.completeRun({
      runId: initialRun.id,
      status: result.auditDecision === 'MANUAL_REVIEW' ? 'manual_review' : 'completed',
      latencyMs: Date.now() - startedAt,
      aiCallCount: result.aiCallCount,
      outputProposalId: persistedProposalUuid,
      validationStatus: complianceFlags.passed ? 'passed' : 'warning',
      usage: result.usage,
      steps: [
        { name: 'initial_generation', status: 'success', latencyMs: result.latencyMs },
        { name: 'semantic_audit', status: 'success', decision: result.auditDecision }
      ]
    });

    res.status(201).json({
      run: {
        id: completedRun.id,
        provider: result.provider,
        model: result.model,
        status: completedRun.status,
        latency_ms: completedRun.latency_ms,
        ai_call_count: completedRun.ai_call_count,
        validation_status: completedRun.validation_status
      },
      proposal
    });

  } catch (error) {
    console.error('Error generating proposal:', error);

    const errorCode = error.code || 'GEMINI_UPSTREAM_UNAVAILABLE';
    const userMessage = error.message || 'Failed to generate proposal';
    const statusCode = errorCode === 'REQUEST_INVALID' ? 400 : errorCode === 'MODEL_OUTPUT_INVALID' ? 422 : 500;

    res.status(statusCode).json({
      error: {
        code: errorCode,
        message: userMessage
      }
    });
  }
});

/**
 * GET /api/proposals
 * Returns all proposals for the user's organization
 */
router.get('/', async (req, res) => {
  try {
    if (!supabase || !req.user || !req.user.org_id) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('org_id', req.user.org_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

/**
 * GET /api/proposals/:id
 * Get single proposal
 */
router.get('/:id', async (req, res) => {
  try {
    if (!supabase || !req.user || !req.user.org_id) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', req.params.id)
      .eq('org_id', req.user.org_id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Proposal not found' });

    res.json(data);
  } catch (error) {
    console.error('Error fetching proposal:', error);
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
});

/**
 * PATCH /api/proposals/:id
 * Update proposal
 */
router.patch('/:id', async (req, res) => {
  try {
    const { proposal_content, status } = req.body;

    if (!supabase || !req.user || !req.user.org_id) {
      return res.json({ id: req.params.id, proposal_content, status, updated_at: new Date() });
    }

    const { data, error } = await supabase
      .from('proposals')
      .update({ proposal_content, status, updated_at: new Date() })
      .eq('id', req.params.id)
      .eq('org_id', req.user.org_id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating proposal:', error);
    res.status(500).json({ error: 'Failed to update proposal' });
  }
});

/**
 * DELETE /api/proposals/:id
 * Delete proposal
 */
router.delete('/:id', async (req, res) => {
  try {
    if (supabase && req.user && req.user.org_id) {
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', req.params.id)
        .eq('org_id', req.user.org_id);

      if (error) throw error;
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting proposal:', error);
    res.status(500).json({ error: 'Failed to delete proposal' });
  }
});

/**
 * POST /api/proposals/outreach
 * Researches prospect domain using Function Calling and generates personalized cold pitch
 */
router.post('/outreach', async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) {
      return res.status(400).json({ error: 'domain is required' });
    }

    const leadProfileTool = {
      functionDeclarations: [{
        name: 'enrich_lead_profile',
        description: 'Fetches company profile data given a domain name',
        parameters: {
          type: 'OBJECT',
          properties: {
            domain: { type: 'STRING', description: 'The prospect company domain name' }
          },
          required: ['domain']
        }
      }]
    };

    const prompt = `Investigate company ${domain} and compose a personalized B2B cold outreach pitch email.`;

    const gatewayResult = await geminiGateway.generateContent({
      prompt,
      systemInstruction: 'You are an expert B2B growth agent. Use the provided tools to research prospect domains before drafting compelling pitch emails.',
      temperature: 0.7,
      tools: [leadProfileTool]
    });

    res.json({
      domain,
      outreach_email: gatewayResult.text,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating outreach email:', error);
    res.status(500).json({ error: 'Failed to generate outreach pitch' });
  }
});

module.exports = router;
