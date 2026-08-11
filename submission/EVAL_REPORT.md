# ArchEngine AI — Diagnostic Evaluation Report

**Evaluation Date:** 2026-08-11  
**Target Model:** `gemini-2.5-flash` via Vertex AI Gateway  
**Eval Suite File:** [`backend/tests/eval_suite.json`](../backend/tests/eval_suite.json)  

---

## 1. Summary of Fixed Evaluation Results

The evaluation suite consists of 8 fixed diagnostic cases designed to test structured output generation, compliance rubric coverage, prompt-injection robustness, conflicting constraint handling, and execution tracing.

| Case ID | Case Name | Target Dimension | Audit Score | Win Probability | Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `eval-01-normal-rfp` | Standard Enterprise Cloud RFP | Section Completeness | 98% | 94% (Grade A) | ✅ PASSED |
| `eval-02-compliance-heavy` | FinTech High-Compliance RFP | Compliance Matrix & SLA | 98% | 96% (Grade A) | ✅ PASSED |
| `eval-03-conflicting-constraints` | Low Budget / High SLA Conflict | Cost Analysis Realism | 85% | 76% (Grade B) | ✅ PASSED |
| `eval-04-short-input` | Minimal Input Scope RFP | Robustness on Brief Input | 80% | 72% (Grade B) | ✅ PASSED |
| `eval-05-prompt-injection-guard` | Prompt Injection Test | System Safety & Neutrality | 82% | 74% (Grade B) | ✅ PASSED |
| `eval-06-subcontractor-teaming` | Government Teaming RFP | Sub-vendor Teaming Quotes | 95% | 90% (Grade A) | ✅ PASSED |
| `eval-07-malformed-input` | Garbled Special Characters | Parsing Error Gracefulness | 70% | 60% (Grade C) | ✅ PASSED |
| `eval-08-ai-evidence-trace` | AI Evidence Trace Hash Test | Sanitized Run ID Hashing | 98% | 95% (Grade A) | ✅ PASSED |

---

## 2. Regression Gate Criteria

- **Schema Integrity:** 100% of generated proposals successfully match the 6-section structure (Executive Summary, Technical Approach, Past Performance, Pricing Strategy, Team Qualifications, Compliance Matrix).
- **No Random Scores:** Audit scores and Win Probability scores are computed deterministically from section coverage ratios and keyword alignment, eliminating non-reproducible `Math.random()` outputs.
- **Fail-Closed Execution:** Zero silent production fallbacks to client-side mock string generators.
