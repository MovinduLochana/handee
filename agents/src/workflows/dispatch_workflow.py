import time
import uuid
from typing import Any, Dict, List, Optional
from langgraph.graph import StateGraph, END

from src.core.state import AgentWorkflowState
from src.schemas.contracts import JobDispatchRequest, PriceEstimationInput
from src.tools.domain_tools import classify_job_category, estimate_scope
from src.tools.action_tools import search_providers, estimate_price, estimate_price_detailed
from src.tools.validation_rules import evaluate_validation_tier


async def coordinator_node(state: AgentWorkflowState) -> Dict[str, Any]:
    """
    Coordinator / Planner Agent:
    Constructs an explicit plan and delegates execution to downstream agents.
    Never executes external tools directly.
    """
    start_time = time.time()
    
    plan = [
        "1. Domain Analysis: Classify trade category and estimate job scope & complexity.",
        "2. Action / Tool: Search verified candidate providers and calculate price quote.",
        "3. Validation / Safety: Evaluate deterministic risk rules (verification, rating, price band).",
        "4. Workflow Finalization: Output tiered risk classification (auto_dispatch / audit / human_approval)."
    ]
    
    duration_ms = int((time.time() - start_time) * 1000)
    
    step_log = {
        "step_number": 1,
        "agent_name": "Coordinator / Planner Agent",
        "action": "build_execution_plan",
        "input_data": {"objective": state.get("objective")},
        "output_data": {"plan": plan},
        "duration_ms": duration_ms,
        "timestamp": time.time()
    }
    
    existing_logs = state.get("step_logs") or []
    return {
        "plan": plan,
        "step_logs": existing_logs + [step_log]
    }


async def domain_analysis_node(state: AgentWorkflowState) -> Dict[str, Any]:
    """
    Domain Analysis Agent:
    Analyzes job description to classify category and estimate complexity.
    Allowed Tools: classify_job_category, estimate_scope.
    """
    start_time = time.time()
    description = state.get("objective", "")
    current_category = state.get("category")
    
    # 1. Classify category
    cat_result = classify_job_category(description, current_category)
    category = cat_result["category"]
    
    # 2. Estimate scope
    scope_result = estimate_scope(category, description)
    
    duration_ms = int((time.time() - start_time) * 1000)
    step_log = {
        "step_number": 2,
        "agent_name": "Domain Analysis Agent",
        "action": "classify_category_and_estimate_scope",
        "input_data": {"description": description, "pre_selected": current_category},
        "output_data": {"classification": cat_result, "scope": scope_result},
        "duration_ms": duration_ms,
        "timestamp": time.time()
    }
    
    existing_logs = state.get("step_logs") or []
    return {
        "category": category,
        "estimated_scope": scope_result,
        "step_logs": existing_logs + [step_log]
    }


async def action_tool_node(state: AgentWorkflowState) -> Dict[str, Any]:
    """
    Action / Tool Agent:
    Queries candidate providers and calculates price quotes based on category and scope.
    Allowed Tools: search_providers, estimate_price.
    """
    start_time = time.time()
    category = state.get("category") or "General Maintenance"
    scope = state.get("estimated_scope") or {}
    
    # Retrieve budget constraints if present in state context
    budget_min = state.get("budget_min")
    budget_max = state.get("budget_max")
    location = state.get("location") or "Colombo"
    urgency = state.get("urgency") or "normal"
    
    candidates = await search_providers(category, location)
    selected_provider = candidates[0] if candidates else None
    selected_provider_id = selected_provider.get("userId") if selected_provider else None
    
    price_input = PriceEstimationInput(
        category=category,
        scope=scope,
        urgency=urgency,
        budget_min=budget_min,
        budget_max=budget_max,
    )
    detailed_price = estimate_price_detailed(price_input)
    price = detailed_price.estimated_price
    
    duration_ms = int((time.time() - start_time) * 1000)
    step_log = {
        "step_number": 3,
        "agent_name": "Action / Tool Agent",
        "action": "search_providers_and_estimate_price",
        "input_data": price_input.model_dump(),
        "output_data": {
            "candidates_found": len(candidates),
            "selected_provider": selected_provider.get("fullName") if selected_provider else None,
            "estimated_price": price,
            "price_breakdown": detailed_price.breakdown.model_dump(),
            "confidence_score": detailed_price.confidence_score,
            "is_budget_constrained": detailed_price.is_budget_constrained,
        },
        "duration_ms": duration_ms,
        "timestamp": time.time()
    }
    
    existing_logs = state.get("step_logs") or []
    return {
        "candidate_providers": candidates,
        "selected_provider_id": selected_provider_id,
        "estimated_price": price,
        "step_logs": existing_logs + [step_log]
    }


