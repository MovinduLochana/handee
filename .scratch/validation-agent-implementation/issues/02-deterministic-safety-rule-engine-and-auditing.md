# 02: Deterministic Safety Rule Engine & Granular Auditing

**What to build:** A hardened, deterministic validation engine in `src/tools/validation_rules.py` evaluating candidate providers and quotes against clear safety rules, outputting granular audit records and synthesizing the 3-tier risk classification.

**Blocked by:** Issue 01 (Contracts)

**Status:** closed

- [x] Implement `evaluate_validation_tier(input_data: ValidationInput) -> ValidationResult` adhering strictly to the Zero-Tool / Least-Privilege Guardrail.
- [x] Evaluate Hard Failure Rules:
  - `H1_PROVIDER_PRESENCE`: missing candidate provider instance.
  - `H2_VERIFICATION_STATUS`: provider identity and verification status (`isVerified` or `verificationStatus == 'Verified'`).
  - `H3_RATING_THRESHOLD`: rating $< 3.5$ for any provider, or rating $< 4.0$ for established providers with $\ge 3$ reviews.
  - `H4_PRICE_OUTLIER`: variance ratio $|Price - Benchmark| / Benchmark > 0.60$.
  - `H5_EXTREME_BUDGET_BREACH`: $Price > BudgetMax \times 1.30$.
- [x] Evaluate Soft Signal Rules:
  - `S1_NEW_PROVIDER_SIGNAL`: verified provider with $< 3$ reviews.
  - `S2_MODERATE_PRICE_VARIANCE`: price variance between $25\%$ and $40\%$.
  - `S3_MILD_BUDGET_BREACH`: $BudgetMax < Price \le BudgetMax \times 1.15$.
  - `S4_SCOPE_AMBIGUITY`: description ambiguity flag from Domain Analysis Agent.
- [x] Implement synthesis logic:
  - 0 hard failures, 0 soft signals $\implies$ `approved_for_auto_dispatch` (approval status: `approved`).
  - 0 hard failures, 1 soft signal $\implies$ `approved_with_audit` (approval status: `approved`).
  - $\ge 1$ hard failure OR $\ge 2$ soft signals $\implies$ `requires_human_approval` (approval status: `pending`).
- [x] Populate `evaluated_rules` list with detailed `ValidationRuleCheck` entries for every evaluated rule.
