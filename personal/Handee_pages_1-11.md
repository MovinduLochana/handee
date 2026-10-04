# Handee - A Trust-Verified Home & Property Maintenance Marketplace

**SE3090 - Software Engineering Frameworks - Assignment 1 - Integrated Full-Stack and Agentic AI Application Development Project Proposal**

Faculty of Computing, SLIIT  
Released: 31 July 2026 | Due: 30 September 2026, 11:50 PM

## 1. Executive Summary

**Handee** is a trust-verified marketplace connecting homeowners with independently vetted tradespeople (plumbers, electricians, AC technicians, painters, and similar trades) across Sri Lanka. The platform addresses a well-known gap in the local informal services market: customers have no reliable way to verify a provider's credentials, availability, or fair pricing before a job starts, and providers have no structured way to build a reputation, publish their services, or secure steady bookings.

Handee is not limited to urgent, break-fix situations. A customer can request **Instant Match** for something that needs attention now, or browse **Service Listings** to book planned, routine maintenance in advance - the same way they'd book any other service. Both paths run through the same trust and verification backbone.

The system is built as a single ASP.NET Core Web API backed by PostgreSQL, consumed identically by a **React web application** and a **Flutter mobile application**. Rather than splitting these clients by user role, they are split by function: Flutter is the live, field-facing surface (submitting jobs, tracking a provider in real time, receiving push alerts), while React is the back-office self-service portal used by all three roles - Admins approving AI-flagged matches, Providers publishing and managing Service Listings and payouts, and Customers managing bookings, payments, and reviews. An internal Python Agentic AI service - never reachable directly by either client - automates the highest-value and most error-prone step in the workflow: matching a job to a qualified provider and validating the proposed quote, with a mandatory human approval gate before any high-impact decision reaches the customer. The same agent service also powers a customer-facing AI assistant, reached only through the backend, that helps customers find and reserve the right provider conversationally.

The four-person group splits ownership along four independent business components - **Booking & Scheduling**, **Provider Verification & Profiles**, **Payments & Invoicing**, and **Job Feed & Dispatch** - each carrying its own backend slice, database entities, React screens, Flutter screens, tests, and a distinct Agentic AI contribution, satisfying the module's Rule of Ownership.

## 2. Problem Statement & Domain Justification

Homeowners in Sri Lanka typically source tradespeople through word-of-mouth, informal Facebook groups, or unverified classifieds - whether the need is urgent or simply routine maintenance they've been putting off. This produces three recurring problems:

1. **No verification** of certification, identity, or past work quality before a stranger is invited into a home.
2. **No standard pricing reference**, leaving customers exposed to inflated quotes and providers exposed to lowball offers.
3. **No accountability mechanism** when work is incomplete, delayed, or disputed.

These problems exist whether someone is booking an emergency plumber at 9pm or scheduling a routine AC service two weeks out. Handee addresses all three by centralising verification, pricing benchmarks, and dispute-relevant history in one auditable system, while an Agentic AI layer automates provider matching and quote sanity-checking so that Admin staff only need to intervene on genuinely high-impact decisions rather than every booking.

**Domain fit for the rubric:** the marketplace naturally supports at least three distinct user roles, a clear cross-platform workflow (mobile-initiated job request -> backend -> AI matching -> web-based human approval -> status pushed back to mobile), and a HITL trigger with an obvious, defensible business rule (unverified provider, high-value quote, or an outlier price).

## 3. Project Objectives

- Deliver a production-grade, cloud-deployed full-stack application satisfying the **Single Public Backend Rule** and **Internal AI Service Rule** without exception.
- Implement a **four-agent Agentic AI subsystem** that plans, analyses, acts through allow-listed tools, and validates its own output against deterministic business rules before any customer-facing effect.
- Support **both on-demand and scheduled bookings** through two complementary paths - AI-matched Instant Match and browsable Service Listings - so the platform serves everyday maintenance, not just emergencies.
- Demonstrate the mandated **cross-platform workflow** end-to-end: job submitted on Flutter, processed by ASP.NET Core and the AI service, approved on React, and reflected back on Flutter in real time via SignalR.
- Achieve secure, **role-based access control (JWT + RBAC)** across all three user roles, on both clients.
- Produce a reproducible, version-controlled deployment (**Terraform on Azure, GitHub Actions CI/CD**) so the live system can be rebuilt in minutes if anything breaks before evaluation.
- Document architectural reasoning through **Architecture Decision Records (ADRs)** covering deployment topology, service boundaries, observability, and infrastructure-as-code choices.

