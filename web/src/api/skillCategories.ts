import { api } from "../lib/api";

export interface SkillCategory {
  id: string;
  name: string;
  iconUrl: string | null;
}

export interface CreateSkillCategoryDto {
  name: string;
  iconUrl: string | null;
}

export interface UpdateSkillCategoryDto {
  name: string;
  iconUrl: string | null;
}

export const skillCategoryApi = {
  async getSkillCategories(): Promise<SkillCategory[]> {
    const response = await api.get<SkillCategory[]>("/api/skill-categories");
    return response.data;
  },

  async createSkillCategory(data: CreateSkillCategoryDto): Promise<SkillCategory> {
    const response = await api.post<SkillCategory>("/api/skill-categories", data);
    return response.data;
  },

  async updateSkillCategory(id: string, data: UpdateSkillCategoryDto): Promise<void> {
    await api.put(`/api/skill-categories/${id}`, data);
  },

  async deleteSkillCategory(id: string): Promise<void> {
    await api.delete(`/api/skill-categories/${id}`);
  },
};
