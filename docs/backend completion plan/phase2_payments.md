# Phase 2: Quotes, Invoices, and Payments

## Objective
Implement the financial backbone of Handee by introducing `Quote`, `Invoice`, and `Payment` entities along with a sandbox payment gateway integration. This enables the Agentic AI to propose priced quotes, customers to accept them, and tracks the lifecycle of Sandbox payments.

## Domain Relationships
- A `Quote` belongs to a [Booking](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Api/Entities/Booking.cs#12-51).
- An `Invoice` is generated from an accepted `Quote` or a fixed-price `ServiceListing` booking.
- A `Payment` (Transaction) belongs to an `Invoice`.

## Step-by-Step Implementation Plan

### 1. Database Entities (`src/backend/handee.Api/Entities/`)
Create the following entities:

**`Quote.cs`**
- `Id` (Guid), `BookingId` (Guid)
- `EstimatedAmount` (decimal), `Notes` (string)
- `Status` (Enum: Pending, Accepted, Rejected)
- `CreatedAt`, `UpdatedAt`

**`Invoice.cs`**
- `Id` (Guid), `BookingId` (Guid)
- `TotalAmount` (decimal), `TaxAmount` (decimal), `PlatformFee` (decimal)
- `Status` (Enum: Unpaid, Paid, Cancelled)
- `DueDate` (DateTimeOffset), `CreatedAt`, `UpdatedAt`

**`Payment.cs`**
- `Id` (Guid), `InvoiceId` (Guid)
- `Amount` (decimal), `ProviderPayoutAmount` (decimal)
- `GatewayTransactionId` (string, for Stripe/PayHere sandbox)
- `Status` (Enum: Processing, Succeeded, Failed, Refunded)
- `CreatedAt`, `UpdatedAt`

*Required Update:* Add `DbSet`s to `ApplicationDbContext.cs` and configure relationships using EF Fluent API to prevent cascade delete cycles. Run EF Core migrations.

### 2. Sandbox Payment Integration 
Create a lightweight wrapper for Stripe/PayHere (Sandbox Mode):
- `IPaymentGatewayService` specifying `CreatePaymentIntentAsync(Invoice invoice)` and `ProcessWebhookAsync(payload)`
- Implement a mock or sandbox version using Stripe `.NET SDK` inside `PaymentGatewayService.cs`.

### 3. Service Layer and Business Logic
- `IQuoteService`: `CreateQuoteAsync`, `AcceptQuoteAsync`, `RejectQuoteAsync`
- `IInvoiceService`: `GenerateInvoiceForBookingAsync`, `GetInvoiceAsync`
- `IPaymentService`: `CreatePaymentForInvoiceAsync`, `GetPaymentStatusAsync`

### 4. API Controllers
- `QuoteController`: Expose endpoints for the AI agent (via backend) to post quotes, and for Customers to accept/reject them.
- `PaymentController`: Expose endpoints to fetch payment intents and an unauthenticated, restricted `/api/payments/webhook` for the Sandbox Gateway to hit on success.

## Definition of Done
- EF Migrations apply the financial tables cleanly.
- Agentic workflow can persist a `Quote` against a pending booking.
- Customers can pay mock invoices, creating a `Payment` transaction that moves the `Invoice` status to `Paid`.
