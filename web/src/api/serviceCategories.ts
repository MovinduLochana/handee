import { api } from "../lib/api";

export interface ServiceCategory {
  id: string;
  name: string;
  iconUrl: string | null;
}

export interface CreateServiceCategoryDto {
  name: string;
  iconUrl: string | null;
}

export interface UpdateServiceCategoryDto {
  name: string;
  iconUrl: string | null;
}

export const serviceCategoryApi = {
  async getServiceCategories(): Promise<ServiceCategory[]> {
    const response = await api.get<ServiceCategory[]>("/api/service-categories");
    return response.data;
  },

  async createServiceCategory(data: CreateServiceCategoryDto): Promise<ServiceCategory> {
    const response = await api.post<ServiceCategory>("/api/service-categories", data);
    return response.data;
  },

  async updateServiceCategory(id: string, data: UpdateServiceCategoryDto): Promise<void> {
    await api.put(`/api/service-categories/${id}`, data);
  },

  async deleteServiceCategory(id: string): Promise<void> {
    await api.delete(`/api/service-categories/${id}`);
  },
};
