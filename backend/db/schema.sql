-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Types
CREATE TYPE plan_type AS ENUM ('free', 'starter', 'professional', 'enterprise');
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'analyst', 'viewer');
CREATE TYPE cloud_provider AS ENUM ('aws', 'gcp', 'azure', 'cloudflare', 'snowflake');
CREATE TYPE connection_type_enum AS ENUM ('api_key', 'iam_role', 'oauth');
CREATE TYPE rfp_source_enum AS ENUM ('manual', 'sam_gov', 'upload');
CREATE TYPE proposal_status_enum AS ENUM ('draft', 'audited', 'exported', 'submitted');
CREATE TYPE event_type_enum AS ENUM ('proposal_generated', 'optimizer_run', 'agent_run', 'export');

-- Organisations Table
CREATE TABLE organisations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    plan plan_type NOT NULL DEFAULT 'free',
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    subscription_status VARCHAR(50),
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'viewer',
    preferred_currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Cloud Profiles Table
CREATE TABLE cloud_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    provider cloud_provider NOT NULL,
    connection_type connection_type_enum NOT NULL,
    credentials_ref TEXT NOT NULL,
    monthly_spend_usd NUMERIC(15, 6),
    region VARCHAR(50),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_cloud_profiles_org_id ON cloud_profiles(org_id);
CREATE INDEX idx_cloud_profiles_user_id ON cloud_profiles(user_id);

-- Proposals Table
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    rfp_title VARCHAR(255) NOT NULL,
    rfp_source rfp_source_enum NOT NULL,
    rfp_raw_text TEXT,
    proposal_content TEXT,
    audit_score NUMERIC(5, 2),
    win_probability NUMERIC(5, 2),
    compliance_flags JSONB,
    status proposal_status_enum NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_proposals_org_id ON proposals(org_id);
CREATE INDEX idx_proposals_user_id ON proposals(user_id);

-- Usage Events Table
CREATE TABLE usage_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    event_type event_type_enum NOT NULL,
    metadata JSONB,
    credits_used NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_usage_events_org_id ON usage_events(org_id);
CREATE INDEX idx_usage_events_user_id ON usage_events(user_id);
CREATE INDEX idx_usage_events_created_at ON usage_events(created_at);

-- Pricing Cache Table
CREATE TABLE pricing_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider cloud_provider NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    price_usd NUMERIC(15, 6) NOT NULL,
    region VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_pricing_cache_lookup ON pricing_cache(provider, service_type, region);

-- Exchange Rates Table
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_currency VARCHAR(3) NOT NULL,
    rates JSONB NOT NULL,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Runs Evidence Trace Table (R4 Requirement)
CREATE TABLE ai_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workflow VARCHAR(100) NOT NULL DEFAULT 'proposal_generation',
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    model VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'vertex_ai',
    prompt_version VARCHAR(50) DEFAULT 'v1.0',
    schema_version VARCHAR(50) DEFAULT 'v1.0',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    latency_ms INTEGER,
    ai_call_count INTEGER DEFAULT 1,
    input_hash VARCHAR(64),
    output_proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
    validation_status VARCHAR(50) DEFAULT 'passed',
    error_code VARCHAR(100),
    usage_json JSONB,
    steps_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_ai_runs_org_id ON ai_runs(org_id);
CREATE INDEX idx_ai_runs_user_id ON ai_runs(user_id);
CREATE INDEX idx_ai_runs_created_at ON ai_runs(created_at);

-- Row-Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_runs ENABLE ROW LEVEL SECURITY;

-- Organisations: Users can only read their own organisation
CREATE POLICY org_read_policy ON organisations
    FOR SELECT USING (id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Users: Users can read other users in their organisation
CREATE POLICY users_read_policy ON users
    FOR SELECT USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Cloud Profiles: Users can read profiles in their organisation
CREATE POLICY cloud_profiles_read_policy ON cloud_profiles
    FOR SELECT USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
CREATE POLICY cloud_profiles_write_policy ON cloud_profiles
    FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Proposals: Users can read/write proposals in their organisation
CREATE POLICY proposals_read_policy ON proposals
    FOR SELECT USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
CREATE POLICY proposals_write_policy ON proposals
    FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Usage Events: Users can read events in their organisation
CREATE POLICY usage_events_read_policy ON usage_events
    FOR SELECT USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
CREATE POLICY usage_events_write_policy ON usage_events
    FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- AI Runs: Users can read AI runs in their organisation
CREATE POLICY ai_runs_read_policy ON ai_runs
    FOR SELECT USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
CREATE POLICY ai_runs_write_policy ON ai_runs
    FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
