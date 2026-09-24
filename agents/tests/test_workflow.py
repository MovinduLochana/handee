import pytest
from pydantic import ValidationError

import src.workflows.dispatch_workflow as dispatch_workflow
from src.schemas.contracts import (
    SERVICE_CATEGORIES,
    AssistantQueryRequest,
    AssistantQueryResponse,
    EstimateScopeOutput,
    JobDispatchRequest,
    JobUrgency,
)
from src.tools.domain_tools import (
    _CATEGORY_KEYWORDS,
    FALLBACK_CONFIDENCE,
    classify_job_category,
    estimate_scope,
)
from src.tools.validation_rules import evaluate_validation_tier
from src.workflows.assistant_workflow import process_assistant_query
from src.workflows.dispatch_workflow import run_dispatch_workflow

# Clear trade (sink, tap, leak), clear size (leak -> Medium), enough detail.
CONFIDENT_JOB = "Kitchen sink tap is leaking and needs a new washer"
# "light" (Electrical) and "sink" (Plumbing) tie; the size itself is clear.
AMBIGUOUS_TRADE_JOB = "The light above the kitchen sink is broken and needs repair"


# ─── classify_job_category ───────────────────────────────────────────────────


def test_classify_category_plumbing():
    result = classify_job_category("There is a major water pipe leak in the kitchen sink")
    assert result.category == "Plumbing"
    assert result.matched_keywords == ["leak", "pipe", "sink"]
    assert result.is_ambiguous is False


def test_classify_category_electrical():
    result = classify_job_category("Switchboard tripping and short circuit in living room")
    assert result.category == "Electrical"
    assert set(result.matched_keywords) == {"switchboard", "short circuit", "trip"}


@pytest.mark.parametrize(
    "description, category, keywords",
    [
        # Audit: both came back General Maintenance at 0.3 ("painting" != "paint").
        ("Painting the walls of two bedrooms", "Painting", ["paint"]),
        ("Deep cleaning of carpets and sofas", "Cleaning", ["clean", "carpet", "sofa"]),
        # Audit: Plumbing, but on "water" alone ("leaking"/"pipes" never matched).
        ("Water leaking from the pipes", "Plumbing", ["leak", "pipe"]),
    ],
)
def test_word_forms_from_the_audit_now_classify_correctly(description, category, keywords):
    result = classify_job_category(description)
    assert result.category == category
    assert result.matched_keywords == keywords
    assert result.is_ambiguous is False


@pytest.mark.parametrize("variant", ["leak", "leaks", "leaked", "leaking", "LEAKING"])
def test_inflections_reach_the_same_keyword(variant):
    assert classify_job_category(f"kitchen tap {variant}").matched_keywords == ["leak", "tap"]


def test_silent_e_forms_match_without_letting_tape_match_tap():
    wiring = classify_job_category("rewiring the house, the old wiring is unsafe")
    assert wiring.matched_keywords == ["wire", "rewire"]

    tape = classify_job_category("sticky tape left on the cabinet")
    assert tape.category == "General Maintenance"
    assert tape.matched_keywords == ["cabinet"]


def test_tie_between_two_categories_is_ambiguous():
    result = classify_job_category("The light above the sink")
    assert result.is_ambiguous is True
    # Documented tie-break without a pre-selection: backend seeder order.
    assert result.category == "Plumbing"
    assert result.confidence == 0.25


@pytest.mark.parametrize("pre_selected", ["Electrical", "electrical", "  ELECTRICAL "])
def test_preselection_boost_is_case_insensitive(pre_selected):
    result = classify_job_category("The light above the sink", pre_selected)
    assert result.category == "Electrical"
    assert result.is_ambiguous is False
    assert result.matched_keywords == ["light"]
    assert result == classify_job_category("The light above the sink", "Electrical")


@pytest.mark.parametrize("pre_selected", [None, "", "Gardening", "Carpentry"])
def test_no_match_without_a_real_preselection_falls_back_to_general_maintenance(pre_selected):
    result = classify_job_category("help needed", pre_selected)
    assert result.model_dump() == {
        "category": "General Maintenance",
        "confidence": FALLBACK_CONFIDENCE,
        "matched_keywords": [],
        "is_ambiguous": True,
    }


