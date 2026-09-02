import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPriceEntry, getPriceEntries, markAsPreferred } from "../api/priceEntries";
import type { PriceType } from "../types";
import styles from "./ProductPage.module.scss";

const priceTypeLabels: Record<PriceType, string> = {
  PESIN: "Peşin",
  TAKTILI: "Taksitli",
  ELDEN_KREDI_KARTI: "Elden Kredi Kartı",
};

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
      <h1>Fiyat Notları</h1>

      <form onSubmit={handleSubmit} className={`card ${styles.form}`}>
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
              step="0.01"
              value={form.cashPrice}
              onChange={(e) => setForm({ ...form, cashPrice: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Taksit Sayısı</label>
            <input
              type="number"
              value={form.installmentCount}
              onChange={(e) => setForm({ ...form, installmentCount: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Taksit Tutarı (TL)</label>
            <input
              type="number"
              step="0.01"
              value={form.installmentAmount}
              onChange={(e) => setForm({ ...form, installmentAmount: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Fotoğraf URL</label>
            <input
              type="text"
              value={form.photoUrl}
              onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
            />
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

      <ul className={styles.entryList}>
        {entries?.map((entry) => (
          <li
            key={entry.id}
            className={`${styles.entry} ${entry.isPreferred ? styles.entryPreferred : ""}`}
          >
            <div className={styles.entryHead}>
              <span className={styles.storeName}>{entry.storeName}</span>
              {entry.isPreferred ? (
                <span className={styles.preferredBadge}>✓ Kullanılan fiyat</span>
              ) : (
                <button
                  onClick={() => preferMutation.mutate(entry.id)}
                  disabled={preferMutation.isPending}
                  className="btn btn-secondary"
                >
                  Bunu Kullan
                </button>
              )}
            </div>
            <div className={styles.entryDetail}>{priceTypeLabels[entry.priceType]}</div>
            {entry.cashPrice != null && (
              <div className={styles.entryDetail}>Peşin: {entry.cashPrice} TL</div>
            )}
            {entry.installmentCount != null && entry.installmentAmount != null && (
              <div className={styles.entryDetail}>
                Taksit: {entry.installmentCount} x {entry.installmentAmount} TL
              </div>
            )}
            {entry.paymentPlanNote && (
              <div className={styles.entryDetail}>Not: {entry.paymentPlanNote}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
