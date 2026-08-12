const { z } = require('zod');

/**
 * Canonical Request Schema
 */
const ProposalRequestSchema = z.object({
  rfp: z.object({
    title: z.string().min(1).default('RFP Response'),
    source: z.enum(['manual', 'sam_gov', 'upload', 'demo']).default('manual'),
    text: z.string().min(10, 'RFP text must be at least 10 characters')
  }).or(
    // Backward compatibility normalization fallback
    z.object({
      text: z.string().min(10)
    })
  ),
  company_context: z.string().min(3, 'Company context must be at least 3 characters'),
  preferred_tone: z.string().default('Professional and authoritative'),
  include_teaming: z.boolean().default(false),
  workload: z.object({
    monthly_active_users: z.number().nonnegative().optional(),
    requests_per_second_peak: z.number().nonnegative().optional(),
    database_size_gb: z.number().nonnegative().optional(),
    monthly_egress_tb: z.number().nonnegative().optional(),
    current_monthly_spend_usd: z.number().nonnegative().optional()
  }).optional()
});

/**
 * Gemini Proposal Output JSON Schema
 */
const GeminiProposalOutputSchema = z.object({
  executive_summary: z.string().min(20),
  technical_approach: z.string().min(20),
  past_performance: z.string().min(20),
  pricing_strategy: z.string().min(10),
  team_qualifications: z.string().min(10),
  compliance_matrix: z.array(
    z.object({
      requirement: z.string(),
      response: z.string(),
      evidence_status: z.enum(['supported', 'assumption', 'requires_human_input']).default('supported')
    })
  ).min(1),
  assumptions: z.array(z.string()).default([]),
  requires_human_input: z.array(z.string()).default([])
});

/**
 * Semantic Audit Output JSON Schema
 */
const SemanticAuditOutputSchema = z.object({
  decision: z.enum(['PASS', 'REVISE', 'MANUAL_REVIEW']),
  issues: z.array(
    z.object({
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      requirement: z.string(),
      finding: z.string(),
      recommended_correction: z.string().optional()
    })
  ).default([])
});

module.exports = {
  ProposalRequestSchema,
  GeminiProposalOutputSchema,
  SemanticAuditOutputSchema
};
