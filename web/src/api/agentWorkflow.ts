import { api } from "../lib/api";

export interface AgentStepLogDto {
  id: string;
  stepNumber: number;
  agentName: string;
  action: string;
  inputData?: string | null;
  outputData?: string | null;
  durationMs: number;
  timestamp: string;
}

export interface AgentWorkflowDto {
  id: string;
  jobRequestId: string;
  workflowId: string;
  objective: string;
  plan: string[];
  validationTier: string;
  approvalStatus: string;
  estimatedPrice?: number | null;
  selectedProviderId?: string | null;
  selectedProviderName?: string | null;
  finalResultJson?: string | null;
  decisionNote?: string | null;
  decidedAt?: string | null;
  createdAt: string;
  stepLogs: AgentStepLogDto[];
}

export interface AdminWorkflowDecisionDto {
  decision: "Approve" | "Reject" | "Revise";
  note?: string;
}

export const agentWorkflowApi = {
  /**
   * Admin: List all agent workflow instances with optional tier/status filters.
   */
  getAll: async (tier?: string, status?: string): Promise<AgentWorkflowDto[]> => {
    const params: Record<string, string> = {};
    if (tier && tier !== "all") params.tier = tier;
    if (status && status !== "all") params.status = status;
    const response = await api.get<AgentWorkflowDto[]>("/api/admin/agent-workflows", { params });
    return response.data;
  },

  /**
   * Admin: Retrieve detailed workflow execution state by ID.
   */
  getById: async (id: string): Promise<AgentWorkflowDto> => {
    const response = await api.get<AgentWorkflowDto>(`/api/admin/agent-workflows/${id}`);
    return response.data;
  },

  /**
   * Admin: Retrieve workflow execution state by associated JobRequest ID.
   */
  getByJobId: async (jobRequestId: string): Promise<AgentWorkflowDto> => {
    const response = await api.get<AgentWorkflowDto>(`/api/admin/agent-workflows/by-job/${jobRequestId}`);
    return response.data;
  },

  /**
   * Admin: Record HITL approval decision (Approve, Reject, Revise).
   */
  makeDecision: async (
    id: string,
    decision: "Approve" | "Reject" | "Revise",
    note?: string
  ): Promise<AgentWorkflowDto> => {
    const response = await api.post<AgentWorkflowDto>(`/api/admin/agent-workflows/${id}/decision`, {
      decision,
      note,
    });
    return response.data;
  },
};
