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

