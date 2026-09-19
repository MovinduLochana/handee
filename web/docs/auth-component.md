# Authentication Component Documentation

The Authentication Component governs identity verification, token persistence, and user registration for the Handee Web application. It seamlessly integrates TanStack query state management, React UI components, and API integration.

## Architecture

The auth component is built across three primary layers:
1. **API Client (`src/api/auth.ts`)**: Core logic for interacting with backend authentication endpoints.
2. **Token Management (`src/lib/tokenManager.ts`)**: Native persistence layer storing session access and refresh tokens.
3. **UI Components (`src/pages/auth/`)**: User-facing React components presenting interactive forms for Login and Registration flows.

## UI Components

### `Login` (`Login.tsx`)
Presents the primary login form capturing email and password.
- Wraps `authApi.login` inside a TanStack query mutation.
- Successfully persists tokens via the API response.
- Navigates to `/dashboard` upon success.
- Displays responsive error banners extracting error messages securely.

### `RegisterCustomer` (`RegisterCustomer.tsx`)
Tailored onboarding form for customers. Automatically standardizes the `role: 'Customer'` field in the API request payload. Routes securely back to the login gateway upon successful account creation.

### `RegisterProvider` (`RegisterProvider.tsx`)
Tailored onboarding form for verified professionals and businesses. Standardizes the `role: 'Provider'` field.

## API Specification (`authApi`)
- `login({ email, password })`: Authenticates users and auto-injects persistent access/refresh tokens.
- `register(payload)`: Registers a new user based on specified `Customer` or `Provider` roles.
- `logout(refreshToken)`: Revokes backend tokens and proactively drops frontend `localStorage` tokens regardless of network state.
- `forgotPassword(email)` & `resetPassword(payload)`: Completes secure tokenized password recovery flows.

## Testing Suite
The component natively relies on a robust unit and integration testing suite utilizing Vitest and React Testing Library, housed entirely within `src/tests/`:
- **API Tests** (`src/tests/api/auth.test.ts`): Ensures token operations and mocked networking layers map flawlessly.
- **Component Tests** (`src/tests/pages/auth/*.test.tsx`): Extensively validates form interactivity, accessibility features, generic DOM mutations, error banner extractions, and React Router dom navigation mappings.
