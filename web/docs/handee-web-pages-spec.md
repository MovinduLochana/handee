# Handee — React Web Application: Full Page Specification

Scope: **React web portal only** (Admin approval · Provider self-service · Customer self-service). Flutter is excluded — this covers every screen the React app needs to satisfy the four component owners plus shared/general infrastructure pages.

Roles referenced: **Customer (C)**, **Provider (P)**, **Admin (A)**. A page marked "All" is role-aware (same route, content/permissions differ by role).

---

## 0. General / Shared Pages (not owned by a single component)

These sit outside the four business components — auth, layout shell, and the one jointly-owned surface (Agent Monitoring/Approval).

| #   | Page                        | Route                                 | Roles  | Purpose                                                                                                                                      |
| --- | --------------------------- | ------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Landing / Marketing         | `/`                                   | Public | Product pitch, CTA to register as Customer or Provider, how-it-works                                                                         |
| G2  | Login                       | `/login`                              | Public | Email/password login, JWT issuance, redirect by role                                                                                         |
| G3  | Register — Customer         | `/register/customer`                  | Public | Customer sign-up form                                                                                                                        |
| G4  | Register — Provider         | `/register/provider`                  | Public | Provider sign-up form, hands off into verification (see B2)                                                                                  |
| G5  | Forgot / Reset Password     | `/forgot-password`, `/reset-password` | Public | Email-based reset flow                                                                                                                       |
| G6  | App Shell / Dashboard Home  | `/dashboard`                          | All    | Post-login landing; role-based nav, summary widgets (active bookings, pending approvals, unread notifications)                               |
| G7  | Account Settings            | `/account`                            | All    | Name, email, phone, password change, notification preferences                                                                                |
| G8  | Notifications Center        | `/notifications`                      | All    | List of SignalR-pushed events (booking status, approval outcome, payout, review) with read/unread state                                      |
| G9  | Agent Monitoring & Approval | `/admin/agent-workflow`               | A      | Shared across all 4 components — see §5 (Job Feed & Dispatch) for full spec, since it's driven by that component's Coordinator/Action agents |
| G10 | Unauthorized (403)          | `/403`                                | All    | Shown when a role hits a route it can't access                                                                                               |
| G11 | Not Found (404)             | `*`                                   | All    | Catch-all                                                                                                                                    |
| G12 | Error / Service Down        | `/error`                              | All    | Generic fallback for unhandled API failures                                                                                                  |

---

## 1. Component: Provider Verification & Profiles

_(Your component — owner: Prageeth)_

Core responsibilities: NIC/certification upload, skill categories, service area (GPS), ratings/reviews, background-check status workflow. AI tie-in: Validation/Safety Agent.

| #   | Page                               | Route                           | Roles | Purpose                                                                                                                                                                                                                                      |
| --- | ---------------------------------- | ------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | Provider Verification Wizard       | `/provider/verification`        | P     | Multi-step form: personal/business info → skill category selection → service area (map picker, radius) → NIC/certification document upload → submit for review. Shows current status (`not_submitted` / `pending` / `approved` / `rejected`) |
| V2  | Verification Status Tracker        | `/provider/verification/status` | P     | Read-only view once submitted — shows reviewer notes if rejected, resubmit action                                                                                                                                                            |
| V3  | Provider Profile (self-edit)       | `/provider/profile`             | P     | Bio, profile photo, skill categories (post-verification edits), service area, portfolio/work photos                                                                                                                                          |
| V4  | Provider Public Profile            | `/providers/:providerId`        | C, A  | Customer-facing read view — verification badge, skills, service area, rating aggregate, review list, "Book" CTA (links into Service Listing or Instant Match flow)                                                                           |
| V5  | Admin Verification Queue           | `/admin/verifications`          | A     | Table of pending submissions, filter by status/category, bulk-view documents                                                                                                                                                                 |
| V6  | Admin Verification Detail / Review | `/admin/verifications/:id`      | A     | Document viewer, applicant details, **Approve / Reject / Request More Info** actions, links to background-check status                                                                                                                       |
| V7  | Ratings & Reviews Management       | `/provider/reviews`             | P     | Provider's own received reviews, response/reply capability                                                                                                                                                                                   |
| V8  | Admin Provider Directory           | `/admin/providers`              | A     | Master list of all providers — verification status, rating, active/suspended toggle                                                                                                                                                          |

---

## 2. Component: Booking & Scheduling

Core responsibilities: service requests (Instant Match + Service Listing bookings), provider availability calendar, booking confirmation/rescheduling, status workflow (`requested → accepted → in-progress → completed → disputed`).

| #   | Page                            | Route                      | Roles   | Purpose                                                                                                                                                   |
| --- | ------------------------------- | -------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | My Bookings — Customer          | `/bookings`                | C       | List/filter by status, upcoming vs. past, links into detail                                                                                               |
| B2  | My Bookings — Provider          | `/provider/bookings`       | P       | Same, provider-side view with accept/decline queue overlap (see Job Feed for the live dispatch queue itself)                                              |
| B3  | Booking Detail / Status Tracker | `/bookings/:id`            | C, P, A | Full lifecycle view — timeline of status changes, assigned provider/customer, quote/invoice link, chat/notes, dispute trigger                             |
| B4  | Reschedule Booking              | `/bookings/:id/reschedule` | C, P    | Date/time picker constrained to provider's published availability                                                                                         |
| B5  | Provider Availability Calendar  | `/provider/availability`   | P       | Weekly/monthly calendar to set open slots, block dates, recurring availability rules — feeds both Instant Match dispatch and Service Listing slot booking |
| B6  | Dispute Center                  | `/bookings/:id/dispute`    | C, P    | Raise/view a dispute with reason, evidence upload                                                                                                         |
| B7  | Admin Dispute Management        | `/admin/disputes`          | A       | Queue of open disputes, resolution actions, links back to Booking Detail                                                                                  |
| B8  | Admin Booking Overview          | `/admin/bookings`          | A       | All bookings across the platform, status filters, SLA/aging indicators                                                                                    |

