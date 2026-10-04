# Specification: SE3090 Software Testing and Quality Evaluation Suite

**Triage Label**: `ready-for-agent`

## Problem Statement

The Handee integrated system represents a sophisticated multi-tier platform comprising an ASP.NET Core Web API, PostgreSQL persistence layer, Redis caching, React web management portal, Flutter mobile field application, and a 4-agent LangGraph AI subsystem. While the system currently boasts extensive unit-level test coverage across individual modules (245 backend xUnit tests, 118 AI pytest tests, 111 React Vitest tests, and 128 Flutter mobile tests), it lacks the comprehensive quality evaluation harness, non-functional verification, database integrity validation, and structured evidence necessary to satisfy the SE3090 Software Testing and Quality Evaluation assessment requirements.

Specifically:
1. **Absence of Required Non-Functional Testing**: The official assignment rubric mandates automated **Performance Testing** and **Security Vulnerability Scanning**. Currently, no automated load scripts (e.g., k6) or dynamic application security testing (DAST via OWASP ZAP) exist in the repository to measure throughput, P95 latency, or resilience against vulnerabilities such as BOLA, SQL injection, and token tampering.
2. **Missing End-to-End Cross-Component Integration Verification**: Despite strong isolated unit suites, there is no automated end-to-end integration test exercising the complete business workflow across system boundaries (Customer creates Job Request $\rightarrow$ ASP.NET Core persists and forwards to Python AI $\rightarrow$ LangGraph evaluates scope and risk $\rightarrow$ React Admin gate approves $\rightarrow$ Provider accepts on Flutter $\rightarrow$ Invoicing & Payment).
3. **Database Constraint and Transaction Integrity Blindspots**: The database persistence layer lacks dedicated tests asserting relational integrity, unique constraint violation behavior, cascade deletion rules, and multi-operation transaction rollback under failure conditions.
4. **Agentic AI Adversarial & Safe-Failure Testing Gaps**: The Python AI test suite validates classification logic and deterministic risk tiers on clean inputs, but lacks adversarial prompt-injection tests, price-boundary tampering checks, and safe-failure fallback verification when downstream tools or external dependencies fail.
5. **Absence of Tool-Generated Evidence Artifacts**: The evaluation requires concrete, reproducible test artifacts (HTML coverage dashboards, Newman execution reports, k6 performance metrics, OWASP ZAP vulnerability reports, and Lighthouse accessibility audits) and 5 formal testing documents (Test Plan, Test Case Document, Defect/Bug Report, Test Execution Summary, Software Testing Report PDF).

---

## Solution

Implement a complete, production-grade Software Testing and Quality Evaluation harness for the Handee platform:
1. **Automate Mandatory Non-Functional Testing**:
   - Create a k6 performance and load testing suite targeting high-traffic catalog search (`GET /api/service-listings`, `GET /api/providers/search`) and compute-heavy AI job dispatch (`POST /api/jobrequests`), asserting throughput, error rates $<1\%$, and $P_{95}$ latency $<500\text{ms}$.
   - Create an automated OWASP ZAP baseline and API security scanner verifying OWASP Top 10 API vulnerabilities, security headers, CORS policies, and authentication boundaries.
   - Run Google Lighthouse and axe-core accessibility audits on the React web portal to verify WCAG 2.1 AA compliance and Core Web Vitals.
2. **Implement Automated Cross-Component E2E Integration Testing**:
   - Provide an automated runner (Newman CLI / headless script) executing the complete cross-platform business flow against active local or cloud profiles, validating end-to-end state transitions across Job Request, AI Dispatch, Booking, and Invoicing.
3. **Establish Database Constraint & Transaction Tests**:
   - Implement xUnit database integrity tests validating unique email constraints, active provider profile uniqueness, foreign key cascade restrictions, and atomic transaction rollback during booking creation failures.
4. **Harden Agentic AI Evaluation with Adversarial & Safety Suites**:
   - Add pytest test suites covering prompt-injection resilience (preventing overrides of price bands or bypass of human approval), negative budget boundaries, and graceful safe-failure degradation when external services time out.
5. **Generate Unified Evidence & Documentation Deliverables**:
   - Provide unified scripts to generate HTML coverage dashboards across all 4 tech stacks (.NET, Python, React, Flutter), Newman HTML Extra reports, k6 latency charts, and OWASP ZAP security summaries.
   - Draft and package the 5 required assessment deliverables: Test Plan, Completed Test Case Document (Normal, Invalid, Boundary, Failure), Defect/Bug Report with retest verification, Test Execution Summary, and Software Testing Report PDF.

---

## User Stories

