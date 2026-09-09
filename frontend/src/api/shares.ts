import api from "../lib/api";
import type { ListShare, ShareRole } from "../types";

export async function getShares(listId: string): Promise<ListShare[]> {
  const response = await api.get<ListShare[]>(`/lists/${listId}/shares`);
  return response.data;
}

export async function inviteToList(listId: string, email: string, role: ShareRole): Promise<ListShare> {
  const response = await api.post<ListShare>(`/lists/${listId}/shares`, { email, role });
  return response.data;
}

export async function updateShareRole(listId: string, shareId: string, role: ShareRole): Promise<void> {
  await api.patch(`/lists/${listId}/shares/${shareId}`, { role });
}

export async function removeShare(listId: string, shareId: string): Promise<void> {
  await api.delete(`/lists/${listId}/shares/${shareId}`);
}