---

## 3. Component: Payments & Invoicing

Core responsibilities: job quotes, itemised invoices, sandbox payment gateway integration, provider payout ledger. AI tie-in: price-estimation tool + approval-to-payment handoff.

| #   | Page                      | Route                       | Roles   | Purpose                                                                                 |
| --- | ------------------------- | --------------------------- | ------- | --------------------------------------------------------------------------------------- |
| I1  | Quote Review              | `/bookings/:id/quote`       | C       | Shows AI-estimated or listing-fixed price breakdown before accepting a booking          |
| I2  | Invoices List             | `/invoices`                 | C       | Itemised invoices per completed/in-progress booking, payment status badges              |
| I3  | Invoice Detail            | `/invoices/:id`             | C, P, A | Line items, tax/fees, payment status, download/print                                    |
| I4  | Checkout / Payment        | `/invoices/:id/pay`         | C       | Sandbox payment gateway (Stripe/PayHere sandbox) flow — card entry, confirmation        |
| I5  | Payment Methods           | `/account/payment-methods`  | C       | Saved sandbox payment methods, add/remove                                               |
| I6  | Provider Payout Dashboard | `/provider/payouts`         | P       | Earnings summary, pending vs. paid-out amounts                                          |
| I7  | Provider Payout History   | `/provider/payouts/history` | P       | Itemised payout ledger, per-booking breakdown, export                                   |
| I8  | Admin Payments Overview   | `/admin/payments`           | A       | Platform-wide payment/payout monitoring, failed-transaction alerts, reconciliation view |

---

## 4. Component: Job Feed & Dispatch

Core responsibilities: real-time nearby-provider matching (map-based), Service Listing publishing/browsing, urgent-request broadcast, provider accept/decline queue, job history/analytics. AI tie-in: Coordinator/Planner Agent, Action/Tool Agent, customer-facing AI assistant.

| #      | Page                                                    | Route                                                   | Roles | Purpose                                                                                                                                                                        |
| ------ | ------------------------------------------------------- | ------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| J1     | Service Listing — Create/Edit                           | `/provider/listings/new`, `/provider/listings/:id/edit` | P     | Fixed-scope, fixed-price listing form — title, description, category, price, availability slots, photos                                                                        |
| J2     | Service Listing Management                              | `/provider/listings`                                    | P     | Provider's own listings, active/paused toggle, booking count per listing                                                                                                       |
| J3     | Service Listing Browse / Search                         | `/listings`                                             | C     | Public-facing search/filter (category, price range, location, rating), map + list toggle                                                                                       |
| J4     | Service Listing Detail & Booking                        | `/listings/:id`                                         | C     | Full listing view, provider snapshot, slot picker, "Book Now"                                                                                                                  |
| J5     | AI Assistant Chat                                       | `/assistant`                                            | C     | Conversational search — "find me an AC technician this week" — surfaces matching listings or kicks off Instant Match, backend-mediated only                                    |
| J6     | Provider Dispatch Queue (live)                          | `/provider/dispatch`                                    | P     | Incoming Instant Match job offers — accept/decline, countdown timer, job summary                                                                                               |
| J7     | Admin Job Feed Monitor                                  | `/admin/job-feed`                                       | A     | Live view of in-flight Instant Match requests, matching status, map of active jobs                                                                                             |
| J8     | Admin Analytics Dashboard                               | `/admin/analytics`                                      | A     | Platform KPIs — job volume, avg. time-to-match, category breakdown, revenue, approval SLA                                                                                      |
| **J9** | **Agent Monitoring & Approval** _(= G9, jointly owned)_ | `/admin/agent-workflow`                                 | A     | Table of `agent_workflow` rows — plan, per-step tool calls/timing, validation outcome, tier (`approved_for_auto_dispatch` / `approved_with_audit` / `requires_human_approval`) |
| J10    | Agent Workflow Detail / Approval Action                 | `/admin/agent-workflow/:id`                             | A     | Full reasoning trail for one job — **Approve / Reject / Request Revision** controls for `requires_human_approval` items; read-only audit view for the other two tiers          |

---

## 5. Page Count Summary

| Component                        | Pages owned                                      |
| -------------------------------- | ------------------------------------------------ |
| General / Shared                 | 12                                               |
| Provider Verification & Profiles | 8                                                |
| Booking & Scheduling             | 8                                                |
| Payments & Invoicing             | 8                                                |
| Job Feed & Dispatch              | 10 (incl. shared Agent Monitoring, counted once) |
| **Total distinct pages**         | **~45**                                          |

Notes for the group:

- Pages tagged **A** (Admin) are the most cross-cutting — expect overlap discussions in standups since every component contributes an Admin surface.
- `/admin/agent-workflow` and `/admin/agent-workflow/:id` are explicitly called out in the proposal as the one jointly-owned React surface — build these together rather than assigning to a single owner.
- Public-facing pages (G1, V4, J3, J4) need no auth guard; everything else should sit behind the JWT/RBAC route guard with role checks per table above.
