from typing import Any, Dict, List, Literal, Optional, Union

from src.schemas.contracts import (
    ProviderCandidateProfile,
    ValidationInput,
    ValidationResult,
    ValidationRiskTier,
    ValidationRuleCheck,
    canonical_category,
)
from src.tools.action_tools import CATEGORY_BENCHMARKS


def evaluate_validation_tier(
    provider_or_input: Optional[Union[ValidationInput, ProviderCandidateProfile, Dict[str, Any]]] = None,
    estimated_price: Optional[float] = None,
    category: Optional[str] = None,
    budget_max: Optional[float] = None,
    ambiguity_flag: bool = False,
    *,
    budget_min: Optional[float] = None,
    complexity: Literal["Low", "Medium", "High"] = "Medium",
    provider: Optional[Union[ProviderCandidateProfile, Dict[str, Any]]] = None,
) -> ValidationResult:
    """
    Pure deterministic validation engine executing tiered safety checks.
    Adheres strictly to the Zero-Tool / Least-Privilege Guardrail.

    Evaluates:
    - Identity & verification status
    - Customer satisfaction ratings and review history maturity
    - Category price band deviations and customer budget limits
    - Job scope ambiguity signals

    Synthesizes outcome into one of three tiers:
    - approved_for_auto_dispatch (Low risk): All deterministic checks passed
    - approved_with_audit (Medium risk): Exactly 1 soft signal flagged for post-dispatch review
    - requires_human_approval (High risk): Hard failures or >= 2 soft signals pause dispatch
    """
    # ── Normalize inputs into typed ValidationInput ───────────────────────────
    if isinstance(provider_or_input, ValidationInput):
        inp = provider_or_input
    else:
        actual_provider = provider if provider is not None else provider_or_input
        validated_provider: Optional[ProviderCandidateProfile] = None
        if actual_provider is not None:
            if isinstance(actual_provider, ProviderCandidateProfile):
                validated_provider = actual_provider
            elif isinstance(actual_provider, dict):
                validated_provider = ProviderCandidateProfile(
                    id=str(actual_provider.get("id") or actual_provider.get("userId") or "unknown"),
                    userId=str(actual_provider.get("userId") or actual_provider.get("id") or "unknown"),
                    fullName=str(actual_provider.get("fullName") or "Unknown Provider"),
                    isVerified=bool(
                        actual_provider.get("isVerified")
                        or actual_provider.get("verificationStatus") == "Verified"
                    ),
                    verificationStatus=str(actual_provider.get("verificationStatus") or ("Verified" if actual_provider.get("isVerified") else "Pending")),
                    rating=float(actual_provider.get("rating", 0.0)),
                    totalReviews=int(actual_provider.get("totalReviews", 0)),
                    hourlyRate=float(actual_provider["hourlyRate"]) if actual_provider.get("hourlyRate") is not None else None,
                    skillCategories=list(actual_provider.get("skillCategories") or []),
                    serviceArea=actual_provider.get("serviceArea"),
                )

        clean_cat = canonical_category(category) or "General Maintenance"
        inp = ValidationInput(
            provider=validated_provider,
            estimated_price=float(estimated_price if estimated_price is not None else 3500.0),
            category=clean_cat,
            budget_min=budget_min,
            budget_max=budget_max,
            ambiguity_flag=ambiguity_flag,
            complexity=complexity,
        )

    # ── Rule Evaluation ───────────────────────────────────────────────────────
    rules: List[ValidationRuleCheck] = []
    reasons: List[str] = []
    hard_failures = 0
    soft_signals = 0

    prov = inp.provider
    price = inp.estimated_price
    cat = inp.category
    b_max = inp.budget_max
    is_ambiguous = inp.ambiguity_flag

    # 1. Candidate Provider Presence
    if prov is None:
        fail_rule = ValidationRuleCheck(
            rule_id="H1_PROVIDER_PRESENCE",
            rule_name="Provider Candidate Matched",
            is_hard_rule=True,
            passed=False,
            actual_value=None,
            threshold="Provider candidate instance required",
            message="No candidate provider could be matched for this request.",
        )
        return ValidationResult(
            risk_tier=ValidationRiskTier.REQUIRES_HUMAN_APPROVAL,
            is_verified_provider=False,
            is_price_within_band=False,
            rating_passed=False,
            scope_clarity_passed=not is_ambiguous,
            hard_failures_count=1,
            soft_signals_count=0,
            evaluated_rules=[fail_rule],
            reasons=["No candidate provider could be matched for this request."],
        )

    # 2. Verification Check (Hard Rule)
    is_verified = bool(prov.isVerified or prov.verificationStatus == "Verified")
    if not is_verified:
        hard_failures += 1
        msg = f"Provider '{prov.fullName}' is unverified or verification is pending (status: {prov.verificationStatus})."
        reasons.append(msg)
        rules.append(
            ValidationRuleCheck(
                rule_id="H2_VERIFICATION_STATUS",
                rule_name="Identity Verification",
                is_hard_rule=True,
                passed=False,
                actual_value=prov.verificationStatus,
                threshold="Verified",
                message=msg,
            )
        )
    else:
        rules.append(
            ValidationRuleCheck(
                rule_id="H2_VERIFICATION_STATUS",
                rule_name="Identity Verification",
                is_hard_rule=True,
                passed=True,
                actual_value=prov.verificationStatus,
                threshold="Verified",
                message="Provider identity and trade credentials verified.",
            )
        )

    # 3. Customer Rating & Review History Checks
    rating = prov.rating
    total_reviews = prov.totalReviews
    is_new_provider = total_reviews < 3

    if is_new_provider:
        soft_signals += 1
        msg = f"Provider is newly onboarded with limited review history ({total_reviews} reviews)."
        reasons.append(msg)
        rules.append(
            ValidationRuleCheck(
                rule_id="S1_NEW_PROVIDER_SIGNAL",
                rule_name="Provider Review Maturity",
                is_hard_rule=False,
                passed=False,
                actual_value=total_reviews,
                threshold=">= 3 reviews",
                message=msg,
            )
        )
    else:
        rules.append(
            ValidationRuleCheck(
                rule_id="S1_NEW_PROVIDER_SIGNAL",
                rule_name="Provider Review Maturity",
                is_hard_rule=False,
                passed=True,
                actual_value=total_reviews,
                threshold=">= 3 reviews",
                message="Provider has established customer review track record.",
            )
        )

    # Rating threshold: hard fail if rating < 3.5, or established provider rating < 4.0
    rating_passed = rating >= 4.0 or (is_new_provider and rating >= 3.5) or (is_new_provider and total_reviews == 0 and rating >= 0.0)
    if not rating_passed:
        hard_failures += 1
        msg = f"Provider rating ({rating:.1f}) is below platform standard (threshold: 4.0)."
        reasons.append(msg)
        rules.append(
            ValidationRuleCheck(
                rule_id="H3_RATING_THRESHOLD",
                rule_name="Customer Satisfaction Rating",
                is_hard_rule=True,
                passed=False,
                actual_value=rating,
                threshold=4.0,
                message=msg,
            )
        )
    else:
        rules.append(
            ValidationRuleCheck(
                rule_id="H3_RATING_THRESHOLD",
                rule_name="Customer Satisfaction Rating",
                is_hard_rule=True,
                passed=True,
                actual_value=rating,
                threshold=4.0,
                message="Provider customer satisfaction rating meets platform threshold.",
            )
        )

    # 4. Price Band Variance & Budget Evaluation
    benchmark = CATEGORY_BENCHMARKS.get(cat, 3500.0)
    variance_ratio = abs(price - benchmark) / benchmark
    price_exceeds_budget = b_max is not None and price > b_max
    price_severe_outlier = variance_ratio > 0.60
    budget_extreme_breach = b_max is not None and price > (b_max * 1.30)
    budget_mild_breach = b_max is not None and price > b_max and not budget_extreme_breach

    # Severe price outlier (> 60% deviation from category median)
    if price_severe_outlier:
        hard_failures += 1
        msg = f"Estimated price (Rs. {price:,.2f}) deviates severely ({variance_ratio*100:.1f}%) from category median (Rs. {benchmark:,.2f})."
        reasons.append(msg)
        rules.append(
            ValidationRuleCheck(
                rule_id="H4_PRICE_OUTLIER",
                rule_name="Category Price Median Band",
                is_hard_rule=True,
                passed=False,
                actual_value=round(variance_ratio, 2),
                threshold="<= 0.60",
                message=msg,
            )
        )
    elif variance_ratio > 0.40:
        soft_signals += 2
        msg = f"Estimated price (Rs. {price:,.2f}) deviates significantly ({variance_ratio*100:.1f}%) from category median (Rs. {benchmark:,.2f})."
        reasons.append(msg)
        rules.append(
            ValidationRuleCheck(
                rule_id="S2_SIGNIFICANT_PRICE_VARIANCE",
                rule_name="Significant Price Deviation",
                is_hard_rule=False,
                passed=False,
                actual_value=round(variance_ratio, 2),
                threshold="<= 0.40",
                message=msg,
            )
        )
    elif variance_ratio > 0.25:
        soft_signals += 1
        msg = f"Estimated price (Rs. {price:,.2f}) has moderate deviation ({variance_ratio*100:.1f}%) from category median (Rs. {benchmark:,.2f})."
        reasons.append(msg)
        rules.append(
            ValidationRuleCheck(
                rule_id="S2_MODERATE_PRICE_VARIANCE",
                rule_name="Moderate Price Deviation",
                is_hard_rule=False,
                passed=False,
                actual_value=round(variance_ratio, 2),
                threshold="<= 0.25",
                message=msg,
            )
        )
    else:
        rules.append(
            ValidationRuleCheck(
                rule_id="S2_MODERATE_PRICE_VARIANCE",
                rule_name="Moderate Price Deviation",
                is_hard_rule=False,
                passed=True,
                actual_value=round(variance_ratio, 2),
                threshold="<= 0.25",
                message="Estimated price is within normal category median band.",
            )
        )

    # Extreme budget breach (> 30% above customer budget)
    if budget_extreme_breach:
        hard_failures += 1
        msg = f"Estimated price (Rs. {price:,.2f}) exceeds customer budget ceiling (Rs. {b_max:,.2f}) by >30%."
        reasons.append(msg)
        rules.append(
            ValidationRuleCheck(
                rule_id="H5_EXTREME_BUDGET_BREACH",
                rule_name="Customer Budget Ceiling",
                is_hard_rule=True,
                passed=False,
                actual_value=price,
                threshold=round(b_max * 1.30, 2),
                message=msg,
            )
        )
    elif budget_mild_breach:
        soft_signals += 1
        msg = f"Estimated price (Rs. {price:,.2f}) exceeds customer maximum budget (Rs. {b_max:,.2f})."
        reasons.append(msg)
        rules.append(
            ValidationRuleCheck(
                rule_id="S3_MILD_BUDGET_BREACH",
                rule_name="Customer Budget Limit",
                is_hard_rule=False,
                passed=False,
                actual_value=price,
                threshold=b_max,
                message=msg,
            )
        )

    # 5. Scope Ambiguity Check
    if is_ambiguous:
        soft_signals += 1
        msg = "Job description lacks sufficient detail or has conflicting signals, creating scope ambiguity."
        reasons.append(msg)
        rules.append(
            ValidationRuleCheck(
                rule_id="S4_SCOPE_AMBIGUITY",
                rule_name="Job Scope Clarity",
                is_hard_rule=False,
                passed=False,
                actual_value="Ambiguous",
                threshold="Clear",
                message=msg,
            )
        )
    else:
        rules.append(
            ValidationRuleCheck(
                rule_id="S4_SCOPE_AMBIGUITY",
                rule_name="Job Scope Clarity",
                is_hard_rule=False,
                passed=True,
                actual_value="Clear",
                threshold="Clear",
                message="Job description scope is well-defined.",
            )
        )

    # ── Risk Tier Synthesis ──────────────────────────────────────────────────
    if hard_failures > 0 or soft_signals >= 2:
        risk_tier = ValidationRiskTier.REQUIRES_HUMAN_APPROVAL
        reasons.append(f"Requires human approval: {hard_failures} hard failure(s) and {soft_signals} soft signal(s) detected.")
    elif soft_signals == 1:
        risk_tier = ValidationRiskTier.APPROVED_WITH_AUDIT
        reasons.append("Approved with audit: one non-critical variance flagged for post-dispatch review.")
    else:
        risk_tier = ValidationRiskTier.APPROVED_FOR_AUTO_DISPATCH
        reasons.append("All deterministic verification, rating, and pricing rules passed.")

    is_price_within_band = variance_ratio <= 0.40 and not (b_max is not None and price > b_max * 1.15)

    return ValidationResult(
        risk_tier=risk_tier,
        is_verified_provider=is_verified,
        is_price_within_band=is_price_within_band,
        rating_passed=rating_passed,
        scope_clarity_passed=not is_ambiguous,
        hard_failures_count=hard_failures,
        soft_signals_count=soft_signals,
        evaluated_rules=rules,
        reasons=reasons,
    )
