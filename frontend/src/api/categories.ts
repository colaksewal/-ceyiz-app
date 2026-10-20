import api from "../lib/api";
import type { Category } from "../types";

export async function getCategories(listId: string): Promise<Category[]> {
  const response = await api.get<Category[]>(`/lists/${listId}/categories`);
  return response.data;
}

export async function createCategory(listId: string, name: string): Promise<Category> {
  const response = await api.post<Category>(`/lists/${listId}/categories`, { name });
  return response.data;
}

export async function renameCategory(categoryId: string, name: string): Promise<Category> {
  const response = await api.patch<Category>(`/categories/${categoryId}`, { name });
  return response.data;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await api.delete(`/categories/${categoryId}`);
}
