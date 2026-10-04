# Handee - A Trust-Verified Home & Property Maintenance Marketplace

> Continuation: source pages 12-21

## 10.4 Human-in-the-Loop Approval Gate - Tiered, Not Binary (continued)

- **The gate gets narrower over time.** Both flagging conditions (provider trust, price-band variance) are driven by historical data that thickens as the platform runs, so the proportion of jobs reaching `requires_human_approval` is expected to shrink as the provider base matures - worth stating explicitly in the domain justification.
- **Matching and pricing are gated separately from each other.** A bad match is self-correcting - a provider can simply decline - so only the proposal (a specific provider at a specific price) is ever gated, not the search itself. This keeps the agent pipeline (Coordinator -> Domain Analysis -> Action/Tool) running at full speed regardless of tier; only the final Validation/Safety decision branches.
- **An approval SLA is tracked as a real metric.** The `agent_workflow` table's approval timestamp lets the React Agent Monitoring screen show average time-to-decision for flagged proposals, which doubles as a good live metric to show in the viva.

### 10.5 Safety, Observability & Guardrail Principles

- **Least privilege** - each agent can only call the tools listed for it; the Domain Analysis agent, for example, can never call `search_providers` directly.
- **Safe failure** - if no candidate provider is found or a tool times out, the workflow ends in a recorded `failed_no_candidates` state rather than silently guessing.
- **Untrusted input handling** - the customer's free-text job description or assistant query is treated as untrusted and validated/sanitised before it reaches any tool call or the database.
- **Strict schema validation** on every tool input/output using Pydantic, so a malformed or hallucinated tool call is rejected before it can reach PostgreSQL.

## 11. Data Model Overview

The database is owned entirely by ASP.NET Core via EF Core migrations. Core entities span all four components and the shared AI workflow:

| Entity | Purpose |
|---|---|
| User / Role | Base identity for Customer, Provider, and Admin, with JWT/RBAC claims. |
| ProviderProfile | Certifications, skill categories, service area (GPS), verification status, rating aggregate. |
| ServiceCategory | Trade categories (plumbing, electrical, AC repair, painting, etc.) and historical price bands. |
| ServiceListing | Provider-published fixed-scope, fixed-price offering with its own availability slots - the "browse & book" path. |
| JobRequest | Customer-submitted request for AI-matched work: category, description, photos, location, urgency, budget. |
| Booking | Lifecycle state machine linking either a JobRequest or a ServiceListing booking to an assigned ProviderProfile. |
| Quote / Invoice | AI-proposed or listing-fixed pricing, Admin-approved where flagged, itemised invoice, payment status. |
| Payment / Payout | Sandbox payment gateway transaction records and provider payout ledger. |
| Review | Post-completion rating and feedback tied to a Booking. |
| AgentWorkflow / AgentStepLog | Persisted plan, tool calls, validation outcome, and approval status per job. |

### 11.1 Booking Lifecycle

```text
Requested -> Accepted -> InProgress -> Completed
                                   \
                                    -> Disputed
```

## 12. Third-Party Integrations

All external calls are made exclusively by ASP.NET Core; neither client ever calls a third-party API directly. Keys live in backend configuration/secrets, and every integration is wrapped in Polly retry and circuit-breaker policies to handle timeouts and rate limits gracefully.

| Service | Purpose | Notes |
|---|---|---|
| **Google Maps / Distance Matrix API** | Provider-to-job distance and location-based matching for the Job Feed & Dispatch component. | Primary integration - directly supports the Action/Tool agent's `search_providers()`. |
| **Sandbox Payment Gateway** (Stripe or PayHere sandbox) | Job quote payment and payout tracking. | No real money moves; used to demonstrate the Payments & Invoicing workflow end-to-end. |
| **SMS / Email** (Twilio or SendGrid) | Booking confirmations and urgent-request alerts. | Secondary/stretch integration triggered asynchronously after Admin approval. |

## 13. Architecture Enhancements

| Enhancement | Role in Handee |
|---|---|
| **ASP.NET Core SignalR** | Pushes live status updates - job assigned, approval pending, provider en route - to Flutter and React without polling. |
| **Redis** | Caches active sessions, category price averages, Service Listing search results, and in-flight agent execution state for fast re-reads during matching. |
| **OpenTelemetry + Seq/Jaeger** | Traces a single job request end-to-end: Flutter -> ASP.NET Core -> PostgreSQL -> Python agent service -> Google Maps API - demoed live in the viva. |
| **Kafka / RabbitMQ** (optional) | Queues background dispatch jobs (e.g. bulk urgent-request broadcast) instead of blocking the HTTP request. |

