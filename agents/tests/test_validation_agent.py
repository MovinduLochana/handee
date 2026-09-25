import pytest
from pydantic import ValidationError

from src.schemas.contracts import (
    ProviderCandidateProfile,
    ValidationInput,
    ValidationResult,
    ValidationRiskTier,
    ValidationRuleCheck,
)


# ─── Contract & Schema Validation Tests ──────────────────────────────────────


def test_validation_risk_tier_enum_values():
    assert ValidationRiskTier.APPROVED_FOR_AUTO_DISPATCH == "approved_for_auto_dispatch"
    assert ValidationRiskTier.APPROVED_WITH_AUDIT == "approved_with_audit"
    assert ValidationRiskTier.REQUIRES_HUMAN_APPROVAL == "requires_human_approval"
    # StrEnum allows transparent string comparisons
    assert isinstance(ValidationRiskTier.APPROVED_FOR_AUTO_DISPATCH, str)


def test_provider_candidate_profile_valid():
    prof = ProviderCandidateProfile(
        id="prov-1",
        userId="user-1",
        fullName="Sunil Perera",
        isVerified=True,
        verificationStatus="Verified",
        rating=4.9,
        totalReviews=34,
        hourlyRate=3500.0,
        skillCategories=["Plumbing"],
        serviceArea="Colombo",
    )
    assert prof.fullName == "Sunil Perera"
    assert prof.isVerified is True
    assert prof.rating == 4.9
    assert prof.totalReviews == 34


@pytest.mark.parametrize(
    "invalid_rating",
    [-0.1, 5.1, 10.0],
)
def test_provider_candidate_profile_invalid_rating(invalid_rating):
    with pytest.raises(ValidationError):
        ProviderCandidateProfile(
            id="prov-1",
            userId="user-1",
            fullName="Sunil Perera",
            rating=invalid_rating,
        )


def test_provider_candidate_profile_negative_reviews():
    with pytest.raises(ValidationError):
        ProviderCandidateProfile(
            id="prov-1",
            userId="user-1",
            fullName="Sunil Perera",
            totalReviews=-1,
        )


def test_validation_input_valid_with_dict_coercion():
    inp = ValidationInput(
        provider={
            "id": "prov-1",
            "userId": "user-1",
            "fullName": "Sunil Perera",
            "isVerified": True,
            "verificationStatus": "Verified",
            "rating": 4.9,
            "totalReviews": 20,
        },
        estimated_price=4200.0,
        category="plumbing",  # canonicalizes to "Plumbing"
        budget_max=5000.0,
        ambiguity_flag=False,
    )
    assert inp.category == "Plumbing"
    assert inp.provider is not None
    assert inp.provider.fullName == "Sunil Perera"
    assert inp.estimated_price == 4200.0


def test_validation_input_invalid_category():
    with pytest.raises(ValidationError):
        ValidationInput(
            estimated_price=3000.0,
            category="Astronautics",
        )


def test_validation_input_zero_or_negative_price():
    with pytest.raises(ValidationError):
        ValidationInput(
            estimated_price=0.0,
            category="Plumbing",
        )
    with pytest.raises(ValidationError):
        ValidationInput(
            estimated_price=-500.0,
            category="Plumbing",
        )


def test_validation_rule_check_model():
    rule = ValidationRuleCheck(
        rule_id="H2_VERIFICATION_STATUS",
        rule_name="Identity Verification",
        is_hard_rule=True,
        passed=True,
        actual_value="Verified",
        threshold="Verified",
        message="Provider identity verified.",
    )
    assert rule.is_hard_rule is True
    assert rule.passed is True


def test_validation_result_serialization():
    res = ValidationResult(
        risk_tier=ValidationRiskTier.APPROVED_FOR_AUTO_DISPATCH,
        is_verified_provider=True,
        is_price_within_band=True,
        rating_passed=True,
        scope_clarity_passed=True,
        hard_failures_count=0,
        soft_signals_count=0,
        evaluated_rules=[],
        reasons=["All rules passed."],
    )
    dumped = res.model_dump()
    assert dumped["risk_tier"] == "approved_for_auto_dispatch"
    assert dumped["is_verified_provider"] is True
    assert dumped["hard_failures_count"] == 0


