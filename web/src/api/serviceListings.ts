import { api } from "../lib/api";
import type {
    ServiceListingDto,
    CreateServiceListingDto,
    UpdateServiceListingDto,
} from "./types";

export const serviceListingsApi = {
    // Provider-secured fetches
    async getMyServiceListings(): Promise<ServiceListingDto[]> {
        const response = await api.get<ServiceListingDto[]>("/api/service-listings/my-listings");
        return response.data;
    },

    // Public fetches
    async getByProviderId(providerId: string): Promise<ServiceListingDto[]> {
        const response = await api.get<ServiceListingDto[]>(
            `/api/service-listings/provider/${providerId}`
        );
        return response.data;
    },

    async createServiceListing(data: CreateServiceListingDto): Promise<ServiceListingDto> {
        const response = await api.post<ServiceListingDto>("/api/service-listings", data);
        return response.data;
    },

    async updateServiceListing(
        id: string,
        data: UpdateServiceListingDto
    ): Promise<ServiceListingDto> {
        const response = await api.put<ServiceListingDto>(`/api/service-listings/${id}`, data);
        return response.data;
    },

    async toggleActiveStatus(id: string, isActive: boolean): Promise<void> {
        await api.patch(`/api/service-listings/${id}/status`, { isActive });
    },

    async deleteServiceListing(id: string): Promise<void> {
        await api.delete(`/api/service-listings/${id}`);
    },
};
