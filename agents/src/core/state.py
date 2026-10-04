from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict

# LangGraph states. LangGraph only keeps keys declared here: anything else in
# the initial state or a node's return value is silently dropped.
class AgentWorkflowState(TypedDict, total=False):
    workflow_id: str
    job_id: str
    objective: str
    plan: List[str]
    step_logs: List[Dict[str, Any]]
    # From the JobDispatchRequest
    location: Optional[str]
    urgency: Optional[str]  # JobUrgency value: Low | Medium | High | Emergency
    urgency_multipliers: Optional[Dict[str, float]]
    budget_min: Optional[float]
    budget_max: Optional[float]
    # Domain Analysis output
    category: Optional[str]
    classification: Optional[Dict[str, Any]]  # ClassifyJobCategoryOutput
    category_is_ambiguous: Optional[bool]
    estimated_scope: Optional[Dict[str, Any]]  # EstimateScopeOutput
    candidate_providers: List[Dict[str, Any]]
    selected_provider_id: Optional[str]
    estimated_price: Optional[float]
    validation_tier: Optional[str]  # approved_for_auto_dispatch | approved_with_audit | requires_human_approval
    approval_status: Optional[str]  # pending | approved | rejected | revised
    final_result: Optional[Dict[str, Any]]
    error: Optional[str]
