const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { GoogleGenAI } = require('@google/genai');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// All routes here are protected
router.use(authMiddleware);

/**
 * POST /api/proposals/generate
 * Generates an RFP proposal using Gemini API
 */
router.post('/generate', async (req, res) => {
  try {
    const { rfp_text, company_context, preferred_tone, include_teaming } = req.body;
    const orgId = req.user.org_id;
    const userId = req.user.id;

    if (!rfp_text || !company_context) {
      return res.status(400).json({ error: 'rfp_text and company_context are required' });
    }

    const systemPrompt = `You are an expert government and enterprise proposal writer.
Write a professional, compliant, and persuasive RFP response.
Structure the response exactly as follows:
1. Executive Summary
2. Technical Approach
3. Past Performance
4. Pricing Strategy
5. Team Qualifications
6. Compliance Matrix

Tone: ${preferred_tone || 'Professional and authoritative'}
Include Teaming Partners: ${include_teaming ? 'Yes' : 'No'}

Company Context: ${company_context}
`;

    // Call Gemini 1.5 Pro
    const response = await ai.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: [
            { role: 'user', parts: [{ text: `System Instructions:\n${systemPrompt}\n\nHere is the RFP text to respond to:\n${rfp_text}` }] }
        ]
    });

    const proposalContent = response.text;

    // Calculate mock audit score and win probability for demo purposes
    const auditScore = (Math.random() * 20 + 80).toFixed(2); // 80-100
    const winProbability = (Math.random() * 30 + 50).toFixed(2); // 50-80

    // Save to Supabase
    const { data: proposal, error } = await supabase
      .from('proposals')
      .insert({
        user_id: userId,
        org_id: orgId,
        rfp_title: 'Generated Proposal ' + new Date().toISOString().split('T')[0],
        rfp_source: 'manual',
        rfp_raw_text: rfp_text,
        proposal_content: proposalContent,
        status: 'draft',
        audit_score: auditScore,
        win_probability: winProbability,
        compliance_flags: JSON.stringify({ passed: true, issues: [] })
      })
      .select()
      .single();

    if (error) throw error;

    // Log usage event
    await supabase.from('usage_events').insert({
        user_id: userId,
        org_id: orgId,
        event_type: 'proposal_generated',
        metadata: { proposal_id: proposal.id },
        credits_used: 1
    });

    res.status(201).json(proposal);

  } catch (error) {
    console.error('Error generating proposal:', error);
    res.status(500).json({ error: 'Failed to generate proposal' });
  }
});

/**
 * GET /api/proposals
 * List proposals for org
 */
router.get('/', async (req, res) => {
  try {
    const orgId = req.user.org_id;
    const { data, error } = await supabase
      .from('proposals')
      .select('id, rfp_title, status, created_at, audit_score, win_probability')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
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
 * Soft delete (actually hard delete for simplicity here, adjust as needed)
 */
router.delete('/:id', async (req, res) => {
    try {
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', req.params.id)
        .eq('org_id', req.user.org_id);
  
      if (error) throw error;
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting proposal:', error);
      res.status(500).json({ error: 'Failed to delete proposal' });
    }
  });

module.exports = router;