1. As a module evaluator, I want to review an automated performance test suite measuring response times and error rates under concurrent load, so that I can verify the Handee system meets production scalability criteria.
2. As a module evaluator, I want to inspect an automated security vulnerability report generated by an industry-standard DAST tool (OWASP ZAP), so that I can confirm the system's endpoints and authentication mechanisms resist common web and API attacks.
3. As a module evaluator, I want to see an automated end-to-end integration test demonstrating a complete business workflow across all components, so that I can verify cross-platform integration between clients, backend, and the AI subsystem.
4. As a module evaluator, I want to inspect a traceable Defect / Bug Report documenting real defects discovered during development, root causes, fix commits, and retesting evidence, so that I can evaluate the team's software quality processes.
5. As a module evaluator, I want each student in the group to independently demonstrate a distinct testing tool or framework during the viva, so that I can assess individual technical contribution and tool proficiency.
6. As a homeowner (customer), I want my high-concurrency requests during peak hours to be handled without timeouts or crashes, so that I can reliably book home repairs.
7. As a homeowner (customer), I want the AI assistant to safely handle malformed or adversarial prompts without corrupting price estimates or crashing the application, so that I receive reliable service recommendations.
8. As a service provider, I want the system to reject duplicate booking requests for the same time slot with atomic database locking, so that I never get double-booked.
9. As a platform administrator, I want high-risk AI dispatch suggestions to reliably halt at the Human-in-the-Loop review gate without bypass vulnerabilities, so that platform trust and financial safety are guaranteed.
10. As a backend developer, I want database integration tests verifying that transaction failures during payment or booking creation roll back all affected tables atomically, so that data inconsistency is prevented.
11. As a frontend developer, I want automated accessibility and usability audits run against the React web portal, so that all administrative and provider management screens adhere to WCAG standards.
12. As a mobile developer, I want repository and widget tests to assert clean handling of HTTP 400 validation and 401 unauthorized responses, so that mobile users receive clear error feedback.
13. As a QA engineer, I want a single script to generate code coverage dashboards across C#, Python, TypeScript, and Dart, so that quality metrics are visible at a glance.
14. As a QA engineer, I want headless Postman/Newman collections to execute cleanly in continuous integration pipelines, so that regression testing is automatic on every commit.
15. As a QA engineer, I want all test cases classified into normal, invalid, boundary, and failure scenarios, so that test coverage across critical edge cases is proven.

---

## Implementation Decisions

### 1. High-Level Testing Seams

To maintain high test fidelity and minimize maintenance friction, tests are organized at the highest possible architectural seams:
- **Public API Boundary Seam (`http://localhost:5057`)**: The primary seam for non-functional performance testing (k6), automated security scans (OWASP ZAP), and cross-component E2E workflow testing (Newman CLI). Testing at this boundary exercises ASP.NET Core routing, authentication middleware, EF Core database operations, Redis caching, and real-time SignalR notifications simultaneously.
- **Internal AI Service Seam (`http://localhost:8000`)**: The boundary for agent evaluation, testing Pydantic schema validation, LangGraph workflow execution, adversarial prompt injection, and safe-failure fallbacks directly against the FastAPI service.
- **Client Presentation & State Seams**:
  - React Web: Page and component integration tests using Vitest and React Testing Library at the DOM boundary, validating user interactions, form validation, and route protection.
  - Flutter Mobile: Widget and bloc/repository tests using `flutter_test` and Mocktail at the UI frame and `ApiClient` boundary.
- **Data Persistence & Constraint Seam**: Direct integration tests against `AppDbContext` asserting relational constraints, unique indexes, and transaction rollbacks.

### 2. Performance Testing Architecture (k6)
- Script modularity: Implement `tests/performance/k6-load-test.js` using k6's ES6 module structure.
- Two distinct testing stages:
  1. *Smoke / Baseline Test*: 5 VUs over 30s to verify zero error baseline.
  2. *Load / Concurrency Test*: Ramp-up to 50 concurrent VUs over 2 minutes, hold for 1 minute, ramp-down over 30s.
- Evaluated Endpoints:
  - Read Path: `GET /api/service-listings`, `GET /api/providers/search` (testing Redis cache hit vs database query).
  - Write Path: `POST /api/jobrequests` (testing transactional persistence and background AI dispatch).
- Strict Assertion Thresholds:
  - `http_req_duration`: `p(95) < 500` (95% of requests complete under 500ms).
  - `http_req_failed`: `rate < 0.01` (error rate below 1%).

### 3. Automated Security Scanning Architecture (OWASP ZAP)
- Implement `tests/security/run-owasp-zap.ps1` wrapping the OWASP ZAP Docker or CLI tool.
- Scan Targets:
  - ASP.NET Core API (`http://localhost:5057`).
  - FastAPI AI Service (`http://localhost:8000`).
- Rules Evaluated:
  - Passive Scan: Missing security headers (Content-Security-Policy, X-Frame-Options, Strict-Transport-Security), cookie flags (HttpOnly, Secure, SameSite), information leakage (server banners, stack traces).
  - Active Scan: SQL injection strings on search and filter query parameters, Cross-Site Scripting (XSS) in description fields, and Broken Object-Level Authorization (BOLA) attempts on booking endpoints.
- Output: Automated HTML and JSON report export (`zap-security-report.html`).

