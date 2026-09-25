# Specification: Validation Agent Implementation & Alignment

**Triage Label**: `ready-for-agent`

## Problem Statement

Homeowners, tradespeople, and platform administrators interacting with Handee face safety, reliability, and governance risks due to gaps and lack of type safety in the validation and dispatch gating system:
1. **Unenforced Schema Contracts & Primitive Obsession**: The safety and risk evaluation engine relies on untyped dictionaries and primitive string flags rather than strongly validated Pydantic contracts, creating runtime fragility if provider profiles or quote inputs deviate.
2. **Missing Granular Rule Auditing**: When a job match is classified or flagged for human review, the platform produces generic text reasons rather than structured rule-by-rule evaluation metrics showing exact thresholds, actual values, and pass/fail criteria.
3. **Disconnected Admin HITL Portal**: While the backend API exposes endpoints to query workflows and record administrator decisions, the web administration interface displays static mock data, leaving administrators unable to inspect real-time agent execution plans, audit trails, or execute Approve/Reject/Revise actions.
4. **Absent Golden-Case Evaluation Suite**: The project specification requires a deterministic evaluation suite verifying schema correctness, tool restrictions, and tiered risk classification across fixed scenarios in CI/CD, but only minimal sanity tests currently exist.
5. **Architectural Ambiguity Between Determinism and LLM Generation**: Without explicit guardrail boundaries, there is a risk of allowing generative models to make high-impact safety decisions, risking compliance hallucinations, prompt injection vulnerabilities, and viva rubric penalties.

---

## Solution

Harden and complete the Validation / Safety Agent subsystem according to the project specification, assignment rubric, and the Rule of Ownership for the Provider Verification & Profiles component:
1. Deliver strongly typed, validated Pydantic contracts for validation inputs, provider candidate profiles, individual rule checks, and structured validation results.
2. Implement an auditable, deterministic validation engine that evaluates verified identity, customer review maturity, minimum ratings, category benchmark price bands, customer budget constraints, and job scope ambiguity.
3. Enforce the mandated Three-Tier Human-in-the-Loop (HITL) classification policy:
   - `approved_for_auto_dispatch` (Low Risk): Fully verified provider, rating $\ge 4.0$, price deviation $\le 25\%$, no scope ambiguity. Dispatches immediately.
   - `approved_with_audit` (Medium Risk): Single soft signal. Dispatches immediately to optimize customer response latency while queuing the proposal for post-dispatch Admin audit.
   - `requires_human_approval` (High Risk): Hard failures or $\ge 2$ compound soft signals. Halts dispatch, persists state as pending, and requires explicit Admin adjudication.
4. Establish the Hybrid Guardrail pattern: deterministic code forms the non-bypassable safety floor, while an LLM critic generates rich risk briefs for administrators reviewing flagged proposals.
5. Connect the React Admin Agent Workflow monitoring page to live backend endpoints, enabling real-time filtering, detailed step log inspection, and interactive decision recording.
6. Deliver a comprehensive PyTest golden-case evaluation suite asserting deterministic risk tier classification across fixed marketplace scenarios.

---

## User Stories

### Customer User Stories
1. As a customer, I want my urgent on-demand job request to be dispatched immediately if the matched provider is verified and fairly priced, so that I do not wait unnecessarily for human approval on routine repairs.
2. As a customer, I want the platform to block unverified or low-rated providers from automatically receiving my job, so that I feel safe inviting a tradesperson into my home.
3. As a customer, I want the system to flag quotes that drastically exceed normal market rates or my stated budget, so that I am protected from price gouging.
4. As a customer, I want to receive real-time notification via WebSockets when my job match has been approved and dispatched, so that I have immediate transparency into my service schedule.
5. As a customer, I want jobs with ambiguous descriptions to be checked carefully before commitment, so that the provider does not arrive with the wrong tools or materials.

### Service Provider User Stories
6. As a service provider, I want my verified credentials and high customer satisfaction ratings to qualify me for immediate automated job dispatches, so that I can secure jobs without administrative delay.
7. As a new service provider with fewer than three reviews, I want to receive job dispatches under an audit tier rather than being completely blocked, so that I have the opportunity to build my platform track record.
8. As a service provider, I want fair price band calculations based on historical trade category medians, so that my quotes are recognized as reasonable by the platform.
9. As a service provider, I want immediate real-time push alerts when an automated dispatch or administrative approval assigns a job to me, so that I can accept or prepare for the job promptly.

