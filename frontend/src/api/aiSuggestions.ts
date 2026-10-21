import api from "../lib/api";
import type { ProductSuggestion } from "../types";

// AI'ya dosya, metin ya da ikisi birden gönderilebilir.
export interface AiInput {
  file: File | null;
  text: string;
}

export function toAiFormData({ file, text }: AiInput): FormData {
  const formData = new FormData();
  if (file) formData.append("file", file);
  if (text.trim()) formData.append("text", text.trim());
  return formData;
}

export async function suggestProducts(input: AiInput): Promise<ProductSuggestion | null> {
  const response = await api.post<ProductSuggestion>("/ai/suggestions", toAiFormData(input));
  return response.status === 204 ? null : response.data;
}
