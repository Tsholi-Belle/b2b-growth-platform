# ArchEngine AI — Diagnostic Evaluation Report

**Evaluation Date:** 2026-08-12  
**Target Model:** `gemini-2.5-flash` via Vertex AI Gateway  
**Eval Suite File:** [`backend/tests/eval_suite.json`](../backend/tests/eval_suite.json)  
**V3 Baseline Commit:** `fa201cce4e2351e91a13bf4701233f7c67ad13d4`

---

> [!WARNING]
> **V3 EVIDENCE STATUS: UNVERIFIED (PENDING PHASE 5 EXECUTABLE EVALUATION)**
> The metrics listed below reflect the initial target thresholds and fixed case definitions in `eval_suite.json`. In accordance with V3 governing PRD rules, these values are quarantined as **UNVERIFIED** until `backend/tests/run_evals.js` is executed against the candidate build in Phase 5 to generate verified result artifacts (`EVAL_RESULTS.json`).

---

## 1. Summary of Fixed Evaluation Results

The evaluation suite consists of 8 fixed diagnostic cases designed to test structured output generation, compliance rubric coverage, prompt-injection robustness, conflicting constraint handling, and execution tracing.

| Case ID | Case Name | Target Dimension | Target Audit Score | Target Win Probability | Baseline Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `eval-01-normal-rfp` | Standard Enterprise Cloud RFP | Section Completeness | 98% (UNVERIFIED) | 94% (Grade A) (UNVERIFIED) | PENDING EVAL RUN |
| `eval-02-compliance-heavy` | FinTech High-Compliance RFP | Compliance Matrix & SLA | 98% (UNVERIFIED) | 96% (Grade A) (UNVERIFIED) | PENDING EVAL RUN |
| `eval-03-conflicting-constraints` | Low Budget / High SLA Conflict | Cost Analysis Realism | 85% (UNVERIFIED) | 76% (Grade B) (UNVERIFIED) | PENDING EVAL RUN |
| `eval-04-short-input` | Minimal Input Scope RFP | Robustness on Brief Input | 80% (UNVERIFIED) | 72% (Grade B) (UNVERIFIED) | PENDING EVAL RUN |
| `eval-05-prompt-injection-guard` | Prompt Injection Test | System Safety & Neutrality | 82% (UNVERIFIED) | 74% (Grade B) (UNVERIFIED) | PENDING EVAL RUN |
| `eval-06-subcontractor-teaming` | Government Teaming RFP | Sub-vendor Teaming Quotes | 95% (UNVERIFIED) | 90% (Grade A) (UNVERIFIED) | PENDING EVAL RUN |
| `eval-07-malformed-input` | Garbled Special Characters | Parsing Error Gracefulness | 70% (UNVERIFIED) | 60% (Grade C) (UNVERIFIED) | PENDING EVAL RUN |
| `eval-08-ai-evidence-trace` | AI Evidence Trace Hash Test | Sanitized Run ID Hashing | 98% (UNVERIFIED) | 95% (Grade A) (UNVERIFIED) | PENDING EVAL RUN |

---

## 2. Regression Gate Criteria

- **Schema Integrity:** Generated proposals must match the canonical schema structure.
- **No Random Scores:** Audit scores and Win Probability scores are computed deterministically from section coverage ratios and keyword alignment, eliminating non-reproducible `Math.random()` outputs.
- **Fail-Closed Execution:** Zero silent production fallbacks to client-side mock string generators in production mode.
- **Evidence Verification:** Every score in final submission reports must be generated directly from `EVAL_RESULTS.json`.

