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
