import api from "../lib/api";
import type { AiJobStarted } from "./aiJobs";

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

// Arka planda çalışır: sonuç (ProductSuggestion) iş bitince GET /ai/jobs/{jobId}'den gelir.
// categoryId: verilirse ve kategorinin admin tanımlı alt kategorileri varsa öneri sadece onlara giren ürünlerle sınırlanır.
export async function suggestProducts(input: AiInput, categoryId?: string): Promise<AiJobStarted> {
  const formData = toAiFormData(input);
  if (categoryId) formData.append("categoryId", categoryId);
  const response = await api.post<AiJobStarted>("/ai/suggestions", formData);
  return response.data;
}
