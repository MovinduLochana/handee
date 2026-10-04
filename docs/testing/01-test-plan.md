# Handee Integrated Platform — Master Test Plan

> **Module**: SE3090 — Software Engineering Frameworks  
> **Assignment**: Software Testing and Quality Evaluation of the SE3090 Integrated System  
> **System Under Test**: Handee Marketplace (Full-Stack & Agentic AI System)  
> **Document Version**: 1.0.0 (Release Candidate)  
> **Evaluation Period**: September – October 2026  

---

## 1. Scope & Objectives

### 1.1 Objectives
The primary objective of this testing program is to rigorously evaluate the functionality, data integrity, security, performance, accessibility, and AI safety of the **Handee Integrated System**. The testing strategy ensures that:
- Core business workflows (Service Listing Direct Booking and On-Demand Instant Match) function predictably across Web and Mobile frontends.
- The single public ASP.NET Core backend enforces role-based access control (RBAC), data validation, and transactional integrity.
- The 4-agent LangGraph AI subsystem makes deterministic, safe dispatch and pricing recommendations adhering to the Human-in-the-Loop (HITL) gate.
- Non-functional performance and security baselines meet production standards under concurrent load.

### 1.2 System Under Test (SUT) Components
1. **Backend REST API**: ASP.NET Core 10 Web API (`http://localhost:5057`).
2. **Persistence & Caching**: PostgreSQL (Neon Cloud / Local) and Redis Cache.
3. **Agentic AI Subsystem**: Python 3.11 FastAPI + LangGraph service (`http://localhost:8000`).
4. **Web Portal**: React 19 / Vite / TypeScript management portal (`http://localhost:5173`).
5. **Mobile Field Application**: Flutter 3.x Android/iOS application (`10.0.2.2:5057`).

---

## 2. Testing Areas & Framework Matrix

| Testing Area | Scope of Testing | Tools & Frameworks | Responsible Member |
|---|---|---|---|
| **1. Backend & API Testing** | Controller actions, business services, auth pipelines, SignalR hubs, contracts | xUnit, Moq, WebApplicationFactory, Postman/Newman | Member 1 (Backend Lead) |
| **2. Database & Data Integrity** | Constraint testing, foreign keys, cascade rules, transaction rollbacks | xUnit, EF Core InMemory, Npgsql | Member 1 (Backend Lead) |
| **3. React Web Application** | Page components, protected routes, form validation, error states | Vitest, React Testing Library, MSW | Member 2 (Frontend Lead) |
| **4. Web Accessibility & Usability** | WCAG 2.1 AA accessibility, Core Web Vitals, performance | Google Lighthouse, axe-core | Member 2 (Frontend Lead) |
| **5. Flutter Mobile Application** | Widget frames, navigation, state transitions, repository error handling | `flutter_test`, Mocktail, Flutter Driver | Member 3 (Mobile Lead) |
| **6. Integration & E2E Workflow** | Cross-platform business lifecycle (Job Request $\rightarrow$ AI $\rightarrow$ Admin $\rightarrow$ Booking $\rightarrow$ Invoice) | Newman CLI, Postman Chained Collection | Member 4 (AI/QA Lead) |
| **7. Non-Functional Performance** | Concurrent load, throughput (RPS), P95/P99 response time under 50-100 VUs | k6, Node.js Benchmark Runner | Member 4 (AI/QA Lead) |
| **8. Non-Functional Security** | OWASP Top 10 API vulnerabilities, JWT tampering, SQLi, security headers | OWASP ZAP, Python Security Suite | Member 4 (AI/QA Lead) |
| **9. Agentic AI Evaluation** | 3-tier validation logic, prompt-injection defense, safe-failure recovery | pytest, LangGraph, Pydantic | Member 4 (AI/QA Lead) |

---

## 3. Test Environments & Profiles

