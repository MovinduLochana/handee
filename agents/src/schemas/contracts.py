from enum import StrEnum
from typing import Annotated, Any, Dict, List, Literal, Optional, get_args

from pydantic import BaseModel, BeforeValidator, Field, StringConstraints, model_validator

# ─── Shared domain vocabulary ────────────────────────────────────────────────

# Exactly the names seeded by handee.API/Data/ServiceCategorySeeder.cs, which
# the backend sends as the pre-selected category (ServiceCategory.Name).
ServiceCategoryName = Literal[
    "Plumbing", "Electrical", "AC Repair", "Painting", "General Maintenance", "Cleaning"
]
SERVICE_CATEGORIES: tuple[str, ...] = get_args(ServiceCategoryName)
FALLBACK_CATEGORY: ServiceCategoryName = "General Maintenance"


def canonical_category(name: Optional[str]) -> Optional[ServiceCategoryName]:
    """Case-insensitive lookup against SERVICE_CATEGORIES; None if unknown."""
    if name is None:
        return None
    wanted = name.strip().lower()
    return next((c for c in SERVICE_CATEGORIES if c.lower() == wanted), None)  # type: ignore[return-value]


class JobUrgency(StrEnum):
    """Mirrors handee.API Entities/JobRequest.cs JobUrgency. The backend sends
    Urgency.ToString().ToLower(), so parsing is case-insensitive."""

    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    EMERGENCY = "Emergency"


# JobRequest.Urgency defaults to JobUrgency.Medium on the backend.
DEFAULT_URGENCY = JobUrgency.MEDIUM


def _parse_urgency(value: Any) -> Any:
    # None means "not specified" and takes the backend's default. Anything
    # else must name a real member; unknown strings like "normal" still fail.
    if value is None:
        return DEFAULT_URGENCY
    if isinstance(value, str):
        wanted = value.strip().lower()
        for member in JobUrgency:
            if member.value.lower() == wanted:
                return member
    return value


def _parse_category(value: Any) -> Any:
    # Canonicalize casing ("ac repair" -> "AC Repair"); leave anything else for
    # the Literal check to reject with a proper ValidationError.
    if isinstance(value, str):
        return canonical_category(value) or value
    return value


Urgency = Annotated[JobUrgency, BeforeValidator(_parse_urgency)]
NonEmptyText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


# Receiver format
class JobDispatchRequest(BaseModel):
    job_id: str = Field(..., description="Unique ID of the job request")
    category: Optional[str] = Field(None, description="Category if pre-selected")
    # Non-empty here so a blank description is a 422 at the boundary rather
    # than a ValidationError from classify_job_category mid-workflow.
    description: NonEmptyText = Field(..., description="Customer free-text job description")
    location: str = Field(..., description="Customer job location / coordinates")
    urgency: Urgency = Field(default=DEFAULT_URGENCY, description="JobUrgency, any casing")
    budget_range: Optional[str] = Field(None, description="Customer budget range (e.g. 3000-5000)")
    budget_min: Optional[float] = Field(None, description="Minimum budget if specified")
    budget_max: Optional[float] = Field(None, description="Maximum budget if specified")
    urgency_multipliers: Optional[Dict[str, float]] = Field(None, description="Dynamic urgency multipliers from backend config")


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


# ─── Validation / Safety Agent contracts ─────────────────────────────────────


class ValidationRiskTier(StrEnum):
    APPROVED_FOR_AUTO_DISPATCH = "approved_for_auto_dispatch"
    APPROVED_WITH_AUDIT = "approved_with_audit"
    REQUIRES_HUMAN_APPROVAL = "requires_human_approval"


class ProviderCandidateProfile(BaseModel):
    id: str = Field(..., description="Unique provider ID")
    userId: str = Field(..., description="User account ID")
    fullName: str = Field(..., description="Provider display name")
    isVerified: bool = Field(default=False, description="Explicit verification boolean flag")
    verificationStatus: str = Field(default="Pending", description="VerificationStatus enum string")
    rating: float = Field(default=0.0, ge=0.0, le=5.0, description="Rating aggregate (0.0 to 5.0)")
    totalReviews: int = Field(default=0, ge=0, description="Count of completed customer reviews")
    hourlyRate: Optional[float] = Field(None, ge=0.0, description="Hourly rate benchmark in LKR")
    skillCategories: List[str] = Field(default_factory=list, description="Associated trade categories")
    serviceArea: Optional[str] = Field(None, description="Primary service area or city")


class ValidationRuleCheck(BaseModel):
    rule_id: str
    rule_name: str
    is_hard_rule: bool
    passed: bool
    actual_value: Any
    threshold: Any
    message: str


class ValidationInput(BaseModel):
    provider: Optional[ProviderCandidateProfile] = None
    estimated_price: float = Field(..., gt=0, description="Proposed job price quote in LKR")
    category: Annotated[ServiceCategoryName, BeforeValidator(_parse_category)]
    budget_min: Optional[float] = Field(None, ge=0.0)
    budget_max: Optional[float] = Field(None, ge=0.0)
    ambiguity_flag: bool = False
    complexity: Literal["Low", "Medium", "High"] = "Medium"


