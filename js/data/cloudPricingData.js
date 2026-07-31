// Real-time Cloud Infrastructure & SaaS Pricing Data Matrix
export const CLOUD_PROVIDERS = {
  aws: {
    name: "Amazon Web Services (AWS)",
    code: "aws",
    badgeColor: "#FF9900",
    compute: {
      t4g_large: { name: "t4g.large (ARM Graviton2, 2 vCPU, 8GB)", hourlyRate: 0.0672, monthlyRate: 48.38 },
      c6i_xlarge: { name: "c6i.xlarge (Intel, 4 vCPU, 8GB)", hourlyRate: 0.17, monthlyRate: 122.40 },
      r6g_2xlarge: { name: "r6g.2xlarge (ARM, 8 vCPU, 64GB)", hourlyRate: 0.4032, monthlyRate: 290.30 }
    },
    database: {
      rds_postgres_small: { name: "RDS PostgreSQL db.t4g.medium", hourlyRate: 0.073, monthlyRate: 52.56 },
      rds_postgres_large: { name: "RDS PostgreSQL db.r6g.xlarge (Multi-AZ)", hourlyRate: 0.74, monthlyRate: 532.80 },
      aurora_serverless: { name: "Aurora Serverless v2 (per ACU)", hourlyRate: 0.12, ACUBasis: true }
    },
    storageGB: 0.08, // S3 Standard
    egressGB: 0.09, // Internet Egress per GB
    apiRateLimit: "10,000 req/sec (API Gateway default)",
    slaUptime: "99.99%",
    reservedDiscountYear1: 0.38
  },
  gcp: {
    name: "Google Cloud Platform (GCP)",
    code: "gcp",
    badgeColor: "#4285F4",
    compute: {
      e2_standard_2: { name: "e2-standard-2 (2 vCPU, 8GB)", hourlyRate: 0.067, monthlyRate: 48.24 },
      c2_standard_4: { name: "c2-standard-4 (Compute Opt, 4 vCPU, 16GB)", hourlyRate: 0.208, monthlyRate: 149.76 },
      n2_standard_8: { name: "n2-standard-8 (8 vCPU, 32GB)", hourlyRate: 0.388, monthlyRate: 279.36 }
    },
    database: {
      cloud_sql_postgres: { name: "Cloud SQL db-custom-2-7680", hourlyRate: 0.098, monthlyRate: 70.56 },
      cloud_spanner: { name: "Cloud Spanner (1 Node)", hourlyRate: 0.90, monthlyRate: 648.00 },
      bigquery_storage: { name: "BigQuery Active Storage (per GB)", hourlyRate: 0.02, monthlyRate: 0.02 }
    },
    storageGB: 0.02, // Google Cloud Storage Standard
    egressGB: 0.085, // Network Egress per GB
    apiRateLimit: "12,000 req/sec (Apigee default)",
    slaUptime: "99.99%",
    reservedDiscountYear1: 0.42
  },
  azure: {
    name: "Microsoft Azure",
    code: "azure",
    badgeColor: "#0089D6",
    compute: {
      b2s: { name: "B2s (2 vCPU, 4GB)", hourlyRate: 0.0416, monthlyRate: 29.95 },
      d4s_v5: { name: "D4s v5 (4 vCPU, 16GB)", hourlyRate: 0.192, monthlyRate: 138.24 },
      e8s_v5: { name: "E8s v5 (8 vCPU, 64GB)", hourlyRate: 0.504, monthlyRate: 362.88 }
    },
    database: {
      azure_postgres_flexible: { name: "Azure Database for PostgreSQL (2 vCPU)", hourlyRate: 0.11, monthlyRate: 79.20 },
      cosmos_db: { name: "Cosmos DB (400 RU/s Autoscale)", hourlyRate: 0.032, monthlyRate: 23.04 }
    },
    storageGB: 0.018, // Blob Storage Hot
    egressGB: 0.087, // Outbound Data Transfer
    apiRateLimit: "10,000 req/min (API Management)",
    slaUptime: "99.95%",
    reservedDiscountYear1: 0.40
  },
  cloudflare: {
    name: "Cloudflare Workers & Edge Stack",
    code: "cloudflare",
    badgeColor: "#F38020",
    compute: {
      workers_unlimited: { name: "Workers Enterprise (10M requests)", hourlyRate: 0.007, monthlyRate: 5.00 }
    },
    database: {
      d1_sqlite: { name: "Cloudflare D1 SQL (Reads per 10M)", hourlyRate: 0.001, monthlyRate: 1.00 },
      vectorize: { name: "Vectorize DB (1M Vector queries)", hourlyRate: 0.005, monthlyRate: 3.60 }
    },
    storageGB: 0.015, // R2 Storage (Zero Egress!)
    egressGB: 0.00, // FREE Egress!
    apiRateLimit: "50,000 req/sec",
    slaUptime: "99.999%",
    reservedDiscountYear1: 0.15
  },
  snowflake: {
    name: "Snowflake Enterprise Data Warehouse",
    code: "snowflake",
    badgeColor: "#29B5E8",
    compute: {
      warehouse_small: { name: "Small Warehouse (2 Credits/hr)", hourlyRate: 4.00, monthlyRate: 2880.00 },
      warehouse_medium: { name: "Medium Warehouse (4 Credits/hr)", hourlyRate: 8.00, monthlyRate: 5760.00 }
    },
    database: {
      snowflake_storage: { name: "Snowflake Storage (per TB/mo)", hourlyRate: 0.055, monthlyRate: 40.00 }
    },
    storageGB: 0.04,
    egressGB: 0.09,
    apiRateLimit: "Unlimited Concurrent Queries",
    slaUptime: "99.99%",
    reservedDiscountYear1: 0.25
  }
};
