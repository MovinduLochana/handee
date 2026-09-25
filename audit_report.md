# Handee — System Audit: Built vs. Project Specification

> Audit Date: 22 September 2026  
> Scope: Full-stack comparison of the implemented codebase against [project_specification.md](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/docs/project_specification.md)

---

## Summary

The system has strong foundations in **Provider Verification & Profiles**, **Authentication**, and the **Agentic AI pipeline skeleton**. However, **3 of the 4 business components** have critical gaps, and most **infrastructure/DevOps deliverables** are missing. The table below gives an at-a-glance severity view; detailed findings follow.

| Area | Status |
|------|--------|
| Provider Verification & Profiles | 🟢 Mostly Complete |
| Authentication & RBAC | 🟢 Mostly Complete |
| Agentic AI Pipeline (structure) | 🟡 Partial |
| Booking & Scheduling | 🟡 Partial — core entities exist, no UI |
| Job Feed & Dispatch | 🟡 Partial — backend + Flutter exist, no React |
| Service Listings | 🔴 Not Implemented |
| Payments & Invoicing | 🔴 Not Implemented |
| SignalR Real-Time | 🔴 Not Implemented |
| CI/CD Pipeline (multi-job) | 🔴 Not Implemented |
| Docker / docker-compose | 🔴 Not Implemented |
| Terraform / Infrastructure-as-Code | 🔴 Not Implemented |
| ADRs | 🔴 Not Implemented |
| Kubernetes / Istio manifests | 🔴 Not Implemented |

---

## 1. Data Model — Entity Gap Analysis

