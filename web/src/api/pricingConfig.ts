import { api } from "../lib/api";

export interface UrgencyMultiplierConfigDto {
  low: number;
  normal: number;
  medium: number;
  high: number;
  emergency: number;
  lastUpdatedAt?: string | null;
}

export interface UpdateUrgencyMultiplierConfigDto {
  low: number;
  normal: number;
  medium: number;
  high: number;
  emergency: number;
}

export const pricingConfigApi = {
  //Get current system urgency multiplier configuration
  getUrgencyMultipliers: async (): Promise<UrgencyMultiplierConfigDto> => {
    const response = await api.get<UrgencyMultiplierConfigDto>(
      "/api/admin/pricing-config/urgency-multipliers",
    );
    return response.data;
  },

  //Update system urgency multiplier configuration
  updateUrgencyMultipliers: async (
    dto: UpdateUrgencyMultiplierConfigDto,
  ): Promise<UrgencyMultiplierConfigDto> => {
    const response = await api.put<UrgencyMultiplierConfigDto>(
      "/api/admin/pricing-config/urgency-multipliers",
      dto,
    );
    return response.data;
  },
};
