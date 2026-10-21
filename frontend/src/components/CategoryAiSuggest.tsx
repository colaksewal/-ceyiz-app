import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { suggestFromFile } from "../api/aiSuggestions";
import AiWaiting from "./AiWaiting";
import styles from "./CategoryAiSuggest.module.scss";

function normalize(name: string): string {
  return name.trim().toLocaleLowerCase("tr");
}

// Bir kategorinin içinden AI önerisi: foto/PDF yüklenir, AI'nın bulduğu ürünler o kategoriye
// eklenir (AI'nın önerdiği kategori adı kullanılmaz). Kategoride zaten olan ürünler öneride
// gösterilmez. Nereye yazılacağına (admin şablonu mu, kullanıcının listesi mi) çağıran karar verir.
export default function CategoryAiSuggest({
  existingNames,
  onAddItems,
}: {
  existingNames: string[];
  onAddItems: (items: string[]) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const suggestMutation = useMutation({
    mutationFn: (f: File) => suggestFromFile(f),
    onSuccess: (result) => {
      const existing = new Set(existingNames.map(normalize));
      const fresh = (result?.items ?? []).filter((item) => !existing.has(normalize(item)));
      setItems(fresh);
      setSelected(new Set(fresh));
    },
  });

  const addMutation = useMutation({
    mutationFn: () => onAddItems((items ?? []).filter((item) => selected.has(item))),
    onSuccess: () => {
      setItems(null);
      setFile(null);
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
            Bir fotoğraf (etiket, liste) ya da PDF yükle; AI içindeki ürünleri bu kategoriye
            önersin. 1-2 dakika sürebilir.
          </p>
        </div>
        <button type="button" className={styles.close} aria-label="Kapat" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>

      <div className={styles.row}>
        <label className={styles.filePick}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setItems(null);
            }}
          />
          <span>{file ? `📎 ${file.name}` : "📷 Dosya seç"}</span>
        </label>
        <button
          type="button"
          className={`btn btn-primary ${styles.pill}`}
          disabled={!file || suggestMutation.isPending}
          onClick={() => file && suggestMutation.mutate(file)}
        >
          {suggestMutation.isPending ? "Düşünüyor..." : "Öner"}
        </button>
      </div>

      {suggestMutation.isPending && <AiWaiting />}

      {suggestMutation.isError && <p className="error-text">Öneri alınamadı, tekrar dene.</p>}

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
            onClick={() => addMutation.mutate()}
          >
            {addMutation.isPending ? "Ekleniyor..." : `${selected.size} ürünü ekle`}
          </button>
        </>
      )}
    </div>
  );
}
