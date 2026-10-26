import api from "../lib/api";
import type { AiJobStatus } from "./aiJobs";

export type AiLogKind = "set-suggestion" | "product-suggestion" | "payment-plan-advice" | "category-organize";

// JSON alanları sunucuda metin olarak tutuluyor; ekranda ayrıştırılıp gösterilir.
// score: AI önerisinin kullanıcının kaydettiği hale benzerliği (0-100); kaydedilmediyse null.
export interface AiLog {
  id: string;
  userEmail: string | null;
  kind: AiLogKind;
  inputText: string | null;
  inputFileUrl: string | null;
  inputContentType: string | null;
  rawResponse: string | null;
  resultJson: string | null;
  status: AiJobStatus;
  error: string | null;
  durationMs: number | null;
  usedJson: string | null;
  usedAt: string | null;
  createdAt: string;
  score: number | null;
}

export interface AiLogStats {
  kind: AiLogKind;
  total: number;
  done: number;
  empty: number;
  failed: number;
  used: number;
  averageScore: number | null;
  averageDurationMs: number | null;
}

export async function getAiLogs(kind: AiLogKind | null): Promise<AiLog[]> {
  const response = await api.get<AiLog[]>("/admin/ai-logs", { params: kind ? { kind } : {} });
  return response.data;
}

export async function getAiLogStats(): Promise<AiLogStats[]> {
  const response = await api.get<AiLogStats[]>("/admin/ai-logs/stats");
  return response.data;
}
