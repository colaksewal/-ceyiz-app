import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { suggestProducts, type AiInput } from "../api/aiSuggestions";
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
  const [text, setText] = useState("");
  const [items, setItems] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const canSuggest = file !== null || text.trim() !== "";

  const suggestMutation = useMutation({
    mutationFn: (input: AiInput) => suggestProducts(input),
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
            kategoriye önersin. Sadece metin daha hızlı, görsel 1-2 dakika sürebilir.
          </p>
        </div>
        <button type="button" className={styles.close} aria-label="Kapat" onClick={() => setOpen(false)}>
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
          disabled={!canSuggest || suggestMutation.isPending}
          onClick={() => canSuggest && suggestMutation.mutate({ file, text })}
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
