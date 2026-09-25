# 01: Architecture Normalization & Standards Prefactoring

**What to build:** A clean, standardized backend architecture foundation that unifies API routes, domain status definitions, workflow risk tiers, and user claims extraction across all endpoints. Consumers experience consistent URL conventions, developers avoid brittle magic-string logic, and the DI container cleanly exposes interface contracts.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] All API controllers are accessible under consistent `/api/...` route prefixes, eliminating legacy un-prefixed duplicate routes.
- [x] A shared claims identity helper extracts the authenticated user identifier without per-controller duplicate code.
- [x] AI workflow risk levels and approval states are defined as strongly typed domain enums rather than raw strings.
- [x] Provider verification status is represented by a single canonical domain enum shared across the user identity and provider profile records.
- [x] All application services are registered through explicit interface abstractions in dependency injection.
- [x] Existing 110-test suite compiles cleanly and passes without regressions.
