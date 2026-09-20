from typing import List, Optional
from pydantic import BaseModel, Field

# Reciever format
class JobDispatchRequest(BaseModel):
    job_id: str = Field(..., description="Unique ID of the job request")
    category: Optional[str] = Field(None, description="Category if pre-selected")
    description: str = Field(..., description="Customer free-text job description")
    location: str = Field(..., description="Customer job location / coordinates")
    urgency: str = Field(default="normal", description="Urgency level")
    budget_range: Optional[str] = Field(None, description="Customer budget range")

# Customer data query
class AssistantQueryRequest(BaseModel):
    customer_id: str = Field(..., description="Authenticated customer ID")
    query: str = Field(..., description="Natural language prompt from customer")

# Outut validation 
class ValidationResult(BaseModel):
    risk_tier: str = Field(
        ...,
        description="One of: approved_for_auto_dispatch, approved_with_audit, requires_human_approval",
    )
    is_verified_provider: bool
    is_price_within_band: bool
    rating_passed: bool
    reasons: List[str] = Field(default_factory=list)
