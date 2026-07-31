// Pre-packaged System Telemetry Logs & Traffic Metrics
export const SAMPLE_LOG_PRESETS = [
  {
    id: "preset_saas_scaleup",
    title: "High-Traffic SaaS Platform (E-Commerce & DB Heavy)",
    description: "System logs showing 4.2M monthly requests, 850GB database with high write contention, 2.5TB egress bandwidth, over-provisioned AWS c6i instances.",
    metrics: {
      monthlyActiveUsers: 145000,
      requestsPerSecondAvg: 185,
      requestsPerSecondPeak: 620,
      monthlyRequestsTotal: 4200000,
      databaseSizeGB: 850,
      storageGrowthGBPerMonth: 65,
      egressBandwidthTB: 2.5,
      currentMonthlySpend: 4850,
      currentProvider: "AWS (c6i.xlarge + Multi-AZ RDS PostgreSQL)",
      bottlenecks: [
        "RDS PostgreSQL is over-provisioned for off-peak hours (40% CPU idle)",
        "Bandwidth egress fees on AWS S3 account for 28% of total bill",
        "No edge caching layer implemented for static assets"
      ]
    },
    rawLogSnippet: `[2026-07-30 19:40:12] [AWS CloudWatch] Instance i-0a8b9c1d2e3f (c6i.xlarge) CPU Utilization: 14.2% (IDLE ALERT)
[2026-07-30 19:40:15] [RDS Postgres] db.r6g.xlarge Connection Pool: 24/200 active connections. Storage: 850.4 GB used.
[2026-07-30 19:40:18] [CloudFront] Outbound Data Transfer: 2,560 GB ($230.40 bandwidth charge)
[2026-07-30 19:40:22] [Nginx Access] 200 OK GET /api/v1/products - 142ms latency - 14.2KB payload
[2026-07-30 19:40:25] [Cost Explorer] Monthly projected spend: $4,850.00 USD (Unoptimized On-Demand)`
  },
  {
    id: "preset_fintech_gateway",
    title: "FinTech Transaction Gateway (Low Latency & High SLA)",
    description: "Financial microservices processing 18.5M transactions/mo, 2.8TB database, high compliance SLA requirements (99.99%).",
    metrics: {
      monthlyActiveUsers: 680000,
      requestsPerSecondAvg: 540,
      requestsPerSecondPeak: 2200,
      monthlyRequestsTotal: 18500000,
      databaseSizeGB: 2800,
      storageGrowthGBPerMonth: 220,
      egressBandwidthTB: 6.8,
      currentMonthlySpend: 12400,
      currentProvider: "AWS (r6g.2xlarge + Aurora Serverless)",
      bottlenecks: [
        "Unutilized Aurora ACUs during low-traffic timezone windows",
        "Legacy Multi-AZ replication overhead",
        "Cross-region data transfer charges"
      ]
    },
    rawLogSnippet: `[2026-07-30 19:41:01] [System Monitoring] Gateway node app-prod-04 CPU: 68%, RAM: 42.1GB / 64GB
[2026-07-30 19:41:03] [Aurora DB] ACU Scaling metric: 32 ACUs allocated (Peak load detected)
[2026-07-30 19:41:05] [Compliance Check] Payment transaction payload encrypted with AES-256 (PCI-DSS compliant)
[2026-07-30 19:41:10] [Billing Telemetry] Total compute hours month-to-date: 5,760 hrs ($12,400 projected)`
  },
  {
    id: "preset_ai_llm_pipeline",
    title: "AI Workload & Vector Search Data Pipeline",
    description: "Machine learning pipeline storing 50M embeddings, heavy vector similarity queries, 4.1TB storage, zero-latency edge requirement.",
    metrics: {
      monthlyActiveUsers: 32000,
      requestsPerSecondAvg: 95,
      requestsPerSecondPeak: 450,
      monthlyRequestsTotal: 8200000,
      databaseSizeGB: 4100,
      storageGrowthGBPerMonth: 450,
      egressBandwidthTB: 12.0,
      currentMonthlySpend: 9800,
      currentProvider: "GCP (n2-standard-8 + Cloud Spanner)",
      bottlenecks: [
        "Cloud Spanner minimum 1 node cost during zero query periods",
        "High egress charges sending vector query results to client applications",
        "Opportunity to offload vector indexing to edge networks (Cloudflare Vectorize)"
      ]
    },
    rawLogSnippet: `[2026-07-30 19:42:00] [GCP Stackdriver] n2-standard-8 Memory consumption: 28.4GB / 32GB
[2026-07-30 19:42:02] [Cloud Spanner] Query execution time (cosine_distance): 18ms over 50M vectors
[2026-07-30 19:42:06] [Egress Monitor] Outbound data transfer to external API clients: 12.4 TB
[2026-07-30 19:42:09] [GCP Invoice] Current billing cycle: $9,800.00`
  }
];
