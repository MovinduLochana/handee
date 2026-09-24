import { api } from "../lib/api";
import type {
  JobRequestResponseDto,
  JobRequestStaffParams,
  JobRequestStatus,
  JobUrgency,
  PagedResult,
} from "./types";

/** Display labels, keyed by the exact C# enum member names. */
export const JOB_REQUEST_STATUS_LABELS: Record<JobRequestStatus, string> = {
  PendingAiReview: "Pending AI Review",
  Open: "Open",
  Cancelled: "Cancelled",
};

export const JOB_REQUEST_STATUSES = Object.keys(JOB_REQUEST_STATUS_LABELS) as JobRequestStatus[];

/** In enum order (Low → Emergency), which is also the severity order. */
export const JOB_URGENCIES: JobUrgency[] = ["Low", "Medium", "High", "Emergency"];

export const jobRequestApi = {
  /**
   * Admin: Paged list of every job request, optionally filtered.
   * The backend only sorts by createdAt (sortDescending); there is no search param.
   * Expected: 200 OK — PagedResult<JobRequestResponseDto>
   */
  async getForStaff(params: JobRequestStaffParams): Promise<PagedResult<JobRequestResponseDto>> {
    const response = await api.get<PagedResult<JobRequestResponseDto>>("/job-requests", {
      params,
    });
    return response.data;
  },

  /**
   * Gets one job request. Admins may read any; others only their own.
   * Expected: 200 OK — JobRequestResponseDto, 404 if missing or not visible.
   */
  async getById(id: string): Promise<JobRequestResponseDto> {
    const response = await api.get<JobRequestResponseDto>(`/job-requests/${id}`);
    return response.data;
  },
};
