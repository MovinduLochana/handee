import { api } from "../lib/api";
import type {
  BookingResponseDto,
  BookingStaffParams,
  BookingStatus,
  PagedResult,
  UpdateBookingScheduleDto,
  UpdateBookingStatusDto,
} from "./types";

/**
 * Mirror of BookingService.LegalTransitions (handee.API/Services/BookingService.cs).
 * Legality applies to everyone, admins included — admins only bypass the
 * separate "who may perform it" layer — so this is exactly the set of targets
 * the backend will accept from each status. Keep the two in sync.
 */
export const LEGAL_BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  Requested: ["Accepted", "Disputed"],
  Accepted: ["InProgress", "Disputed"],
  InProgress: ["Completed", "Disputed"],
  Completed: ["Disputed"],
  Disputed: ["Requested", "Accepted", "InProgress", "Completed"],
};

/** In C# enum order. */
export const BOOKING_STATUSES = Object.keys(LEGAL_BOOKING_TRANSITIONS) as BookingStatus[];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  Requested: "Requested",
  Accepted: "Accepted",
  InProgress: "In Progress",
  Completed: "Completed",
  Disputed: "Disputed",
};

export function getLegalTransitions(from: BookingStatus): readonly BookingStatus[] {
  return LEGAL_BOOKING_TRANSITIONS[from] ?? [];
}

export const bookingApi = {
  /**
   * Admin: Paged list of every booking, optionally filtered by status.
   * The backend only sorts by createdAt (sortDescending); there is no search param.
   * Items do not carry customerName/providerName/etc. — the staff query has no includes.
   * Expected: 200 OK — PagedResult<BookingResponseDto>
   */
  async getForStaff(params: BookingStaffParams): Promise<PagedResult<BookingResponseDto>> {
    const response = await api.get<PagedResult<BookingResponseDto>>("/bookings", { params });
    return response.data;
  },

  /**
   * Gets one booking with Customer, Provider and JobRequest joined in.
   * Expected: 200 OK — BookingResponseDto, 404 if missing or not visible.
   */
  async getById(id: string): Promise<BookingResponseDto> {
    const response = await api.get<BookingResponseDto>(`/bookings/${id}`);
    return response.data;
  },

  /**
   * Expected: 200 OK — BookingResponseDto (without the joined fields),
   * 400 on an illegal transition, 403 if not permitted, 404 if missing.
   */
  async updateStatus(id: string, data: UpdateBookingStatusDto): Promise<BookingResponseDto> {
    const response = await api.put<BookingResponseDto>(`/bookings/${id}/status`, data);
    return response.data;
  },

  /**
   * Expected: 200 OK — BookingResponseDto (without the joined fields),
   * 400 if the status doesn't allow rescheduling (non-admins only), 404 if missing.
   */
  async updateSchedule(id: string, data: UpdateBookingScheduleDto): Promise<BookingResponseDto> {
    const response = await api.put<BookingResponseDto>(`/bookings/${id}/schedule`, data);
    return response.data;
  },
};
