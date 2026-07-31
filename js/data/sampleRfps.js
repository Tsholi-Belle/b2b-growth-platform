// Sample RFP Documents for Autonomous Bid Proposal Generation
export const SAMPLE_RFPS = [
  {
    id: "rfp_fintech_migration",
    title: "RFP-2026-904: Modernization of Core FinTech Microservices & Multi-Cloud Infrastructure",
    issuingOrganization: "Apex Global Financial Services Corp",
    budgetRange: "$150,000 - $250,000 USD",
    submissionDeadline: "August 20, 2026",
    complianceRequirements: ["SOC2 Type II", "PCI-DSS Level 1", "HIPAA / ISO27001", "99.99% Uptime SLA"],
    extractedTechnicalSpecs: {
      expectedMAU: 500000,
      requestsPerSecondPeak: 1200,
      databaseStorageTB: 3.5,
      monthlyEgressTB: 8.0,
      targetProviders: ["AWS", "GCP", "Azure"],
      keyDeliverables: [
        "Infrastructure Cost Optimization Blueprint",
        "Zero-Downtime Database Migration Strategy",
        "Multi-Region Failover Architecture",
        "Itemized Monthly Cloud & Subcontractor Cost Estimate"
      ]
    },
    rawContent: `REQUEST FOR PROPOSAL (RFP)
Title: Core Payment Gateway Cloud Infrastructure Modernization & Migration
Organization: Apex Global Financial Services Corp
Deadline: August 20, 2026
Budget Range: $150,000 - $250,000 USD (Includes Implementation & Year 1 OpEx)

1. OBJECTIVE & SCOPE
Apex Global Financial Services is seeking qualified IT Consulting & Cloud Architecture firms to modernize our legacy monolithic infrastructure to a high-availability multi-cloud architecture.

2. TECHNICAL REQUIREMENTS
- Support for 500,000 Monthly Active Users (MAU) with peak loads up to 1,200 req/sec.
- Relational DB size of 3.5 TB with rapid daily storage growth.
- Network Egress requirement of approx 8.0 TB/month.
- Strict compliance with SOC2 Type II, PCI-DSS Level 1, and 99.99% Uptime SLA.
- Proposed solution MUST include a side-by-side cost optimization comparison across AWS, GCP, and Azure.

3. PROPOSAL REQUIREMENTS
Bidders must submit:
a) Executive Summary & Technical Approach
b) Detailed Cloud Architecture Blueprint & Dynamic Financial Simulation Model
c) Risk Mitigation & SLA Guarantee Matrix
d) Implementation Timeline & Milestones`
  },
  {
    id: "rfp_healthcare_datalake",
    title: "RFP-2026-312: HIPAA-Compliant Healthcare Analytics Data Lake & AI Vector Engine",
    issuingOrganization: "BioHealth Innovations Network",
    budgetRange: "$200,000 - $350,000 USD",
    submissionDeadline: "September 05, 2026",
    complianceRequirements: ["HIPAA Compliant", "BAA Agreement", "SOC2 Type II", "AES-256 at Rest"],
    extractedTechnicalSpecs: {
      expectedMAU: 85000,
      requestsPerSecondPeak: 450,
      databaseStorageTB: 12.0,
      monthlyEgressTB: 15.0,
      targetProviders: ["GCP", "AWS", "Snowflake"],
      keyDeliverables: [
        "HIPAA Compliant Data Pipeline & Vector Indexing Blueprint",
        "Snowflake vs GCP BigQuery Cost Simulation",
        "Subcontractor Security Assessment",
        "Fixed-Price Proposal with OpEx Guarantee"
      ]
    },
    rawContent: `REQUEST FOR PROPOSAL (RFP)
Title: Next-Gen HIPAA-Compliant Medical Analytics Platform
Organization: BioHealth Innovations Network
Deadline: September 05, 2026
Budget Range: $200,000 - $350,000 USD

1. PROJECT OVERVIEW
BioHealth Network requires an enterprise-grade cloud data lake capable of processing patient health records (12 TB current data size) and supporting real-time AI vector searches for medical query analytics.

2. SYSTEM SPECIFICATIONS
- Database/Data Warehouse volume: 12 TB active storage + 15 TB/mo egress transfer.
- Strict HIPAA compliance with mandatory Business Associate Agreement (BAA).
- Real-time SLA monitoring with zero data loss tolerance.
- Compare Snowflake vs GCP BigQuery + AWS S3 for long-term storage TCO.

3. SUBMISSION GUIDELINES
Proposals will be evaluated based on Technical Excellence (40%), Cloud Cost Blueprint Accuracy (40%), and Past Performance Case Studies (20%).`
  }
];
