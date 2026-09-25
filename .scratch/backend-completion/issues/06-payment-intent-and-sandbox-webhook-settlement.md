# 06: Payment Intent & Sandbox Webhook Settlement

**What to build:** A structured sandbox payment flow that creates payment intents for unpaid booking invoices, accepts asynchronous gateway webhook callbacks, validates payment status transitions, and automatically credits the provider payout ledger upon successful settlement.

**Blocked by:** 02: Customer Service Listing Booking Flow

**Status:** ready-for-agent

- [ ] Customers can initiate payment by requesting a payment intent for their unpaid booking invoice, receiving a transaction reference or client token.
- [ ] The backend exposes a sandbox webhook endpoint that verifies incoming gateway payloads and marks the corresponding invoice as `Paid`.
- [ ] Duplicate or replay webhook events are handled idempotently without duplicate charges or corrupted statuses.
- [ ] Successfully settling an invoice automatically creates an auditable payout entry in the provider's ledger with platform fees subtracted from the gross total.
- [ ] If payment processing fails or is cancelled, the invoice remains in an unpaid status and error details are recorded.
- [ ] Payment intent generation, webhook settlement idempotency, and ledger credit calculations are verified by automated tests.
