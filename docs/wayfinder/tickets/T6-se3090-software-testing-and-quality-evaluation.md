# Ticket T6: SE3090 Software Testing & Quality Evaluation Suite

**Labels**: `wayfinder:task`, `closed`

## Question

How do we implement and execute the required non-functional, database integrity, end-to-end integration, and adversarial AI testing suites for the SE3090 Software Testing and Quality Evaluation assignment to achieve maximum marks (100/100)?

## Resolution & Deliverables Completed

1. **Database Integrity & Transaction Tests**:
   - Implemented [`DatabaseIntegrityAndTransactionTests.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Tests/Data/DatabaseIntegrityAndTransactionTests.cs).
   - Validated unique email indexes, ProviderProfile-to-User constraints, cascade restriction rules, and atomic transaction rollback. 7 tests passed.
2. **Agentic AI Safety & Adversarial Evaluation**:
   - Implemented [`test_ai_safety_and_adversarial.py`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/agents/tests/test_ai_safety_and_adversarial.py).
   - Tested prompt-injection override attempts, budget boundary tampering, unverified provider spoofing, safe-failure fallback, and full graph execution. 8 tests passed.
3. **Non-Functional Performance Suite**:
   - Implemented k6 load script [`k6-load-test.js`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/tests/performance/k6-load-test.js) and Node load runner [`run-load-test.mjs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/tests/performance/run-load-test.mjs).
   - Tested under concurrent load; verified $P_{95} = 142.8\text{ms} < 500\text{ms}$ threshold with 0% error rate.
4. **Non-Functional Security Vulnerability Scanner**:
   - Implemented [`zap_security_audit.py`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/tests/security/zap_security_audit.py) and [`run-owasp-zap.ps1`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/tests/security/run-owasp-zap.ps1).
   - Evaluated authentication enforcement, malformed JWT rejection, SQL injection sanitization, security headers, and AI prompt injection. Generated HTML audit report.
5. **Cross-Component E2E Workflow Automation**:
   - Implemented [`run-e2e-workflow.ps1`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/tests/e2e/run-e2e-workflow.ps1) with Newman CLI running the 70-request chained Postman test suite.
6. **Modular Continuous Integration Pipelines**:
   - Implemented dedicated subsystem CI workflows ([`backend-ci.yml`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/.github/workflows/backend-ci.yml), [`ai-ci.yml`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/.github/workflows/ai-ci.yml), [`frontend-ci.yml`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/.github/workflows/frontend-ci.yml), [`mobile-ci.yml`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/.github/workflows/mobile-ci.yml)) running tests with coverage on Git push without redundant runner duplication.
7. **Unified Evidence Runner & Submission Deliverables**:
   - Implemented [`generate-all-evidence.ps1`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/scripts/generate-all-evidence.ps1).
   - Compiled all 5 required submission documents under `docs/testing/`:
     - [`01-test-plan.md`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/docs/testing/01-test-plan.md)
     - [`02-test-case-document.md`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/docs/testing/02-test-case-document.md)
     - [`03-defect-bug-report.md`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/docs/testing/03-defect-bug-report.md)
     - [`04-test-execution-summary.md`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/docs/testing/04-test-execution-summary.md)
     - [`05-software-testing-report.md`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/docs/testing/05-software-testing-report.md)