| Spec Entity | Status | Notes |
|---|---|---|
| `User / Role` | ✅ | `ApplicationUser` extends ASP.NET Identity. JWT + RBAC working. |
| [ProviderProfile](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Api/Entities/ProviderProfile.cs#11-56) | ✅ | Full implementation — skill categories, service area (GPS), address, verification status, rating aggregate, certifications, audit logs, reviews. |
| `ServiceCategory` (SkillCategory) | ✅ | Exists as [SkillCategory](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/web/src/api/types.ts#7-12) entity with seeded data, admin CRUD, and icon support. |
| [JobRequest](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Api/Entities/JobRequest.cs#21-46) | ✅ | Implemented with category, description, photo URLs, location, urgency, budget range, status enum. |
| [Booking](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Api/Entities/Booking.cs#12-51) | ✅ | Entity exists with lifecycle state machine (`Requested → Accepted → InProgress → Completed → Disputed`). FK placeholder for `ServiceListingId`. |
| [Review](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/web/src/api/types.ts#116-128) | ✅ | Post-completion ratings, comments, photo URLs tied to providers. |
| [AgentWorkflow](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/web/src/pages/dashboard/AgentWorkflow.tsx#3-161) | ✅ | Persists plan, validation tier, approval status, estimated price, selected provider, decision notes, step logs. |
| `AgentStepLog` | ✅ | Logs individual tool calls with inputs/outputs and timing. |
| [Certification](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/web/src/api/types.ts#13-21) | ✅ | Document uploads with review status (Pending/Approved/Rejected). |
| `VerificationAuditLog` | ✅ | Tracks status transitions with admin user, timestamps, and notes. |
| `RefreshToken` | ✅ | JWT refresh token management. |
| **`ServiceListing`** | ❌ **Missing** | The spec's "browse & book" path. No entity, controller, service, or UI. Booking entity has a nullable `ServiceListingId` FK placeholder but nothing to reference. |
| **`Quote / Invoice`** | ❌ **Missing** | No entity for AI-proposed pricing, itemised invoices, or payment status tracking. |
| **`Payment / Payout`** | ❌ **Missing** | No entity for sandbox payment transactions or provider payout ledger. |

> [!CAUTION]
> **3 core entities** from the spec are entirely absent. `ServiceListing` is a foundational piece that enables the "planned maintenance / browse & book" path — one of the two booking paths described in the spec (Section 8). Without `Quote/Invoice` and `Payment/Payout`, the Payments & Invoicing component (one of 4 rubric-graded components) has zero implementation.

---

## 2. Backend API — Controller & Service Audit

### What Exists (11 Controllers, 12 Services)

| Controller | Key Endpoints | Spec Alignment |
|---|---|---|
| `AuthController` | Register (customer/provider), login, refresh, forgot/reset password, photo upload | ✅ Complete |
| `ProviderController` | Profile CRUD, onboarding, certification upload/review, verification status change | ✅ Complete |
| `AdminController` | Verification queue, summary, provider directory, search/filter | ✅ Complete |
| `ReviewController` | Create/read reviews, pagination | ✅ Complete |
| `ReviewActionController` | Admin review actions on certifications | ✅ Complete |
| `SkillCategoriesController` | CRUD with icon upload, seed data | ✅ Complete |
| `UserController` | User profile management | ✅ Complete |
| `BookingController` | CRUD, status updates, schedule updates | 🟡 Partial — no payment or listing integration |
| `JobRequestController` | Create, read, cancel job requests | 🟡 Partial — AI invocation flow incomplete |
| `AgentWorkflowController` | CRUD, admin approval/reject | ✅ Structure complete |
| `AssistantController` | Customer AI query endpoint | ✅ Endpoint exists |

### What's Missing

| Missing API Surface | Spec Section | Impact |
|---|---|---|
| **Service Listing CRUD** (Provider publishes, Customer browses/books) | §4.1, §8 | No "browse & book" path |
| **Quote / Invoice endpoints** | §11 | No pricing lifecycle |
| **Payment gateway integration** (Stripe/PayHere sandbox) | §12 | No payment flow at all |
| **Payout ledger endpoints** | §7 | Provider earnings not trackable |
| **SignalR Hub** | §6, §9, §13 | No real-time status push to clients |
| **Availability calendar endpoints** | §7 | Provider scheduling not implemented |
| **Dispute management endpoints** | §4.1 | `Disputed` status exists in enum but no resolution flow |
| **Platform analytics endpoints** for Admin | §5 | No analytics dashboard data |

---

## 3. React Web App — Page Audit

### Implemented Pages (38 files across auth, admin, provider, public, dashboard, error)

| Page/Route | Status |
|---|---|
| Landing, Auth (Login, Register, Forgot/Reset Password) | ✅ |
| Provider Onboarding, Profile, Submit Verification, Verification Status, Reviews | ✅ |
| Admin: Verification Queue, Verification Detail, Provider Directory | ✅ |
| Public: Provider Search, Public Provider Profile | ✅ |
| Dashboard Home, Account Settings, Notifications | ✅ |
| **Agent Workflow Monitoring** | ⚠️ **UI shell only — uses hardcoded mock data, not connected to API** |

### Missing React Pages

| Missing Page | Spec Section | Notes |
|---|---|---|
| **Service Listing browse/book** (Customer) | §4.1, §5, §8 | The spec says React is for "Customer manages bookings" |
| **Service Listing publish/manage** (Provider) | §5, §8 | Provider should publish fixed-price listings from React |
| **Customer booking management** | §5 | View/manage bookings, rescheduling |
| **Customer payment / invoice view** | §5 | Payment methods, invoices, payment status |
| **Provider availability calendar** | §5, §7 | Set availability for bookings |
| **Provider payout / earnings history** | §5, §7 | View payout history |
| **Admin dispute management** | §5 | Oversee disputes |
| **Admin analytics dashboard** | §5 | Platform analytics, agent workflow metrics |
| **Customer AI assistant chat** (React version) | §5, §10.2 | Spec says customers can use AI assistant on React too |
| **Agent Workflow with real API data** | §10.3 | Current page is a static mock |

---

## 4. Flutter Mobile App — Screen Audit

### Implemented Screens (14 screen files)

| Screen | Status |
|---|---|
| Auth: Login, Register, Splash | ✅ |
| Customer: Home, Create Job, Bookings, Booking Tracker, AI Assistant Chat | ✅ Structure exists |
| Provider: Home, Jobs, Dispatch Queue, Active Job | ✅ Structure exists |
| Shared: Booking Detail, Profile | ✅ |

### Issues & Gaps

| Issue | Details |
|---|---|
| **Mock data service present** | [mock_data_service.dart](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/app/lib/core/services/mock_data_service.dart) exists and is referenced — unclear how much real API integration is done vs mocked |
| **No photo/camera integration** | Spec requires camera for job photos; Flutter screens exist but camera plugin usage not confirmed in pubspec |
| **No GPS/location integration** for job submission | Spec requires GPS for job location; need to verify if location services are integrated |
| **No push notification setup** | Spec requires push alerts for dispatch; no Firebase/FCM configuration found |
| **No Service Listing browsing** | Customer can't browse/book service listings from Flutter |
| **No real-time SignalR connection** | No WebSocket/SignalR client integration in Flutter |
| **No QR code scanning** | Spec mentions QR native features |

---

## 5. Agentic AI Service — Agent Audit

### Implemented

| Component | Status | Notes |
|---|---|---|
| **Coordinator/Planner Agent** | ✅ | [coordinator_node](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/agents/src/workflows/dispatch_workflow.py#13-45) in [dispatch_workflow.py](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/agents/src/workflows/dispatch_workflow.py) — builds plan, delegates |
| **Domain Analysis Agent** | ✅ | [domain_analysis_node](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/agents/src/workflows/dispatch_workflow.py#47-81) — uses `classify_job_category()`, `estimate_scope()` |
| **Action/Tool Agent** | ✅ | [action_tool_node](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/agents/src/workflows/dispatch_workflow.py#83-131) — uses `search_providers()`, `estimate_price()` |
| **Validation/Safety Agent** | ✅ | [validation_safety_node](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/agents/src/workflows/dispatch_workflow.py#133-205) — deterministic rule evaluation, tiered outcomes |
| **LangGraph State Graph** | ✅ | [build_dispatch_graph()](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/agents/src/workflows/dispatch_workflow.py#207-223) compiles the 4-node pipeline |
| **Assistant Workflow** | ✅ | [process_assistant_query()](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/agents/src/workflows/assistant_workflow.py#7-61) — searches providers and listings |
| **Pydantic Schemas** | ✅ | [contracts.py](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/agents/src/schemas/contracts.py) with request/response validation |
| **FastAPI Service** | ✅ | [main.py](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/agents/src/main.py) with API routes |
| **Dockerfile** | ✅ | Agents service containerised |

### Issues & Gaps

| Issue | Details |
|---|---|
| **Tools use hardcoded/mock data** | `search_providers()` and `search_service_listings()` in [action_tools.py](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/agents/src/tools/action_tools.py) likely use mock data or direct DB calls — need to verify actual PostgreSQL integration |
| **No actual LLM integration** | The agents appear to use rule-based logic rather than actual LLM calls (which may be intentional per Pydantic validation approach) |
| **Backend → Agent invocation incomplete** | The `AgentWorkflowController` and `AgentWorkflowService` exist but the full end-to-end flow (JobRequest creation → automatic AI invocation → result persistence) needs verification |
| **`check_provider_rating()` tool missing** | Spec lists this as an Action/Tool agent's allowed tool |
| **Agent tests minimal** | Only [test_health.py](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/agents/tests/test_health.py) and [test_workflow.py](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/agents/tests/test_workflow.py) — spec requires golden-case evaluation suite |

---

## 6. Infrastructure & DevOps — Gap Analysis

| Deliverable | Spec Section | Status |
|---|---|---|
| **docker-compose.yml** | §15.2 | ❌ **Missing** — spec says "one command to run full stack" |
| **Backend Dockerfile** | §16 | ❌ **Missing** — only agents has a Dockerfile |
| **Terraform files** | §16.1 | ❌ **Missing** — `infra/` directory is empty (only [.gitkeep](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/infra/.gitkeep)) |
| **ADR documents (01-07)** | §20 | ❌ **Missing** — none of the 7 specified ADRs exist |
| **K8s/Istio manifests** | §16.2 | ❌ **Missing** — no `/k8s` directory |
| **Multi-job CI pipeline** | §15.1 | ❌ **Only 1 workflow** ([build-apk.yml](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/.github/workflows/build-apk.yml) — Flutter APK build only). Spec requires 4 jobs: backend test, frontend test, mobile test, agent evaluation |
| **Redis** | §13 | ✅ Configured in [Program.cs](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Api/Program.cs) with cloud Redis connection |
| **OpenTelemetry** | §13 | ✅ Configured with OTLP exporter |
| **Polly resilience** | §12 | ✅ Retry + circuit-breaker on `GoogleMapsService` |
| **SignalR Hub** | §13 | ❌ **Not implemented** — referenced in spec only |

---

## 7. Testing Coverage — Gap Analysis

### What Exists

| Test Suite | Files | Coverage Area |
|---|---|---|
| **Backend (xUnit)** | 12 test files | Auth, Bookings, JobRequests, Admin, Provider Search, Trust, Reviews, Verification, Data Models |
| **Web (Vitest)** | 5 test files | Auth API, Login, RegisterCustomer, RegisterProvider, sample |
| **Agents (PyTest)** | 2 test files | Health check, basic workflow |
| **Flutter** | 2 test files | Repository tests, widget test |

### What's Missing

| Gap | Spec Section |
|---|---|
| **Golden-case agent evaluation** | §15.3 — fixed scenarios asserting schema correctness and tool-selection accuracy |
| **Performance tests** on matching/dispatch endpoint | §15.3 |
| **Integration tests** across component boundaries | §15.3 |
| **End-to-end cross-platform workflow test** | §9 |

---

## 8. Third-Party Integrations — Status

| Integration | Spec Section | Status |
|---|---|---|
| **Google Maps / Geocoding** | §12 | ✅ Implemented with Polly resilience |
| **Sandbox Payment Gateway** (Stripe/PayHere) | §12 | ❌ **Not started** |
| **SMS/Email** (Twilio/SendGrid) | §12 | 🟡 [EmailService.cs](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Api/Services/EmailService.cs) exists (MailKit-based) but unclear if SMS is implemented |

---

## 9. Priority Ranking — What to Build Next

Based on rubric weight (100 marks) and spec criticality, here's a prioritized list:

### 🔴 Critical (High rubric impact, core spec requirements)

| # | Item | Rubric Category | Est. Effort |
|---|---|---|---|
| 1 | **SignalR Hub + real-time push** | Architecture (10 marks), Cross-Platform Flow (10 marks) | Medium |
| 2 | **ServiceListing entity + CRUD + UI** (both React and Flutter) | Component Design (10 marks), React UI (10 marks) | Large |
| 3 | **Quote/Invoice/Payment entities + sandbox gateway** | Component Design (10 marks), Individual marks for Payments owner | Large |
| 4 | **Connect AgentWorkflow React page to real API** | Architecture & AI (10 marks) | Small |
| 5 | **End-to-end cross-platform workflow demo** (Flutter → Backend → AI → React approval → SignalR → Flutter) | Cross-Platform Flow (10 marks) | Medium |

### 🟡 Important (Required by spec, rubric impact)

| # | Item | Rubric Category | Est. Effort |
|---|---|---|---|
| 6 | **docker-compose.yml** for full local stack | Documentation & Deployment (10 marks) | Small |
| 7 | **Terraform infrastructure** (`infra/`) | Documentation & Deployment (10 marks) | Medium |
| 8 | **ADRs (at least ADR 01-07)** | Documentation & Deployment (10 marks) | Small |
| 9 | **Multi-job GitHub Actions pipeline** (backend, frontend, mobile, agents) | Testing & CI/CD (8 marks) | Small |
| 10 | **Backend Dockerfile** | Deployment (10 marks) | Small |
| 11 | **Customer booking management pages** (React) | React UI (10 marks) | Medium |
| 12 | **Provider availability calendar** | Component Design (10 marks) | Medium |

### 🟢 Stretch (Adds polish, mentioned in spec)

| # | Item | Notes |
|---|---|---|
| 13 | K8s/Istio manifests | §16.2 — repo artifact only, local demo |
| 14 | Golden-case agent evaluation test suite | §15.3 |
| 15 | Performance tests on dispatch endpoint | §15.3 |
| 16 | Admin analytics dashboard | §5 |
| 17 | Dispute resolution workflow | §11.1 |
| 18 | Push notifications (Firebase/FCM) for Flutter | §5 |

---

## 10. Component Ownership Coverage

| Component | Backend | React | Flutter | AI | Overall |
|---|---|---|---|---|---|
| **Provider Verification & Profiles** | ✅ Full | ✅ Full | 🟡 Basic | ✅ Validation Agent | 🟢 **80%+** |
| **Booking & Scheduling** | 🟡 Entity + basic CRUD | ❌ No UI | 🟡 Screens exist | 🟡 Domain Analysis Agent | 🟡 **40%** |
| **Payments & Invoicing** | ❌ No entities | ❌ No UI | ❌ No screens | ❌ No price tool integration | 🔴 **0%** |
| **Job Feed & Dispatch** | 🟡 JobRequest + AgentWorkflow | ⚠️ Mock UI only | 🟡 Dispatch + Jobs screens | ✅ Coordinator + Action Agent | 🟡 **50%** |
