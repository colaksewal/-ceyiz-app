import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPriceEntry,
  deletePriceEntry,
  getPriceEntries,
  markAsPreferred,
} from "../api/priceEntries";
import { uploadFile, resolveUploadUrl } from "../api/uploads";
import type { PriceType } from "../types";
import styles from "./ProductPage.module.scss";

const priceTypeLabels: Record<PriceType, string> = {
  PESIN: "Peşin",
  TAKSITLI: "Taksitli",
  ELDEN_KREDI_KARTI: "Elden Kredi Kartı",
};

const tlFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

function formatTl(value: number) {
  return tlFormatter.format(value);
}

const emptyForm = {
  storeName: "",
  priceType: "PESIN" as PriceType,
  cashPrice: "",
  installmentCount: "",
  installmentAmount: "",
  paymentPlanNote: "",
  photoUrl: "",
};

export default function ProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: entries, isLoading, error } = useQuery({
    queryKey: ["priceEntries", productId],
    queryFn: () => getPriceEntries(productId!),
    enabled: !!productId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createPriceEntry(productId!, {
        storeName: form.storeName,
        priceType: form.priceType,
        cashPrice: form.cashPrice ? Number(form.cashPrice) : null,
        installmentCount: form.installmentCount ? Number(form.installmentCount) : null,
        installmentAmount: form.installmentAmount ? Number(form.installmentAmount) : null,
        paymentPlanNote: form.paymentPlanNote || null,
        photoUrl: form.photoUrl || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priceEntries", productId] });
      setForm(emptyForm);
    },
  });

  const preferMutation = useMutation({
    mutationFn: (priceEntryId: string) => markAsPreferred(priceEntryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priceEntries", productId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (priceEntryId: string) => deletePriceEntry(priceEntryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priceEntries", productId] });
    },
  });

  function handleDelete(priceEntryId: string, storeName: string) {
    if (window.confirm(`"${storeName}" fiyat notu silinecek. Emin misin?`)) {
      deleteMutation.mutate(priceEntryId);
    }
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(file),
    onSuccess: (url) => setForm((prev) => ({ ...prev, photoUrl: url })),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.storeName.trim()) return;
    createMutation.mutate();
  }

  if (!productId) return null;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="btn btn-ghost back-link">
        ← Geri
      </button>
      <h1 className={styles.title}>Fiyat Notları</h1>
      {entries && entries.length > 0 && (
        <p className={styles.subtitle}>{entries.length} mağazadan fiyat not edildi</p>
      )}

      <form onSubmit={handleSubmit} className={`card ${styles.form}`}>
        <h3 className={styles.formTitle}>Yeni fiyat notu</h3>
        <div className="form-grid">
          <div className="field">
            <label>Mağaza</label>
            <input
              type="text"
              value={form.storeName}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Ödeme Tipi</label>
            <select
              value={form.priceType}
              onChange={(e) => setForm({ ...form, priceType: e.target.value as PriceType })}
            >
              {Object.entries(priceTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Peşin Fiyat (TL)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={form.cashPrice}
              onChange={(e) => setForm({ ...form, cashPrice: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Taksit Sayısı</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.installmentCount}
              onChange={(e) => setForm({ ...form, installmentCount: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Taksit Tutarı (TL)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={form.installmentAmount}
              onChange={(e) => setForm({ ...form, installmentAmount: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Fotoğraf</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
            {uploadMutation.isPending && <span className="muted">Yükleniyor...</span>}
            {uploadMutation.isError && <span className="error-text">Fotoğraf yüklenemedi</span>}
            {form.photoUrl && (
              <img src={resolveUploadUrl(form.photoUrl)} alt="Önizleme" className={styles.photoPreview} />
            )}
          </div>
          <div className="field form-grid-full">
            <label>Ödeme Planı Notu</label>
            <input
              type="text"
              placeholder="ör. 3 ay sonra 500 TL, kalanı 6 taksit"
              value={form.paymentPlanNote}
              onChange={(e) => setForm({ ...form, paymentPlanNote: e.target.value })}
            />
          </div>
        </div>
        <button type="submit" disabled={createMutation.isPending} className={`btn btn-primary ${styles.submitBtn}`}>
          {createMutation.isPending ? "Kaydediliyor..." : "Fiyat Notu Ekle"}
        </button>
      </form>

      {isLoading && <p className="muted">Yükleniyor...</p>}
      {error && <p className="error-text">Fiyat notları yüklenemedi</p>}
      {entries && entries.length === 0 && <p className="empty-state">Henüz fiyat notu yok.</p>}
      {deleteMutation.isError && <p className="error-text">Fiyat notu silinemedi</p>}

      <ul className={styles.entryGrid}>
        {entries?.map((entry) => (
          <li
            key={entry.id}
            className={`${styles.entry} ${entry.isPreferred ? styles.entryPreferred : ""}`}
          >
            {entry.isPreferred && <span className={styles.preferredRibbon}>✓ Kullanılan fiyat</span>}
            {entry.photoUrl && (
              <img src={resolveUploadUrl(entry.photoUrl)} alt={entry.storeName} className={styles.entryPhoto} />
            )}
            <div className={styles.entryBody}>
              <div className={styles.entryHead}>
                <span className={styles.storeName}>{entry.storeName}</span>
                <span className="badge badge-neutral">{priceTypeLabels[entry.priceType]}</span>
              </div>

              {entry.cashPrice != null && (
                <div className={styles.price}>{formatTl(entry.cashPrice)}</div>
              )}
              {entry.installmentCount != null && entry.installmentAmount != null && (
                <div className={styles.entryDetail}>
                  {entry.installmentCount} × {formatTl(entry.installmentAmount)} taksit
                </div>
              )}
              {entry.paymentPlanNote && (
                <div className={styles.entryNote}>{entry.paymentPlanNote}</div>
              )}

              <div className={styles.entryActions}>
                {!entry.isPreferred && (
                  <button
                    onClick={() => preferMutation.mutate(entry.id)}
                    disabled={preferMutation.isPending}
                    className="btn btn-secondary"
                  >
                    Bunu Kullan
                  </button>
                )}
                <button
                  onClick={() => handleDelete(entry.id, entry.storeName)}
                  disabled={deleteMutation.isPending}
                  className={`btn btn-danger-ghost ${styles.deleteBtn}`}
                  title="Fiyat notunu sil"
                >
                  🗑 Sil
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
