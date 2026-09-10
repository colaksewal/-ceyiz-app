import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { suggestFromFile } from "../api/aiSuggestions";
import type { ProductSuggestion } from "../types";
import styles from "./AiSuggestionPanel.module.scss";

export default function AiSuggestionPanel({
  onAdd,
}: {
  onAdd: (categoryName: string, items: string[]) => Promise<unknown>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [suggestion, setSuggestion] = useState<ProductSuggestion | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const suggestMutation = useMutation({
    mutationFn: (f: File) => suggestFromFile(f),
    onSuccess: (result) => {
      setSuggestion(result);
      if (result) {
        setCategoryName(result.categoryName);
        setSelected(new Set(result.items));
      }
    },
  });

  const addMutation = useMutation({
    mutationFn: () => onAdd(categoryName, Array.from(selected)),
    onSuccess: () => {
      setFile(null);
      setSuggestion(null);
      setCategoryName("");
      setSelected(new Set());
    },
  });

  function toggleItem(item: string) {
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

  return (
    <div className={`card ${styles.panel}`}>
      <h3>AI ile Öner</h3>
      <p className="muted">
        Bir fotoğraf (etiket, liste) ya da PDF yükle — AI bir kategori adı ve ürün önerileri
        çıkarsın. İşlem 1-2 dakika sürebilir.
      </p>

      <div className={`form-row ${styles.form}`}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={!file || suggestMutation.isPending}
          onClick={() => file && suggestMutation.mutate(file)}
        >
          {suggestMutation.isPending ? "İşleniyor..." : "Öner"}
        </button>
      </div>

      {suggestMutation.isError && <p className="error-text">Öneri alınamadı, tekrar dene.</p>}
      {suggestMutation.isSuccess && !suggestion && (
        <p className="error-text">AI bir öneri üretemedi.</p>
      )}

      {suggestion && (
        <div className={styles.suggestionResult}>
          <div className="field">
            <label>Kategori adı</label>
            <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
          </div>

          <ul className={styles.productList}>
            {suggestion.items.map((item) => (
              <li key={item} className={styles.productRow}>
                <label className={styles.checkboxRow}>
                  <input type="checkbox" checked={selected.has(item)} onChange={() => toggleItem(item)} />
                  {item}
                </label>
              </li>
            ))}
            {suggestion.items.length === 0 && <li className="muted">AI hiç ürün bulamadı.</li>}
          </ul>

          {addMutation.isError && <p className="error-text">Eklenemedi, tekrar dene.</p>}

          <button
            type="button"
            className="btn btn-primary"
            disabled={!categoryName.trim() || selected.size === 0 || addMutation.isPending}
            onClick={() => addMutation.mutate()}
          >
            {addMutation.isPending ? "Ekleniyor..." : "Seçilenleri Ekle"}
          </button>
        </div>
      )}
    </div>
  );
}
