import api from "../lib/api";
import type { CreateSetTemplatePayload, SetTemplate, SetTemplateSuggestion } from "../types";
import { toAiFormData, type AiInput } from "./aiSuggestions";

export async function getSetTemplates(): Promise<SetTemplate[]> {
  const response = await api.get<SetTemplate[]>("/admin/set-templates");
  return response.data;
}

export async function createSetTemplate(payload: CreateSetTemplatePayload): Promise<SetTemplate> {
  const response = await api.post<SetTemplate>("/admin/set-templates", payload);
  return response.data;
}

// 204 = AI'ya ulaşılamadı ya da yanıtı anlaşılamadı.
export async function suggestSet(input: AiInput): Promise<SetTemplateSuggestion | null> {
  const response = await api.post<SetTemplateSuggestion>("/admin/set-templates/ai-suggestion", toAiFormData(input));
  return response.status === 204 ? null : response.data;
}

export async function deleteSetTemplate(setTemplateId: string): Promise<void> {
  await api.delete(`/admin/set-templates/${setTemplateId}`);
}
