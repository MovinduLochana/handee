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