### Platform Administrator User Stories
10. As an administrator, I want an interactive monitoring dashboard displaying all AI agent workflow runs, so that I have complete visibility into platform matching decisions.
11. As an administrator, I want to filter agent workflows by risk tier (`approved_for_auto_dispatch`, `approved_with_audit`, `requires_human_approval`) and approval status (`pending`, `approved`, `rejected`, `revised`), so that I can focus on jobs requiring immediate attention.
12. As an administrator, I want to view the complete execution plan and step logs with exact durations and input/output payloads for every agent in the pipeline, so that I can audit agent reasoning.
13. As an administrator, I want to view a detailed breakdown of which safety rules passed or failed, including actual provider ratings and quote variances against category medians, so that I can make informed approval decisions.
14. As an administrator, I want an AI-generated risk summary highlighting key trade-offs and recommended verification checks, so that I can evaluate complex proposals rapidly.
15. As an administrator, I want interactive Approve, Reject, and Request Revision buttons with optional decision notes, so that my decisions update the booking lifecycle and notify clients immediately.
16. As an administrator, I want approving a flagged workflow to automatically generate an initial booking and quote/invoice, so that the customer and provider can proceed seamlessly to payment and execution.
17. As an administrator, I want rejecting an unsafe proposal to cancel the job request cleanly, so that platform standards are upheld without stranded database records.

### System & Academic Evaluator User Stories
18. As an evaluator, I want the Validation Agent to enforce a strict Zero-Tool Least-Privilege restriction, so that safety-critical classification cannot be bypassed by external tool exploits or hallucinations.
19. As an evaluator, I want a dedicated PyTest golden-case evaluation suite asserting deterministic risk tier assignment across fixed scenarios in CI/CD, so that the AI subsystem meets assignment testing criteria.
20. As an evaluator, I want the Provider Verification & Profiles component to demonstrate full-stack ownership spanning backend entities, React admin screens, Flutter dispatch alerts, and the Validation Agent, satisfying the module's Rule of Ownership.

---

## Implementation Decisions

### 1. Strongly Typed Pydantic Contracts
- Define dedicated domain schemas for the Validation Agent boundary.
- Represent validation risk tiers as a strict string enum mirroring the backend domain enum:
  - `APPROVED_FOR_AUTO_DISPATCH = "approved_for_auto_dispatch"`
  - `APPROVED_WITH_AUDIT = "approved_with_audit"`
  - `REQUIRES_HUMAN_APPROVAL = "requires_human_approval"`
- Encapsulate provider profile attributes within a validated candidate model containing `id`, `userId`, `fullName`, `isVerified`, `verificationStatus`, `rating` (bounded $0.0$ to $5.0$), and `totalReviews` (non-negative integer).
- Encapsulate rule evaluations within a structured check record containing `rule_id`, `rule_name`, `is_hard_rule`, `passed`, `actual_value`, `threshold`, and explanatory message.
- Enforce that the top-level validation input model requires valid trade category names matching the canonical platform category registry.

*(Prototype schema definition)*:
```python
class ValidationInput(BaseModel):
    provider: Optional[ProviderCandidateProfile] = None
    estimated_price: float = Field(..., gt=0)
    category: ServiceCategoryName
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    ambiguity_flag: bool = False
    complexity: Literal["Low", "Medium", "High"] = "Medium"

class ValidationResult(BaseModel):
    risk_tier: ValidationRiskTier
    is_verified_provider: bool
    is_price_within_band: bool
    rating_passed: bool
    scope_clarity_passed: bool
    hard_failures_count: int
    soft_signals_count: int
    evaluated_rules: List[ValidationRuleCheck]
    reasons: List[str]
```

### 2. Deterministic Rule Engine & Synthesis Matrix
- Enforce the Zero-Tool Guardrail: the validation engine does not call external APIs, database drivers, or remote services; it evaluates provided state purely deterministically.
- Define explicit Hard Failure rules:
  - Missing candidate provider (`H1_PROVIDER_PRESENCE`).
  - Unverified provider status (`H2_VERIFICATION_STATUS`: `isVerified == False` and `verificationStatus != "Verified"`).
  - Deficient rating threshold (`H3_RATING_THRESHOLD`: rating $< 3.5$ for any provider, or rating $< 4.0$ for established providers with $\ge 3$ reviews).
  - Severe price outlier (`H4_PRICE_OUTLIER`: variance ratio $|Price - Median| / Median > 0.60$).
  - Extreme budget breach (`H5_EXTREME_BUDGET_BREACH`: $Price > BudgetMax \times 1.30$).
- Define explicit Soft Signal rules:
  - New provider onboarding (`S1_NEW_PROVIDER_SIGNAL`: verified provider with $< 3$ reviews).
  - Moderate price variance (`S2_MODERATE_PRICE_VARIANCE`: variance ratio between $25\%$ and $40\%$).
  - Mild budget overrun (`S3_MILD_BUDGET_BREACH`: $BudgetMax < Price \le BudgetMax \times 1.15$).
  - Scope ambiguity (`S4_SCOPE_AMBIGUITY`: ambiguity flag emitted by Domain Analysis).
- Synthesize risk tiers via deterministic counting:
  - 0 hard failures, 0 soft signals $\implies$ `approved_for_auto_dispatch` (approval status: `approved`).
  - 0 hard failures, exactly 1 soft signal $\implies$ `approved_with_audit` (approval status: `approved`).
  - $\ge 1$ hard failure OR $\ge 2$ compound soft signals $\implies$ `requires_human_approval` (approval status: `pending`).