## 14. Architecture Decision: Modular Monolith over Full Microservices

Splitting the core domain into fully independent, database-per-service microservices (separate Booking, Verification, Payments, and Dispatch databases) risks distributed-transaction complexity that is difficult to defend live in a 20-minute viva.

Handee instead uses a **Modular Monolith Gateway**:

- ASP.NET Core remains the single public entry point and sole owner of one PostgreSQL database.
- Internally organised as Clean Architecture with each student owning one domain module/folder.
- Polyglot is satisfied at the service boundary, not inside the core domain: the Python Agentic AI service is a genuinely separate internal service called over internal HTTP/gRPC, keeping the required polyglot element without fragmenting the transactional core.

## 15. DevOps, CI/CD & Testing Strategy

### 15.1 GitHub Actions Pipeline

A multi-job pipeline runs on every push/PR to `main`:

- **Backend job** - restore, build, `dotnet test` against an in-memory/test PostgreSQL instance.
- **Frontend job** - `npm ci`, ESLint, `npm test -- --watchAll=false`.
- **Mobile job** - `flutter analyze`, `flutter test`.
- **Agent evaluation job** - PyTest suite validating Pydantic schemas, tool-call contracts, and golden-case outputs.

### 15.2 Local Development

A single `docker-compose.yml` spins up PostgreSQL, Redis, the backend, the AI service, and Seq (logging UI) with one command, so any group member - or an evaluator - can run the full stack locally without manual setup.

### 15.3 Testing Coverage

- Unit and integration tests per component (owned by the respective student).
- Golden-case agent evaluation - a fixed set of job scenarios fed through the agent suite, asserting schema correctness and tool-selection accuracy.
- Performance tests on the matching/dispatch endpoint given it is the core demo path.

## 16. Deployment & Infrastructure

### 16.1 Production Topology

Deployment targets **Azure**, funded by the team's student credits, provisioned entirely through **Terraform** rather than manual portal configuration - giving a reproducible, single-command rebuild if any resource is misconfigured before evaluation.

| Layer | Azure Resource |
|---|---|
| ASP.NET Core Web API | Azure App Service (Linux, B1 tier) - public HTTPS base URL, `/swagger`, `/health`. |
| PostgreSQL | Azure Database for PostgreSQL Flexible Server (B1ms tier). |
| React Web App | Azure Static Web App. |
| Python Agentic AI Service | Azure App Service - internal only, reachable solely from the backend. |
| Secrets | Azure Key Vault - DB connection strings, JWT signing key, Maps/payment API keys. |

Terraform state is kept out of Git and stored in a remote Azure Blob Storage backend. A GitHub Actions workflow runs `terraform fmt` -> `validate` -> `plan` on pull requests and `terraform apply` on merge to `main`, giving a full GitOps trail for the deployment itself.

### 16.2 Kubernetes & Service Mesh - Repository Artifact

Running production on a free-tier Kubernetes cluster with an Istio service mesh carries real live-demo risk (pod memory limits, sidecar overhead) and is not required for the mandatory deployment.

Handee follows a dual-pipeline approach:

- **Production** stays on the lightweight Azure App Service topology above.
- A complete `/k8s` directory - Helm charts for the API, AI service, PostgreSQL, and Redis, plus Istio manifests (`VirtualService`, `DestinationRule`, `Gateway`, `PeerAuthentication` for mTLS) - is included in the repository and demonstrated running locally on K3s/Minikube in the recorded demo video.

This earns architectural credit for enterprise container-orchestration knowledge without risking the live evaluation URL.

## 17. Risk Management

| Risk | Impact | Mitigation |
|---|---|---|
| Live cloud URL unavailable during evaluation | High - loses deployment marks. | Terraform enables a full rebuild in minutes; production stays on lightweight Azure App Service rather than a fragile K8s cluster. |
| Agent produces an invalid or unsafe match | High - core AI workflow. | Deterministic Validation/Safety agent plus mandatory HITL gate before any customer-facing effect. |
| Component work overlaps or blocks another student | Medium - team delivery. | Strict domain-module ownership inside the Modular Monolith, with the shared `agent_workflow` and approval screen as the only jointly-owned surface. |
| React portal scope grows too large for the timeline (three roles instead of one) | Medium - delivery risk from the added Provider/Customer self-service screens. | Reuse a shared component library across role dashboards; scope each role's portal to the minimum screens needed for the rubric before adding polish. |
| Third-party API rate limits/timeouts during demo | Medium - live workflow. | Polly retry and circuit-breaker policies around every external call, with graceful fallback messaging. |