# ─── Golden-Case Evaluation Suite ────────────────────────────────────────────
from src.tools.validation_rules import evaluate_validation_tier


def test_golden_case_1_clean_auto_dispatch():
    """Verified provider, 4.9 rating, 34 reviews, price exactly at category median."""
    inp = ValidationInput(
        provider=ProviderCandidateProfile(
            id="p-1",
            userId="u-1",
            fullName="Sunil Perera",
            isVerified=True,
            verificationStatus="Verified",
            rating=4.9,
            totalReviews=34,
        ),
        estimated_price=3500.0,
        category="Plumbing",
    )
    res = evaluate_validation_tier(inp)
    assert res.risk_tier == ValidationRiskTier.APPROVED_FOR_AUTO_DISPATCH
    assert res.hard_failures_count == 0
    assert res.soft_signals_count == 0
    assert res.is_verified_provider is True
    assert res.is_price_within_band is True
    assert res.rating_passed is True
    assert len(res.evaluated_rules) >= 4


def test_golden_case_2_audit_new_verified_provider():
    """Verified provider with high rating (4.8), but only 1 review (Soft Signal S1)."""
    inp = ValidationInput(
        provider=ProviderCandidateProfile(
            id="p-2",
            userId="u-2",
            fullName="Amara Silva",
            isVerified=True,
            verificationStatus="Verified",
            rating=4.8,
            totalReviews=1,
        ),
        estimated_price=3500.0,
        category="Plumbing",
    )
    res = evaluate_validation_tier(inp)
    assert res.risk_tier == ValidationRiskTier.APPROVED_WITH_AUDIT
    assert res.hard_failures_count == 0
    assert res.soft_signals_count == 1
    assert any(r.rule_id == "S1_NEW_PROVIDER_SIGNAL" and not r.passed for r in res.evaluated_rules)


def test_golden_case_3_audit_moderate_price_variance():
    """Established verified provider, quote Rs. 4,725 (35% above Rs. 3,500 median -> Soft Signal S2)."""
    inp = ValidationInput(
        provider=ProviderCandidateProfile(
            id="p-1",
            userId="u-1",
            fullName="Sunil Perera",
            isVerified=True,
            verificationStatus="Verified",
            rating=4.9,
            totalReviews=34,
        ),
        estimated_price=4725.0,
        category="Plumbing",
    )
    res = evaluate_validation_tier(inp)
    assert res.risk_tier == ValidationRiskTier.APPROVED_WITH_AUDIT
    assert res.hard_failures_count == 0
    assert res.soft_signals_count == 1
    assert any(r.rule_id == "S2_MODERATE_PRICE_VARIANCE" and not r.passed for r in res.evaluated_rules)


def test_golden_case_4_audit_mild_budget_overrun():
    """Quote Rs. 3,500 exceeds customer budget of Rs. 3,200 by < 15% (Soft Signal S3)."""
    inp = ValidationInput(
        provider=ProviderCandidateProfile(
            id="p-1",
            userId="u-1",
            fullName="Sunil Perera",
            isVerified=True,
            verificationStatus="Verified",
            rating=4.9,
            totalReviews=34,
        ),
        estimated_price=3500.0,
        category="Plumbing",
        budget_max=3200.0,
    )
    res = evaluate_validation_tier(inp)
    assert res.risk_tier == ValidationRiskTier.APPROVED_WITH_AUDIT
    assert res.soft_signals_count == 1
    assert any(r.rule_id == "S3_MILD_BUDGET_BREACH" and not r.passed for r in res.evaluated_rules)


def test_golden_case_5_audit_scope_ambiguity():
    """Clean provider and price, but job description flagged as ambiguous (Soft Signal S4)."""
    inp = ValidationInput(
        provider=ProviderCandidateProfile(
            id="p-1",
            userId="u-1",
            fullName="Sunil Perera",
            isVerified=True,
            verificationStatus="Verified",
            rating=4.9,
            totalReviews=34,
        ),
        estimated_price=3500.0,
        category="Plumbing",
        ambiguity_flag=True,
    )
    res = evaluate_validation_tier(inp)
    assert res.risk_tier == ValidationRiskTier.APPROVED_WITH_AUDIT
    assert res.soft_signals_count == 1
    assert res.scope_clarity_passed is False


