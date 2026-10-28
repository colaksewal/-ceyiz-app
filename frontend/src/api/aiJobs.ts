import api from "../lib/api";

// PENDING: sırada, RUNNING: AI çalışıyor, DONE: sonuç hazır, EMPTY: AI bir şey çıkaramadı,
// FAILED: hata (error dolu).
export type AiJobStatus = "PENDING" | "RUNNING" | "DONE" | "EMPTY" | "FAILED";

export interface AiJob {
  id: string;
  status: AiJobStatus;
  // Sadece PENDING'de anlamlı: önünde bekleyen istek sayısı.
  queuePosition: number;
  result: unknown;
  error: string | null;
}

export interface AiJobStarted {
  jobId: string;
}

export async function getAiJob(jobId: string): Promise<AiJob> {
  const response = await api.get<AiJob>(`/ai/jobs/${jobId}`);
  return response.data;
}

// Kullanıcı AI önerisini kaydedince o an kaydedilen hal admin ekranındaki başarı ölçümü için
// bildirilir. Bildirim kullanıcının işini etkilememeli: hata olursa sessizce geçilir.
export function reportAiOutcome(jobId: string, used: unknown): void {
  api.post(`/ai/jobs/${jobId}/outcome`, used).catch(() => undefined);
}

export function isActiveStatus(status: AiJobStatus): boolean {
  return status === "PENDING" || status === "RUNNING";
}
