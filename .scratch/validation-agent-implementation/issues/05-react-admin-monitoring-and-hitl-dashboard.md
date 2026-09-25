# 05: React Admin Agent Monitoring & HITL Dashboard Integration

**What to build:** Replace the hardcoded mock records in `web/src/pages/dashboard/AgentWorkflow.tsx` with live data fetched via a typed API client, and provide interactive administrator decision actions (Approve, Reject, Request Revision).

**Blocked by:** Issue 03 (Workflow Integration)

**Status:** closed

- [x] Create typed API client `web/src/api/agentWorkflow.ts` consuming:
  - `GET /api/admin/agent-workflows?tier={tier}&status={status}`
  - `GET /api/admin/agent-workflows/{id}`
  - `POST /api/admin/agent-workflows/{id}/decision` (`{ decision: "Approved" | "Rejected" | "Revised", note?: string }`)
- [x] Connect `AgentWorkflow.tsx` to fetch active workflows with loading and error states.
- [x] Implement filter tabs: `All`, `Requires Approval`, `Audit Required`, `Auto-Dispatched`.
- [x] Build workflow detail view displaying execution plan, candidate provider information, quote breakdown, and safety rule check metrics.
- [x] Add interactive decision modal allowing administrators to select Approve, Reject, or Request Revision with an optional decision note.
- [x] Verify that approving a workflow triggers backend booking creation and real-time updates without page reload.
