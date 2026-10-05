# 06: Customer Role Authorization on Review Actions & Ownership Cleanup

**What to build:** Restrict "Write a Review" actions on provider profiles strictly to logged-in customers. Guests and providers cannot see or trigger review submission, preventing unauthorized 401/403 API calls. Encapsulate profile ownership checks to avoid complex message chains.

**Blocked by:** None (can start immediately)

**Status:** complete

- [x] "Write a Review" button in the reviews section header is only visible when the user is logged in as a customer (`auth.isAuthenticated && auth.isCustomer`).
- [x] "Be the first to review" empty-state action button is only visible when the user is logged in as a customer.
- [x] Non-logged in visitors or provider accounts cannot see or trigger the review creation CTA.
- [x] Provider ownership check is encapsulated cleanly (e.g. `provider.isOwnedBy(user)` or `auth.isOwnerOf(provider)`).
- [x] Automated widget tests verify visibility of review action buttons across customer, provider, and unauthenticated states.
