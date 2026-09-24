import pytest
from src.schemas.contracts import (
    PriceBreakdown,
    PriceEstimationInput,
    PriceEstimationOutput,
)
from src.tools.action_tools import (
    CATEGORY_BENCHMARKS,
    URGENCY_MULTIPLIERS,
    estimate_price,
    estimate_price_detailed,
)


def test_category_benchmarks_presence():
    for trade in ["Plumbing", "Electrical", "AC Repair", "Carpentry", "Painting", "Masonry", "Cleaning"]:
        assert trade in CATEGORY_BENCHMARKS
        assert CATEGORY_BENCHMARKS[trade] > 0


def test_estimate_price_baseline_plumbing():
    input_data = PriceEstimationInput(
        category="Plumbing",
        scope={"complexity": "Low", "price_multiplier": 1.0},
        urgency="normal",
    )
    result = estimate_price_detailed(input_data)

    assert isinstance(result, PriceEstimationOutput)
    assert result.estimated_price == 3500.0
    assert result.currency == "LKR"
    assert result.is_budget_constrained is False
    assert result.breakdown.total_approved_amount == 3500.0
    assert result.breakdown.service_labor == 2975.0
    assert result.breakdown.platform_fee == 525.0
    assert result.breakdown.service_labor + result.breakdown.platform_fee == 3500.0


def test_estimate_price_emergency_urgency():
    input_data = PriceEstimationInput(
        category="Electrical",
        scope={"complexity": "Medium", "price_multiplier": 1.2},
        urgency="emergency",
    )
    result = estimate_price_detailed(input_data)

    assert result.urgency_multiplier == 1.40
    assert result.estimated_price == 6720.0
    assert result.breakdown.urgency_surcharge > 0
    assert result.breakdown.service_labor + result.breakdown.platform_fee == 6720.0


def test_estimate_price_budget_harmonization_within_range():
    input_data = PriceEstimationInput(
        category="AC Repair",
        scope={"complexity": "Normal", "price_multiplier": 1.0},
        urgency="normal",
        budget_min=4000.0,
        budget_max=6000.0,
    )
    result = estimate_price_detailed(input_data)

    assert 4000.0 <= result.estimated_price <= 6000.0
    assert result.breakdown.total_approved_amount == result.estimated_price


def test_estimate_price_caps_near_budget_max():
    # If quote is within 25% above customer budget_max (3500 * 1.2 = 4200 <= 4000 * 1.25), cap it at budget_max
    input_data = PriceEstimationInput(
        category="Plumbing",
        scope={"complexity": "Medium", "price_multiplier": 1.2},
        urgency="normal",
        budget_max=4000.0,
    )
    result = estimate_price_detailed(input_data)

    assert result.estimated_price == 4000.0
    assert result.is_budget_constrained is True


def test_estimate_price_convenience_wrapper():
    price = estimate_price(
        category="Carpentry",
        scope={"complexity": "Low", "price_multiplier": 1.0},
        urgency="normal",
    )
    assert isinstance(price, float)
    assert price == 3800.0


def test_pydantic_schema_validation_contract():
    payload = {
        "category": "Painting",
        "scope": {"complexity": "High", "price_multiplier": 1.5},
        "urgency": "high",
        "budget_min": 4500.0,
        "budget_max": 7000.0,
    }
    validated_input = PriceEstimationInput.model_validate(payload)
    result = estimate_price_detailed(validated_input)

    dumped = result.model_dump()
    assert "estimated_price" in dumped
    assert "breakdown" in dumped
    assert "service_labor" in dumped["breakdown"]
    assert "platform_fee" in dumped["breakdown"]
    assert dumped["currency"] == "LKR"
