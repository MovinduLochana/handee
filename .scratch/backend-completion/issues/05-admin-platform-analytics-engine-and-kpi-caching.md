# 05: Admin Platform Analytics Engine & KPI Caching

**What to build:** An administrative analytics API that computes core marketplace health indicators—total job volume, request-to-booking conversion rate, AI agent autonomy percentage, and dispute rate—over custom time windows, caching heavy aggregations in Redis to keep dashboard response times fast.

**Blocked by:** 01: Architecture Normalization & Standards Prefactoring

**Status:** ready-for-agent

- [ ] Administrators can request platform analytics specifying optional start and end date query parameters.
- [ ] Analytics computation aggregates total job requests, completed bookings, conversion percentage, and dispute rate accurately using database queries.
- [ ] Analytics computation calculates the AI autonomy rate by comparing automated dispatches against human-approval gates.
- [ ] Computed metrics are cached in distributed memory/Redis with a short sliding expiration to eliminate repetitive heavy database queries.
- [ ] Non-admin callers receive a 403 Forbidden response when attempting to access the analytics endpoint.
- [ ] Metric calculations and cache retrieval behavior are verified by automated tests.
