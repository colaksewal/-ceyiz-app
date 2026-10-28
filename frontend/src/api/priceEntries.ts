import api from "../lib/api";
import type { PriceEntry, PriceType } from "../types";

export interface CreatePriceEntryPayload {
  storeName: string;
  priceType: PriceType;
  cashPrice: number | null;
  installmentCount: number | null;
  installmentAmount: number | null;
  paymentPlanNote: string | null;
  photoUrl: string | null;
  url: string | null;
}

// Fiyat notunun düzenlenebilir alanları (fotoğraf ve "kullanılan" işareti düzenlemede değişmez).
export type UpdatePriceEntryPayload = Omit<CreatePriceEntryPayload, "photoUrl">;

export async function getPriceEntries(productId: string): Promise<PriceEntry[]> {
  const response = await api.get<PriceEntry[]>(`/products/${productId}/price-entries`);
  return response.data;
}

export async function createPriceEntry(
  productId: string,
  payload: CreatePriceEntryPayload
): Promise<PriceEntry> {
  const response = await api.post<PriceEntry>(`/products/${productId}/price-entries`, payload);
  return response.data;
}

export async function updatePriceEntry(priceEntryId: string, payload: UpdatePriceEntryPayload): Promise<PriceEntry> {
  const response = await api.put<PriceEntry>(`/price-entries/${priceEntryId}`, payload);
  return response.data;
}

export async function markAsPreferred(priceEntryId: string): Promise<PriceEntry> {
  const response = await api.patch<PriceEntry>(`/price-entries/${priceEntryId}/preferred`);
  return response.data;
}

export async function deletePriceEntry(priceEntryId: string): Promise<void> {
  await api.delete(`/price-entries/${priceEntryId}`);
}
