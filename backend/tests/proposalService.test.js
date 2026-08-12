const test = require('node:test');
const assert = require('node:assert');
const ProposalService = require('../services/proposalService');
const geminiGateway = require('../services/geminiGateway');

const validModelOutput = JSON.stringify({
  executive_summary: 'Comprehensive enterprise cloud advisory proposal tailored for client requirements.',
  technical_approach: 'Architecting multi-cloud workload migration using Kubernetes, Terraform, and PostgreSQL.',
  past_performance: 'Successfully migrated 40+ enterprise workloads with zero downtime and 35% cost reduction.',
  pricing_strategy: 'Milestone-based fixed fee pricing with guaranteed SLA performance thresholds.',
  team_qualifications: 'Certified AWS Solutions Architects, GCP Professional Cloud Engineers, and CISSP Security Lead.',
  compliance_matrix: [
    { requirement: 'SOC 2 Type II Compliance', response: 'Full SOC 2 Type II audit report provided upon request.', evidence_status: 'supported' }
  ],
  assumptions: ['Client provides read-only cloud IAM access'],
  requires_human_input: ['Final legal sign-off']
});

test.beforeEach(() => {
  geminiGateway.resetClient();
});

test('ProposalService accepts valid RFP payload and returns structured proposal with audit PASS', async () => {
  let callCount = 0;
  geminiGateway.setClientFactory(() => ({
    models: {
      generateContent: async () => {
        callCount++;
        if (callCount === 1) {
          return { text: validModelOutput, model: 'gemini-2.5-flash', provider: 'vertex_ai', latencyMs: 120 };
        }
        // Audit call returns PASS
        return { text: JSON.stringify({ decision: 'PASS', issues: [] }), model: 'gemini-2.5-flash', provider: 'vertex_ai', latencyMs: 80 };
      }
    }
  }));

  const result = await ProposalService.generateProposal({
    rfp_text: 'Enterprise Cloud Migration RFP for 5000 VM instances',
    company_context: 'ArchEngine Solutions — Cloud Infrastructure Advisory'
  });

  assert.strictEqual(result.auditDecision, 'PASS');
  assert.strictEqual(result.aiCallCount, 1); // 1 gen + audit
  assert.ok(result.proposalContent.includes('Executive Summary'));
});

test('ProposalService rejects invalid payload missing rfp_text', async () => {
  await assert.rejects(async () => {
    await ProposalService.generateProposal({ company_context: 'Test' });
  }, (err) => {
    assert.strictEqual(err.code, 'REQUEST_INVALID');
    return true;
  });
});

test('ProposalService executes maximum 1 revision loop when audit returns REVISE', async () => {
  let callCount = 0;
  geminiGateway.setClientFactory(() => ({
    models: {
      generateContent: async () => {
        callCount++;
        if (callCount === 1) {
          return { text: validModelOutput, model: 'gemini-2.5-flash', provider: 'vertex_ai', latencyMs: 100 };
        }
        if (callCount === 2) {
          // Audit returns REVISE
          return {
            text: JSON.stringify({
              decision: 'REVISE',
              issues: [{ severity: 'medium', requirement: 'SLA Uptime', finding: 'Clarify 99.99% SLA uptime commitment' }]
            }),
            model: 'gemini-2.5-flash',
            provider: 'vertex_ai',
            latencyMs: 90
          };
        }
        // Revision call returns revised output
        return { text: validModelOutput, model: 'gemini-2.5-flash', provider: 'vertex_ai', latencyMs: 110 };
      }
    }
  }));

  const result = await ProposalService.generateProposal({
    rfp_text: 'Enterprise Cloud Migration RFP requiring 99.99% SLA uptime',
    company_context: 'ArchEngine Solutions'
  });

  assert.strictEqual(result.auditDecision, 'REVISE');
  assert.strictEqual(result.aiCallCount, 2); // Initial gen + 1 revision
});
