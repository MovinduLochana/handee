import { api } from "../lib/api";
import type {
  ProviderOperatingScheduleDto,
  UpdateOperatingScheduleDto,
  PredefinedSlotDto,
} from "./types";

export const providerAvailabilityApi = {
  /**
   * Get dynamic 1-hour predefined slots for a provider on a specific date.
   */
  async getPredefinedSlots(providerId: string, date: string): Promise<PredefinedSlotDto[]> {
    const response = await api.get<PredefinedSlotDto[]>("/api/provider-availability/slots", {
      params: { providerId, date },
    });
    return response.data;
  },

  /**
   * Get provider's declarative operating schedule (weekly working days and hours).
   */
  async getOperatingSchedule(providerId: string): Promise<ProviderOperatingScheduleDto> {
    const response = await api.get<ProviderOperatingScheduleDto>(
      `/api/provider-availability/${providerId}/schedule`,
    );
    return response.data;
  },

  /**
   * Update provider's declarative operating schedule.
   */
  async updateOperatingSchedule(
    data: UpdateOperatingScheduleDto,
  ): Promise<ProviderOperatingScheduleDto> {
    const response = await api.put<ProviderOperatingScheduleDto>(
      "/api/provider-availability/schedule",
      data,
    );
    return response.data;
  },
};
