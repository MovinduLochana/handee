# Phase 4: Admin Dispute & Analytics

## Objective
Finalize the Admin dashboard requirements specified in the project scope by providing backend endpoints for platform-wide analytics/metrics, and a lifecycle workflow for resolving Booking disputes.

## Step-by-Step Implementation Plan

### 1. Analytics & Metrics (`AdminController` & `AdminService`)
Create endpoints querying aggregated data for the React Admin Dashboard.

**Data Requirements to calculate (via LINQ grouping natively on Postgres):**
- Total Jobs Requested (grouped by day/week).
- Conversion rate (% of `JobRequests` that result in a `Completed` booking).
- AI accuracy/autonomy (% of jobs bypassing human gate: `approved_for_auto_dispatch` vs `requires_human_approval`).
- Dispute rate.

**New Endpoint Layer:**
- `GET /api/admin/analytics`: Return a composite DTO containing the metrics above, optionally respecting standard `startDate` / `endDate` query parameters. Fast-caching via `IMemoryCache` or Redis (since it's already configured) is recommended to prevent heavy dashboard loads from dragging the DB.

### 2. Dispute Resolution Lifecycle
The `BookingStatus.Disputed` enum value exists, but there is no mechanism for an Admin to investigate and adjudicate it.

**New Action Endpoints in [AdminController.cs](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Api/Controllers/AdminController.cs)**:
- `POST /api/admin/bookings/{id}/resolve-dispute`
  - Takes a DTO containing the resolution: `AdjudicatedStatus` (should it become `Completed` or `Cancelled`) and `AdminNotes`.
  - Service logic must update the booking status, create a `VerificationAuditLog` or generalized `AuditLog` entry, and trigger a SignalR update to the Provider and Customer.

**New Listing Endpoint**:
- `GET /api/admin/bookings/disputed`: Return a paginated list of all bookings currently bearing the `Disputed` status, sorting by `UpdatedAt` (oldest first) to serve as a queue for Admin intervention.

## Definition of Done
- Admin dashboard can paint graphs and KPIs entirely through data from `/api/admin/analytics` without making expensive `N+1` requests.
- An admin can fetch a queue of disputed jobs and definitively close them out, producing an auditable state transition back to the Customer/Provider.
