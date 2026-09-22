from typing import Any, Dict, List, Optional
from src.schemas.contracts import ValidationResult
from src.tools.action_tools import CATEGORY_BENCHMARKS


def evaluate_validation_tier(
    provider: Optional[Dict[str, Any]],
    estimated_price: float,
    category: str,
    budget_max: Optional[float] = None,
    ambiguity_flag: bool = False
) -> ValidationResult:
    """
    Tiered safety and risk assessment engine enforcing deterministic rules:
    - approved_for_auto_dispatch (Low risk): Verified provider, rating >= 4.0, price in band
    - approved_with_audit (Medium risk): Single soft signal (e.g. newer provider or minor variance)
    - requires_human_approval (High risk): Unverified, rating < 3.5, severe price outlier, or ambiguous
    """
    reasons: List[str] = []

    if not provider:
        return ValidationResult(
            risk_tier="requires_human_approval",
            is_verified_provider=False,
            is_price_within_band=False,
            rating_passed=False,
            reasons=["No candidate provider could be matched for this request."]
        )

    # 1. Verification check
    is_verified = bool(provider.get("isVerified") or provider.get("verificationStatus") == "Verified")
    if not is_verified:
        reasons.append("Provider is unverified or verification is pending.")

    # 2. Rating check
    rating = float(provider.get("rating", 0.0))
    total_reviews = int(provider.get("totalReviews", 0))
    is_new_provider = total_reviews < 3
    rating_passed = rating >= 4.0 or (is_new_provider and rating >= 0.0)

    if not rating_passed:
        reasons.append(f"Provider rating ({rating}) is below required platform threshold of 4.0.")

    # 3. Price band variance check
    benchmark = CATEGORY_BENCHMARKS.get(category, 3500.0)
    # Price variance ratio compared to category baseline
    variance_ratio = abs(estimated_price - benchmark) / benchmark
    price_exceeds_budget = budget_max is not None and estimated_price > (budget_max * 1.15)

    is_price_within_band = variance_ratio <= 0.40 and not price_exceeds_budget
    if variance_ratio > 0.40:
        reasons.append(f"Estimated price (Rs. {estimated_price}) deviates significantly from category median (Rs. {benchmark}).")
    if price_exceeds_budget:
        reasons.append(f"Estimated price (Rs. {estimated_price}) exceeds customer maximum budget (Rs. {budget_max}).")

    if ambiguity_flag:
        reasons.append("Job description lacks sufficient detail, creating scope ambiguity.")

    # Determine Risk Tier
    hard_failures = 0
    soft_signals = 0

    if not is_verified:
        hard_failures += 1
    if not rating_passed:
        hard_failures += 1
    if variance_ratio > 0.60 or (budget_max is not None and estimated_price > budget_max * 1.3):
        hard_failures += 1

    if is_new_provider:
        soft_signals += 1
    if 0.25 < variance_ratio <= 0.40 or price_exceeds_budget:
        soft_signals += 1
    if ambiguity_flag:
        soft_signals += 1

    if hard_failures > 0 or soft_signals >= 2:
        risk_tier = "requires_human_approval"
    elif soft_signals == 1:
        risk_tier = "approved_with_audit"
        reasons.append("Approved with audit: one non-critical variance flagged for post-dispatch review.")
    else:
        risk_tier = "approved_for_auto_dispatch"
        reasons.append("All deterministic verification, rating, and pricing rules passed.")

    return ValidationResult(
        risk_tier=risk_tier,
        is_verified_provider=is_verified,
        is_price_within_band=is_price_within_band,
        rating_passed=rating_passed,
        reasons=reasons
    )
