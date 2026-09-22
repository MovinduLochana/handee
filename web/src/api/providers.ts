import { api } from "../lib/api";
import type {
  ProviderProfileProviderDto,
  ProviderProfileAdminDto,
  ProviderProfileCustomerDto,
  UpdateProviderProfileDto,
  VerificationActionDto,
  CertificationDto,
  ReviewDto,
  PagedResult,
  ProviderSearchParams,
  CertificationType,
  DocumentReviewStatus,
} from "./types";

// ─── Provider Profile API ──────────────────────────────────────────────────

export const providerApi = {
  /**
   * Resolves the authenticated provider's own profile from their JWT.
   * Expected: 200 OK — ProviderProfileProviderDto
   */
  async getMyProfile(): Promise<ProviderProfileProviderDto> {
    const response = await api.get<ProviderProfileProviderDto>("/api/providers/me");
    return response.data;
  },

  /**
   * Gets a provider profile by ID. The backend returns role-scoped projections:
   * - Provider (own) → ProviderProfileProviderDto
   * - Admin → ProviderProfileAdminDto
   * - Customer/Anonymous → ProviderProfileCustomerDto
   */
  async getProfile(
    id: string,
  ): Promise<ProviderProfileProviderDto | ProviderProfileAdminDto | ProviderProfileCustomerDto> {
    const response = await api.get(`/api/providers/${id}`);
    return response.data;
  },

  /**
   * Updates the authenticated provider's own profile.
   * Expected: 204 No Content
   */
  async updateProfile(id: string, data: UpdateProviderProfileDto): Promise<void> {
    await api.put(`/api/providers/${id}`, data);
  },

  /**
   * Uploads a document (NIC, certification) for the provider profile.
   * Expected: 201 Created — { id, type, fileUrl, originalFileName, uploadedAt, reviewStatus }
   */
  async uploadDocument(
    profileId: string,
    file: File,
    type: CertificationType,
  ): Promise<CertificationDto> {
    const formData = new FormData();
    formData.append("File", file);
    formData.append("Type", type);

    const response = await api.post<CertificationDto>(
      `/api/providers/${profileId}/documents`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  /**
   * Admin: Transitions a provider's verification status.
   * Expected: 204 No Content
   */
  async updateVerification(profileId: string, dto: VerificationActionDto): Promise<void> {
    await api.patch(`/api/providers/${profileId}/verification`, dto);
  },

  /**
   * Searches for providers by skill category, location, and pagination.
   * Expected: 200 OK — PagedResult
   */
  async search(params: ProviderSearchParams): Promise<PagedResult<ProviderProfileCustomerDto>> {
    const response = await api.get<PagedResult<ProviderProfileCustomerDto>>(
      "/api/providers/search",
      { params },
    );
    return response.data;
  },

  /**
   * Gets paginated reviews for a provider.
   * Expected: 200 OK — PagedResult<ReviewDto>
   */
  async getReviews(
    providerId: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<PagedResult<ReviewDto>> {
    const response = await api.get<PagedResult<ReviewDto>>(`/api/providers/${providerId}/reviews`, {
      params: { page, pageSize },
    });
    return response.data;
  },

  /**
   * Admin: Reviews an individual certification document.
   * Expected: 204 No Content
   */
  async reviewCertification(certId: string, status: DocumentReviewStatus): Promise<void> {
    await api.patch(`/admin/certifications/${certId}/review`, { status });
  },
};
