# 04: Golden-Case Evaluation Test Suite

**What to build:** A comprehensive PyTest evaluation suite in `agents/tests/test_validation_agent.py` asserting schema correctness, tool-call restrictions, rule boundaries, and tiered risk classification across a fixed matrix of marketplace scenarios as required by project specification §15.1 and §15.3.

**Blocked by:** Issue 03 (Workflow Integration)

**Status:** closed

- [x] Golden Case 1: Clean Low-Risk Request $\implies$ `approved_for_auto_dispatch` (Verified provider, rating 4.9, 34 reviews, exact category median price).
- [x] Golden Case 2: New Verified Provider $\implies$ `approved_with_audit` (Verified provider, rating 4.8, 1 review).
- [x] Golden Case 3: Moderate Price Variance $\implies$ `approved_with_audit` (Price 35% above benchmark, all other signals clean).
- [x] Golden Case 4: Mild Budget Overrun $\implies$ `approved_with_audit` (Price 10% above customer budget, variance <= 25%).
- [x] Golden Case 5: Scope Ambiguity Signal $\implies$ `approved_with_audit` (Ambiguous description, all other signals clean).
- [x] Golden Case 6: Unverified Provider $\implies$ `requires_human_approval` (Pending/unverified status).
- [x] Golden Case 7: Deficient Rating $\implies$ `requires_human_approval` (Rating 3.2 < 3.5).
- [x] Golden Case 8: Severe Price Outlier $\implies$ `requires_human_approval` (Price 75% above benchmark).
- [x] Golden Case 9: Extreme Budget Breach $\implies$ `requires_human_approval` (Price 35% above customer budget ceiling).
- [x] Golden Case 10: Compound Soft Signals $\implies$ `requires_human_approval` (New provider + ambiguous description).
- [x] Golden Case 11: Missing Provider Safe Failure $\implies$ `requires_human_approval` (No candidates matched).
- [x] Contract boundary tests asserting exact thresholds ($25\%$, $40\%$, $60\%$ variance, $3.5$ and $4.0$ rating, $0$, $1$, $2$, $3$ reviews).
- [x] Ensure all tests execute cleanly under `pytest` with zero external network or LLM dependencies.
