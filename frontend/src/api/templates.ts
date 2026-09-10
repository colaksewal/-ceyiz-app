import api from "../lib/api";
import type { CategoryTemplate } from "../types";

export async function getAllTemplates(): Promise<CategoryTemplate[]> {
  const response = await api.get<CategoryTemplate[]>("/templates");
  return response.data;
}