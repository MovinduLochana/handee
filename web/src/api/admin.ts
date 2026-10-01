import { api } from "../lib/api";
import type {
  ProviderProfileAdminDto,
  PagedResult,
  VerificationStatus,
  AdminUserResult,
} from "./types";

export const adminApi = {
  /**
   * Admin: Gets the verification queue with optional status filtering.
   * Expected: 200 OK — PagedResult<ProviderProfileAdminDto>
   */
  async getVerificationQueue(params: {
    status?: VerificationStatus;
    searchTerm?: string;
    serviceCategoryId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PagedResult<ProviderProfileAdminDto>> {
    const response = await api.get<PagedResult<ProviderProfileAdminDto>>("/admin/verifications", {
      params,
    });
    return response.data;
  },

  /**
   * Admin: Gets the verification generic summary counts for the dashboard.
   * Expected: 200 OK — Record<VerificationStatus, number>
   */
  async getVerificationSummary(): Promise<Record<string, number>> {
    const response = await api.get<Record<string, number>>("/admin/verifications/summary");
    return response.data;
  },

  /**
   * Admin: Retrieves all registered users across all roles (Customers, Providers, Admins).
   * Expected: 200 OK — AdminUserResult[]
   */
  async getUsers(): Promise<AdminUserResult[]> {
    const response = await api.get<AdminUserResult[]>("/admin/users");
    return response.data;
  },

  /**
   * Admin: Sets active status of a user (activate or suspend).
   * Expected: 204 No Content
   */
  async setUserStatus(id: string, isActive: boolean): Promise<void> {
    await api.put(`/admin/users/${id}/status`, { isActive });
  },
};
