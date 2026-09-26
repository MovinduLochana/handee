import { api } from "../lib/api";
import type {
  ProviderAvailabilitySlotDto,
  CreateSlotDto,
  BatchCreateSlotsDto,
  RecurringScheduleDto,
} from "./types";

export const providerAvailabilityApi = {
  /**
   * Public / Customer: Get available non-conflicting time slots for a provider.
   * Optionally filtered by date range.
   */
  async getForProvider(
    providerId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ProviderAvailabilitySlotDto[]> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await api.get<ProviderAvailabilitySlotDto[]>(
      `/api/provider-availability/${providerId}`,
      { params },
    );
    return response.data;
  },

  /**
   * Provider: Get all of current provider's slots (both booked and unbooked).
   */
  async getMine(): Promise<ProviderAvailabilitySlotDto[]> {
    const response = await api.get<ProviderAvailabilitySlotDto[]>("/api/provider-availability/mine");
    return response.data;
  },

  /**
   * Provider: Create a single availability slot.
   */
  async create(data: CreateSlotDto): Promise<ProviderAvailabilitySlotDto> {
    const response = await api.post<ProviderAvailabilitySlotDto>("/api/provider-availability", data);
    return response.data;
  },

  /**
   * Provider: Batch create multiple discrete availability slots.
   */
  async createBatch(data: BatchCreateSlotsDto): Promise<ProviderAvailabilitySlotDto[]> {
    const response = await api.post<ProviderAvailabilitySlotDto[]>(
      "/api/provider-availability/batch",
      data,
    );
    return response.data;
  },

  /**
   * Provider: Generate recurring availability slots according to daily schedules.
   */
  async createRecurring(data: RecurringScheduleDto): Promise<ProviderAvailabilitySlotDto[]> {
    const response = await api.post<ProviderAvailabilitySlotDto[]>(
      "/api/provider-availability/recurring",
      data,
    );
    return response.data;
  },

  /**
   * Provider: Delete an unbooked availability slot.
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/api/provider-availability/${id}`);
  },
};
