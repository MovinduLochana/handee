# Specification: Handee Backend Completion & Alignment

**Triage Label**: `ready-for-agent`

## Problem Statement

Homeowners and service providers on Handee face critical functional breaks and blind spots in the backend API:
1. **Broken "Browse & Book" Path**: While service providers can publish service listings, customers cannot book them because no booking creation endpoint exists for listings.
2. **Missing Real-Time Feedback**: Customers and providers must repeatedly poll for status updates because the mandated SignalR live-update channel is unimplemented.
3. **Unresolved Disputes & Blind Governance**: Platform admins have no dedicated workflow to review or adjudicate disputed bookings, nor any platform analytics endpoint to monitor conversion, autonomy, and dispute KPIs.
4. **Mocked Payment Lifecycle**: Payment processing relies on in-memory simulated delays without structured transaction lifecycle management or payout auditing.
5. **Architectural Inconsistencies**: The backend API exposes conflicting route prefixes, divergent domain enums for provider verification status, string-based primitive obsession for AI risk tiers, and duplicated claims-parsing logic across controllers.

## Solution

Complete the backend API implementation according to the single public backend architecture and project specification:
1. Provide a direct booking creation workflow allowing customers to book published Service Listings with scheduled slot selection.
2. Establish a secure ASP.NET Core SignalR hub broadcasting typed real-time events for booking state transitions and AI job dispatches.
3. Deliver Admin dispute adjudication endpoints and cached platform analytics calculations.
4. Implement a structured sandbox payment intent and payout lifecycle service.
5. Standardize API route prefixing under a unified pattern, unify provider verification status enums, replace string-based workflow tiers with strongly typed enums, and consolidate claims extraction into a shared utility.

---

## User Stories

### Customer User Stories
1. As a customer, I want to browse active Service Listings filtered by category and search keyword, so that I can find routine maintenance services with transparent fixed prices.
2. As a customer, I want to view the details, scope, and estimated duration of a specific Service Listing, so that I understand exactly what work is included before committing.
3. As a customer, I want to book a selected Service Listing for a chosen date and time, so that I can schedule planned maintenance directly with a verified provider.
4. As a customer, I want to receive an automatic invoice when booking a fixed-price Service Listing, so that I have a clear breakdown of service cost, taxes, and platform fees.
5. As a customer, I want to submit an instant on-demand job request with photos, location, urgency, and budget, so that the AI matching agent can locate an optimal provider.
6. As a customer, I want to receive live push notifications over WebSockets when a provider accepts my booking, starts the work, or completes the job, so that I don't have to keep refreshing the screen.
7. As a customer, I want to pay an unpaid invoice using a sandbox card or mock gateway transaction, so that my booking payment is securely settled.
8. As a customer, I want to flag a booking as Disputed if the work delivered is unsatisfactory or unfinished, so that platform administrators can intervene and resolve the issue.
9. As a customer, I want to submit a rating and review with photos for a completed booking, so that other customers can gauge the provider's quality of work.
10. As a customer, I want to update or remove my review for a provider, so that my published feedback accurately reflects my experience.
11. As a customer, I want to query the conversational AI assistant, so that I can find appropriate trade categories and providers on the go.

### Provider User Stories
12. As a service provider, I want to create and publish fixed-price Service Listings with explicit title, scope, and estimated duration, so that customers can book my routine services directly.
13. As a service provider, I want to update the details, scope, pricing, and active status of my Service Listings, so that my offerings stay current.
14. As a service provider, I want to delete or deactivate a Service Listing, so that customers can no longer book an offering I no longer provide.
15. As a service provider, I want to receive real-time push alerts via SignalR when a new job is dispatched to me or when a customer books one of my listings, so that I can respond immediately.
16. As a service provider, I want to view my queue of pending booking offers, so that I can accept or decline them based on my schedule.
17. As a service provider, I want to advance an accepted booking to InProgress when I arrive on site and Completed when work is finished, so that the customer and platform track job progress.
18. As a service provider, I want to view my payout ledger and accumulated earnings broken down by gross amount, platform commission, and net payout, so that I have full transparency into my earnings.
19. As a service provider, I want to define my weekly working availability slots, so that customers and AI agents only book me when I am free.
20. As a service provider, I want to upload trade certifications and government identity documents, so that admins can review and verify my profile.

