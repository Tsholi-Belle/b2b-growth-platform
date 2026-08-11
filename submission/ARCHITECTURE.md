# ArchEngine AI — System Architecture & Data Flow

```text
  [ USER INTERFACE (Vanilla ES6 Single Page App) ]
                         │
                         │ HTTPS (JSON API Payload)
                         ▼
  [ NODE.JS / EXPRESS BACKEND API GATEWAY ]
                         │
           ┌─────────────┴─────────────┐
           ▼                           ▼
  [ AUTH & RBAC GUARD ]       [ INPUT VALIDATION & HASHING ]
           │                           │
           └─────────────┬─────────────┘
                         │
                         ▼
  [ VERTEX AI GEMINI GATEWAY (geminiGateway.js) ]
     - Application Default Credentials (ADC)
     - Vertex AI Mode (GOOGLE_GENAI_USE_VERTEXAI=true)
     - Configurable Model (gemini-2.5-flash)
                         │
                         ▼
  [ DETERMINISTIC QA & AUDIT EVALUATOR ]
     - 6-Section Coverage Analysis
     - Keyword Alignment & Win Probability Calculation
                         │
                         ▼
  [ PERSISTENCE & TRACING LAYER ]
     - Supabase PostgreSQL Database
     - Proposals Record (`proposals`)
     - AI Run Evidence Trace (`ai_runs`)
                         │
                         ▼
  [ CANONICAL JSON RESPONSE (run + proposal) ]
                         │
                         ▼
  [ UI RENDERING & AI RUN EVIDENCE BADGE DISPLAY ]
```

---

## Technical Security Boundaries

1. **Authentication**: Supabase JWT authentication verified on every backend route via `authMiddleware.js`. Role-Based Access Control enforced via `rbacMiddleware.js`.
2. **Google Cloud Identity**: Google Gen AI SDK operates under Application Default Credentials (ADC) using an attached user-managed service account (`roles/aiplatform.user`). No long-lived service account key files are checked into code or embedded in container images.
3. **Tenant Data Isolation**: Database queries enforce `org_id` filtering, complemented by Supabase PostgreSQL Row-Level Security (RLS) policies.
4. **Data Privacy**: Zero-data-retention AI policy. Ingested RFP documents and system telemetry are processed statelessly via Vertex AI APIs and encrypted with AES-256 at rest.