## 4. Scope of Work

### 4.1 In Scope

- Customer and Provider registration, authentication, and role-based dashboards on both Flutter and React.
- Job request submission with category, description, photos, location, urgency, and budget range (Flutter) - for on-demand, AI-matched work.
- Service Listing publishing and browsing - fixed-scope, fixed-price offerings customers can book directly for planned maintenance (React for Providers to publish/manage, both Flutter and React for Customers to browse/book).
- Provider verification workflow: document upload, skill categories, service area, background-check status.
- AI-driven provider matching and quote validation, with an Admin approval gate in React.
- A customer-facing AI assistant (backend-mediated) that helps customers find and reserve a suitable provider or Service Listing.
- Booking lifecycle management (requested -> accepted -> in-progress -> completed -> disputed).
- Invoicing and payment status tracking through a sandbox payment gateway.
- Real-time status updates (SignalR), ratings and reviews, and basic analytics for Admin.

### 4.2 Out of Scope (for this assignment)

- Real money transactions - all payments run through a sandbox/test gateway.
- Full production-scale Kubernetes hosting - K8s/Istio is delivered as a repository artifact and local demo only, not the production host.
- Multi-country localisation or multi-currency support.

## 5. User Roles

| Role | Flutter (live/field surface) | React (self-service portal) |
|---|---|---|
| **Customer** | Submits job requests with photos/location/budget, tracks booking status in real time, chats with the AI assistant to find providers on the go. | Browses Service Listings, books planned maintenance, manages payment methods, views invoices/payment status, rates completed jobs. |
| **Service Provider** | Receives job dispatch alerts, accepts/declines in real time, updates job progress in the field. | Completes verification, publishes and manages Service Listings, sets availability calendar, views payout history and earnings. |
| **Admin / Dispatcher** | - (React only) | Reviews and approves AI-generated provider matches and quotes when flagged for human review, manages provider verification status, oversees disputes, monitors platform analytics and the agent workflow audit trail. |

Splitting by function rather than duplicating every screen on every client keeps the mandated cross-platform demo workflow unambiguous - a job is always initiated on Flutter - while giving Providers and Customers a proper desktop-class portal for the parts of the experience that aren't time-critical.

## 6. High-Level System Architecture

The system follows the module's mandatory architecture pattern exactly: both clients talk only to ASP.NET Core, which is the sole owner of the PostgreSQL database and the only caller of the internal Agentic AI service.

```text
React Web Portal                          Flutter Mobile App
Admin approval                            Customer job submission & tracking
Provider listings & payouts               Provider live dispatch
Customer bookings
          \                               /
           \ REST/JSON                   / REST/JSON
            v                           v
                 ASP.NET Core Web API
                 Single public entry point
                       |        |        \
                       |        |         \ Internal HTTP/gRPC
                       |        |          v
                       |        |    Python Agentic AI Service
                       |        |    LangGraph, internal only
                       |        |
                       |        +--> SignalR Hub
                       |
                       +--> PostgreSQL via EF Core

Real-time push to React and Flutter occurs through WebSocket connections to SignalR.
```

### 6.1 Non-Negotiable Architecture Rules

- **Single Public Backend:** React and Flutter consume the exact same ASP.NET Core API and PostgreSQL database - no disconnected prototypes.
- **Internal AI Service:** the Agentic AI subsystem is invoked internally by the backend only; neither client ever calls it directly - including the customer-facing AI assistant, which is just another authenticated backend endpoint that happens to call the agent service internally.
- **Cross-Platform Workflow:** job initiated on Flutter -> backend + database -> AI execution triggered -> pause for human approval on React -> final status pushed back to Flutter.

### 6.2 Mandatory Technology Stack

