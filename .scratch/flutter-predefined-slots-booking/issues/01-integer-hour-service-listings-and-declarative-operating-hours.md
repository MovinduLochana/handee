# 01: Integer-Hour Service Listings & Declarative Operating Hours

**What to build:**
Enable providers to configure their standard weekly working hours (e.g., Monday–Friday 09:00 to 17:00) without running complex recurring schedule generator jobs or persisting thousands of empty slot records. Constrain service listing durations to whole integer hours ($1 \le N \le 8$) so every bookable offering cleanly consumes an exact number of 1-hour appointment slots.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] `ServiceListing` entity, DTOs, and creation/update endpoints enforce duration in integer hours (`DurationHours`, $1 \le N \le 8$), maintaining backward-compatible `EstimatedDuration` time aliases.
- [x] `ProviderOperatingSchedule` entity and database mapping store weekly working windows (active days, daily start time, daily end time).
- [x] Unconfigured provider schedules automatically default to standard business hours (Monday through Friday, 09:00 to 17:00).
- [x] `PUT /api/provider-availability/schedule` allows providers to update their active operating days and daily working hours atomically.
- [x] Unit and integration tests verify persistence of working hours, default fallback behavior, and rejection of non-integer or out-of-range service durations.
