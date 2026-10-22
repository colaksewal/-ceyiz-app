import api from "../lib/api";
import type { CreateSetTemplatePayload, SetTemplate } from "../types";
import type { AiJobStarted } from "./aiJobs";
import { toAiFormData, type AiInput } from "./aiSuggestions";

export async function getSetTemplates(): Promise<SetTemplate[]> {
  const response = await api.get<SetTemplate[]>("/set-templates");
  return response.data;
}

export async function createSetTemplate(payload: CreateSetTemplatePayload): Promise<SetTemplate> {
  const response = await api.post<SetTemplate>("/set-templates", payload);
  return response.data;
}

// Formun tamamını gönderir; sunucu eski parça ve fiyatların yerine bunları yazar.
export async function updateSetTemplate(setTemplateId: string, payload: CreateSetTemplatePayload): Promise<SetTemplate> {
  const response = await api.put<SetTemplate>(`/set-templates/${setTemplateId}`, payload);
  return response.data;
}

// Arka planda çalışır: sonuç (SetTemplateSuggestion) iş bitince GET /ai/jobs/{jobId}'den gelir.
// İş EMPTY biterse AI dosyadan set bilgisi çıkaramamıştır.
export async function suggestSet(input: AiInput): Promise<AiJobStarted> {
  const response = await api.post<AiJobStarted>("/set-templates/ai-suggestion", toAiFormData(input));
  return response.data;
}

export async function deleteSetTemplate(setTemplateId: string): Promise<void> {
  await api.delete(`/set-templates/${setTemplateId}`);
}
