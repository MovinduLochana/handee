import pytest
from src.schemas.contracts import (
    PriceBreakdown,
    PriceEstimationInput,
    PricingAgentInput,
    PricingAgentResult,
    ValidationRiskTier,
)
from src.tools.pricing_agent import (
    PricingAndInvoicingAgent,
    estimate_price_tool,
    generate_invoice_breakdown_tool,
    prepare_payment_handoff_tool,
    pricing_agent,
    validate_category_price_band,
    validate_customer_budget_compliance,
    validate_fee_split_integrity,
    validate_payment_handoff_integrity,
)


def test_pricing_agent_initialization():
    agent = PricingAndInvoicingAgent()
    assert agent.agent_name == "PricingAndInvoicingAgent"
    assert "estimate_price_tool" in agent.allowed_tools
    assert "generate_invoice_breakdown_tool" in agent.allowed_tools
    assert "prepare_payment_handoff_tool" in agent.allowed_tools
    assert len(agent.validation_rules) == 4


def test_pricing_agent_happy_path_auto_dispatch():
    agent_input = PricingAgentInput(
        job_id="job-plumb-001",
        category="Plumbing",
        scope={"complexity": "Low", "price_multiplier": 1.0},
        urgency="normal",
        budget_min=3000.0,
        budget_max=4000.0,
        provider_id="prov-101",
        customer_id="cust-202",
    )

    result = pricing_agent.run(agent_input)

    assert isinstance(result, PricingAgentResult)
    assert result.job_id == "job-plumb-001"
    assert result.category == "Plumbing"
    assert result.estimated_price == 3500.0
    assert result.risk_tier == ValidationRiskTier.APPROVED_FOR_AUTO_DISPATCH
    assert result.approval_status == "approved"

    # Verify 85% / 15% fee breakdown
    assert result.breakdown.service_labor == 2975.0
    assert result.breakdown.platform_fee == 525.0
    assert result.breakdown.service_labor + result.breakdown.platform_fee == 3500.0

    # Verify all 4 validation rules evaluated and passed
    assert len(result.validation_rules) == 4
    for rule in result.validation_rules:
        assert rule.passed is True

    # Verify Payment Handoff payload
    handoff = result.payment_handoff
    assert handoff.job_id == "job-plumb-001"
    assert handoff.total_amount == 3500.0
    assert handoff.service_labor == 2975.0
    assert handoff.platform_fee == 525.0
    assert handoff.currency == "LKR"
    assert handoff.payment_gateway_action == "escrow_hold"
    assert handoff.invoice_generation_triggered is True
    assert len(handoff.line_items) >= 2

    # Verify step-by-step reasoning trace
    assert len(result.step_logs) == 5
    actions = [s["action"] for s in result.step_logs]
    assert "plan_and_analyze" in actions
    assert "execute_tool_estimate_price" in actions
    assert "execute_tool_generate_invoice_breakdown" in actions
    assert "evaluate_pricing_validation_rules" in actions
    assert "synthesize_risk_and_prepare_handoff" in actions


def test_pricing_agent_price_outlier_rule_pauses_dispatch():
    # Electrical benchmark is 4000; complexity 2.0 + emergency 1.4 -> ~11,200 (> 60% above benchmark)
    agent_input = PricingAgentInput(
        job_id="job-elec-outlier",
        category="Electrical",
        scope={"complexity": "Extreme", "price_multiplier": 2.2},
        urgency="emergency",
        provider_id="prov-102",
    )

    result = pricing_agent.run(agent_input)

    assert result.risk_tier == ValidationRiskTier.REQUIRES_HUMAN_APPROVAL
    assert result.approval_status == "pending_approval"
    assert result.payment_handoff.payment_gateway_action == "manual_audit_review"

    # Check that H4_PRICE_OUTLIER failed
    outlier_rule = next(r for r in result.validation_rules if r.rule_id == "H4_PRICE_OUTLIER")
    assert outlier_rule.passed is False
    assert outlier_rule.is_hard_rule is True


def test_pricing_agent_extreme_budget_breach_pauses_dispatch():
    # Benchmark for AC Repair is 5000; customer max budget is only 2000 (breach > 30%)
    agent_input = PricingAgentInput(
        job_id="job-ac-breach",
        category="AC Repair",
        scope={"complexity": "Normal", "price_multiplier": 1.0},
        urgency="normal",
        budget_max=2000.0,
    )

    result = pricing_agent.run(agent_input)

    assert result.risk_tier == ValidationRiskTier.REQUIRES_HUMAN_APPROVAL
    assert result.approval_status == "pending_approval"

    # Check that H5_EXTREME_BUDGET_BREACH failed
    budget_rule = next(r for r in result.validation_rules if r.rule_id == "H5_EXTREME_BUDGET_BREACH")
    assert budget_rule.passed is False
    assert budget_rule.is_hard_rule is True


def test_pricing_agent_tools_standalone():
    # 1. Price estimation tool
    p_in = PriceEstimationInput(
        category="Carpentry",
        scope={"price_multiplier": 1.0},
        urgency="normal",
    )
    p_out = estimate_price_tool(p_in)
    assert p_out.estimated_price == 3800.0

    # 2. Invoice breakdown tool
    line_items = generate_invoice_breakdown_tool(
        estimated_price=p_out.estimated_price,
        breakdown=p_out.breakdown,
        currency="LKR",
        category="Carpentry",
    )
    assert len(line_items) == 2
    assert line_items[0]["amount"] == p_out.breakdown.service_labor
    assert line_items[1]["amount"] == p_out.breakdown.platform_fee

    # 3. Payment handoff tool
    handoff = prepare_payment_handoff_tool(
        job_id="job-carp-1",
        estimated_price=p_out.estimated_price,
        breakdown=p_out.breakdown,
        risk_tier=ValidationRiskTier.APPROVED_FOR_AUTO_DISPATCH,
        approval_status="approved",
        line_items=line_items,
        provider_id="p-1",
    )
    assert handoff.total_amount == 3800.0
    assert handoff.payment_gateway_action == "escrow_hold"


def test_pricing_validation_rules_standalone():
    # Fee split rule passes
    breakdown_valid = PriceBreakdown(
        service_labor=850.0,
        platform_fee=150.0,
        urgency_surcharge=0.0,
        subtotal=1000.0,
        total_approved_amount=1000.0,
    )
    rules, h, s, _ = validate_fee_split_integrity(1000.0, breakdown_valid)
    assert h == 0
    assert rules[0].passed is True

    # Fee split rule fails when imbalanced
    breakdown_invalid = PriceBreakdown(
        service_labor=800.0,
        platform_fee=150.0,
        urgency_surcharge=0.0,
        subtotal=950.0,
        total_approved_amount=1000.0,
    )
    rules, h, s, _ = validate_fee_split_integrity(1000.0, breakdown_invalid)
    assert h == 1
    assert rules[0].passed is False

    # Handoff integrity rule
    rules, h, s, _ = validate_payment_handoff_integrity("job-xyz", 5000.0)
    assert h == 0
    assert rules[0].passed is True

    rules, h, s, _ = validate_payment_handoff_integrity("", 0.0)
    assert h == 1
    assert rules[0].passed is False
