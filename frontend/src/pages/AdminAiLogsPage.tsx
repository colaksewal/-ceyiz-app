import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAiLogs, getAiLogStats, type AiLog, type AiLogKind, type AiLogStats } from "../api/aiLogs";
import { resolveUploadUrl } from "../api/uploads";
import { useAuthStore } from "../store/authStore";
import styles from "./AdminAiLogsPage.module.scss";

const kindLabels: Record<AiLogKind, string> = {
  "set-suggestion": "Set doldurma",
  "product-suggestion": "Ürün önerisi",
  "payment-plan-advice": "Ödeme planı yorumu",
};

const statusLabels: Record<string, string> = {
  PENDING: "Sırada",
  RUNNING: "Çalışıyor",
  DONE: "Başarılı",
  EMPTY: "Boş",
  FAILED: "Hata",
};

const dateFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" });

function seconds(ms: number | null): string {
  return ms == null ? "—" : `${(ms / 1000).toFixed(1)} sn`;
}

function parse(json: string | null): unknown {
  if (json == null) return null;
  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
}

function pretty(json: string | null): string {
  const value = parse(json);
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function normalize(name: string): string {
  return name.trim().toLocaleLowerCase("tr");
}

function itemNames(value: unknown): string[] {
  const items = (value as { items?: { itemName?: string }[] } | null)?.items ?? [];
  return items.map((item) => item.itemName ?? "").filter((name) => name.trim() !== "");
}

// Admin, kullanıcıların AI'ya ne verdiğini, AI'nın ne döndüğünü ve kullanıcının sonunda neyi
// kaydettiğini buradan görür; prompt değişikliklerinin işe yarayıp yaramadığı buradan ölçülür.
export default function AdminAiLogsPage() {
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const [kind, setKind] = useState<AiLogKind | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: stats } = useQuery({ queryKey: ["aiLogStats"], queryFn: getAiLogStats, enabled: isAdmin });
  const { data: logs, isLoading, error } = useQuery({
    queryKey: ["aiLogs", kind],
    queryFn: () => getAiLogs(kind),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return <Navigate to="/lists" replace />;
  }

  return (
    <div>
      <div className={styles.hero}>
        <h1>AI kayıtları</h1>
        <p className="muted">
          Kullanıcıların AI'ya verdiği girdi, AI'nın ham cevabı ve kullanıcının sonunda kaydettiği hal.
          İsabet: AI'nın önerisinin ne kadarı değiştirilmeden kaydedildi.
        </p>
      </div>

      {stats && (
        <div className={styles.statsGrid}>
          {stats.map((s) => (
            <StatsCard key={s.kind} stats={s} />
          ))}
        </div>
      )}

      <div className={styles.filters}>
        <button
          type="button"
          className={`${styles.filter} ${kind === null ? styles.filterOn : ""}`}
          onClick={() => setKind(null)}
        >
          Tümü
        </button>
        {(Object.keys(kindLabels) as AiLogKind[]).map((k) => (
          <button
            key={k}
            type="button"
            className={`${styles.filter} ${kind === k ? styles.filterOn : ""}`}
            onClick={() => setKind(k)}
          >
            {kindLabels[k]}
          </button>
        ))}
      </div>

      {isLoading && <p className="muted">Yükleniyor...</p>}
      {error && <p className="error-text">Kayıtlar yüklenemedi</p>}
      {logs && logs.length === 0 && <p className="empty-state">Henüz AI kaydı yok.</p>}

      {logs && logs.length > 0 && (
        <ul className={styles.logList}>
          {logs.map((log) => (
            <LogRow
              key={log.id}
              log={log}
              open={openId === log.id}
              onToggle={() => setOpenId((id) => (id === log.id ? null : log.id))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function StatsCard({ stats }: { stats: AiLogStats }) {
  const usedRate = stats.done > 0 ? Math.round((100 * stats.used) / stats.done) : null;
  return (
    <div className={`card ${styles.statsCard}`}>
      <strong>{kindLabels[stats.kind]}</strong>
      <span className={styles.statsMain}>
        {stats.averageScore != null ? `%${stats.averageScore}` : "—"}
        <span className="muted"> ortalama isabet</span>
      </span>
      <span className="muted">
        {stats.total} istek · {stats.done} başarılı · {stats.empty} boş · {stats.failed} hata
      </span>
      <span className="muted">
        {stats.used} kaydedildi{usedRate != null && ` (başarılıların %${usedRate}'i)`} · ort.{" "}
        {seconds(stats.averageDurationMs)}
      </span>
    </div>
  );
}

function LogRow({ log, open, onToggle }: { log: AiLog; open: boolean; onToggle: () => void }) {
  const isImage = log.inputContentType?.startsWith("image/");
  return (
    <li className={`card ${styles.logCard}`}>
      <button type="button" className={styles.logHeader} onClick={onToggle} aria-expanded={open}>
        <span className={styles.logTitle}>
          <span className="badge badge-neutral">{kindLabels[log.kind] ?? log.kind}</span>
          <span className={`badge ${log.status === "DONE" ? "badge-success" : log.status === "FAILED" ? "badge-warning" : "badge-neutral"}`}>
            {statusLabels[log.status] ?? log.status}
          </span>
          {log.score != null ? (
            <span className={styles.score}>%{log.score} isabet</span>
          ) : log.usedJson == null && log.kind !== "payment-plan-advice" && log.status === "DONE" ? (
            <span className="muted">kaydedilmedi</span>
          ) : null}
        </span>
        <span className={styles.logMeta}>
          {log.userEmail ?? "silinmiş kullanıcı"} · {dateFormatter.format(new Date(log.createdAt))} ·{" "}
          {seconds(log.durationMs)}
          {log.inputFileUrl && " · 📎"}
        </span>
        <span className={styles.logPreview}>{log.inputText ?? (log.inputFileUrl ? "(sadece dosya)" : "")}</span>
      </button>

      {open && (
        <div className={styles.logBody}>
          {log.inputFileUrl && (
            <Block title="Yüklenen dosya">
              {isImage ? (
                <a href={resolveUploadUrl(log.inputFileUrl)} target="_blank" rel="noreferrer">
                  <img src={resolveUploadUrl(log.inputFileUrl)} alt="Kullanıcının yüklediği görsel" className={styles.inputImage} />
                </a>
              ) : (
                <a href={resolveUploadUrl(log.inputFileUrl)} target="_blank" rel="noreferrer">
                  📄 PDF'i aç
                </a>
              )}
            </Block>
          )}
          {log.inputText && (
            <Block title="Kullanıcının yazdığı">
              <pre className={styles.pre}>{log.inputText}</pre>
            </Block>
          )}
          {log.error && <p className="error-text">{log.error}</p>}

          {log.usedJson && log.kind === "set-suggestion" && <SetComparison log={log} />}
          {log.usedJson && log.kind === "product-suggestion" && <ProductComparison log={log} />}

          <Block title="AI'nın ham cevabı">
            <pre className={styles.pre}>{log.rawResponse ? pretty(log.rawResponse) : "(cevap yok)"}</pre>
          </Block>
          {log.resultJson && (
            <Block title="Forma giden sonuç (düzeltmelerden sonra)">
              <pre className={styles.pre}>{pretty(log.resultJson)}</pre>
            </Block>
          )}
          {log.usedJson && (
            <Block title={`Kullanıcının kaydettiği${log.usedAt ? ` · ${dateFormatter.format(new Date(log.usedAt))}` : ""}`}>
              <pre className={styles.pre}>{pretty(log.usedJson)}</pre>
            </Block>
          )}
        </div>
      )}
    </li>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.block}>
      <h4>{title}</h4>
      {children}
    </div>
  );
}

// Parça adları: AI'nın önerip kullanıcının aynen tuttukları, sildikleri/değiştirdikleri ve
// kendi eklediği (ya da düzelttiği) adlar.
function SetComparison({ log }: { log: AiLog }) {
  const suggested = itemNames(parse(log.resultJson));
  const saved = itemNames(parse(log.usedJson));
  const savedSet = new Set(saved.map(normalize));
  const suggestedSet = new Set(suggested.map(normalize));
  const suggestedValue = parse(log.resultJson) as { name?: string; brand?: string } | null;
  const savedValue = parse(log.usedJson) as { name?: string; brand?: string } | null;

  return (
    <Block title="Karşılaştırma">
      <ul className={styles.compare}>
        <CompareLine label="Set adı" before={suggestedValue?.name} after={savedValue?.name} />
        <CompareLine label="Marka" before={suggestedValue?.brand} after={savedValue?.brand} />
        {suggested.map((name) => (
          <li key={`s-${name}`} className={savedSet.has(normalize(name)) ? styles.kept : styles.dropped}>
            {savedSet.has(normalize(name)) ? "✓" : "✕"} {name}
          </li>
        ))}
        {saved
          .filter((name) => !suggestedSet.has(normalize(name)))
          .map((name) => (
            <li key={`u-${name}`} className={styles.added}>
              ＋ {name}
            </li>
          ))}
      </ul>
      <p className={styles.legend}>✓ aynen kaydedildi · ✕ silindi ya da düzeltildi · ＋ kullanıcı ekledi/düzeltti</p>
    </Block>
  );
}

function CompareLine({ label, before, after }: { label: string; before?: string | null; after?: string | null }) {
  const same = (before ?? "").trim() === (after ?? "").trim();
  return (
    <li className={same ? styles.kept : styles.changed}>
      <strong>{label}:</strong> {same ? before || "—" : `${before || "—"} → ${after || "—"}`}
    </li>
  );
}

function ProductComparison({ log }: { log: AiLog }) {
  const used = parse(log.usedJson) as { offered?: string[]; selected?: string[] } | null;
  const selected = new Set(used?.selected ?? []);
  return (
    <Block title="Karşılaştırma">
      <ul className={styles.compare}>
        {(used?.offered ?? []).map((name) => (
          <li key={name} className={selected.has(name) ? styles.kept : styles.dropped}>
            {selected.has(name) ? "✓" : "✕"} {name}
          </li>
        ))}
      </ul>
      <p className={styles.legend}>✓ eklendi · ✕ seçilmedi</p>
    </Block>
  );
}
