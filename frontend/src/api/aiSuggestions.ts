import api from "../lib/api";
import type { ProductSuggestion } from "../types";

export async function suggestFromFile(file: File): Promise<ProductSuggestion | null> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<ProductSuggestion>("/ai/suggestions", formData);
  return response.status === 204 ? null : response.data;
}
