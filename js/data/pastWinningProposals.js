// Past Winning Proposals RAG Database (Vector Knowledge Base)
export const PAST_WINNING_PROPOSALS = [
  {
    id: "win_prop_01",
    clientIndustry: "FinTech & Banking",
    contractValue: "$210,000",
    winRateScore: 0.96,
    tags: ["AWS", "Terraform", "PCI-DSS", "Multi-AZ Postgres", "Zero-Downtime"],
    executiveSummarySnippet: "ArchEngine Consulting delivers an automated infrastructure transformation for FinTech platforms, leveraging ARM Graviton2 compute nodes and Aurora Serverless auto-scaling to reduce OpEx by 42% while guaranteeing PCI-DSS Level 1 compliance.",
    technicalArchitectureSnippet: "Our proposed architecture deploys dual-region AWS EKS clusters with Cloudflare Magic Transit for DDoS mitigation. Primary database uses AWS Aurora PostgreSQL with multi-master write replication.",
    methodologyMilestones: [
      { phase: "Phase 1: Discovery & Log Audit", duration: "2 Weeks", deliverables: "Baseline benchmark report & security mapping" },
      { phase: "Phase 2: IaC Deployment & Sandbox Migration", duration: "4 Weeks", deliverables: "Terraform modules & staging environment" },
      { phase: "Phase 3: Zero-Downtime Data Cutover", duration: "2 Weeks", deliverables: "Live cutover & post-launch telemetry tuning" }
    ],
    complianceFrameworks: ["PCI-DSS Level 1", "SOC2 Type II", "ISO 27001"],
    caseStudyOutcome: "Saved client $112,000/year in AWS cloud spend while increasing throughput from 400 to 1,500 req/sec."
  },
  {
    id: "win_prop_02",
    clientIndustry: "Healthcare & Life Sciences",
    contractValue: "$295,000",
    winRateScore: 0.94,
    tags: ["GCP", "Snowflake", "HIPAA", "BigQuery", "Vector Search"],
    executiveSummarySnippet: "A comprehensive HIPAA-compliant cloud data lake blueprint utilizing GCP BigQuery paired with Cloudflare R2 zero-egress object storage. Delivers sub-second query speeds across 15+ TB of clinical data.",
    technicalArchitectureSnippet: "Patient data ingestion via encrypted GCP Pub/Sub pipelines into BigQuery HIPAA sandbox. Cloudflare Vectorize handles vector similarity searches with zero egress bandwidth overhead.",
    methodologyMilestones: [
      { phase: "Phase 1: HIPAA Compliance & BAA Execution", duration: "2 Weeks", deliverables: "BAA agreement & security audit" },
      { phase: "Phase 2: Data Pipeline & Warehouse Setup", duration: "5 Weeks", deliverables: "Snowflake / BigQuery ingestion pipelines" },
      { phase: "Phase 3: AI Vector Query Optimization", duration: "3 Weeks", deliverables: "Sub-second analytical query engine" }
    ],
    complianceFrameworks: ["HIPAA BAA", "SOC2 Type II", "NIST 800-53"],
    caseStudyOutcome: "Reduced cloud data warehousing costs by 38% while enabling real-time clinical AI research."
  }
];
