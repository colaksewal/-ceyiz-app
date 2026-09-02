import api from "../lib/api";
import type { ProductSet, SetComparisonResult, SetItem } from "../types";

export interface CreateProductSetPayload {
  name: string;
  storeName: string;
  setPrice: number;
  items: SetItem[];
}

export async function getSets(listId: string): Promise<ProductSet[]> {
  const response = await api.get<ProductSet[]>(`/lists/${listId}/sets`);
  return response.data;
}

export async function createSet(
  listId: string,
  payload: CreateProductSetPayload
): Promise<ProductSet> {
  const response = await api.post<ProductSet>(`/lists/${listId}/sets`, payload);
  return response.data;
}

export async function getSetComparison(setId: string): Promise<SetComparisonResult> {
  const response = await api.get<SetComparisonResult>(`/sets/${setId}/comparison`);
  return response.data;
}