| Layer | Technology |
|---|---|
| Backend | C# / ASP.NET Core Web API - single public entry point |
| Database & ORM | PostgreSQL + Entity Framework Core (migrations, constraints, seed data) |
| Web App | React (functional components, hooks, routing, state management) - Admin, Provider, and Customer self-service portal |
| Mobile App | Flutter & Dart - Customer and Provider live/field apps; camera, GPS, secure storage, push notifications |
| Agentic AI | Python - LangGraph orchestration (FastAPI service), Pydantic schema validation |
| CI/CD & Testing | Git, GitHub Actions, unit/integration/performance tests, agent golden-case evaluation |

## 7. Component Ownership & Team Structure

Each of the four group members owns one business component end-to-end - backend API, database entities, React screens, Flutter screens, tests, and a distinct Agentic AI contribution - in line with the module's Rule of Ownership.

| Component | Core Responsibilities | Agentic AI Contribution |
|---|---|---|
| **Booking & Scheduling** | Service requests (both Instant Match and Service Listing bookings), provider availability calendar, booking confirmation/rescheduling, status workflow (requested -> accepted -> in-progress -> completed -> disputed). | **Domain Analysis Agent** - classifies job category, estimates scope/complexity, flags ambiguous descriptions. |
| **Provider Verification & Profiles** | NIC/certification upload, skill categories, service area (GPS), ratings/reviews, background-check status workflow. | **Validation / Safety Agent** - enforces verification and rating rules before any match is approved. |
| **Payments & Invoicing** | Job quotes, itemised invoices, sandbox payment gateway integration, provider payout ledger. | **Price-estimation tool + approval-to-payment handoff logic.** |
| **Job Feed & Dispatch** | Real-time nearby-provider matching (map-based), Service Listing publishing/browsing, urgent-request broadcast, provider accept/decline queue, job history/analytics. | **Coordinator/Planner Agent, Action/Tool Agent, and the customer-facing AI assistant endpoint** - build the plan, execute matching tool calls, and power conversational search over listings and providers. |

All four members additionally share responsibility for the shared `agent_workflow` persistence layer, the React Agent Monitoring/Approval screen, and integration testing across component boundaries, since the core demo workflow deliberately touches every component.

## 8. Two Booking Paths

Handee supports two complementary ways to get work done, both backed by the same verification and trust layer:

