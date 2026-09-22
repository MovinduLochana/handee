import pytest
from src.schemas.contracts import JobDispatchRequest, AssistantQueryRequest
from src.tools.domain_tools import classify_job_category, estimate_scope
from src.tools.action_tools import estimate_price
from src.tools.validation_rules import evaluate_validation_tier
from src.workflows.dispatch_workflow import run_dispatch_workflow
from src.workflows.assistant_workflow import process_assistant_query


def test_classify_category_plumbing():
    result = classify_job_category("There is a major water pipe leak in the kitchen sink")
    assert result["category"] == "Plumbing"
    assert "leak" in result["matched_keywords"] or "pipe" in result["matched_keywords"]


def test_classify_category_electrical():
    result = classify_job_category("Switchboard tripping and short circuit in living room")
    assert result["category"] == "Electrical"


def test_estimate_scope_high_complexity():
    scope = estimate_scope("Electrical", "Entire house rewiring after power outage", urgency="emergency")
    assert scope["complexity"] == "High"
    assert scope["price_multiplier"] > 1.5
    assert scope["is_emergency"] is True


def test_validation_tiers():
    # Low risk provider: verified, high rating, within price band
    verified_provider = {
        "id": "prov-1",
        "userId": "user-1",
        "fullName": "Sunil Perera",
        "isVerified": True,
        "verificationStatus": "Verified",
        "rating": 4.9,
        "totalReviews": 20
    }
    low_risk = evaluate_validation_tier(verified_provider, 3500.0, "Plumbing")
    assert low_risk.risk_tier == "approved_for_auto_dispatch"
    assert low_risk.is_verified_provider is True

    # Medium risk: newer provider (soft signal)
    new_provider = {
        "id": "prov-2",
        "userId": "user-2",
        "fullName": "New Tech",
        "isVerified": True,
        "verificationStatus": "Verified",
        "rating": 4.0,
        "totalReviews": 1
    }
    medium_risk = evaluate_validation_tier(new_provider, 3500.0, "Plumbing")
    assert medium_risk.risk_tier == "approved_with_audit"

    # High risk: unverified provider
    unverified = {
        "id": "prov-3",
        "userId": "user-3",
        "fullName": "Unknown",
        "isVerified": False,
        "verificationStatus": "Pending",
        "rating": 3.0,
        "totalReviews": 5
    }
    high_risk = evaluate_validation_tier(unverified, 3500.0, "Plumbing")
    assert high_risk.risk_tier == "requires_human_approval"


@pytest.mark.asyncio
async def test_full_dispatch_workflow():
    req = JobDispatchRequest(
        job_id="test-job-001",
        category="Plumbing",
        description="Leaking water tap in bathroom needs washer replacement",
        location="Colombo",
        urgency="normal",
        budget_range="3000-5000"
    )
    state = await run_dispatch_workflow(req)
    
    assert state["workflow_id"].startswith("wf-")
    assert state["job_id"] == "test-job-001"
    assert len(state["plan"]) == 4
    assert len(state["step_logs"]) == 4
    assert state["category"] == "Plumbing"
    assert state["estimated_price"] is not None
    assert state["validation_tier"] in [
        "approved_for_auto_dispatch", "approved_with_audit", "requires_human_approval"
    ]
    assert state["selected_provider_id"] is not None


@pytest.mark.asyncio
async def test_assistant_query():
    req = AssistantQueryRequest(
        customer_id="cust-123",
        query="Looking for an AC repair expert to clean my air conditioner"
    )
    res = await process_assistant_query(req)
    assert res.category == "AC Repair"
    assert len(res.suggested_providers) > 0
    assert len(res.suggestions) > 0
    assert "AC" in res.reply
