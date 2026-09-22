from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict

# LangGraph states
class AgentWorkflowState(TypedDict, total=False):
    workflow_id: str
    job_id: str
    objective: str
    plan: List[str]
    step_logs: List[Dict[str, Any]]
    category: Optional[str]
    estimated_scope: Optional[Dict[str, Any]]
    candidate_providers: List[Dict[str, Any]]
    selected_provider_id: Optional[str]
    estimated_price: Optional[float]
    validation_tier: Optional[str]  # approved_for_auto_dispatch | approved_with_audit | requires_human_approval
    approval_status: Optional[str]  # pending | approved | rejected | revised
    final_result: Optional[Dict[str, Any]]
    error: Optional[str]
