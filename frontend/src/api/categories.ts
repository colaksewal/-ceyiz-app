import api from "../lib/api";
import type { AiJobStarted } from "./aiJobs";
import type { Category } from "../types";

export async function getCategories(listId: string): Promise<Category[]> {
  const response = await api.get<Category[]>(`/lists/${listId}/categories`);
  return response.data;
}

export async function createCategory(listId: string, name: string, parentId?: string): Promise<Category> {
  const response = await api.post<Category>(`/lists/${listId}/categories`, { name, parentId });
  return response.data;
}

export async function renameCategory(categoryId: string, name: string): Promise<Category> {
  const response = await api.patch<Category>(`/categories/${categoryId}`, { name });
  return response.data;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await api.delete(`/categories/${categoryId}`);
}

// Arka planda çalışır: sonuç (CategoryOrganizeSuggestion) iş bitince GET /ai/jobs/{jobId}'den gelir.
export async function startOrganize(categoryId: string): Promise<AiJobStarted> {
  const response = await api.post<AiJobStarted>(`/categories/${categoryId}/ai-organize`);
  return response.data;
}

export interface ApplyOrganize {
  groups: { name: string; productIds: string[] }[];
  // keepId kalır; removeIds ona birleştirilip silinir (fiyat notları keepId'ye taşınır).
  merges: { keepId: string; removeIds: string[] }[];
}

export async function applyOrganize(categoryId: string, body: ApplyOrganize): Promise<void> {
  await api.post(`/categories/${categoryId}/organize`, body);
}