class ValidationResult(BaseModel):
    risk_tier: ValidationRiskTier
    is_verified_provider: bool
    is_price_within_band: bool
    rating_passed: bool
    scope_clarity_passed: bool = True
    hard_failures_count: int = 0
    soft_signals_count: int = 0
    evaluated_rules: List[ValidationRuleCheck] = Field(default_factory=list)
    reasons: List[str] = Field(default_factory=list)


# ─── Domain Analysis tool contracts ──────────────────────────────────────────
# The tools build their Input model on entry, so None or a wrong type raises
# pydantic.ValidationError instead of failing later with AttributeError.


class ClassifyJobCategoryInput(BaseModel):
    description: NonEmptyText
    # Free text on purpose: a category the backend doesn't know is ignored
    # (no boost) rather than failing the whole dispatch. Blank means none.
    pre_selected_category: Optional[
        Annotated[str, StringConstraints(strip_whitespace=True)]
    ] = None


class ClassifyJobCategoryOutput(BaseModel):
    category: ServiceCategoryName
    confidence: float = Field(ge=0.0, le=1.0)
    matched_keywords: List[str]
    is_ambiguous: bool


class EstimateScopeInput(BaseModel):
    # Validated against the real category list (any casing), though it doesn't
    # change the estimate itself — see estimate_scope.
    category: Annotated[ServiceCategoryName, BeforeValidator(_parse_category)]
    description: NonEmptyText
    urgency: Urgency = DEFAULT_URGENCY
    # ClassifyJobCategoryOutput.is_ambiguous, so an uncertain trade widens the range.
    category_is_ambiguous: bool = False


class EstimateScopeOutput(BaseModel):
    complexity: Literal["Low", "Medium", "High"]
    estimated_duration_hours: float = Field(gt=0)
    # Equal when the job is confidently understood; apart when it's ambiguous.
    price_multiplier_min: float = Field(gt=0)
    price_multiplier_max: float = Field(gt=0)
    urgency_multiplier: float = 1.0
    is_emergency: bool
    ambiguity_flag: bool
    ambiguity_reasons: List[str] = Field(default_factory=list)
    summary: str

    @model_validator(mode="after")
    def _range_is_ordered(self) -> "EstimateScopeOutput":
        if self.price_multiplier_min > self.price_multiplier_max:
            raise ValueError("price_multiplier_min must not exceed price_multiplier_max")
        if self.ambiguity_flag != bool(self.ambiguity_reasons):
            raise ValueError("ambiguity_flag must be set exactly when there are ambiguity_reasons")
        return self
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
    urgency_multipliers: Optional[Dict[str, float]] = None


class PriceEstimationOutput(BaseModel):
    estimated_price: float
    currency: str = "LKR"
    base_benchmark: float
    complexity_multiplier: float = 1.0
    urgency_multiplier: float = 1.0
    breakdown: PriceBreakdown
    is_budget_constrained: bool = False
    confidence_score: float = 0.95


class PaymentHandoffPayload(BaseModel):
    job_id: str
    booking_id: Optional[str] = None
    provider_id: Optional[str] = None
    customer_id: Optional[str] = None
    total_amount: float
    service_labor: float
    platform_fee: float
    urgency_surcharge: float = 0.0
    currency: str = "LKR"
    risk_tier: ValidationRiskTier
    approval_status: str
    invoice_generation_triggered: bool = True
    payment_gateway_action: str = "escrow_hold"
    line_items: List[Dict[str, Any]] = Field(default_factory=list)


class PricingAgentInput(BaseModel):
    job_id: str = Field(..., description="Unique job or booking identifier")
    category: str = Field(..., description="Service trade category")
    scope: Dict[str, Any] = Field(default_factory=dict, description="Job scope & complexity estimation")
    urgency: str = Field(default="normal", description="Urgency level")
    budget_min: Optional[float] = Field(None, description="Customer minimum budget")
    budget_max: Optional[float] = Field(None, description="Customer maximum budget")
    provider_id: Optional[str] = Field(None, description="Assigned or candidate provider ID")
    customer_id: Optional[str] = Field(None, description="Requesting customer ID")
    urgency_multipliers: Optional[Dict[str, float]] = None


class PricingAgentResult(BaseModel):
    agent_name: str = "PricingAndInvoicingAgent"
    job_id: str
    category: str
    estimated_price: float
    currency: str = "LKR"
    breakdown: PriceBreakdown
    risk_tier: ValidationRiskTier
    approval_status: str
    is_budget_constrained: bool = False
    confidence_score: float = 0.95
    validation_rules: List[ValidationRuleCheck] = Field(default_factory=list)
    payment_handoff: PaymentHandoffPayload
    step_logs: List[Dict[str, Any]] = Field(default_factory=list)
    reasoning_summary: str