## 18. Project Timeline

The assignment runs from **31 July 2026 to 30 September 2026, 11:50 PM**. Work is organised into five phases:

| Phase | Focus |
|---|---|
| **Phase 1 - Setup & Architecture** | Repository scaffolding, database schema design (including `ServiceListing`), CI pipeline skeleton, initial ADRs, base Terraform/Azure infrastructure. |
| **Phase 2 - Core Component Build** | Each student builds their backend slice, EF Core entities, React screens (their role's portal), and Flutter screens in parallel. |
| **Phase 3 - Agentic AI Integration** | Wiring the four agents into the shared workflow, the customer-facing AI assistant endpoint, HITL approval screen, SignalR real-time push. |
| **Phase 4 - Integration & Hardening** | Third-party API integration, JWT/RBAC security, golden-case evaluation, end-to-end testing. |
| **Phase 5 - Final Polish & Submission** | Deployment freeze, ADRs finalised, report writing, demo video recording, viva preparation. |

## 19. Marking Rubric Alignment

The proposal is deliberately shaped against all 100 marks of the SE3090 Assignment 1 rubric:

| Category | Marks | How Handee Addresses It |
|---|---:|---|
| Component Design & Business Logic | 10 (Group) | Four independent, end-to-end domain components with no fragmented workflows. |
| Architecture, AI & State Management | 10 (Group) | Four-agent pipeline, persisted `agent_workflow` state, mandatory HITL gate. |
| Documentation, ADRs & Deployment | 10 (Group) | Terraform-driven Azure deployment, live URLs, working APK, ADRs 1-6. |
| ASP.NET Core Web API | 10 (Individual) | REST conventions, DTOs, async, middleware, Clean Architecture per module. |
| PostgreSQL Data Modeling | 10 (Individual) | Normalised schema, EF Core migrations, indexes, constraints, audit fields. |
| React Web UI | 10 (Individual) | Reusable components shared across three role-based portals, protected routes, Admin approval and monitoring screens. |
| Flutter Mobile App | 10 (Individual) | State management, camera/GPS/QR native features, secure storage. |
| Individual Agentic AI Contribution | 12 (Individual) | Each student owns one agent or tool with its own contract and tests. |
| API Security & Cross-Platform Flow | 10 (Individual) | JWT, RBAC, and the Flutter -> backend -> AI -> React -> Flutter workflow demo. |
| Testing, CI/CD & Git Workflow | 8 (Individual) | Active PRs/issues, four-job GitHub Actions pipeline, unit/integration suites. |

## 20. Architecture Decision Records to be Produced

- **ADR 01** - Modular Monolith Gateway vs. full database-per-service microservices.
- **ADR 02** - Choice of LangGraph for Agentic AI orchestration.
- **ADR 03** - Deployment topology and managed cloud platform selection (Azure App Service + Static Web Apps + Flexible Server).
- **ADR 04** - Observability and distributed state/caching architecture (OpenTelemetry, Redis).
- **ADR 05** - Kubernetes/Istio as a repository artifact vs. production host.
- **ADR 06** - Splitting Flutter and React by function (live vs. self-service) rather than by user role.
- **ADR 07** - Infrastructure-as-Code via Terraform vs. imperative Azure portal configuration.

## 21. Conclusion

Handee gives the group a domain with genuine real-world relevance in Sri Lanka, a natural three-role structure, and a single demoable workflow that legitimately exercises every mandatory architectural rule in the assignment brief. Supporting both on-demand Instant Match and browsable Service Listings broadens the product beyond emergencies into everyday use, and splitting the web and mobile clients by function rather than duplicating every screen keeps the mandated cross-platform demo clean while still giving Providers and Customers a proper self-service portal. The four-agent AI design meets the minimum criteria exactly, with a defensible, business-driven Human-in-the-Loop gate rather than an artificial one bolted on for marks.

Combined with Terraform-driven Azure deployment and a K8s/Istio repository artifact, the proposal is positioned to score strongly across every rubric category while remaining something each team member can build, explain, and debug live in the viva.