### 4. Cross-Component E2E Workflow Test
- Implement `tests/e2e/run-e2e-workflow.ps1` utilizing Newman CLI with `Handee_API_Complete_Test_Suite.postman_collection.json`.
- Execute a chained 8-step lifecycle test:
  1. Customer registration & JWT token acquisition.
  2. Urgent Job Request creation (`POST /api/jobrequests`).
  3. Verification of AI dispatch classification and risk evaluation.
  4. React Admin review simulation (`POST /api/agentworkflow/{id}/decision`).
  5. Provider booking offer acceptance (`POST /api/bookings/{id}/accept`).
  6. Provider invoice generation (`POST /api/invoices`).
  7. Customer sandbox payment settlement (`POST /api/payments`).
  8. Final booking state verification (`Completed`).
- Reporter: `newman-reporter-htmlextra` generating interactive HTML test evidence with request/response dumps.

### 5. Database Constraint & Transaction Tests
- Implement `src/backend/handee.Tests/Data/DatabaseIntegrityAndTransactionTests.cs`.
- Scenarios:
  - *Unique Email Constraint*: Verifies inserting duplicate `ApplicationUser.Email` throws `DbUpdateException`.
  - *Provider Profile 1-to-1 Constraint*: Verifies creating two `ProviderProfile` entities for the same `UserId` fails.
  - *Cascade Restrict*: Verifies deleting an `ApplicationUser` with dependent active `Booking` records is restricted.
  - *Atomic Transaction Rollback*: Executes a simulated failure mid-workflow and asserts that `IDbContextTransaction.RollbackAsync()` preserves database consistency with zero orphaned rows.

### 6. Agentic AI Safety & Adversarial Evaluation
- Implement `agents/tests/test_ai_safety_and_adversarial.py`.
- Scenarios:
  - *Adversarial Prompt Injection*: Submits descriptions instructing the agent to ignore safety rules or force auto-approval; asserts the deterministic validation agent halts at `requires_human_approval`.
  - *Price Boundary Inversion*: Submits negative or extreme budgets; asserts pricing agent clamps or flags invalid ranges.
  - *Safe-Failure Graceful Recovery*: Mocks an external provider search failure; asserts workflow catches the exception and returns a structured failure state rather than throwing an unhandled 500.

---

## Testing Decisions

### What Makes a Good Test
- **Behavioral Verification Over Internal Implementation**: Tests assert outcomes and contracts (HTTP status codes, response payloads, state machine transitions, database commits) rather than private method calls or mock call counts.
- **Deterministic and Isolated**: Each test runs with self-contained test fixtures, ephemeral IDs, or isolated database contexts to prevent cross-test contamination.
- **Coverage of Four Scenario Archetypes**:
  1. *Normal Cases*: Happy-path operations with standard valid inputs.
  2. *Invalid Cases*: Malformed data, unauthorized roles, missing headers.
  3. *Boundary / Edge Cases*: Threshold transitions (e.g. 3.8 vs 3.9 provider rating, 40% price variance limits).
  4. *Failure / Recovery Cases*: Service timeouts, simulated database locks, network drops.

### Modules Tested
- **ASP.NET Core Backend**: Controllers, Business Services, EF Core Entities, SignalR Hubs.
- **Python AI Subsystem**: Coordinator Node, Domain Analysis Node, Pricing Agent, Validation Safety Agent, Assistant Endpoint.
- **React Web Portal**: Admin Verification, Bookings, Agent Workflows, Provider Availability, User Management.
- **Flutter Mobile App**: Dispatch Queue, Booking Tracker, Role Switching, Location Picker, API Client.
- **Database & Persistence**: PostgreSQL constraints, migrations, and transactions.

### Prior Art
- Existing xUnit test suite in [`src/backend/handee.Tests/`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Tests) (245 tests).
- Existing pytest suite in [`agents/tests/`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/agents/tests) (118 tests).
- Existing Vitest suite in [`web/src/tests/`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/web/src/tests) (111 tests).
- Existing Flutter test suite in [`app/test/`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/app/test) (128 tests).
- Postman API collection in [`tests/postman/`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/tests/postman) (70 requests).

---

## Out of Scope

- Testing against external live payment processors (all tests utilize the internal sandbox payment engine).
- Live SMS/Email gateway testing (all email transmissions are verified via mock email service or local SMTP sink).
- Physical GPS hardware simulation (all geographic coordinates utilize predetermined Colombo-area latitude/longitude coordinates).

---

## Further Notes

- **Submission Deliverables Checklist**:
  1. Software Testing Report (PDF)
  2. Completed Test Case Document (XLSX / PDF)
  3. Defect / Bug Report with Retest Proofs (PDF)
  4. Test Execution Summary (PDF)
  5. Tool-Generated Evidence Archive (HTML/JSON/PNGs)
- **Individual Viva Allocation (60 Marks)**:
  - Member 1: Backend API, Identity & Database Testing (xUnit, Moq, EF Core, Newman).
  - Member 2: React Web Frontend & Accessibility Testing (Vitest, RTL, Axe, Lighthouse).
  - Member 3: Flutter Mobile Application Testing (`flutter_test`, Mocktail, Widget & Seam tests).
  - Member 4: Agentic AI Evaluation, Performance & Security (pytest, k6, OWASP ZAP).
