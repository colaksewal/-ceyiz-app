import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { reportAiOutcome } from "../api/aiJobs";
import { suggestProducts, type AiInput } from "../api/aiSuggestions";
import { isJobActive, useAiJob, useAiJobStore } from "../store/aiJobStore";
import type { ProductSuggestion } from "../types";
import AiWaiting from "./AiWaiting";
import styles from "./CategoryAiSuggest.module.scss";

function normalize(name: string): string {
  return name.trim().toLocaleLowerCase("tr");
}

function startErrorMessage(error: unknown): string {
  if (isAxiosError(error) && typeof error.response?.data?.error === "string") {
    return error.response.data.error;
  }
  return "Öneri alınamadı, tekrar dene.";
}

// Bir kategorinin içinden AI önerisi: foto/PDF yüklenir, AI'nın bulduğu ürünler o kategoriye
// eklenir (AI'nın önerdiği kategori adı kullanılmaz). Kategoride zaten olan ürünler öneride
// gösterilmez. Nereye yazılacağına (admin şablonu mu, kullanıcının listesi mi) çağıran karar verir.
//
// İstek arka planda çalışır (bkz. aiJobStore): jobKey bu kutuyu tanımlar; kullanıcı sayfadan
// çıkıp dönerse sonuç burada onu bekler, çıkmışken biterse köşede bildirim görür.
export default function CategoryAiSuggest({
  jobKey,
  jobLabel,
  existingNames,
  onAddItems,
  categoryId,
  restrictTo,
}: {
  jobKey: string;
  jobLabel: string;
  existingNames: string[];
  onAddItems: (items: string[]) => Promise<unknown>;
  // Kategori kimliği verilirse AI, kategorinin admin tanımlı alt kategorilerine (restrictTo) giren ürünleri önerir.
  categoryId?: string;
  restrictTo?: string[];
}) {
  const location = useLocation();
  const job = useAiJob(jobKey);
  const startJob = useAiJobStore((state) => state.start);
  const removeJob = useAiJobStore((state) => state.remove);
  const [open, setOpen] = useState(() => job !== undefined);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [items, setItems] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [jobError, setJobError] = useState<string | null>(null);
  // Öneriyi getiren AI işi; ürünler eklenince ne seçildiği bu işe bildirilir (admin ölçümü).
  const [resultJobId, setResultJobId] = useState<string | null>(null);
  const canSuggest = file !== null || text.trim() !== "";

  const suggestMutation = useMutation({
    mutationFn: (input: AiInput) => suggestProducts(input, categoryId),
    onSuccess: ({ jobId }) => startJob({ key: jobKey, jobId, label: jobLabel, returnTo: location.pathname }),
  });

  // İş bitince sonucu kutuya al ve store'dan sil (bildirim de böylece kapanır).
  useEffect(() => {
    if (!job || isJobActive(job)) return;
    if (job.status === "FAILED") {
      setJobError(job.error ?? "Öneri alınamadı, tekrar dene.");
    } else {
      const existing = new Set(existingNames.map(normalize));
      const result = job.status === "DONE" ? (job.result as ProductSuggestion) : null;
      const fresh = (result?.items ?? []).filter((item) => !existing.has(normalize(item)));
      setItems(fresh);
      setSelected(new Set(fresh));
      setResultJobId(job.jobId);
    }
    setOpen(true);
    removeJob(jobKey);
  }, [job, existingNames, jobKey, removeJob]);

  const thinking = suggestMutation.isPending || isJobActive(job);

  function startSuggestion() {
    if (!canSuggest) return;
    setItems(null);
    setJobError(null);
    suggestMutation.mutate({ file, text });
  }

  // Kutuyu kapatmak süren isteği de bırakır; sonucu gelse bile gösterilmez.
  function close() {
    removeJob(jobKey);
    setOpen(false);
  }

  const addMutation = useMutation({
    mutationFn: (chosen: string[]) => onAddItems(chosen),
    onSuccess: (_result, chosen) => {
      if (resultJobId) reportAiOutcome(resultJobId, { offered: items ?? [], selected: chosen });
      setResultJobId(null);
      setItems(null);
      setFile(null);
      setText("");
      setSelected(new Set());
      setOpen(false);
    },
  });

  function toggle(item: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  }

  if (!open) {
    return (
      <button type="button" className={styles.openButton} onClick={() => setOpen(true)}>
        <span aria-hidden="true">✨</span> AI ile ürün öner
      </button>
    );
  }

  return (
    <div className={styles.box}>
      <div className={styles.header}>
        <span className={styles.spark} aria-hidden="true">
          ✨
        </span>
        <div className={styles.headerText}>
          <strong>AI ile ürün öner</strong>
          <p>
            Bir fotoğraf (etiket, liste) ya da PDF yükle veya listeyi yaz; AI içindeki ürünleri bu
            kategoriye önersin.{restrictTo && restrictTo.length > 0 && ` Sadece alt kategorilere (${restrictTo.join(", ")}) giren ürünler önerilir.`}{" "}
            Sadece metin daha hızlı, görsel 1-2 dakika sürebilir.
          </p>
        </div>
        <button type="button" className={styles.close} aria-label="Kapat" onClick={close}>
          ✕
        </button>
      </div>

      <textarea
        className={styles.textInput}
        rows={3}
        maxLength={10000}
        placeholder="ya da buraya yaz / yapıştır, ör. çatal bıçak takımı, 6'lı su bardağı, tencere seti..."
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setItems(null);
        }}
      />

      <div className={styles.row}>
        <label className={styles.filePick}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setItems(null);
              e.target.value = "";
            }}
          />
          <span>{file ? `📎 ${file.name}` : "📷 Dosya seç (opsiyonel)"}</span>
        </label>
        {file && (
          <button type="button" className={styles.close} aria-label="Dosyayı kaldır" onClick={() => setFile(null)}>
            ✕
          </button>
        )}
        <button
          type="button"
          className={`btn btn-primary ${styles.pill}`}
          disabled={!canSuggest || thinking}
          onClick={startSuggestion}
        >
          {thinking ? "Düşünüyor..." : "Öner"}
        </button>
      </div>

      {thinking && <AiWaiting startedAt={job?.startedAt} queuePosition={job?.queuePosition} />}

      {suggestMutation.isError && <p className="error-text">{startErrorMessage(suggestMutation.error)}</p>}
      {jobError && <p className="error-text">{jobError}</p>}

      {items && items.length === 0 && (
        <p className={styles.note}>AI bu kategoriye eklenecek yeni bir ürün bulamadı.</p>
      )}

      {items && items.length > 0 && (
        <>
          <div className={styles.chips}>
            {items.map((item) => (
              <button
                key={item}
                type="button"
                className={`${styles.chip} ${selected.has(item) ? styles.chipOn : ""}`}
                aria-pressed={selected.has(item)}
                onClick={() => toggle(item)}
              >
                {selected.has(item) ? "✓ " : "+ "}
                {item}
              </button>
            ))}
          </div>
          {addMutation.isError && <p className="error-text">Eklenemedi, tekrar dene.</p>}
          <button
            type="button"
            className={`btn btn-primary btn-block ${styles.pill}`}
            disabled={selected.size === 0 || addMutation.isPending}
            onClick={() => addMutation.mutate((items ?? []).filter((item) => selected.has(item)))}
          >
            {addMutation.isPending ? "Ekleniyor..." : `${selected.size} ürünü ekle`}
          </button>
        </>
      )}
    </div>
  );
}