def test_golden_case_6_hitl_unverified_provider():
    """Provider unverified (Hard Failure H2) -> Pauses dispatch."""
    inp = ValidationInput(
        provider=ProviderCandidateProfile(
            id="p-3",
            userId="u-3",
            fullName="Unknown Handyman",
            isVerified=False,
            verificationStatus="Pending",
            rating=4.8,
            totalReviews=12,
        ),
        estimated_price=3500.0,
        category="Plumbing",
    )
    res = evaluate_validation_tier(inp)
    assert res.risk_tier == ValidationRiskTier.REQUIRES_HUMAN_APPROVAL
    assert res.hard_failures_count >= 1
    assert any(r.rule_id == "H2_VERIFICATION_STATUS" and not r.passed for r in res.evaluated_rules)


def test_golden_case_7_hitl_deficient_rating():
    """Provider rating 3.2 < 3.5 minimum standard (Hard Failure H3)."""
    inp = ValidationInput(
        provider=ProviderCandidateProfile(
            id="p-4",
            userId="u-4",
            fullName="Low Quality Tech",
            isVerified=True,
            verificationStatus="Verified",
            rating=3.2,
            totalReviews=10,
        ),
        estimated_price=3500.0,
        category="Plumbing",
    )
    res = evaluate_validation_tier(inp)
    assert res.risk_tier == ValidationRiskTier.REQUIRES_HUMAN_APPROVAL
    assert res.hard_failures_count >= 1
    assert res.rating_passed is False


def test_golden_case_8_hitl_severe_price_outlier():
    """Quote Rs. 6,300 on Plumbing (80% above Rs. 3,500 median -> Hard Failure H4)."""
    inp = ValidationInput(
        provider=ProviderCandidateProfile(
            id="p-1",
            userId="u-1",
            fullName="Sunil Perera",
            isVerified=True,
            verificationStatus="Verified",
            rating=4.9,
            totalReviews=34,
        ),
        estimated_price=6300.0,
        category="Plumbing",
    )
    res = evaluate_validation_tier(inp)
    assert res.risk_tier == ValidationRiskTier.REQUIRES_HUMAN_APPROVAL
    assert res.hard_failures_count >= 1
    assert any(r.rule_id == "H4_PRICE_OUTLIER" and not r.passed for r in res.evaluated_rules)


def test_golden_case_9_hitl_extreme_budget_breach():
    """Customer budget Rs. 3,000, price Rs. 4,200 (> 30% above ceiling -> Hard Failure H5)."""
    inp = ValidationInput(
        provider=ProviderCandidateProfile(
            id="p-1",
            userId="u-1",
            fullName="Sunil Perera",
            isVerified=True,
            verificationStatus="Verified",
            rating=4.9,
            totalReviews=34,
        ),
        estimated_price=4200.0,
        category="Plumbing",
        budget_max=3000.0,
    )
    res = evaluate_validation_tier(inp)
    assert res.risk_tier == ValidationRiskTier.REQUIRES_HUMAN_APPROVAL
    assert res.hard_failures_count >= 1
    assert any(r.rule_id == "H5_EXTREME_BUDGET_BREACH" and not r.passed for r in res.evaluated_rules)


def test_golden_case_10_hitl_compound_soft_signals():
    """New provider (Soft Signal 1) + Ambiguous scope (Soft Signal 2) -> Compound uncertainty halts dispatch."""
    inp = ValidationInput(
        provider=ProviderCandidateProfile(
            id="p-2",
            userId="u-2",
            fullName="Amara Silva",
            isVerified=True,
            verificationStatus="Verified",
            rating=4.8,
            totalReviews=1,
        ),
        estimated_price=3500.0,
        category="Plumbing",
        ambiguity_flag=True,
    )
    res = evaluate_validation_tier(inp)
    assert res.risk_tier == ValidationRiskTier.REQUIRES_HUMAN_APPROVAL
    assert res.hard_failures_count == 0
    assert res.soft_signals_count == 2


