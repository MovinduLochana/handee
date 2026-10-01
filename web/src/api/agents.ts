import axios from "axios";
import { api } from "../lib/api";

export interface AgentStepLogDto {
  id?: string;
  step_number?: number;
  stepNumber?: number;
  agent_name?: string;
  agentName?: string;
  action: string;
  input_data?: any;
  inputData?: any;
  output_data?: any;
  outputData?: any;
  duration_ms?: number;
  durationMs?: number;
  timestamp: number | string;
}

export interface AgentWorkflowResponseDto {
  id: string;
  jobRequestId: string;
  workflowId: string;
  objective: string;
  plan: string[];
  validationTier: string; // "approved_for_auto_dispatch" | "approved_with_audit" | "requires_human_approval"
  approvalStatus: string; // "pending" | "approved" | "rejected"
  estimatedPrice?: number;
  selectedProviderId?: string;
  selectedProviderName?: string;
  finalResultJson?: string;
  decisionNote?: string;
  decidedAt?: string;
  createdAt: string;
  stepLogs: AgentStepLogDto[];
}

export interface LiveDispatchWorkflowRequest {
  job_id: string;
  category?: string;
  description: string;
  location: string;
  urgency: string;
  budget_min?: number;
  budget_max?: number;
}

export interface AssistantQueryRequest {
  customer_id: string;
  query: string;
}

export interface AssistantQueryResponse {
  reply: string;
  category?: string;
  suggested_providers?: Array<{
    id: string;
    fullName: string;
    skillCategories?: string[];
    serviceArea?: string;
    rating?: number;
    totalReviews?: number;
    isVerified?: boolean;
    hourlyRate?: number;
  }>;
  suggested_listings?: Array<{
    id: string;
    title: string;
    category: string;
    price: number;
    providerName?: string;
    rating?: number;
  }>;
  suggestions?: string[];
}

const AGENT_SERVICE_URL =
  import.meta.env.VITE_AGENT_SERVICE_URL || "https://handee-production.up.railway.app";

export const agentsApi = {
  /**
   * Admin: List persisted agent workflows from ASP.NET Core backend.
   */
  async getWorkflows(tier?: string, status?: string): Promise<AgentWorkflowResponseDto[]> {
    const params: Record<string, string> = {};
    if (tier) params.tier = tier;
    if (status) params.status = status;
    const response = await api.get<AgentWorkflowResponseDto[]>("/api/admin/agent-workflows", {
      params,
    });
    return response.data;
  },

  /**
   * Admin: Get single workflow by ID.
   */
  async getWorkflowById(id: string): Promise<AgentWorkflowResponseDto> {
    const response = await api.get<AgentWorkflowResponseDto>(`/api/admin/agent-workflows/${id}`);
    return response.data;
  },

  /**
   * Admin: Make decision on high-risk workflow (Approve / Reject).
   */
  async makeDecision(
    id: string,
    decision: "Approve" | "Reject",
    note?: string,
  ): Promise<AgentWorkflowResponseDto> {
    const response = await api.post<AgentWorkflowResponseDto>(
      `/api/admin/agent-workflows/${id}/decision`,
      {
        decision,
        note: note || `Admin decision: ${decision} via Web Portal`,
      },
    );
    return response.data;
  },

  /**
   * Direct execution of 4-Agent LangGraph dispatch workflow via Python AI agent service.
   */
  async runLiveDispatch(payload: LiveDispatchWorkflowRequest): Promise<any> {
    const response = await axios.post(`${AGENT_SERVICE_URL}/api/v1/workflow/dispatch`, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    });
    return response.data;
  },

  /**
   * Query the conversational AI Assistant.
   */
  async queryAssistant(
    query: string,
    customerId: string = "guest-customer",
  ): Promise<AssistantQueryResponse> {
    try {
      // Primary: Call Python Agent Service directly
      const response = await axios.post<AssistantQueryResponse>(
        `${AGENT_SERVICE_URL}/api/v1/assistant/query`,
        { customer_id: customerId, query },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 },
      );
      return response.data;
    } catch {
      // Fallback: Call ASP.NET Core Backend assistant endpoint
      const response = await api.post<AssistantQueryResponse>("/api/assistant/query", { query });
      return response.data;
    }
  },

  /**
   * Check if the AI Agent service is healthy.
   */
  async checkHealth(): Promise<{ status: string; service: string }> {
    try {
      const response = await axios.get(`${AGENT_SERVICE_URL}/health`, { timeout: 3000 });
      return response.data;
    } catch {
      return { status: "offline", service: "handee-agents" };
    }
  },
};
