import api from "../lib/api";
import type { TrousseauListItem } from "../types";

export interface CreateListPayload {
  name: string;
  weddingDate: string | null;
}

export async function getMyLists(): Promise<TrousseauListItem[]> {
  const response = await api.get<TrousseauListItem[]>("/lists");
  return response.data;
}

export async function createList(payload: CreateListPayload): Promise<TrousseauListItem> {
  const response = await api.post<TrousseauListItem>("/lists", payload);
  return response.data;
}

export async function applyTemplate(listId: string): Promise<void> {
  await api.post(`/lists/${listId}/apply-template`);
}