def test_golden_case_11_hitl_no_candidates_safe_failure():
    """No candidate provider matched -> Safe failure into human approval."""
    inp = ValidationInput(
        provider=None,
        estimated_price=3500.0,
        category="Plumbing",
    )
    res = evaluate_validation_tier(inp)
    assert res.risk_tier == ValidationRiskTier.REQUIRES_HUMAN_APPROVAL
    assert res.hard_failures_count == 1
    assert res.is_verified_provider is False
    assert "No candidate provider could be matched" in res.reasons[0]


# ─── Exact Threshold Boundary Tests ──────────────────────────────────────────


@pytest.mark.parametrize(
    "price, expected_tier",
    [
        (4375.0, ValidationRiskTier.APPROVED_FOR_AUTO_DISPATCH),  # Exact 25% deviation from 3500
        (4376.0, ValidationRiskTier.APPROVED_WITH_AUDIT),          # Just above 25% deviation
        (4900.0, ValidationRiskTier.APPROVED_WITH_AUDIT),          # Exact 40% deviation from 3500
        (5600.0, ValidationRiskTier.REQUIRES_HUMAN_APPROVAL),      # 60% deviation from 3500
        (5601.0, ValidationRiskTier.REQUIRES_HUMAN_APPROVAL),      # > 60% deviation
    ],
)
def test_price_variance_threshold_boundaries(price, expected_tier):
    inp = ValidationInput(
        provider=ProviderCandidateProfile(
            id="p-1",
            userId="u-1",
            fullName="Sunil Perera",
            isVerified=True,
            verificationStatus="Verified",
            rating=4.9,
            totalReviews=20,
        ),
        estimated_price=price,
        category="Plumbing",
    )
    res = evaluate_validation_tier(inp)
    assert res.risk_tier == expected_tier


@pytest.mark.parametrize(
    "rating, reviews, expected_tier",
    [
        (4.0, 10, ValidationRiskTier.APPROVED_FOR_AUTO_DISPATCH),  # Exact 4.0 threshold for established
        (3.9, 10, ValidationRiskTier.REQUIRES_HUMAN_APPROVAL),      # 3.9 fails for established
        (3.8, 1, ValidationRiskTier.APPROVED_WITH_AUDIT),           # New provider >= 3.5 passes with audit
        (3.4, 1, ValidationRiskTier.REQUIRES_HUMAN_APPROVAL),       # Rating < 3.5 fails even for new provider
    ],
)
def test_rating_threshold_boundaries(rating, reviews, expected_tier):
    inp = ValidationInput(
        provider=ProviderCandidateProfile(
            id="p-1",
            userId="u-1",
            fullName="Test Tech",
            isVerified=True,
            verificationStatus="Verified",
            rating=rating,
            totalReviews=reviews,
        ),
        estimated_price=3500.0,
        category="Plumbing",
    )
    res = evaluate_validation_tier(inp)
    assert res.risk_tier == expected_tier


def test_review_count_maturity_boundary():
    # 2 reviews is treated as new provider (Soft Signal)
    res_new = evaluate_validation_tier(
        ValidationInput(
            provider=ProviderCandidateProfile(
                id="p-1", userId="u-1", fullName="Tech", isVerified=True, verificationStatus="Verified",
                rating=4.5, totalReviews=2
            ),
            estimated_price=3500.0,
            category="Plumbing"
        )
    )
    assert res_new.risk_tier == ValidationRiskTier.APPROVED_WITH_AUDIT

    # 3 reviews is treated as established provider (Clean Auto-Dispatch)
    res_est = evaluate_validation_tier(
        ValidationInput(
            provider=ProviderCandidateProfile(
                id="p-1", userId="u-1", fullName="Tech", isVerified=True, verificationStatus="Verified",
                rating=4.5, totalReviews=3
            ),
            estimated_price=3500.0,
            category="Plumbing"
        )
    )
    assert res_est.risk_tier == ValidationRiskTier.APPROVED_FOR_AUTO_DISPATCH