### Admin / Dispatcher User Stories
21. As an admin, I want to view a paginated queue of providers pending verification with their uploaded documents, so that I can verify legitimate tradespeople.
22. As an admin, I want to approve or reject provider certification documents with audit notes, so that all credential decisions are logged.
23. As an admin, I want to review AI agent workflows that require human approval, so that high-risk or high-value job matches are vetted before reaching the customer.
24. As an admin, I want to approve or reject flagged AI workflows, triggering automated booking creation upon approval.
25. As an admin, I want to view a dedicated queue of disputed bookings sorted by unresolved duration, so that customer-provider conflicts can be prioritized.
26. As an admin, I want to resolve a dispute by adjudicating the booking status to Completed or Cancelled with explanatory notes, so that the booking lifecycle reaches closure.
27. As an admin, I want to view platform analytics including total job requests, booking conversion rate, AI autonomy percentage, and dispute rate over selectable date ranges, so that I can monitor marketplace health.
28. As an admin, I want to view platform-wide payouts and mark pending payouts as processed, so that provider funds are settled.

---

## Implementation Decisions

### 1. Service Listing Booking Path
- Add an endpoint for booking creation directly linked to a `ServiceListingId`.
- When a customer books a listing:
  - Validate that the listing exists and is marked active.
  - Verify that the scheduled time falls within the provider's active availability windows and does not collide with existing active bookings.
  - Instantiate a `Booking` entity with `BookingStatus.Requested` (or confirmed if immediate acceptance applies), populating `CustomerId`, `ProviderId`, `ServiceListingId`, and `ScheduledAt`.
  - Automatically invoke invoice generation for the listing's `FixedPrice`.
  - Emit a real-time SignalR event to the provider's channel.

### 2. Real-Time SignalR Hub
- Implement a strongly typed SignalR Hub bound to a typed client contract.
- Hub endpoint mapped under `/hubs/booking`.
- Support JWT authentication via query string `access_token` parameter for WebSocket connections.
- Automatically associate authenticated users with their personal SignalR groups (`Customer_{id}`, `Provider_{id}`, `Admin_Group`) upon connection.
- Publish real-time notifications for:
  - `ReceiveBookingStatusUpdate(Guid bookingId, BookingStatus newStatus)`
  - `ReceiveNewJobDispatch(Guid bookingId, Guid? jobRequestId)`
  - `ReceiveDisputeAlert(Guid bookingId, string reason)`

```csharp
// Prototype Typed Hub Interface
public interface IBookingClient
{
    Task ReceiveBookingStatusUpdate(Guid bookingId, string status, DateTimeOffset timestamp);
    Task ReceiveNewJobDispatch(Guid bookingId, Guid? jobRequestId, string category, decimal? estimatedPrice);
    Task ReceiveDisputeAlert(Guid bookingId, string reason);
}
```

*For complete architectural details, sequence flow, and manual verification steps, see [phase3_signalr.md](../backend%20completion%20plan/phase3_signalr.md).*

### 3. Admin Dispute Resolution & Platform Analytics
- Introduce an endpoint `GET /api/admin/bookings/disputed` returning paginated bookings currently in `BookingStatus.Disputed`.
- Introduce an endpoint `POST /api/admin/bookings/{id}/resolve-dispute` accepting:
  - `TargetStatus`: Must be either `Completed` or `Cancelled`.
  - `AdminNotes`: Mandatory explanation of the resolution.
  - Creates an audit log entry and notifies both parties via SignalR.
