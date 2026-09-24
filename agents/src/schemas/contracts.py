from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# Receiver format
class JobDispatchRequest(BaseModel):
    job_id: str = Field(..., description="Unique ID of the job request")
    category: Optional[str] = Field(None, description="Category if pre-selected")
    description: str = Field(..., description="Customer free-text job description")
    location: str = Field(..., description="Customer job location / coordinates")
    urgency: str = Field(default="normal", description="Urgency level")
    budget_range: Optional[str] = Field(None, description="Customer budget range (e.g. 3000-5000)")
    budget_min: Optional[float] = Field(None, description="Minimum budget if specified")
    budget_max: Optional[float] = Field(None, description="Maximum budget if specified")


# Customer data query
class AssistantQueryRequest(BaseModel):
    customer_id: str = Field(..., description="Authenticated customer ID")
    query: str = Field(..., description="Natural language prompt from customer")


class AssistantQueryResponse(BaseModel):
    reply: str
    category: Optional[str] = None
    suggested_providers: List[Dict[str, Any]] = Field(default_factory=list)
    suggested_listings: List[Dict[str, Any]] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)


# Output validation 
class ValidationResult(BaseModel):
    risk_tier: str = Field(
        ...,
        description="One of: approved_for_auto_dispatch, approved_with_audit, requires_human_approval",
    )
    is_verified_provider: bool
    is_price_within_band: bool
    rating_passed: bool
    reasons: List[str] = Field(default_factory=list)


class PriceBreakdown(BaseModel):
    service_labor: float
    platform_fee: float
    urgency_surcharge: float = 0.0
    subtotal: float
    total_approved_amount: float


class PriceEstimationInput(BaseModel):
    category: str
    scope: Dict[str, Any] = Field(default_factory=dict)
    urgency: str = "normal"
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None


class PriceEstimationOutput(BaseModel):
    estimated_price: float
    currency: str = "LKR"
    base_benchmark: float
    complexity_multiplier: float = 1.0
    urgency_multiplier: float = 1.0
    breakdown: PriceBreakdown
    is_budget_constrained: bool = False
    confidence_score: float = 0.95

