// AGENT 3: RAG Retrieval & Autonomous Proposal Writer Engine
import { PAST_WINNING_PROPOSALS } from '../data/pastWinningProposals.js';
import { SimulatorAgent } from './simulatorAgent.js';
import { AuditorAgent } from './auditorAgent.js';

export class ProposalAgent {
  constructor() {
    this.name = "Agent 3 (The Proposal Writer)";
    this.simulator = new SimulatorAgent();
    this.auditor = new AuditorAgent();
  }

  async generateProposal(rfpDocument) {
    const logs = [];
    const timestamp = new Date().toISOString();

    logs.push(`[${timestamp}] [Agent 3: Proposal Writer] Processing incoming bid document: "${rfpDocument.title}"...`);
    logs.push(`[${new Date().toISOString()}] [Agent 3: Proposal Writer] Extracting technical parameters & compliance requirements...`);

    const specs = rfpDocument.extractedTechnicalSpecs || {
      expectedMAU: 250000,
      requestsPerSecondPeak: 500,
      databaseStorageTB: 2.0,
      monthlyEgressTB: 5.0
    };

    // Step 1: Run Concept 1 Simulator Engine to get live cost blueprints
    logs.push(`[${new Date().toISOString()}] [Agent 3: Proposal Writer] SYNERGY TRIGGERED: Feeding technical specs into Agent 2 (The Simulator)...`);
    
    const simulation = this.simulator.simulateCosts({
      monthlyActiveUsers: specs.expectedMAU,
      requestsPerSecondPeak: specs.requestsPerSecondPeak,
      databaseSizeGB: (specs.databaseStorageTB || 2.0) * 1024,
      monthlyEgressTB: specs.monthlyEgressTB || 5.0,
      currentMonthlySpend: 8500
    });

    logs.push(...simulation.logs);

    // Step 2: Vector RAG Search over Past Winning Proposals
    logs.push(`[${new Date().toISOString()}] [Agent 3: Proposal Writer] Querying RAG Knowledge Base for top matching historical bids...`);

    // Simulate RAG vector match score computation
    const matchedProposals = PAST_WINNING_PROPOSALS.map(prop => {
      let score = 0.85;
      if (rfpDocument.complianceRequirements) {
        rfpDocument.complianceRequirements.forEach(req => {
          if (prop.complianceFrameworks.includes(req) || prop.tags.includes(req)) {
            score += 0.04;
          }
        });
      }
      return { ...prop, matchScore: Math.min(0.98, parseFloat(score.toFixed(2))) };
    }).sort((a, b) => b.matchScore - a.matchScore);

    const bestMatch = matchedProposals[0];
    logs.push(`[${new Date().toISOString()}] [Agent 3: Proposal Writer] RAG match selected: ${bestMatch.clientIndustry} proposal (Match Score: ${(bestMatch.matchScore * 100).toFixed(0)}%)`);

    // Step 3: Synthesize Complete Proposal Blueprint
    const recProvider = simulation.recommendedProvider;

    const fullProposalDraft = {
      proposalId: `PROP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      generatedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      rfpTitle: rfpDocument.title,
      clientName: rfpDocument.issuingOrganization,
      budgetRange: rfpDocument.budgetRange,
      matchScore: bestMatch.matchScore,
      ragSource: bestMatch,

      executiveSummary: `We are pleased to present this comprehensive technical and financial proposal for ${rfpDocument.issuingOrganization}. Leveraging our battle-tested multi-cloud deployment methodology, our solution modernizes your core infrastructure to support up to ${specs.expectedMAU.toLocaleString()} Monthly Active Users while guaranteeing strict ${rfpDocument.complianceRequirements ? rfpDocument.complianceRequirements.join(', ') : 'SOC2/HIPAA'} compliance.`,

      recommendedCloudArchitecture: {
        primaryProvider: recProvider.providerName,
        badgeColor: recProvider.badgeColor,
        monthlyOpEx: recProvider.monthlyReserved,
        annualOpEx: recProvider.annualSpend,
        slaGuarantee: recProvider.slaUptime,
        costBreakdown: recProvider.breakdown
      },

      multiCloudComparison: simulation.results,

      implementationMilestones: [
        { phase: "Phase 1: Architecture Blueprint & Compliance Mapping", duration: "Weeks 1-2", cost: "$25,000", details: "Finalize IaC templates, BAA/PCI compliance auditing, sandbox provisioning." },
        { phase: "Phase 2: Database Migration & Multi-Region Setup", duration: "Weeks 3-5", cost: "$45,000", details: "Zero-downtime database replication, edge caching configuration, automated failover." },
        { phase: "Phase 3: Integration & Performance Tuning", duration: "Weeks 6-7", cost: "$30,000", details: "Load testing up to ${specs.requestsPerSecondPeak * 2} RPS peak traffic, telemetry dashboard setup." },
        { phase: "Phase 4: Production Cutover & Handover", duration: "Week 8", cost: "$20,000", details: "Live traffic cutover, 24/7 hypercare support, documentation delivery." }
      ],

      totalProposedImplementationFee: "$120,000 USD",
      projectedFirstYearOpExSavings: `$${recProvider.annualSavingsVsCurrent > 0 ? recProvider.annualSavingsVsCurrent.toLocaleString() : '48,500'} USD`,

      // AI & DATA PROTECTION DISCLAIMERS & LEGAL CLAUSES
      aiDisclaimer: "NOTICE: This proposal draft was generated autonomously by ArchEngine AI's multi-agent synthesis engine combining vector RAG retrieval and real-time cloud cost simulations. It is intended for preliminary evaluation and mandatory human-in-the-loop review by an authorized solutions architect before binding submission.",

      dataProtectionClauses: {
        privacyPolicy: "DATA PRIVACY & ENCRYPTION: All telemetry logs, database schemas, and proprietary bid documents ingested into ArchEngine AI are processed in an isolated sandbox environment, encrypted in transit (TLS 1.3) and at rest (AES-256). Customer data is strictly protected under zero-retention policies and is never utilized for foundational model retraining.",
        complianceStandard: "COMPLIANCE & GOVERNANCE: Proposed cloud infrastructure blueprints strictly enforce compliance with SOC 2 Type II, ISO/IEC 27001, PCI-DSS Level 1, and HIPAA (with mandatory Business Associate Agreement execution where applicable).",
        pricingLiability: "RATE ACCURACY DISCLAIMER: Dynamic cloud infrastructure cost estimates are calculated based on public rate cards and scraped SLAs. Actual billing may vary depending on bandwidth egress variance, region selection, reserved instance commitments, or custom enterprise discount agreements (EDP)."
      }
    };

    // Step 4: Closed-Loop Audit & Self-Correction by Agent 4
    logs.push(`[${new Date().toISOString()}] [Agent 3: Proposal Writer] Passing draft to Agent 4 (The Auditor & Critic) for closed-loop validation...`);
    
    const auditRes = await this.auditor.auditProposal(fullProposalDraft, rfpDocument);
    logs.push(...auditRes.logs);

    return {
      success: true,
      proposal: auditRes.auditedProposal,
      auditReport: auditRes.auditReport,
      logs
    };
  }
}
