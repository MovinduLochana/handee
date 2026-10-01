# Ticket T5: React Web App Customer Bookings & Self-Service Portal

**Labels**: `wayfinder:task`, `unblocked`

## Question

How do we design and build a customer-facing bookings portal screen in the React Web App (`/customer/bookings` or `/bookings`) to view, manage, filter, reschedule, and review bookings?

## Context & Key Artifacts

- **React App Routes**: [`App.tsx`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/web/src/App.tsx)
- **React Navigation**: [`AppShell.tsx`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/web/src/components/layout/AppShell.tsx)
- **API Client**: [`bookings.ts`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/web/src/api/bookings.ts)

## Gaps to Resolve

1. **Missing Customer Route**: Currently, React portal has `/admin/bookings` for Admins and provider listings for Providers, but no dedicated `/customer/bookings` route for Customers.
2. **Customer Bookings Dashboard**: Create a modern React page for Customers showing active and past bookings with filter tabs (`All`, `Upcoming`, `Completed`, `Disputed`).
3. **Self-Service Actions**: Provide quick-action buttons on booking cards for Customers:
   - Pay / View Invoice
   - Reschedule Booking
   - Cancel Booking
   - Open Dispute
   - Leave Provider Review & Rating
