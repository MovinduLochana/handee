# 04: AI Instant Match Service Listing Selection & Dispatch

**What to build:**
Upgrade the Python LangGraph Instant Match Agent to discover and match customer job requests against active, published `ServiceListing` offerings from verified providers rather than bare provider user IDs. Lock the resulting booking and initial invoice draft to the matched service listing's fixed price and reserve a valid hourly operating slot instead of hardcoding arbitrary timestamps.

**Blocked by:** 01: Integer-Hour Service Listings & Declarative Operating Hours

**Status:** closed

- [x] `action_tools.py` provides `search_matching_service_listings` querying active listings in the customer's trade category and geographic area.
- [x] `dispatch_workflow.py` selects a concrete candidate `ServiceListingId` and locks `estimated_price` to `listing.FixedPrice`.
- [x] `AgentWorkflowService.cs` assigns `booking.ServiceListingId = workflow.SelectedServiceListingId` when auto-dispatching or approving an Instant Match booking.
- [x] Booking timestamp is assigned to a valid open operating slot rather than an arbitrary `UtcNow.AddDays(1)` placeholder.
- [x] Golden-dataset and agent workflow tests assert `selected_service_listing_id` presence and price locking.
