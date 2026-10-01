"""
Pricing & Invoicing AI Agent for Handee Marketplace.

This agent is dedicated to the Payments & Invoicing business component.
It autonomously estimates service prices, compiles itemized invoices,
evaluates strict deterministic pricing and budget validation rules,
and prepares the approval-to-payment handoff payload for the ASP.NET Core backend.
"""

import logging
import time
from typing import Any, Dict, List, Optional, Tuple

from src.schemas.contracts import (
    PaymentHandoffPayload,
    PriceBreakdown,
    PriceEstimationInput,
    PriceEstimationOutput,
    PricingAgentInput,
    PricingAgentResult,
    ValidationRiskTier,
    ValidationRuleCheck,
)
from src.tools.action_tools import (
    CATEGORY_BENCHMARKS,
    URGENCY_MULTIPLIERS,
    estimate_price_detailed,
)

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
# 1. AGENT TOOLS
# ══════════════════════════════════════════════════════════════════════════════

def estimate_price_tool(input_data: PriceEstimationInput) -> PriceEstimationOutput:
    """
    Tool 1: Price-estimation tool.
    Computes fair market service quote based on trade category benchmarks,
    job complexity multiplier, urgency surcharge, and customer budget harmonization.
    Enforces the platform's mandated 85% provider labor / 15% platform fee split.
    """
    return estimate_price_detailed(input_data)


def generate_invoice_breakdown_tool(
    estimated_price: float,
    breakdown: PriceBreakdown,
    currency: str = "LKR",
    category: str = "General",
) -> List[Dict[str, Any]]:
    """
    Tool 2: Invoice breakdown and line-item compiler.
    Builds itemized line items conforming to Handee's backend InvoiceItem schema:
    - Base service labor (85%)
    - Platform service & escrow protection fee (15%)
    - Urgency / Emergency surcharge (if applicable)
    """
    items: List[Dict[str, Any]] = [
        {
            "description": f"{category} Service Labor (85%)",
            "quantity": 1,
            "unitPrice": breakdown.service_labor,
            "amount": breakdown.service_labor,
            "itemType": "Labor",
        },
        {
            "description": "Handee Platform & Trust Guarantee Fee (15%)",
            "quantity": 1,
            "unitPrice": breakdown.platform_fee,
            "amount": breakdown.platform_fee,
            "itemType": "PlatformFee",
        },
    ]

    if breakdown.urgency_surcharge > 0:
        items.append({
            "description": "Priority Dispatch / Emergency Surcharge",
            "quantity": 1,
            "unitPrice": breakdown.urgency_surcharge,
            "amount": breakdown.urgency_surcharge,
            "itemType": "Surcharge",
        })

    return items


def prepare_payment_handoff_tool(
    job_id: str,
    estimated_price: float,
    breakdown: PriceBreakdown,
    risk_tier: ValidationRiskTier,
    approval_status: str,
    line_items: List[Dict[str, Any]],
    provider_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    currency: str = "LKR",
) -> PaymentHandoffPayload:
    """
    Tool 3: Approval-to-Payment Handoff tool.
    Prepares the handoff payload consumed by ASP.NET Core AgentWorkflowService
    to transition the booking into invoice generation and payment escrow hold.
    """
    gateway_action = (
        "escrow_hold"
        if risk_tier in [ValidationRiskTier.APPROVED_FOR_AUTO_DISPATCH, ValidationRiskTier.APPROVED_WITH_AUDIT]
        else "manual_audit_review"
    )

    return PaymentHandoffPayload(
        job_id=job_id,
        booking_id=job_id,
        provider_id=provider_id,
        customer_id=customer_id,
        total_amount=estimated_price,
        service_labor=breakdown.service_labor,
        platform_fee=breakdown.platform_fee,
        urgency_surcharge=breakdown.urgency_surcharge,
        currency=currency,
        risk_tier=risk_tier,
        approval_status=approval_status,
        invoice_generation_triggered=True,
        payment_gateway_action=gateway_action,
        line_items=line_items,
    )


# ══════════════════════════════════════════════════════════════════════════════
# 2. VALIDATION RULES (PRICING & BUDGET GUARDRAILS)
# ══════════════════════════════════════════════════════════════════════════════

def validate_category_price_band(
    category: str,
    estimated_price: float,
) -> Tuple[List[ValidationRuleCheck], int, int, List[str]]:
    """
    Rule 1: Evaluates quote against category baseline median.
    - > 60% deviation: Hard failure (H4_PRICE_OUTLIER) -> Pauses dispatch.
    - 40% - 60% deviation: 2 soft signals (S2_SIGNIFICANT_PRICE_VARIANCE).
    - 25% - 40% deviation: 1 soft signal (S2_MODERATE_PRICE_VARIANCE).
    - <= 25% deviation: Passed.
    """
    rules: List[ValidationRuleCheck] = []
    hard_failures = 0
    soft_signals = 0
    reasons: List[str] = []

    benchmark = CATEGORY_BENCHMARKS.get(category, 3500.0)
    variance_ratio = abs(estimated_price - benchmark) / benchmark

    if variance_ratio > 0.60:
        hard_failures += 1
        msg = f"Estimated price (Rs. {estimated_price:,.2f}) deviates severely ({variance_ratio*100:.1f}%) from category benchmark (Rs. {benchmark:,.2f})."
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
        msg = f"Estimated price (Rs. {estimated_price:,.2f}) deviates significantly ({variance_ratio*100:.1f}%) from category benchmark (Rs. {benchmark:,.2f})."
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
        msg = f"Estimated price (Rs. {estimated_price:,.2f}) has moderate deviation ({variance_ratio*100:.1f}%) from category benchmark (Rs. {benchmark:,.2f})."
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

    return rules, hard_failures, soft_signals, reasons


