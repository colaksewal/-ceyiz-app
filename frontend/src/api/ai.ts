import api from "../lib/api";
import type { ListSuggestionRequest, ListSuggestionResponse } from "../types";

export async function suggestList(payload: ListSuggestionRequest): Promise<ListSuggestionResponse | null> {
  const response = await api.post<ListSuggestionResponse>("/ai/list-suggestion", payload);
  if (response.status === 204) return null;
  return response.data;
}