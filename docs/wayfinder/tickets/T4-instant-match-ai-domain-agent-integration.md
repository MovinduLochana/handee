# Ticket T4: Instant Match AI Domain Agent & Admin Approval Gate Integration

**Labels**: `wayfinder:research`, `unblocked`

## Question

What are the exact integration gaps between Job Request submission on Flutter, the Python Domain Analysis Agent matching pipeline, and the React Admin approval gate?

## Context & Key Artifacts

- **Backend Controller**: [`JobRequestController.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.API/Controllers/JobRequestController.cs)
- **Agent Service**: [`AgentWorkflowService.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.API/Services/AgentWorkflowService.cs)
- **React Admin Screen**: [`AgentWorkflow.tsx`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/web/src/pages/dashboard/AgentWorkflow.tsx)
- **Python Agent Subsystem**: [`agents/`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/agents)

## Gaps to Resolve

1. **Job Request -> AI Invocation**: Verify `JobRequestController` persists job with `pending_ai_review` and triggers Python agent service asynchronously.
2. **Tiered Risk Evaluation**: Ensure Validation/Safety agent outputs `approved_for_auto_dispatch`, `approved_with_audit`, or `requires_human_approval`.
3. **React HITL Approval Action**: Verify Admin `Approve` / `Reject` / `Revise` actions in React update `agent_workflow` state and convert `JobRequest` into a confirmed `Booking`.
4. **SignalR Push to Mobile**: Confirm provider receiving the dispatch sees full booking details on Flutter (`dispatch_queue_screen.dart`).
