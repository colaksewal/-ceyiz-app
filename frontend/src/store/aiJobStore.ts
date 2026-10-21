import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isActiveStatus, type AiJobStatus } from "../api/aiJobs";

// Arka planda süren AI istekleri. Her iş, onu başlatan ekranın anahtarıyla tutulur
// (ör. "products:<kategoriId>", "set:new"): kullanıcı başka sayfaya gidip dönünce sonuç aynı
// ekranda onu bekler. Sayfa yenilense de kaybolmasın diye sessionStorage'da saklanır.
// Durumu sunucuya soran ve bildirim gösteren yer AiJobCenter.
export interface TrackedAiJob {
  key: string;
  jobId: string;
  // Bildirimde görünür, ör. "Mutfak için ürün önerisi".
  label: string;
  // Bildirimdeki "Göster" bağlantısı: işi başlatan sayfa.
  returnTo: string;
  startedAt: number;
  status: AiJobStatus;
  queuePosition: number;
  result: unknown;
  error: string | null;
  // Set formunda AI'ya verilen görsel kart görseli olarak da yüklenir; form kapanıp açılsa da kalsın.
  imageUrl?: string | null;
}

interface AiJobState {
  jobs: Record<string, TrackedAiJob>;
  // O an ekranda açık olan anahtarlar. Bunlar için bildirim çıkmaz, sonucu ekran kendisi gösterir.
  watchers: Record<string, number>;
  start: (job: Pick<TrackedAiJob, "key" | "jobId" | "label" | "returnTo" | "imageUrl">) => void;
  // jobId eşleşmezse (aynı ekranda bu arada yeni bir iş başlatıldıysa) eski yanıt yok sayılır.
  update: (key: string, jobId: string, patch: Partial<TrackedAiJob>) => void;
  remove: (key: string) => void;
  clear: () => void;
  watch: (key: string) => () => void;
}

export const useAiJobStore = create<AiJobState>()(
  persist(
    (set) => ({
      jobs: {},
      watchers: {},

      start: (job) =>
        set((state) => ({
          jobs: {
            ...state.jobs,
            [job.key]: {
              ...job,
              startedAt: Date.now(),
              status: "PENDING",
              queuePosition: 0,
              result: null,
              error: null,
            },
          },
        })),

      update: (key, jobId, patch) =>
        set((state) => {
          const job = state.jobs[key];
          if (!job || job.jobId !== jobId) return state;
          return { jobs: { ...state.jobs, [key]: { ...job, ...patch } } };
        }),

      remove: (key) =>
        set((state) => {
          if (!state.jobs[key]) return state;
          const { [key]: _removed, ...rest } = state.jobs;
          return { jobs: rest };
        }),

      clear: () => set({ jobs: {} }),

      watch: (key) => {
        set((state) => ({ watchers: { ...state.watchers, [key]: (state.watchers[key] ?? 0) + 1 } }));
        return () =>
          set((state) => ({ watchers: { ...state.watchers, [key]: (state.watchers[key] ?? 1) - 1 } }));
      },
    }),
    {
      name: "ai-jobs",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ jobs: state.jobs }),
    }
  )
);

export function isJobActive(job: TrackedAiJob | undefined): boolean {
  return !!job && isActiveStatus(job.status);
}

// İşi gösteren ekran bunu kullanır: ekran açıkken o iş için bildirim çıkmaz.
export function useAiJob(key: string): TrackedAiJob | undefined {
  const job = useAiJobStore((state) => state.jobs[key]);
  const watch = useAiJobStore((state) => state.watch);
  useEffect(() => watch(key), [key, watch]);
  return job;
}