- Introduce `GET /api/admin/analytics`:
  - Calculate metrics using EF Core SQL aggregation:
    - Total job requests submitted.
    - Conversion rate: `Completed Bookings / Total Requests`.
    - AI autonomy rate: `% of workflows with auto_dispatch vs human_approval`.
    - Dispute rate: `% of bookings that entered Disputed status`.
  - Cache results in `IDistributedCache` (Redis) with a 5-minute sliding expiration to prevent dashboard query load.

### 4. Sandbox Payment Gateway & Payout Lifecycle
- Replace inline simulation with a formalized sandbox gateway interface `IPaymentGatewayService`.
- Expose `POST /api/payments/create-intent` returning client secret / mock transaction tokens for frontend payment collection.
- Expose `POST /api/payments/webhook` validating sandbox webhook payloads to mark invoices `Paid` asynchronously.
- Ensure ledger payouts are generated upon payment confirmation with platform commission deducted.

### 5. Architectural Normalization & Code Smell Eradication
- **Unified Routing**: Standardize all controllers to use `[Route("api/[controller]")]` (or consistent `api/` prefixes), eliminating legacy non-prefixed routes.
- **Unified Verification Enums**: Replace divergent `ProviderVerificationStatus` and `VerificationStatus` with a single canonical enum shared across `ApplicationUser` and `ProviderProfile`.
- **Eliminate Primitive Obsession**: Convert `AgentWorkflow.ValidationTier` and `AgentWorkflow.ApprovalStatus` from raw `string` to strongly typed C# enums.
- **Eliminate Duplicated Code**: Consolidate `GetUserId()` logic into a shared `ClaimsPrincipalExtensions` helper method across all controllers.
- **Interface Segregation & DI Consistency**: Register all service dependencies (`VerificationService`, `ProviderProfileService`, `ProviderTrustService`, `ReviewService`) via their respective interfaces in the DI container.
- **Consolidate Review Controllers**: Merge split actions from `ReviewActionController` into `ReviewController` for a cohesive RESTful resource.

---

## Testing Decisions

### What Makes a Good Test
- Tests must verify observable external HTTP behavior, state machine transitions, and database state invariants rather than internal implementation details.
- Avoid mocking Entity Framework `DbContext` directly; use in-memory database providers or SQLite test instances for transactional isolation.
- Every state machine transition must have an explicit positive test (legal transition succeeds) and negative test (illegal transition throws validation/conflict error).
- Authorization tests must assert that unauthorized roles receive `401 Unauthorized` or `403 Forbidden`.

### Tested Modules
- **Booking & Service Listing Lifecycle**: Creation of bookings from listings, slot collision validation, legal status transitions, dispute triggering.
- **SignalR Real-Time Hub**: Client connection authentication, group assignment, push message delivery.
- **Admin Dispute & Analytics**: Dispute adjudication state change, calculation accuracy of conversion and autonomy KPIs.
- **Payment & Payout Engine**: Invoicing calculation, payment settlement, ledger credit accuracy.
- **Auth & Claims Helpers**: Token extraction, role claim parsing, verified provider access gating.

### Prior Art
- Existing test suite in `handee.Tests` provides 110 unit and service integration tests covering authentication, provider verification, and booking status transitions.
- Testing patterns will follow existing xUnit + Moq + FluentAssertions conventions established in `BookingServiceTests.cs` and `InvoiceServiceTests.cs`.

---

## Out of Scope
- Real money financial transactions or PCI-DSS certified payment vaults (sandbox gateway only).
- Multi-currency conversion (LKR standard only).
- SMS gateway integration (in-app notifications and email stubs only).
- Native Kubernetes production cluster management (manifests are repo artifacts only).

---

## Further Notes
- This specification addresses all critical gaps discovered during the full system audit against the SE3090 project specification.
- Changes can be implemented progressively across isolated phases without breaking existing frontend or mobile contracts.
