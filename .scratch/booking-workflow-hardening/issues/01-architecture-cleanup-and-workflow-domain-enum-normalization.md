# 01: Architecture Cleanup & Workflow Domain Enum Normalization

**What to build:** A normalized backend route surface and type-safe AI workflow domain model. API consumers interact exclusively with standardized `/api/...` prefixes, redundant controller forwarding paths are eliminated, and Entity Framework Core handles workflow domain enums natively through database string conversions without custom parser adapters.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Legacy un-prefixed controller routes (`[Route("bookings")]` and `[Route("admin/agent-workflows")]`) are removed; only `/api/...` routes remain active.
- [x] The redundant `POST /api/service-listings/{id}/book` forwarding action is removed from `ServiceListingsController`, establishing `POST /api/bookings` as the single canonical listing booking endpoint.
- [x] `AgentWorkflow.ValidationTier` and `AgentWorkflow.ApprovalStatus` are declared as strongly typed domain enums (`WorkflowValidationTier` and `WorkflowApprovalStatus`) rather than raw string properties.
- [x] EF Core model configuration uses `HasConversion<string>()` to persist and retrieve workflow enums cleanly from PostgreSQL string columns.
- [x] Obsolete `[NotMapped]` adapter properties, manual string switch parsers, and custom formatter methods are removed from `AgentWorkflow.cs`.
- [x] Existing test suite compiles cleanly and passes without regressions.