@pytest.mark.parametrize(
    "pre_selected, kept",
    [("Plumbing", "Plumbing"), ("plumbing", "Plumbing"), ("  ac REPAIR ", "AC Repair")],
)
def test_no_match_keeps_a_real_preselection_but_flags_it(pre_selected, kept):
    result = classify_job_category("help needed", pre_selected)
    assert result.model_dump() == {
        "category": kept,
        "confidence": FALLBACK_CONFIDENCE,
        "matched_keywords": [],
        "is_ambiguous": True,
    }

    # The flag still does its job downstream: the price range widens.
    scope = estimate_scope(
        result.category, "help needed", category_is_ambiguous=result.is_ambiguous
    )
    assert scope.price_multiplier_max > scope.price_multiplier_min
    assert "trade category is ambiguous" in scope.ambiguity_reasons


def test_fallback_confidence_is_below_any_keyword_backed_result():
    weakest_real_result = classify_job_category("The light above the sink")  # a 1-1 tie
    assert FALLBACK_CONFIDENCE < weakest_real_result.confidence


def test_confidence_reflects_the_lead_over_the_runner_up():
    clear = classify_job_category("Leaking pipe under the sink")
    contested = classify_job_category("Leaking pipe under the sink near the light switch")
    assert clear.category == contested.category == "Plumbing"
    assert len(clear.matched_keywords) == len(contested.matched_keywords) == 3
    assert contested.confidence < clear.confidence


def test_taxonomy_is_exactly_the_backend_categories():
    assert tuple(_CATEGORY_KEYWORDS) == SERVICE_CATEGORIES


def test_no_category_lists_two_forms_of_one_word():
    # Otherwise one word in the text ("wiring") would count as two keywords.
    for category, keywords in _CATEGORY_KEYWORDS.items():
        single_words = [(label, forms[0]) for label, forms in keywords if len(forms) == 1]
        for i, (label_a, forms_a) in enumerate(single_words):
            for label_b, forms_b in single_words[i + 1 :]:
                assert not forms_a & forms_b, f"{category}: {label_a!r} overlaps {label_b!r}"


@pytest.mark.parametrize("bad", [None, 123, "", "   ", ["leak"]])
def test_classify_rejects_bad_description(bad):
    with pytest.raises(ValidationError):
        classify_job_category(bad)


def test_classify_rejects_non_string_preselection():
    with pytest.raises(ValidationError):
        classify_job_category("leaking tap", 5)


# ─── estimate_scope ──────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "override",
    [
        {"description": None},
        {"description": 42},
        {"description": "   "},
        {"category": None},
        {"category": "Carpentry"},
        {"urgency": "normal"},
        {"urgency": 3},
    ],
)
def test_estimate_scope_rejects_bad_input(override):
    args = {"category": "Plumbing", "description": CONFIDENT_JOB, **override}
    with pytest.raises(ValidationError):
        estimate_scope(**args)


def test_prefix_no_longer_counts_as_fix():
    prefix = estimate_scope("General Maintenance", "Need a prefix label on the cabinet door")
    assert prefix.complexity == "Low"
    real_fix = estimate_scope("General Maintenance", "Need someone to fix the cabinet door")
    assert real_fix.complexity == "Medium"


def test_estimate_scope_high_complexity():
    scope = estimate_scope(
        "Electrical", "Entire house rewiring after power outage", urgency="emergency"
    )
    assert scope.complexity == "High"
    assert scope.estimated_duration_hours == 4.0
    assert scope.price_multiplier_min == scope.price_multiplier_max == 2.25  # 1.8 x 1.25
    assert scope.is_emergency is True


def test_high_and_emergency_urgency_are_distinct():
    scopes = {
        u: estimate_scope("Plumbing", CONFIDENT_JOB, urgency=u)
        for u in ["low", "Medium", "HIGH", "emergency"]
    }
    assert scopes["low"].price_multiplier_min == scopes["Medium"].price_multiplier_min == 1.2
    assert scopes["HIGH"].price_multiplier_min == 1.32  # 1.2 x 1.1
    assert scopes["emergency"].price_multiplier_min == 1.5  # 1.2 x 1.25
    assert scopes["HIGH"].is_emergency is False
    assert scopes["emergency"].is_emergency is True


@pytest.mark.parametrize("urgency", [None, "medium", "not passed"])
def test_missing_urgency_takes_the_backend_default(urgency):
    if urgency == "not passed":
        scope = estimate_scope("Plumbing", CONFIDENT_JOB)
    else:
        scope = estimate_scope("Plumbing", CONFIDENT_JOB, urgency=urgency)
    assert scope.price_multiplier_min == 1.2
    assert scope.is_emergency is False


def test_confident_job_gets_a_single_multiplier():
    classification = classify_job_category(CONFIDENT_JOB)
    assert classification.is_ambiguous is False

    scope = estimate_scope(classification.category, CONFIDENT_JOB, category_is_ambiguous=False)
    assert scope.price_multiplier_min == scope.price_multiplier_max == 1.2
    assert scope.ambiguity_flag is False
    assert scope.ambiguity_reasons == []


