import api from "../lib/api";
import type { ProposalCategory, PublishProposalResult, TemplateProposal } from "../types";

// Kullanıcı: listesini şablon olarak önerir (kategoriler, alt kategoriler ve ürün adları; fiyat/mağaza/link gitmez).
export async function proposeTemplate(payload: {
  listId: string;
  title: string;
  note: string | null;
  // Seçilen kategoriler; includeProducts kapalıysa sadece kategorinin adı gider, ürün adları gitmez.
  categories: { categoryId: string; includeProducts: boolean }[];
}): Promise<TemplateProposal> {
  const response = await api.post<TemplateProposal>("/template-proposals", payload);
  return response.data;
}

export async function getMyProposals(): Promise<TemplateProposal[]> {
  const response = await api.get<TemplateProposal[]>("/template-proposals/mine");
  return response.data;
}

// Admin: bekleyen (varsayılan) ya da tüm öneriler.
export async function getAdminProposals(status: "PENDING" | "ALL"): Promise<TemplateProposal[]> {
  const response = await api.get<TemplateProposal[]>("/admin/template-proposals", { params: { status } });
  return response.data;
}

export async function getPendingProposalCount(): Promise<number> {
  const response = await api.get<{ count: number }>("/admin/template-proposals/pending-count");
  return response.data.count;
}

// categories: admin'in incelemede düzenlediği son hal (çıkardığı kategori/ürünler hariç).
export async function publishProposal(proposalId: string, categories: ProposalCategory[]): Promise<PublishProposalResult> {
  const response = await api.post<PublishProposalResult>(`/admin/template-proposals/${proposalId}/publish`, {
    categories,
  });
  return response.data;
}

export async function rejectProposal(proposalId: string, adminNote: string | null): Promise<void> {
  await api.post(`/admin/template-proposals/${proposalId}/reject`, { adminNote });
}
