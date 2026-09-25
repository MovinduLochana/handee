import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AgentWorkflow from "../../../pages/dashboard/AgentWorkflow";
import { agentWorkflowApi, type AgentWorkflowDto } from "../../../api/agentWorkflow";

vi.mock("../../../api/agentWorkflow", () => ({
  agentWorkflowApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getByJobId: vi.fn(),
    makeDecision: vi.fn(),
  },
}));

const mockWorkflows: AgentWorkflowDto[] = [
  {
    id: "wf-1",
    jobRequestId: "job-1",
    workflowId: "wf-test-001",
    objective: "Leaking pipe in kitchen sink",
    plan: [
      "1. Domain Analysis",
      "2. Action / Tool Agent",
      "3. Validation / Safety Agent",
      "4. Finalize",
    ],
    validationTier: "requires_human_approval",
    approvalStatus: "pending",
    estimatedPrice: 6500,
    selectedProviderId: "prov-1",
    selectedProviderName: "Sunil Perera",
    createdAt: new Date().toISOString(),
    decisionNote: null,
    decidedAt: null,
    stepLogs: [
      {
        id: "step-1",
        stepNumber: 1,
        agentName: "Coordinator / Planner Agent",
        action: "build_execution_plan",
        durationMs: 4,
        timestamp: new Date().toISOString(),
      },
      {
        id: "step-4",
        stepNumber: 4,
        agentName: "Validation / Safety Agent",
        action: "evaluate_safety_and_risk_rules",
        durationMs: 1,
        timestamp: new Date().toISOString(),
        outputData: JSON.stringify({
          risk_tier: "requires_human_approval",
          is_verified: true,
          reasons: ["Estimated price deviates by 85% from category median."],
        }),
      },
    ],
    finalResultJson: JSON.stringify({
      reasons: ["Estimated price deviates by 85% from category median."],
      evaluated_rules: [
        {
          rule_id: "H4_PRICE_OUTLIER",
          rule_name: "Category Price Median Band",
          passed: false,
          message: "Quote (Rs. 6,500) deviates severely from median.",
        },
      ],
    }),
  },
  {
    id: "wf-2",
    jobRequestId: "job-2",
    workflowId: "wf-test-002",
    objective: "Standard electrical switch repair",
    plan: [],
    validationTier: "approved_for_auto_dispatch",
    approvalStatus: "approved",
    estimatedPrice: 4000,
    selectedProviderId: "prov-2",
    selectedProviderName: "Kamal Fernando",
    createdAt: new Date().toISOString(),
    decisionNote: null,
    decidedAt: new Date().toISOString(),
    stepLogs: [],
    finalResultJson: null,
  },
];

describe("AgentWorkflow Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <AgentWorkflow />
      </MemoryRouter>
    );

  it("renders workflow list and summary metrics from API", async () => {
    vi.mocked(agentWorkflowApi.getAll).mockResolvedValue(mockWorkflows);
    renderComponent();

    expect(screen.getByText(/loading agent workflows/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Leaking pipe in kitchen sink")).toBeInTheDocument();
      expect(screen.getByText("Standard electrical switch repair")).toBeInTheDocument();
    });

    // Verify KPI numbers
    expect(screen.getByText("2")).toBeInTheDocument(); // Total Runs
    expect(screen.getByText("wf-test-001")).toBeInTheDocument();
    expect(screen.getByText("Sunil Perera")).toBeInTheDocument();
  });

  it("opens review modal and submits an approval decision", async () => {
    const user = userEvent.setup();
    vi.mocked(agentWorkflowApi.getAll).mockResolvedValue(mockWorkflows);
    vi.mocked(agentWorkflowApi.makeDecision).mockResolvedValue({
      ...mockWorkflows[0],
      approvalStatus: "approved",
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("wf-test-001")).toBeInTheDocument();
    });

    // Click "Review" button on the pending workflow
    const reviewBtn = screen.getByRole("button", { name: /review/i });
    await user.click(reviewBtn);

    // Verify drawer contents
    expect(screen.getByText("Workflow Audit & Governance")).toBeInTheDocument();
    expect(screen.getByText("Category Price Median Band")).toBeInTheDocument();

    // Click "Approve Match"
    const approveBtn = screen.getByRole("button", { name: /approve match/i });
    await user.click(approveBtn);

    await waitFor(() => {
      expect(agentWorkflowApi.makeDecision).toHaveBeenCalledWith("wf-1", "Approve", undefined);
      expect(screen.getByText(/workflow successfully marked as approve/i)).toBeInTheDocument();
    });
  });
});
