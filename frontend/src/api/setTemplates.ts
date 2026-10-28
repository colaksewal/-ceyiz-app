import api from "../lib/api";
import type {
  AddSetAsProductResult,
  AddSetToListResult,
  AttachSetToProductResult,
  CreateSetTemplatePayload,
  SetPlacementPreview,
  SetTemplate,
} from "../types";
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

// Setin fiyat(lar)ını listedeki mevcut bir ürüne fiyat notu olarak ekler (set içeriği nota yazılır).
// priceId boşsa setin tüm fiyatları eklenir.
export async function attachSetToProduct(
  productId: string,
  setTemplateId: string,
  priceId: string | null
): Promise<AttachSetToProductResult> {
  const response = await api.post<AttachSetToProductResult>(`/products/${productId}/set-prices`, {
    setTemplateId,
    priceId,
  });
  return response.data;
}

// Seti listeye TEK ÜRÜN olarak ekler: ürün setin adı/linki/fiyat notlarıyla açılır, parçalar ürünün altında listelenir.
export async function addSetAsProduct(
  listId: string,
  payload: { setTemplateId: string; priceId: string | null; categoryKey: string; productName: string | null }
): Promise<AddSetAsProductResult> {
  const response = await api.post<AddSetAsProductResult>(`/lists/${listId}/sets/as-product`, payload);
  return response.data;
}

// Ekleme öncesi önizleme: parçaların önerilen hedef kategorileri ve seçilebilecek tüm hedefler.
export async function previewSetPlacement(listId: string, setTemplateId: string): Promise<SetPlacementPreview> {
  const response = await api.get<SetPlacementPreview>(`/lists/${listId}/sets/from-template/${setTemplateId}/preview`);
  return response.data;
}

// Katalog setini listeye ekler (set + parçaları seçilen kategorilerde ürünler). priceId boşsa en ucuz fiyat.
export async function addSetToList(
  listId: string,
  setTemplateId: string,
  priceId: string | null,
  placements: { setTemplateItemId: string; destinationKey: string; newProductName: string | null }[]
): Promise<AddSetToListResult> {
  const response = await api.post<AddSetToListResult>(`/lists/${listId}/sets/from-template`, {
    setTemplateId,
    priceId,
    placements,
  });
  return response.data;
}

export async function deleteSetTemplate(setTemplateId: string): Promise<void> {
  await api.delete(`/set-templates/${setTemplateId}`);
}