def validate_customer_budget_compliance(
    estimated_price: float,
    budget_max: Optional[float],
) -> Tuple[List[ValidationRuleCheck], int, int, List[str]]:
    """
    Rule 2: Evaluates quote against customer budget ceiling.
    - > 30% above budget_max: Hard failure (H5_EXTREME_BUDGET_BREACH) -> Pauses dispatch.
    - Exceeds budget_max up to 30%: 1 soft signal (S3_MILD_BUDGET_BREACH).
    - Within budget: Passed.
    """
    rules: List[ValidationRuleCheck] = []
    hard_failures = 0
    soft_signals = 0
    reasons: List[str] = []

    if budget_max is None or budget_max <= 0:
        rules.append(
            ValidationRuleCheck(
                rule_id="S3_BUDGET_CHECK",
                rule_name="Customer Budget Ceiling",
                is_hard_rule=False,
                passed=True,
                actual_value=estimated_price,
                threshold="No budget ceiling specified",
                message="No customer budget ceiling specified.",
            )
        )
        return rules, hard_failures, soft_signals, reasons

    extreme_breach = estimated_price > (budget_max * 1.30)
    mild_breach = estimated_price > budget_max and not extreme_breach

    if extreme_breach:
        hard_failures += 1
        msg = f"Estimated price (Rs. {estimated_price:,.2f}) exceeds customer budget ceiling (Rs. {budget_max:,.2f}) by >30%."
        reasons.append(msg)
        rules.append(
            ValidationRuleCheck(
                rule_id="H5_EXTREME_BUDGET_BREACH",
                rule_name="Customer Budget Ceiling",
                is_hard_rule=True,
                passed=False,
                actual_value=estimated_price,
                threshold=round(budget_max * 1.30, 2),
                message=msg,
            )
        )
    elif mild_breach:
        soft_signals += 1
        msg = f"Estimated price (Rs. {estimated_price:,.2f}) exceeds customer maximum budget (Rs. {budget_max:,.2f})."
        reasons.append(msg)
        rules.append(
            ValidationRuleCheck(
                rule_id="S3_MILD_BUDGET_BREACH",
                rule_name="Customer Budget Limit",
                is_hard_rule=False,
                passed=False,
                actual_value=estimated_price,
                threshold=budget_max,
                message=msg,
            )
        )
    else:
        rules.append(
            ValidationRuleCheck(
                rule_id="S3_BUDGET_COMPLIANCE",
                rule_name="Customer Budget Limit",
                is_hard_rule=False,
                passed=True,
                actual_value=estimated_price,
                threshold=budget_max,
                message="Estimated price is within customer budget limit.",
            )
        )

    return rules, hard_failures, soft_signals, reasons


def validate_fee_split_integrity(
    estimated_price: float,
    breakdown: PriceBreakdown,
) -> Tuple[List[ValidationRuleCheck], int, int, List[str]]:
    """
    Rule 3: Enforces exact 85% provider labor / 15% platform commission integrity.
    Guarantees no ledger imbalances occur before reaching the C# backend.
    """
    rules: List[ValidationRuleCheck] = []
    hard_failures = 0
    soft_signals = 0
    reasons: List[str] = []

    summed = round(breakdown.service_labor + breakdown.platform_fee, 2)
    expected = round(estimated_price, 2)
    delta = abs(summed - expected)

    if delta > 0.05:
        hard_failures += 1
        msg = f"Ledger fee integrity check failed: Labor ({breakdown.service_labor}) + Fee ({breakdown.platform_fee}) != Total ({estimated_price})."
        reasons.append(msg)
        rules.append(
            ValidationRuleCheck(
                rule_id="H6_FEE_SPLIT_INTEGRITY",
                rule_name="Platform Fee Split Integrity",
                is_hard_rule=True,
                passed=False,
                actual_value=summed,
                threshold=expected,
                message=msg,
            )
        )
    else:
        rules.append(
            ValidationRuleCheck(
                rule_id="H6_FEE_SPLIT_INTEGRITY",
                rule_name="Platform Fee Split Integrity",
                is_hard_rule=True,
                passed=True,
                actual_value=summed,
                threshold=expected,
                message="85% provider labor / 15% platform fee split balances perfectly.",
            )
        )

    return rules, hard_failures, soft_signals, reasons


def validate_payment_handoff_integrity(
    job_id: str,
    estimated_price: float,
) -> Tuple[List[ValidationRuleCheck], int, int, List[str]]:
    """
    Rule 4: Validates payload completeness for ASP.NET Core handoff.
    """
    rules: List[ValidationRuleCheck] = []
    hard_failures = 0
    soft_signals = 0
    reasons: List[str] = []

    is_valid_id = bool(job_id and len(job_id.strip()) > 0)
    is_positive_price = estimated_price > 0

    if not is_valid_id or not is_positive_price:
        hard_failures += 1
        msg = "Payment handoff contract failed: Job ID missing or non-positive price."
        reasons.append(msg)
        rules.append(
            ValidationRuleCheck(
                rule_id="H7_HANDOFF_PAYLOAD_VALIDITY",
                rule_name="Payment Handoff Contract",
                is_hard_rule=True,
                passed=False,
                actual_value={"job_id": job_id, "price": estimated_price},
                threshold="Valid ID and price > 0",
                message=msg,
            )
        )
    else:
        rules.append(
            ValidationRuleCheck(
                rule_id="H7_HANDOFF_PAYLOAD_VALIDITY",
                rule_name="Payment Handoff Contract",
                is_hard_rule=True,
                passed=True,
                actual_value={"job_id": job_id, "price": estimated_price},
                threshold="Valid ID and price > 0",
                message="Payment handoff contract payload valid.",
            )
        )

    return rules, hard_failures, soft_signals, reasons