def test_ambiguous_classification_widens_the_price_range():
    confident = estimate_scope("Plumbing", CONFIDENT_JOB)

    classification = classify_job_category(AMBIGUOUS_TRADE_JOB)
    assert classification.is_ambiguous is True
    ambiguous = estimate_scope(
        classification.category,
        AMBIGUOUS_TRADE_JOB,
        category_is_ambiguous=classification.is_ambiguous,
    )

    confident_gap = confident.price_multiplier_max - confident.price_multiplier_min
    ambiguous_gap = ambiguous.price_multiplier_max - ambiguous.price_multiplier_min
    assert ambiguous_gap > confident_gap
    # Medium tier widened one tier each way: Low 1.0 .. High 1.8.
    assert (ambiguous.price_multiplier_min, ambiguous.price_multiplier_max) == (1.0, 1.8)
    assert ambiguous.ambiguity_reasons == ["trade category is ambiguous"]

    # Same text without the classifier's flag: no widening, so the flag is the cause.
    unflagged = estimate_scope(classification.category, AMBIGUOUS_TRADE_JOB)
    assert unflagged.price_multiplier_min == unflagged.price_multiplier_max


@pytest.mark.parametrize(
    "description, reason",
    [
        ("sink broken", "description too short to judge the job's size"),
        ("Deep cleaning of carpets and sofas", "no complexity signal in the description"),
        ("Minor burst in the garden hose pipe", "conflicting size signals ('burst' vs 'minor')"),
    ],
)
def test_inconclusive_scope_widens_even_with_a_clear_category(description, reason):
    scope = estimate_scope("Plumbing", description)
    assert scope.ambiguity_reasons == [reason]
    assert scope.price_multiplier_max > scope.price_multiplier_min


def test_both_ambiguity_sources_widen_further_than_one():
    one = estimate_scope("General Maintenance", "help needed")
    both = estimate_scope("General Maintenance", "help needed", category_is_ambiguous=True)
    assert (one.price_multiplier_min, one.price_multiplier_max) == (1.0, 1.2)
    assert (both.price_multiplier_min, both.price_multiplier_max) == (1.0, 1.8)


def test_high_estimate_can_only_widen_downward():
    scope = estimate_scope(
        "Plumbing", "Burst pipe flooding the whole house", category_is_ambiguous=True
    )
    assert scope.complexity == "High"
    assert (scope.price_multiplier_min, scope.price_multiplier_max) == (1.2, 1.8)


def test_scope_output_rejects_an_inverted_range():
    with pytest.raises(ValidationError):
        EstimateScopeOutput(
            complexity="Low",
            estimated_duration_hours=1.0,
            price_multiplier_min=1.5,
            price_multiplier_max=1.0,
            is_emergency=False,
            ambiguity_flag=False,
            summary="x",
        )


# ─── JobDispatchRequest ──────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "urgency, expected",
    [("emergency", JobUrgency.EMERGENCY), ("High", JobUrgency.HIGH), (None, JobUrgency.MEDIUM)],
)
def test_dispatch_request_parses_backend_urgency(urgency, expected):
    extra = {} if urgency is None else {"urgency": urgency}
    request = JobDispatchRequest(job_id="j", description="leaking tap", location="Colombo", **extra)
    assert request.urgency is expected


def test_dispatch_request_rejects_unknown_urgency_and_blank_description():
    with pytest.raises(ValidationError):
        JobDispatchRequest(
            job_id="j", description="leaking tap", location="Colombo", urgency="normal"
        )
    with pytest.raises(ValidationError):
        JobDispatchRequest(job_id="j", description="   ", location="Colombo")


# ─── Dispatch workflow state ─────────────────────────────────────────────────


@pytest.fixture
def search_calls(monkeypatch):
    """Stubs search_providers so workflow tests run offline and show its inputs."""
    calls = []

    async def fake_search_providers(category, location):
        calls.append((category, location))
        return [{
            "userId": "user-1",
            "fullName": "Sunil Perera",
            "isVerified": True,
            "verificationStatus": "Verified",
            "rating": 4.9,
            "totalReviews": 34,
        }]

    monkeypatch.setattr(dispatch_workflow, "search_providers", fake_search_providers)
    return calls


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "urgency, stored, is_emergency, multiplier",
    [
        ("emergency", "Emergency", True, 2.25),  # 1.8 x 1.25
        ("high", "High", False, 1.98),  # 1.8 x 1.1
        ("low", "Low", False, 1.8),
    ],
)
async def test_urgency_flows_from_request_through_state_to_scope(
    search_calls, urgency, stored, is_emergency, multiplier
):
    # Audit: urgency="emergency" went in and is_emergency came out False,
    # because LangGraph dropped the undeclared "urgency" state key.
    request = JobDispatchRequest(
        job_id="j-urgency",
        category="Plumbing",
        description="Burst pipe flooding the kitchen",
        location="Kandy",
        urgency=urgency,
    )
    state = await run_dispatch_workflow(request)

    assert state["urgency"] == stored
    assert state["estimated_scope"]["is_emergency"] is is_emergency
    assert state["estimated_scope"]["price_multiplier_min"] == multiplier
    assert state["estimated_scope"]["price_multiplier_max"] == multiplier


