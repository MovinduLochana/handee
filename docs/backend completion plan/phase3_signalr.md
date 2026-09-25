# Real-Time SignalR Status & Dispatch Architecture

## Overview & Objective

ASP.NET Core SignalR provides a persistent, bi-directional communication channel between the Handee backend API and mobile/web clients (Flutter and React). This satisfies the platform requirement for real-time tracking, eliminating the latency and overhead of periodic HTTPS polling.

Whenever a booking lifecycle state transitions (e.g., `Requested` -> `Accepted` -> `InProgress` -> `Completed` or `Disputed`), or when an AI agent dispatches an emergency job, events are immediately pushed down open WebSockets to the relevant parties in sub-milliseconds.

---

## How SignalR Works

### 1. Persistent Push vs Traditional Polling

```
Traditional HTTP Polling:
Client  ─── "Any new updates?" (GET /bookings/123) ───▶ Server (No)
Client  ─── "Any new updates?" (GET /bookings/123) ───▶ Server (No)
Client  ─── "Any new updates?" (GET /bookings/123) ───▶ Server (Yes: "Accepted")
(High network overhead, high database load, latency between checks)

SignalR Persistent Push:
Client  ◄═══════════════ Persistent WebSocket ═══════════════▶ Server
Server  ─── "ReceiveBookingStatusUpdate('Accepted')" ────────▶ Client
(Sub-millisecond latency, zero polling overhead)
```

### 2. Transport Mechanism Negotiation

SignalR automatically negotiates the optimal transport mechanism available on the client and network:
1. **WebSockets** *(preferred)*: Full-duplex persistent TCP connection.
2. **Server-Sent Events (SSE)**: One-way server-to-client streaming fallback.
3. **Long Polling**: Fallback HTTP polling when persistent socket connections are blocked by proxies/firewalls.

### 3. Core Architectural Concepts

#### A. The Hub (`BookingHub : Hub<IBookingClient>`)
The **Hub** is the central ASP.NET Core construct handling client connections and Remote Procedure Calls (RPC). By inheriting from `Hub<IBookingClient>`, it is **strongly typed**, avoiding magic strings and ensuring compile-time safety across client-callable methods.

#### B. Connection ID (`Context.ConnectionId`)
Each individual client connection (e.g., a browser tab or mobile app instance) is assigned a unique `ConnectionId`. If a user opens Handee on both their mobile phone and desktop browser, they will have two distinct `ConnectionId` values.

#### C. Secure Target Groups (`Groups.AddToGroupAsync`)
To ensure privacy and avoid sending global broadcasts (`Clients.All`), SignalR segments connections into secure, identifier-specific groups:
- `Customer_{userId}`: Enrolled when an authenticated user has the `Customer` role.
- `Provider_{userId}`: Enrolled when an authenticated user has the `Provider` role.
- `Admin`: Enrolled when an authenticated user has the `Admin` role.

When an event is dispatched to group `Provider_{providerId}`, every active connection for that provider (phone, laptop, tablet) receives the push notification simultaneously. When a connection drops or closes, SignalR automatically purges it from group rosters.

#### D. WebSocket JWT Bearer Authentication
Standard browser `WebSocket` APIs cannot attach custom HTTP request headers (like `Authorization: Bearer <token>`) during the initial WebSocket handshake. 

To solve this securely:
1. The client passes the JWT bearer token as a query string parameter: `/hubs/booking?access_token=<JWT>`.
2. `HubAuthExtensions.ConfigureHubJwtBearer` intercepts requests matching the `/hubs/` path prefix and populates `context.Token = accessToken`.
3. SignalR unpacks the JWT claims into `Context.User`, allowing the `[Authorize]` attribute and role checks (`user.IsInRole("Provider")`) to function natively.

---

## Component Architecture

```
┌────────────────────────┐      ┌─────────────────────────┐
│     Mobile / Web       │      │      Mobile / Web       │
│    Customer Client     │      │     Provider Client     │
└───────────▲────────────┘      └────────────▲────────────┘
            │                                │
      WebSocket                      WebSocket
   (Customer_{id})                (Provider_{id})
            │                                │
┌───────────┴────────────────────────────────┴────────────┐
│                    BookingHub                           │
│              (/hubs/booking, [Authorize])               │
└───────────────────────────▲─────────────────────────────┘
                            │
              IBookingNotificationService
             (BookingNotificationService)
                            │
         ┌──────────────────┴──────────────────┐
         │                                     │
   BookingService                     AgentWorkflowService
 (Status Updates &                     (AI Job Dispatches &
  Listing Bookings)                     Admin Approvals)
```

---

## Typed Client Contract (`IBookingClient`)

