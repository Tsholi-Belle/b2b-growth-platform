const geminiGateway = require('./geminiGateway');
const { SemanticAuditOutputSchema } = require('../schemas/proposalSchemas');

/**
 * Service for performing schema-constrained semantic compliance audits on generated proposals.
 */
class ProposalAuditService {
  /**
   * Audits a structured proposal against RFP requirements and compliance constraints.
   *
   * @param {Object} proposalData - Structured proposal object
   * @param {string} rfpText - Raw RFP text
   * @returns {Promise<Object>} Audit result containing { decision: 'PASS'|'REVISE'|'MANUAL_REVIEW', issues: [] }
   */
  static async auditProposal(proposalData, rfpText) {
    const auditPrompt = `RFP Document Text:
${rfpText.substring(0, 3000)}

Generated Proposal Draft:
Executive Summary: ${proposalData.executive_summary}
Technical Approach: ${proposalData.technical_approach}
Past Performance: ${proposalData.past_performance}
Pricing Strategy: ${proposalData.pricing_strategy}
Team Qualifications: ${proposalData.team_qualifications}

Audit Instructions:
Review the generated proposal draft against the RFP text.
Determine if all key RFP requirements are addressed.
Check if any unverified compliance claims (e.g. unverified SOC 2 / HIPAA certifications not mentioned in evidence) were made.
Return JSON with decision: "PASS", "REVISE" (if fixable minor omissions exist), or "MANUAL_REVIEW" (if critical requirement fails).`;

    const systemInstruction = `You are a compliance auditor for government and enterprise bids.
Output valid JSON matching this schema:
{
  "decision": "PASS" | "REVISE" | "MANUAL_REVIEW",
  "issues": [
    {
      "severity": "low" | "medium" | "high" | "critical",
      "requirement": "string",
      "finding": "string",
      "recommended_correction": "string"
    }
  ]
}`;

    try {
      const gatewayResult = await geminiGateway.generateContent({
        prompt: auditPrompt,
        systemInstruction,
        temperature: 0.1,
        responseMimeType: 'application/json'
      });

      const parsed = JSON.parse(gatewayResult.text);
      const validated = SemanticAuditOutputSchema.parse(parsed);
      return validated;
    } catch (err) {
      console.warn('[ProposalAuditService] Audit parsing/validation failed, defaulting to MANUAL_REVIEW:', err.message);
      return {
        decision: 'MANUAL_REVIEW',
        issues: [{
          severity: 'medium',
          requirement: 'Semantic Compliance Audit',
          finding: `Audit execution returned unparseable result: ${err.message}`,
          recommended_correction: 'Manual review recommended prior to bid submission'
        }]
      };
    }
  }
}

module.exports = ProposalAuditService;
