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
 * POST /api/proposals/generate
 * Generates an RFP proposal using Gemini Gateway & logs AI Evidence Run
 */
router.post('/generate', async (req, res) => {
  const startedAt = new Date();
  const orgId = req.user ? req.user.org_id : null;
  const userId = req.user ? req.user.id : null;

  try {
    // Standardize input payload handling (canonical or legacy format)
    const body = req.body || {};
    const rfpText = body.rfp_text || (body.rfp && body.rfp.text) || '';
    const rfpTitle = (body.rfp && body.rfp.title) || body.rfp_title || ('RFP Proposal Response ' + new Date().toISOString().split('T')[0]);
    const rfpSource = (body.rfp && body.rfp.source) || body.rfp_source || 'manual';
    const companyContext = body.company_context || 'B2B Enterprise Software Consultancy';
    const preferredTone = body.preferred_tone || 'Professional and authoritative';
    const includeTeaming = body.include_teaming || false;

    if (!rfpText || !companyContext) {
      return res.status(400).json({
        error: {
          code: 'REQUEST_INVALID',
          message: 'rfp_text (or rfp.text) and company_context are required'
        }
      });
    }

    const inputHash = AIRunService.hashInput(rfpText);

    const systemInstruction = `You are an expert government and enterprise proposal writer.
Write a professional, compliant, and persuasive RFP response.
Structure the response clearly into these sections:
1. Executive Summary
2. Technical Approach
3. Past Performance
4. Pricing Strategy
5. Team Qualifications
6. Compliance Matrix

Tone: ${preferredTone}
Include Subcontractor Teaming Partners: ${includeTeaming ? 'Yes' : 'No'}
Company Context: ${companyContext}
`;

    const userPrompt = `RFP Document Text:\n${rfpText}`;

    // Invoke Gemini Gateway with configurable model
    const gatewayResult = await geminiGateway.generateContent({
      prompt: userPrompt,
      systemInstruction,
      temperature: 0.4
    });

    const proposalContent = gatewayResult.text;
    const latencyMs = gatewayResult.latencyMs;

    // Measured Deterministic Evaluation (No Math.random())
    const requiredSections = [
      'Executive Summary',
      'Technical Approach',
      'Past Performance',
      'Pricing Strategy',
      'Team Qualifications',
      'Compliance Matrix'
    ];

    let sectionsPresent = 0;
    requiredSections.forEach(sec => {
      if (proposalContent.toLowerCase().includes(sec.toLowerCase())) {
        sectionsPresent++;
      }
    });

    const sectionCoverageRatio = sectionsPresent / requiredSections.length;
    const auditScore = Math.min(100, Math.round(70 + sectionCoverageRatio * 28)); // 70 to 98
    
    // Keyword alignment calculation
    const rfpWords = rfpText.toLowerCase().match(/\b[a-z]{5,}\b/g) || [];
    const uniqueRfpWords = [...new Set(rfpWords)];
    let matchedKeywords = 0;
    uniqueRfpWords.slice(0, 50).forEach(word => {
      if (proposalContent.toLowerCase().includes(word)) matchedKeywords++;
    });
    const keywordRatio = uniqueRfpWords.length > 0 ? (matchedKeywords / Math.min(50, uniqueRfpWords.length)) : 0.8;
    const winProbability = Math.min(96, Math.round(55 + (sectionCoverageRatio * 25) + (keywordRatio * 16)));

    const complianceFlags = {
      passed: auditScore >= 80,
      sections_covered: `${sectionsPresent}/${requiredSections.length}`,
      win_probability_grade: winProbability >= 85 ? 'A' : winProbability >= 70 ? 'B' : 'C'
    };

    let proposal = {
      id: 'local-' + Date.now(),
      user_id: userId,
      org_id: orgId,
      rfp_title: rfpTitle,
      rfp_source: rfpSource,
      rfp_raw_text: rfpText,
      proposal_content: proposalContent,
      status: 'audited',
      audit_score: auditScore,
      win_probability: winProbability,
      compliance_flags: complianceFlags,
      created_at: new Date().toISOString()
    };

    // Save proposal to Supabase if DB configured
    if (supabase && orgId) {
      try {
        const { data: dbProposal, error: dbError } = await supabase
          .from('proposals')
          .insert({
            user_id: userId,
            org_id: orgId,
            rfp_title: rfpTitle,
            rfp_source: rfpSource,
            rfp_raw_text: rfpText,
            proposal_content: proposalContent,
            status: 'audited',
            audit_score: auditScore,
            win_probability: winProbability,
            compliance_flags: complianceFlags
          })
          .select()
          .single();

        if (!dbError && dbProposal) {
          proposal = dbProposal;
          // Log usage event
          await supabase.from('usage_events').insert({
            user_id: userId,
            org_id: orgId,
            event_type: 'proposal_generated',
            metadata: { proposal_id: proposal.id },
            credits_used: 1
          });
        }
      } catch (dbErr) {
        console.warn('[ProposalsRoute] Could not persist proposal to Supabase:', dbErr.message);
      }
    }

    // Record Sanitized AI Run Evidence (R4 Requirement)
    const runRecord = await AIRunService.recordRun({
      orgId,
      userId,
      workflow: 'proposal_generation',
      status: 'completed',
      model: gatewayResult.model,
      provider: gatewayResult.provider,
      startedAt,
      completedAt: new Date(),
      latencyMs,
      aiCallCount: 1,
      inputHash,
      outputProposalId: proposal.id,
      validationStatus: complianceFlags.passed ? 'passed' : 'warning',
      usage: gatewayResult.usage
    });

    // Return canonical response format
    res.status(201).json({
      run: {
        id: runRecord.id,
        provider: runRecord.provider,
        model: runRecord.model,
        status: runRecord.status,
        latency_ms: runRecord.latency_ms,
        ai_call_count: runRecord.ai_call_count,
        validation_status: runRecord.validation_status
      },
      proposal
    });

  } catch (error) {
    console.error('Error generating proposal:', error);

    const errorCode = error.code || 'GEMINI_UPSTREAM_UNAVAILABLE';
    const userMessage = error.message || 'Failed to generate proposal';

    res.status(500).json({
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