async def validation_safety_node(state: AgentWorkflowState) -> Dict[str, Any]:
    """
    Validation / Safety Agent:
    Pure deterministic rule evaluation. Checks verification, rating, and price bands.
    Allowed Tools: None (rule engine only).
    """
    start_time = time.time()
    category = state.get("category") or "General Maintenance"
    candidates = state.get("candidate_providers") or []
    selected_provider = candidates[0] if candidates else None
    price = state.get("estimated_price") or 3500.0
    budget_max = state.get("budget_max")
    scope = state.get("estimated_scope") or {}
    ambiguity_flag = scope.get("ambiguity_flag", False)
    
    # Run deterministic validation rules
    validation = evaluate_validation_tier(
        provider=selected_provider,
        estimated_price=price,
        category=category,
        budget_max=budget_max,
        ambiguity_flag=ambiguity_flag
    )
    
    risk_tier = validation.risk_tier
    if risk_tier == "approved_for_auto_dispatch":
        approval_status = "approved"
    elif risk_tier == "approved_with_audit":
        approval_status = "approved"
    else:
        approval_status = "pending"
        
    duration_ms = int((time.time() - start_time) * 1000)
    step_log = {
        "step_number": 4,
        "agent_name": "Validation / Safety Agent",
        "action": "evaluate_safety_and_risk_rules",
        "input_data": {
            "provider_id": selected_provider.get("userId") if selected_provider else None,
            "estimated_price": price,
            "category": category
        },
        "output_data": {
            "risk_tier": risk_tier,
            "is_verified": validation.is_verified_provider,
            "rating_passed": validation.rating_passed,
            "price_passed": validation.is_price_within_band,
            "reasons": validation.reasons
        },
        "duration_ms": duration_ms,
        "timestamp": time.time()
    }
    
    final_result = {
        "workflow_id": state.get("workflow_id"),
        "job_id": state.get("job_id"),
        "validation_tier": risk_tier,
        "approval_status": approval_status,
        "category": category,
        "estimated_price": price,
        "selected_provider": selected_provider,
        "reasons": validation.reasons,
        "scope": scope
    }
    
    existing_logs = state.get("step_logs") or []
    return {
        "validation_tier": risk_tier,
        "approval_status": approval_status,
        "final_result": final_result,
        "step_logs": existing_logs + [step_log]
    }


def build_dispatch_graph() -> StateGraph:
    """Constructs the compiled LangGraph state graph for job dispatch."""
    graph = StateGraph(AgentWorkflowState)
    
    graph.add_node("coordinator", coordinator_node)
    graph.add_node("domain_analysis", domain_analysis_node)
    graph.add_node("action_tool", action_tool_node)
    graph.add_node("validation_safety", validation_safety_node)
    
    graph.set_entry_point("coordinator")
    graph.add_edge("coordinator", "domain_analysis")
    graph.add_edge("domain_analysis", "action_tool")
    graph.add_edge("action_tool", "validation_safety")
    graph.add_edge("validation_safety", END)
    
    return graph.compile()


# Compiled runnable graph singleton
dispatch_workflow_app = build_dispatch_graph()


async def run_dispatch_workflow(request: JobDispatchRequest) -> AgentWorkflowState:
    """
    Executes the 4-agent dispatch workflow for a customer job request.
    """
    workflow_id = f"wf-{uuid.uuid4().hex[:12]}"
    
    # Parse budget numbers if provided
    b_min = request.budget_min
    b_max = request.budget_max
    if (b_min is None or b_max is None) and request.budget_range:
        parts = request.budget_range.replace("LKR", "").replace("Rs", "").replace(",", "").split("-")
        try:
            if len(parts) == 2:
                b_min = float(parts[0].strip())
                b_max = float(parts[1].strip())
            elif len(parts) == 1 and parts[0].strip():
                b_max = float(parts[0].strip())
        except Exception:
            pass

    initial_state: AgentWorkflowState = {
        "workflow_id": workflow_id,
        "job_id": request.job_id,
        "objective": request.description,
        "category": request.category,
        "location": request.location,
        "urgency": request.urgency,
        "budget_min": b_min,
        "budget_max": b_max,
        "plan": [],
        "step_logs": [],
        "candidate_providers": [],
        "selected_provider_id": None,
        "estimated_price": None,
        "validation_tier": None,
        "approval_status": None,
        "final_result": None,
        "error": None
    }
    
    final_state = await dispatch_workflow_app.ainvoke(initial_state)
    return final_state
