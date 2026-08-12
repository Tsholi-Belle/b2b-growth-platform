# ArchEngine AI — XPRIZE Production Evidence Document

**Project:** ArchEngine AI (B2B Growth Platform)  
**Submission Category:** Small Business Services  
**Competition:** Build with Gemini XPRIZE  
**Target Date:** 2026-08-17  
**V3 Baseline Commit:** `fa201cce4e2351e91a13bf4701233f7c67ad13d4`

---

> [!WARNING]
> **V3 EVIDENCE STATUS: UNVERIFIED (PENDING PHASE 5 EVAL & PHASE 7 CLOUD RUN DEPLOYMENT)**
> Per V3 governing PRD requirements, all operational benchmarks and sample trace structures are marked as **UNVERIFIED** until observed directly from the Phase 5 executable eval runner (`EVAL_RESULTS.json`) and Phase 7 Cloud Run production execution trace.

---

## 1. Production Architecture & Identity Verification

ArchEngine AI runs on a managed Google Cloud Cloud Run backend utilizing **Vertex AI with Application Default Credentials (ADC)**.

- **AI SDK**: `@google/genai` (Google Gen AI SDK)
- **Authentication**: Google Cloud Application Default Credentials (ADC) attached to runtime user-managed service account (`roles/aiplatform.user`)
- **Default Model**: Configurable via `GEMINI_MODEL` (default: `gemini-2.5-flash`)
- **Gateway Module**: [`backend/services/geminiGateway.js`](../backend/services/geminiGateway.js)
- **AI Run Evidence Service**: [`backend/services/aiRunService.js`](../backend/services/aiRunService.js)
- **Database Schema**: Supabase PostgreSQL with Row-Level Security (`ai_runs` table)

---

## 2. Sample AI Run Evidence Trace (Format Specification)

Every production proposal generation request produces a sanitized execution trace stored in the `ai_runs` table and rendered directly in the user interface:

```json
{
  "id": "e89f41b2-7c3d-4e92-91a5-812d46e921b3",
  "workflow": "proposal_generation",
  "status": "completed",
  "model": "gemini-2.5-flash",
  "provider": "vertex_ai",
  "started_at": "2026-08-11T11:25:00.000Z",
  "completed_at": "2026-08-11T11:25:01.345Z",
  "latency_ms": 1345,
  "ai_call_count": 1,
  "input_hash": "a4f89d31b2e591c478a2e5d19012bc4f",
  "validation_status": "passed",
  "note": "FORMAT SPECIFICATION — Pending Phase 7 Cloud Run execution capture"
}
```

---

## 3. Product Contract & No Silent Fallback Verification

- **Production Mode (`APP_MODE=production`)**: If Vertex AI or backend services fail, the system fails closed with structured machine-readable error codes (`GEMINI_UPSTREAM_UNAVAILABLE`, `REQUEST_INVALID`). It does NOT silently switch to client-side string mock generators.
- **Demo Mode (`APP_MODE=demo`)**: Explicit demo mode permits interactive exploration with clear UI badges labeling sample inputs and benchmark datasets.

---

## 4. Operational & Performance Benchmarks

| Metric | Target Value | Baseline Evidence Status | Verification Method |
| :--- | :--- | :--- | :--- |
| **Average End-to-End Proposal Generation Latency** | ~1,240 ms | UNVERIFIED | Recorded via `ai_runs.latency_ms` in Phase 7 |
| **Deterministic Section Coverage Pass Rate** | ≥ 95.0% | UNVERIFIED | Evaluated via Phase 5 executable evals |
| **Structured Output Schema Validity** | 100% | UNVERIFIED | Verified via response JSON parser in Phase 3/5 |
| **Tenant Isolation & RLS Enforcement** | 100% | UNVERIFIED | Tested via Supabase org_id test suite in Phase 4 |