@pytest.mark.asyncio
async def test_request_fields_survive_into_state(search_calls):
    request = JobDispatchRequest(
        job_id="j-fields",
        category="Plumbing",
        description=CONFIDENT_JOB,
        location="Kandy",
        budget_min=3000,
        budget_max=9000,
    )
    state = await run_dispatch_workflow(request)

    assert (state["location"], state["budget_min"], state["budget_max"]) == ("Kandy", 3000, 9000)
    # Before the fix the action node never saw "Kandy" and fell back to "Colombo".
    assert search_calls == [("Plumbing", "Kandy")]


@pytest.mark.asyncio
async def test_classification_and_range_are_in_state_not_just_the_log(search_calls):
    request = JobDispatchRequest(
        job_id="j-amb", description=AMBIGUOUS_TRADE_JOB, location="Colombo"
    )
    state = await run_dispatch_workflow(request)

    assert state["category_is_ambiguous"] is True
    assert state["classification"]["is_ambiguous"] is True
    scope = state["estimated_scope"]
    assert scope["ambiguity_flag"] is True
    assert scope["price_multiplier_min"] < scope["price_multiplier_max"]
    # The final result handed back to the backend carries the same range.
    assert state["final_result"]["scope"] == scope


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "description, expected_price",
    [
        (CONFIDENT_JOB, 4200.0),  # Plumbing 3500 x 1.2
        (AMBIGUOUS_TRADE_JOB, 4900.0),  # Plumbing 3500 x midpoint(1.0, 1.8)
    ],
)
async def test_price_uses_the_scope_range_not_a_flat_default(
    search_calls, description, expected_price
):
    request = JobDispatchRequest(job_id="j-price", description=description, location="Colombo")
    state = await run_dispatch_workflow(request)
    assert state["category"] == "Plumbing"
    assert state["estimated_price"] == expected_price


# ─── Unchanged from before the rebuild (except urgency, see below) ──────────


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


import asyncio


def test_full_dispatch_workflow():
    req = JobDispatchRequest(
        job_id="test-job-001",
        category="Plumbing",
        description="Leaking water tap in bathroom needs washer replacement",
        location="Colombo",
        urgency="medium",  # was "normal", which isn't a JobUrgency value
        budget_range="3000-5000"
    )
    state = asyncio.run(run_dispatch_workflow(req))
    
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


@pytest.mark.parametrize("query", ["", "   "])
def test_assistant_blank_query_is_a_422_not_a_500(client, query):
    # AssistantQueryRequest accepts a blank string; it's ClassifyJobCategoryInput
    # that rejects it once the workflow strips it.
    response = client.post("/api/v1/assistant/query", json={"customer_id": "c1", "query": query})
    assert response.status_code == 422
    assert response.json() == {"detail": "Invalid query: String should have at least 1 character"}


def test_assistant_request_shape_errors_are_still_fastapis_own_422(client):
    response = client.post("/api/v1/assistant/query", json={"customer_id": "c1"})
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "query"]


def test_assistant_non_tool_validation_error_stays_a_500(client, monkeypatch):
    async def broken_workflow(request):
        # A server-side bug: building the response model from bad data.
        return AssistantQueryResponse(reply=None)

    monkeypatch.setattr("src.api.routes.process_assistant_query", broken_workflow)
    response = client.post(
        "/api/v1/assistant/query", json={"customer_id": "c1", "query": "AC not cooling"}
    )
    assert response.status_code == 500


@pytest.mark.asyncio
async def test_assistant_query():
    req = AssistantQueryRequest(
        customer_id="cust-123",
        query="Looking for an AC repair expert to clean my air conditioner"
    )
    res = asyncio.run(process_assistant_query(req))
    assert res.category == "AC Repair"
    assert len(res.suggested_providers) > 0
    assert len(res.suggestions) > 0
    assert "AC" in res.reply