### 3. Hybrid Guardrail Architecture (Deterministic Floor + LLM Explainer)
- The deterministic rule engine serves as the inviolable gatekeeper: an LLM can never downgrade a `requires_human_approval` outcome to auto-dispatch.
- When a proposal is flagged as `approved_with_audit` or `requires_human_approval`, an LLM critic service may optionally run as an asynchronous summarizer to synthesize an executive risk brief for human administrators reviewing the proposal in React.
- If the LLM service is unavailable, unconfigured, or times out, the workflow falls back gracefully to the deterministic rule reasons list without halting execution.

### 4. Workflow Pipeline & Shared State Integration
- In the LangGraph workflow graph, the validation node consumes outputs produced by previous nodes:
  - Selected provider and candidate list from Action/Tool Agent.
  - Calculated quote from Action/Tool Agent.
  - Category classification and scope ambiguity flag from Domain Analysis Agent.
- Map the validation output into the shared agent workflow state, setting `validation_tier`, `approval_status`, and populating the audit log with step duration and evaluation metrics.
- Return structured final result dictionary containing workflow ID, job ID, risk tier, approval status, category, price, provider details, and rule evaluation reasons.

### 5. React Admin Portal Integration & Decision Flow
- Implement a dedicated typed API client for administrative agent workflow operations.
- Replace static mock data on the Agent Workflow page with dynamic data fetched from the backend API.
- Support real-time tabbed filtering by validation tier (`All`, `Pending Approval`, `Audit Required`, `Auto-Dispatched`).
- Provide an expandable detail drawer or modal rendering:
  - Full execution plan steps with individual runtimes.
  - Candidate provider credentials, badge, rating, and review count.
  - Calculated price breakdown against category median benchmark.
  - Rule-by-rule pass/fail checklist.
  - Decision action controls: **Approve**, **Reject**, **Request Revision** with mandatory decision note for rejections/revisions.
- Upon successful administrative decision, trigger optimistic UI updates and refresh table data.

---

## Testing Decisions

### What Makes a Good Test
- Tests must verify observable behavior, contract conformance, and deterministic tier assignment across boundary conditions rather than internal variable naming.
- Golden-case scenarios must use fixed, realistic marketplace data to ensure complete reproducibility in automated CI pipelines without network dependencies or flaky LLM calls.
- Every combination in the rule synthesis matrix (zero signals, single soft signal, multiple soft signals, individual hard failures, compound hard/soft failures) must be covered by a dedicated assertion.
- Boundary values must be explicitly tested: exact $25\%$, $40\%$, and $60\%$ price variances; exact $3.5$ and $4.0$ rating thresholds; and exact $0$, $1$, $2$, and $3$ review counts.

### Tested Modules
- **Validation Engine & Contracts**: Pydantic schema validation, invalid input rejection, deterministic rule checks, and risk tier synthesis.
- **Workflow Pipeline Node**: Verification that candidate provider data, calculated price, and ambiguity flags flow from previous nodes into the validation step, producing expected state modifications.
- **Golden Evaluation Suite**: Fixed scenario suite covering all primary marketplace cases:
  - Clean low-risk job $\implies$ auto-dispatch.
  - Verified new provider $\implies$ audit dispatch.
  - Unverified provider $\implies$ human approval.
  - Deficient rating $\implies$ human approval.
  - Severe price outlier $\implies$ human approval.
  - Compound soft signals (new provider + ambiguous scope) $\implies$ human approval.
  - No candidate providers available $\implies$ human approval / safe failure.
- **Backend Admin Decision Lifecycle**: Verification that administrative decisions update the workflow entity, transition job request status, trigger booking creation upon approval, and broadcast SignalR events.
- **Web Administration UI**: Component testing asserting table rendering, filtering, detail drawer display, and decision submission handling.

### Prior Art
- `agents/tests/test_workflow.py`: Demonstrates request parsing, state persistence, and mock tool injection for LangGraph dispatches.
- `agents/tests/test_price_estimation.py`: Demonstrates parameterized boundary testing against pricing multipliers and budget constraints.
- `src/backend/handee.Tests/Workflows/AgentWorkflowEnumsTests.cs`: Validates domain enum parsing, formatting, and EF Core string persistence.
- `src/backend/handee.Tests/Workflows/AgentWorkflowDispatchNotificationTests.cs`: Validates real-time SignalR notifications upon workflow decisions.

---

## Out of Scope
- Integrating live third-party criminal record or government identity verification APIs (handled via uploaded documents reviewed by admins).
- Allowing generative LLMs to dynamically override or relax deterministic safety guardrails.
- End-user customer arbitration and dispute resolution interfaces (covered under dispute management).
- Native mobile administrative controls in Flutter (the project specification specifies React as the sole administrative portal).

---

## Further Notes
- This specification fulfills the individual Agentic AI contribution (12 marks) for the Provider Verification & Profiles component owner under rubric item §19.
- The design strictly adheres to Non-Negotiable Architecture Rules: the agent service is internal only, accessed solely by ASP.NET Core, and coordinates the end-to-end cross-platform demonstration flow.
