# General Pages Implementation (G1-G12)

This document serves as the technical record for the General & Shared Pages module of the Handee Web application.

## Overview
The General Pages module encompasses the first 12 core pages responsible for public routing, user onboarding, authentication, global dashboard layouts, and generic error states. These views establish the visual and architectural foundation for the entire application.

## Component Structure & Routing
All routes are controlled via `react-router-dom` within `src/App.tsx`.

### 1. Public Marketing
- **Landing Page (`/` - G1)**
  - **Component:** `src/pages/Landing.tsx`
  - **Styles:** `Landing.css`
  - **Design Note:** Built using a "Bolder UI" aesthetic, emphasizing typography scaling, asymmetric composition, and a clear value proposition with Trust Badges. 
  - **Motion:** Staggered `fade-up` CSS entrance choreographies.

### 2. Authentication & Onboarding
- **Login (`/login` - G2)**
  - **Component:** `src/pages/auth/Login.tsx`
- **Customer Registration (`/register/customer` - G3)**
  - **Component:** `src/pages/auth/RegisterCustomer.tsx`
- **Provider Registration (`/register/provider` - G4)**
  - **Component:** `src/pages/auth/RegisterProvider.tsx`
- **Password Reset (`/forgot-password`, `/reset-password` - G5)**
  - **Components:** `src/pages/auth/ForgotPassword.tsx`, `src/pages/auth/ResetPassword.tsx`

*Design Note for Auth Interfaces:* All authentication views utilize a shared aesthetic governed by `Auth.css`. This enforces high structural padding, soft elevation shadows (`shadow-xl`), and modern input ring-focus states.

### 3. Shared Dashboard Forms & Views
These components require authentication and are wrapped by `src/components/layout/AppShell.tsx`, which provides the persistent sidebar and top navigation interface.

- **Dashboard Shell Output (`/dashboard` - G6)**
  - **Component:** `src/pages/dashboard/DashboardHome.tsx`
  - **Features:** Provides the KPI summary blocks. Uses `.hover-lift` physics and a `.animate-pulse-gentle` indicator to subtly guide user attention without annoyance.
- **Account Settings (`/account` - G7)**
  - **Component:** `src/pages/dashboard/AccountSettings.tsx`
  - **Features:** Houses personal configuration. Engineered with an inline button saving micro-interaction mimicking the network resolution process.
- **Notifications Center (`/notifications` - G8)**
  - **Component:** `src/pages/dashboard/Notifications.tsx`
  - **Features:** Designed with an intentional "Inbox Zero" celebratory empty state to promote psychological delight upon checking notifications.
- **Agent Monitoring (`/admin/agent-workflow` - G9)**
  - **Component:** `src/pages/dashboard/AgentWorkflow.tsx`
  - **Features:** Shared internal admin dashboard representing system AI Agent pipelines (e.g. `Validation/Safety` agents).

### 4. Application Error Boundaries
- **Unauthorized (`/403` - G10)**: `src/pages/error/Unauthorized.tsx`
- **Not Found (`*` mapping to 404 - G11)**: `src/pages/error/NotFound.tsx`
- **Server Error (`/500` - G12)**: `src/pages/error/ServerError.tsx`

*Design Note for Errors:* Error boundaries are strictly functional. They provide an instant explanation and a direct hard-route back to safety (`/` or `/dashboard`).

## Design Vocabulary & Variables
Global tokens are recorded in `src/index.css`.
- **Primary Font**: `Outfit` (Ranges from lightweight 200 to ultra-bold 900)
- **Backgrounds**: Tinted slate-blues (`#F8FAFC`, `#F1F5F9`) instead of pure gray, building cohesive trust. Dark mode support mapped successfully.
- **Brand Accent**: Ultramarine Royal Blue (`#2563EB`) communicating speed and modern efficiency.
- **Micro-Animations**: All global keyframes (`fadeUp`, `pulseGentle`, `spin`) are maintained at the root CSS layer for high portability.
