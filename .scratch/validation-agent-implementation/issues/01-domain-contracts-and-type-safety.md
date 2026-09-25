# 01: Validation Agent Domain Contracts & Type Safety

**What to build:** Strongly typed Pydantic contracts for the Validation / Safety Agent subsystem. Replace untyped dictionary inputs and primitive strings with validated domain models defining candidate provider profiles, validation inputs, granular rule check results, and strict validation risk tier enums.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Declare `ValidationRiskTier` StrEnum in `src/schemas/contracts.py` with members: `approved_for_auto_dispatch`, `approved_with_audit`, and `requires_human_approval`.
- [x] Define `ProviderCandidateProfile` Pydantic model with fields: `id`, `userId`, `fullName`, `isVerified`, `verificationStatus`, `rating` (bounded 0.0 to 5.0), `totalReviews` (ge 0), and optional `hourlyRate`, `skillCategories`, and `serviceArea`.
- [x] Define `ValidationRuleCheck` model for individual rule audit logging: `rule_id`, `rule_name`, `is_hard_rule`, `passed`, `actual_value`, `threshold`, and `message`.
- [x] Define `ValidationInput` model requiring `category: ServiceCategoryName`, `estimated_price > 0`, optional `provider: ProviderCandidateProfile`, optional budget bounds, and boolean `ambiguity_flag`.
- [x] Refactor `ValidationResult` model to use `risk_tier: ValidationRiskTier`, boolean flags (`is_verified_provider`, `is_price_within_band`, `rating_passed`, `scope_clarity_passed`), counts for hard failures and soft signals, list of `ValidationRuleCheck`, and summary reasons.
- [x] Unit tests asserting schema validation, boundary value rejection, and enum serialization.
