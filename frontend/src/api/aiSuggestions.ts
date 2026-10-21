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
export async function suggestProducts(input: AiInput): Promise<AiJobStarted> {
  const response = await api.post<AiJobStarted>("/ai/suggestions", toAiFormData(input));
  return response.data;
}
