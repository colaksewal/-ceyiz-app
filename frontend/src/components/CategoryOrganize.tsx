import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { applyOrganize, startOrganize, type ApplyOrganize } from "../api/categories";
import { reportAiOutcome } from "../api/aiJobs";
import { isJobActive, useAiJob, useAiJobStore } from "../store/aiJobStore";
import type { CategoryOrganizeSuggestion, OrganizeProduct } from "../types";
import AiWaiting from "./AiWaiting";
import aiStyles from "./CategoryAiSuggest.module.scss";
import styles from "./CategoryOrganize.module.scss";

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error === "string") {
    return error.response.data.error;
  }
  return fallback;
}

interface GroupDraft {
  name: string;
  products: OrganizeProduct[];
  on: boolean;
}

// Üst kategorideki ürünleri AI'ya alt kategorilere ayırtır ve aynı ürünleri birleştirir.
// AI hiçbir şey yazmaz: önizlemede kullanıcı grupları/ürünleri düzeltir, onaylayınca uygulanır.
// İstek arka planda çalışır (bkz. aiJobStore), kullanıcı sayfadan çıkıp dönse sonuç bekler.
export default function CategoryOrganize({
  categoryId,
  categoryName,
}: {
  categoryId: string;
  categoryName: string;
}) {
  const jobKey = `organize:${categoryId}`;
  const location = useLocation();
  const queryClient = useQueryClient();
  const job = useAiJob(jobKey);
  const startJob = useAiJobStore((state) => state.start);
  const removeJob = useAiJobStore((state) => state.remove);
  const [open, setOpen] = useState(() => job !== undefined);
  const [groups, setGroups] = useState<GroupDraft[] | null>(null);
  const [duplicates, setDuplicates] = useState<OrganizeProduct[][]>([]);
  // Birleştirilmesi kapatılan kümeler ve her kümede kalacak ürün (varsayılan: ilki).
  const [mergeOff, setMergeOff] = useState<Set<number>>(new Set());
  const [keep, setKeep] = useState<Record<number, string>>({});
  const [resultJobId, setResultJobId] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

  const startMutation = useMutation({
    mutationFn: () => startOrganize(categoryId),
    onSuccess: ({ jobId }) =>
      startJob({ key: jobKey, jobId, label: `${categoryName} için düzenleme`, returnTo: location.pathname }),
  });

  // İş bitince sonucu kutuya al ve store'dan sil (bildirim de böylece kapanır).
  useEffect(() => {
    if (!job || isJobActive(job)) return;
    if (job.status === "FAILED") {
      setJobError(job.error ?? "Düzenleme önerisi alınamadı, tekrar dene.");
    } else {
      const result = job.status === "DONE" ? (job.result as CategoryOrganizeSuggestion) : null;
      setGroups((result?.groups ?? []).map((group) => ({ ...group, on: true })));
      setDuplicates(result?.duplicates ?? []);
      setMergeOff(new Set());
      setKeep({});
      setEmpty(!result || (result.groups.length === 0 && result.duplicates.length === 0));
      setResultJobId(job.jobId);
    }
    setOpen(true);
    removeJob(jobKey);
  }, [job, jobKey, removeJob]);

  const thinking = startMutation.isPending || isJobActive(job);

  function start() {
    setGroups(null);
    setDuplicates([]);
    setEmpty(false);
    setJobError(null);
    startMutation.mutate();
  }

  // Kutuyu kapatmak süren isteği de bırakır; sonucu gelse bile gösterilmez.
  function close() {
    removeJob(jobKey);
    setOpen(false);
    setGroups(null);
    setDuplicates([]);
    setEmpty(false);
  }

  function keptId(index: number): string {
    return keep[index] ?? duplicates[index][0].id;
  }

  function buildRequest(): ApplyOrganize {
    const merges = duplicates
      .map((cluster, index) => ({ cluster, index }))
      .filter(({ index }) => !mergeOff.has(index))
      .map(({ cluster, index }) => ({
        keepId: keptId(index),
        removeIds: cluster.filter((p) => p.id !== keptId(index)).map((p) => p.id),
      }));
    // Silinecek ürün bir gruptaysa, onun yerine kalan ürün o gruba girer.
    const replacement = new Map(merges.flatMap((m) => m.removeIds.map((id) => [id, m.keepId] as const)));
    return {
      merges,
      groups: (groups ?? [])
        .filter((group) => group.on && group.name.trim() !== "")
        .map((group) => ({
          name: group.name.trim(),
          productIds: [...new Set(group.products.map((p) => replacement.get(p.id) ?? p.id))],
        })),
    };
  }

  const request = groups ? buildRequest() : null;
  const hasChanges =
    request !== null && (request.merges.length > 0 || request.groups.some((g) => g.productIds.length > 0));

  const applyMutation = useMutation({
    mutationFn: (body: ApplyOrganize) => applyOrganize(categoryId, body),
    onSuccess: (_result, body) => {
      if (resultJobId) {
        reportAiOutcome(resultJobId, { groups: body.groups.length, merges: body.merges.length });
      }
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      close();
    },
  });

  function toggleGroup(index: number) {
    setGroups((prev) => prev && prev.map((g, i) => (i === index ? { ...g, on: !g.on } : g)));
  }

  function renameGroup(index: number, name: string) {
    setGroups((prev) => prev && prev.map((g, i) => (i === index ? { ...g, name } : g)));
  }

  function removeFromGroup(index: number, productId: string) {
    setGroups((prev) =>
      prev && prev.map((g, i) => (i === index ? { ...g, products: g.products.filter((p) => p.id !== productId) } : g))
    );
  }

  function toggleMerge(index: number) {
    setMergeOff((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  if (!open) {
    return (
      <button type="button" className={aiStyles.openButton} onClick={() => setOpen(true)}>
        <span aria-hidden="true">🗂️</span> AI ile alt kategorilere ayır
      </button>
    );
  }

  return (
    <div className={aiStyles.box}>
      <div className={aiStyles.header}>
        <span className={aiStyles.spark} aria-hidden="true">
          🗂️
        </span>
        <div className={aiStyles.headerText}>
          <strong>AI ile düzenle</strong>
          <p>
            Bu kategorideki ürünleri alt kategorilere (ör. Pişirme, Servis) ayırır ve aynı ürünü iki kez
            yazdıysan birleştirmeyi önerir. Sen onaylamadan hiçbir şey değişmez.
          </p>
        </div>
        <button type="button" className={aiStyles.close} aria-label="Kapat" onClick={close}>
          ✕
        </button>
      </div>

      {groups === null && (
        <button type="button" className={`btn btn-primary ${aiStyles.pill}`} disabled={thinking} onClick={start}>
          {thinking ? "Düşünüyor..." : "Düzenleme öner"}
        </button>
      )}

      {thinking && <AiWaiting startedAt={job?.startedAt} queuePosition={job?.queuePosition} />}

      {startMutation.isError && (
        <p className="error-text">{errorMessage(startMutation.error, "Öneri alınamadı, tekrar dene.")}</p>
      )}
      {jobError && <p className="error-text">{jobError}</p>}
      {empty && <p className={aiStyles.note}>AI bu kategoride düzenlenecek bir şey bulamadı.</p>}

      {duplicates.length > 0 && (
        <>
          <p className={styles.sectionTitle}>Aynı ürün olabilir, birleştirilsin mi?</p>
          {duplicates.map((cluster, index) => (
            <div
              key={cluster.map((p) => p.id).join()}
              className={`${styles.section} ${mergeOff.has(index) ? styles.sectionOff : ""}`}
            >
              <label className={styles.sectionHead}>
                <input type="checkbox" checked={!mergeOff.has(index)} onChange={() => toggleMerge(index)} />
                <span>Birleştir (fiyat notları kalan ürüne taşınır)</span>
              </label>
              {cluster.map((product) => (
                <label key={product.id} className={styles.keepRow}>
                  <input
                    type="radio"
                    name={`keep-${categoryId}-${index}`}
                    disabled={mergeOff.has(index)}
                    checked={keptId(index) === product.id}
                    onChange={() => setKeep((prev) => ({ ...prev, [index]: product.id }))}
                  />
                  <span>{product.name}</span>
                  {keptId(index) === product.id && <span className={styles.keepTag}>kalacak</span>}
                </label>
              ))}
            </div>
          ))}
        </>
      )}

      {groups && groups.length > 0 && (
        <>
          <p className={styles.sectionTitle}>Alt kategoriler</p>
          {groups.map((group, index) => (
            <div key={index} className={`${styles.section} ${group.on ? "" : styles.sectionOff}`}>
              <div className={styles.sectionHead}>
                <input
                  type="checkbox"
                  aria-label={`${group.name} alt kategorisini ekle`}
                  checked={group.on}
                  onChange={() => toggleGroup(index)}
                />
                <input
                  type="text"
                  className={styles.nameInput}
                  aria-label="Alt kategori adı"
                  maxLength={60}
                  value={group.name}
                  disabled={!group.on}
                  onChange={(e) => renameGroup(index, e.target.value)}
                />
              </div>
              <div className={aiStyles.chips}>
                {group.products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className={`${aiStyles.chip} ${aiStyles.chipOn}`}
                    disabled={!group.on}
                    title="Bu gruptan çıkar"
                    onClick={() => removeFromGroup(index, product.id)}
                  >
                    {product.name} ✕
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {groups !== null && !empty && (
        <>
          {applyMutation.isError && (
            <p className="error-text">{errorMessage(applyMutation.error, "Uygulanamadı, tekrar dene.")}</p>
          )}
          <button
            type="button"
            className={`btn btn-primary btn-block ${aiStyles.pill}`}
            disabled={!hasChanges || applyMutation.isPending}
            onClick={() => request && applyMutation.mutate(request)}
          >
            {applyMutation.isPending ? "Uygulanıyor..." : "Uygula"}
          </button>
        </>
      )}
    </div>
  );
}