| | Instant Match | Service Listing |
|---|---|---|
| **Best for** | Something needs attention now - leak, outage, urgent repair. | Planned, routine maintenance - AC servicing, painting, gutter cleaning. |
| **Initiated by** | Customer submits a free-text job request on Flutter. | Provider publishes a fixed-scope, fixed-price listing on React; Customer browses and books a slot. |
| **Provider selection** | AI-matched - Coordinator, Domain Analysis, and Action/Tool agents find and propose a provider. | Customer-selected directly from the listing. |
| **Pricing** | AI-estimated, validated against category price bands. | Fixed by the Provider in advance. |
| **HITL gate** | Yes - Validation/Safety agent can require Admin approval. | Only if flagged by the same deterministic rules (e.g. a first-time provider's very first listing bookings). |

The customer-facing AI assistant sits across both paths - a customer can ask it to find an available AC technician this week, and it can either point them at a matching Service Listing or kick off an Instant Match request, depending on what's available.

## 9. Core Cross-Platform Workflow: Job Dispatch & Quote Validation (Instant Match)

This single workflow remains the centrepiece of the demo: it is the one interaction that provably touches Flutter, ASP.NET Core, PostgreSQL, all four AI agents, the React approval screen, and the SignalR push back to Flutter - satisfying the mandated cross-platform pattern in one pass.

### 9.1 Trigger

A customer submits a job request in Flutter (category, description, photos, location, urgency, budget range). ASP.NET Core validates and persists the request to PostgreSQL with status `pending_ai_review`, then internally invokes the Agentic AI service with the job ID.

### 9.2 End-to-End Sequence

```text
Customer (Flutter)
    |
    | Submit job request
    v
ASP.NET Core
    |
    | Save JobRequest (pending_ai_review)
    v
PostgreSQL
    ^
    |
ASP.NET Core
    |
    | Invoke workflow (job ID)
    v
Agentic AI Service
    |
    | Coordinator builds plan
    | Domain Analysis classifies job and estimates scope
    | Action/Tool agent queries providers and pricing
    | Validation/Safety agent checks rules
    |
    +--> [Requires human approval]
    |        |
    |        | Save agent_workflow (pending_approval)
    |        v
    |     PostgreSQL
    |        ^
    |        |
    |     Admin (React): Approve / Reject / Revise
    |        |
    |        v
    |     ASP.NET Core updates Booking status
    |
    +--> [Auto-approved]
             |
             | Save agent_workflow (approved_for_auto_dispatch)
             v
          PostgreSQL
             ^
             |
          ASP.NET Core updates Booking status
             |
             | Push final status via SignalR
             v
          Customer (Flutter)
```

## 10. Agentic AI Subsystem Design

The subsystem satisfies the module's minimum criteria: at least four distinct agents, allow-listed tool calls, persisted state in the database, deterministic schema validation, and a genuine Human-in-the-Loop approval control on a high-impact action.

### 10.1 Agent Roster

| Agent | Allowed Tools | Responsibility |
|---|---|---|
| **Coordinator / Planner** | None directly - delegates only. | Receives the objective, builds an explicit step plan, and routes each step to the correct downstream agent. Never touches a tool itself. |
| **Domain Analysis** | `classify_job_category()`, `estimate_scope()` | Classifies the job category and estimates complexity/duration from the free-text description; flags ambiguity for a wider cost range. |
| **Action / Tool** | `search_providers()`, `estimate_price()`, `check_provider_rating()`, `search_service_listings()` | Executes matching and pricing against PostgreSQL and historical job data, and searches published Service Listings for the AI assistant; returns a ranked, schema-validated candidate list. |
| **Validation / Safety** | None - pure rule evaluation, no tool calls. | Deterministic, **tiered** risk checks: provider must be verified, quote must fall within an accepted band of the category average, rating must clear a configurable threshold. Produces one of three outcomes - `approved_for_auto_dispatch`, `approved_with_audit`, or `requires_human_approval` - rather than a single binary flag. |

### 10.2 Customer-Facing AI Assistant

A conversational entry point, reached only via an authenticated backend endpoint (e.g. `POST /api/assistant/query`), lets customers ask for help in natural language ("find me a plumber available this weekend under Rs 5,000"). The backend forwards the query to the Agentic AI service, which uses the same Action/Tool agent (`search_providers`, `search_service_listings`) to return ranked, schema-validated results. This preserves the Internal AI Service Rule exactly - the client only ever talks to ASP.NET Core.

### 10.3 Shared State & Persistence

Every workflow run is persisted in an `agent_workflow` table keyed by workflow ID, storing:

- The objective.
- The plan.
- Each step's tool inputs/outputs and timing.
- The validation outcome.
- The approval status (`pending` / `approved` / `rejected` / `revised`).
- The final result.

This table is both the audit trail the rubric expects and the data source for the React Agent Monitoring screen.

### 10.4 Human-in-the-Loop Approval Gate - Tiered, Not Binary

A blanket "every match waits for a human" rule would defeat the point of Instant Match, so the Validation/Safety agent classifies every proposal into one of three risk tiers instead of a single pass/fail flag:

| Tier | Condition | Effect |
|---|---|---|
| **Low risk** | Verified provider with an established rating, quote within the normal band for the category. | `approved_for_auto_dispatch` - dispatched immediately, no human in the loop. This is the expected outcome for the large majority of jobs once the provider base and price history mature. |
| **Medium risk** | One soft signal only - e.g. a moderately new provider with an otherwise clean record, or a quote slightly outside the band. | `approved_with_audit` - the provider is notified and dispatched immediately (so the customer still gets an instant response), but the proposal is queued for Admin review after the fact. If Admin later rejects it, the booking is flagged for follow-up rather than blocking dispatch upfront. |
| **High risk** | First-time or borderline-rated provider **and** an outlier quote, or any deterministic rule fails outright. | `requires_human_approval` - the only tier that pauses dispatch. The proposal, provider, quote, and agent reasoning trail are shown to the Admin in React with **Approve**, **Reject**, and **Request Revision** controls; only an explicit Admin action moves the job out of `pending_approval`, and the result is what Flutter reflects to the customer. |

Two design choices keep this honest rather than just theoretical:

- **The gate gets narrower over time.** Both flagging conditions (provider trust, price-band variance) are driven by historical data that thickens as the platform

<!-- End of source page 11. The sentence continues on page 12 of the original document. -->