### 3.1 Local Profile (`-Target Local`)
- Backend API: `http://localhost:5057`
- AI Agent Service: `http://localhost:8000`
- Web Portal: `http://localhost:5173`
- Flutter App: `http://10.0.2.2:5057` (Android Emulator loopback)
- PostgreSQL: Local instance on port `5432` (`HandeeDb`)
- Redis: Local instance on port `6379`

### 3.2 Cloud Profile (`-Target Cloud`)
- Backend API: Deployed Azure App Service (`https://sefproject...azurewebsites.net`)
- Database: Neon Cloud Serverless PostgreSQL (`neondb`)
- Redis: Redis Cloud Labs managed cache
- AI Agents: Railway containerized deployment

---

## 4. Test Schedule & Milestones

| Milestone | Deliverables | Target Date | Status |
|---|---|---|---|
| **M1: Baseline Unit Testing** | Backend xUnit, Agent pytest, Web Vitest, Flutter test | 25-Sep-2026 | Completed (602 Tests Passed) |
| **M2: Database & Integrity** | Constraint & transaction rollback tests | 28-Sep-2026 | Completed (7 Tests Passed) |
| **M3: Adversarial AI Evaluation** | Prompt injection & safe-failure tests | 30-Sep-2026 | Completed (8 Tests Passed) |
| **M4: Non-Functional Scans** | k6 load test script & OWASP ZAP security audit | 02-Oct-2026 | Completed |
| **M5: E2E Automation & CI** | Newman runner & GitHub Actions multi-job pipeline | 03-Oct-2026 | Completed |
| **M6: Documentation & Viva** | Final report compilation and individual viva practice | 04-Oct-2026 | Ready for Submission |

---

## 5. Pass / Fail Criteria

- **Automated Test Pass Rate**: $100\%$ required for all regression unit and component suites.
- **Code Coverage Target**: $>80\%$ statement coverage on critical business modules.
- **Performance Thresholds**:
  - $P_{95}$ latency $< 500\text{ms}$ (Local Loopback) / $< 1500\text{ms}$ (Cloud WAN) under concurrent virtual users.
  - Error rate $< 1.0\%$.
- **Security Vulnerability Tolerance**: Zero High or Critical severity vulnerabilities (SQLi, BOLA, or unauthenticated route access).
- **AI Safety Threshold**: Zero unhandled 500 crashes on prompt injection; strict enforcement of the `requires_human_approval` gate on untrusted providers or price outliers.

---

## 5. Dual-Target Environment Execution Profiles

The test harness supports flexible switching between **Local Development** and **Deployed Cloud Staging** environments:

| Test Harness Tool | Local Profile (`-Local` / `--local`) | Cloud Profile (`-Cloud` / `--cloud`) | Auto-Fallback (Default) |
|---|---|---|---|
| **Load Benchmark Runner** | `.\tests\performance\run-load-test.ps1 -Local` | `.\tests\performance\run-load-test.ps1 -Cloud` | Probes `localhost:5057`; falls back to Azure if offline |
| **Node.js Benchmark** | `node tests/performance/run-load-test.mjs --local` | `node tests/performance/run-load-test.mjs --cloud` | Automatic health discovery |
| **OWASP Security Audit** | `python tests/security/zap_security_audit.py --local` | `python tests/security/zap_security_audit.py --cloud` | Automatic health discovery |
| **OWASP PS1 Wrapper** | `.\tests\security\run-owasp-zap.ps1 -Local` | `.\tests\security\run-owasp-zap.ps1 -Cloud` | Automatic health discovery |
| **Newman E2E Workflows**| `.\tests\e2e\run-e2e-workflow.ps1 -Local` | `.\tests\e2e\run-e2e-workflow.ps1 -Cloud` | Automatic environment selection |
| **Master Evidence Script** | `.\scripts\generate-all-evidence.ps1 -Local` | `.\scripts\generate-all-evidence.ps1 -Cloud` | Comprehensive dual-environment runner |

