import api from "../lib/api";
import type { CreateSetTemplatePayload, SetTemplate, SetTemplateSuggestion } from "../types";

export async function getSetTemplates(): Promise<SetTemplate[]> {
  const response = await api.get<SetTemplate[]>("/admin/set-templates");
  return response.data;
}

export async function createSetTemplate(payload: CreateSetTemplatePayload): Promise<SetTemplate> {
  const response = await api.post<SetTemplate>("/admin/set-templates", payload);
  return response.data;
}

// 204 = AI'ya ulaşılamadı ya da yanıtı anlaşılamadı.
export async function suggestSetFromFile(file: File): Promise<SetTemplateSuggestion | null> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<SetTemplateSuggestion>("/admin/set-templates/ai-suggestion", formData);
  return response.status === 204 ? null : response.data;
}

export async function deleteSetTemplate(setTemplateId: string): Promise<void> {
  await api.delete(`/admin/set-templates/${setTemplateId}`);
}