Located in [`src/backend/handee.Api/Hubs/IBookingClient.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Api/Hubs/IBookingClient.cs):

```csharp
namespace handee.API.Hubs;

public interface IBookingClient
{
    Task ReceiveBookingStatusUpdate(Guid bookingId, string status, DateTimeOffset timestamp);
    Task ReceiveNewJobDispatch(Guid bookingId, Guid? jobRequestId, string category, decimal? estimatedPrice);
    Task ReceiveDisputeAlert(Guid bookingId, string reason);
}
```

---

## Event Trigger Points

| Event Trigger | Originating Service & Method | Target Groups | Client RPC Method |
|---|---|---|---|
| **Booking Status Transition** | `BookingService.UpdateStatusAsync` | `Customer_{customerId}`, `Provider_{providerId}`, `Admin` | `ReceiveBookingStatusUpdate(bookingId, status, timestamp)` |
| **Dispute Flagged** | `BookingService.UpdateStatusAsync` (to `Disputed`) | `Customer_{customerId}`, `Provider_{providerId}`, `Admin` | `ReceiveDisputeAlert(bookingId, reason)` |
| **Listing Booked** | `BookingService.CreateFromListingAsync` | `Provider_{providerId}` | `ReceiveNewJobDispatch(bookingId, null, category, fixedPrice)` |
| **AI Auto-Dispatch** | `AgentWorkflowService.DispatchWorkflowAsync` | `Provider_{providerId}` | `ReceiveNewJobDispatch(bookingId, jobRequestId, category, price)` |
| **Admin Decision Approved** | `AgentWorkflowService.MakeDecisionAsync` | `Provider_{providerId}` | `ReceiveNewJobDispatch(bookingId, jobRequestId, category, price)` |

---

## Manual Verification Guide

### 1. Launch the Backend API

```powershell
dotnet run --project src/backend/handee.Api
```
The API listens at `http://localhost:5057` (or `https://localhost:7071`).

### 2. Retrieve an Access Token

#### For a Provider:
```powershell
curl -X POST http://localhost:5057/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"provider1@mockdata.local","password":"Password123!"}'
```

#### For a Customer:
```powershell
curl -X POST http://localhost:5057/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"customer1@mockdata.local","password":"Password123!"}'
```
Copy the returned `accessToken`.

### 3. Connect via Browser Console (F12)

Open DevTools in any browser tab and paste:

```javascript
// 1. Dynamically load SignalR client library
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/microsoft-signalr/8.0.7/signalr.min.js';
document.head.appendChild(script);

script.onload = async () => {
    // 2. Replace with your JWT token
    const token = "<YOUR_ACCESS_TOKEN_HERE>";

    const connection = new signalR.HubConnectionBuilder()
        .withUrl("http://localhost:5057/hubs/booking", {
            accessTokenFactory: () => token
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

    // 3. Register real-time event listeners
    connection.on("ReceiveBookingStatusUpdate", (bookingId, status, timestamp) => {
        console.log("%c[SignalR] Status Update:", "color: #22c55e; font-weight: bold;", {
            bookingId, status, timestamp
        });
    });

    connection.on("ReceiveNewJobDispatch", (bookingId, jobRequestId, category, estimatedPrice) => {
        console.log("%c[SignalR] New Job Dispatched:", "color: #3b82f6; font-weight: bold;", {
            bookingId, jobRequestId, category, estimatedPrice
        });
    });

    connection.on("ReceiveDisputeAlert", (bookingId, reason) => {
        console.log("%c[SignalR] Dispute Alert:", "color: #ef4444; font-weight: bold;", {
            bookingId, reason
        });
    });

    // 4. Start connection
    try {
        await connection.start();
        console.log("%c[SignalR] Connected successfully to /hubs/booking!", "color: #10b981; font-weight: bold;");
    } catch (err) {
        console.error("[SignalR] Connection failed:", err);
    }
};
```

### 4. Trigger Real-Time Events

1. **Trigger Status Change**:
   ```powershell
   curl -X PATCH http://localhost:5057/api/bookings/<BOOKING_ID>/status `
     -H "Authorization: Bearer <TOKEN>" `
     -H "Content-Type: application/json" `
     -d '{"status":"Accepted"}'
   ```
2. **Trigger Dispute**:
   ```powershell
   curl -X PATCH http://localhost:5057/api/bookings/<BOOKING_ID>/status `
     -H "Authorization: Bearer <CUSTOMER_TOKEN>" `
     -H "Content-Type: application/json" `
     -d '{"status":"Disputed"}'
   ```
3. **Trigger Listing Booking**:
   ```powershell
   curl -X POST http://localhost:5057/api/bookings/from-listing `
     -H "Authorization: Bearer <CUSTOMER_TOKEN>" `
     -H "Content-Type: application/json" `
     -d '{"serviceListingId":"<LISTING_ID>", "scheduledAt":"2026-10-01T10:00:00Z"}'
   ```

---

## Automated Test Coverage

The SignalR implementation is thoroughly verified by automated unit and integration tests:

1. **Hub Group Enrollment & Lifecycle**: [`BookingHubTests.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Tests/Hubs/BookingHubTests.cs)
   - Verified automated mapping to `Customer_{id}`, `Provider_{id}`, and `Admin` groups based on claims.
   - Verified graceful disconnection handling without unhandled server exceptions.
2. **Notification Dispatching**: [`BookingNotificationServiceTests.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Tests/Hubs/BookingNotificationServiceTests.cs)
   - Verified typed status update broadcasts to customer, provider, and admin groups.
   - Verified simultaneous `ReceiveDisputeAlert` dispatch upon `Disputed` status.
   - Verified `ReceiveNewJobDispatch` delivery to target provider groups.
3. **Service Layer Integration**:
   - Status updates triggering notifications: [`BookingServiceTests.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Tests/Bookings/BookingServiceTests.cs)
   - Listing booking triggering job dispatch: [`ListingBookingServiceTests.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Tests/Bookings/ListingBookingServiceTests.cs)
   - AI auto-dispatch and Admin approvals triggering job dispatch: [`AgentWorkflowDispatchNotificationTests.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Tests/Workflows/AgentWorkflowDispatchNotificationTests.cs)
4. **WebSocket JWT Authentication Pipeline**: [`HubAuthenticationPipelineTests.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Tests/Hubs/HubAuthenticationPipelineTests.cs)
   - Verified query-string `access_token` extraction for `/hubs/` requests.
   - Verified rejection of query-string token extraction on non-hub routes.
   - Verified `[Authorize]` attribute enforcement on `BookingHub`.
