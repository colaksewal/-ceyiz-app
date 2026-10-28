import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPriceEntry,
  deletePriceEntry,
  getPriceEntries,
  markAsPreferred,
  updatePriceEntry,
} from "../api/priceEntries";
import { getProduct, updateProduct } from "../api/products";
import ExternalLink from "../components/ExternalLink";
import { uploadFile, resolveUploadUrl } from "../api/uploads";
import type { PriceEntry, PriceType } from "../types";
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
  url: "",
};

export default function ProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();
  // Düzenlenen fiyat notu (aynı anda biri) ve ürün linki düzenleme durumu.
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingUrl, setEditingUrl] = useState<string | null>(null);

  const { data: product } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProduct(productId!),
    enabled: !!productId,
  });

  const urlMutation = useMutation({
    mutationFn: (url: string) => updateProduct(productId!, { url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditingUrl(null);
    },
  });

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
        url: form.url.trim() || null,
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
      <h1 className={styles.title}>{product?.name ?? "Fiyat Notları"}</h1>

      {product && (
        <section className={`card ${styles.productCard}`}>
          <div className={styles.productLinkRow}>
            {editingUrl === null ? (
              <>
                {product.url ? <ExternalLink url={product.url} /> : <span className="muted">Ürün linki yok</span>}
                <button type="button" className="btn btn-ghost" onClick={() => setEditingUrl(product.url ?? "")}>
                  {product.url ? "✎ Linki düzenle" : "＋ Link ekle"}
                </button>
              </>
            ) : (
              <form
                className={styles.urlForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  urlMutation.mutate(editingUrl.trim());
                }}
              >
                <input
                  type="url"
                  inputMode="url"
                  autoFocus
                  aria-label="Ürün linki"
                  placeholder="https://... (boş bırakırsan link kalkar)"
                  value={editingUrl}
                  onChange={(e) => setEditingUrl(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={urlMutation.isPending}>
                  Kaydet
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingUrl(null)}>
                  Vazgeç
                </button>
              </form>
            )}
          </div>
          {urlMutation.isError && <p className="error-text">Link kaydedilemedi, adresi kontrol et.</p>}

          {product.partCount > 0 && (
            <div className={styles.partsBlock}>
              <strong>🧩 {product.partCount} parça</strong>
              <ul className={styles.partsList}>
                {product.parts.map((part, index) => (
                  <li key={`${part.name}-${index}`}>
                    <strong>{part.quantity}×</strong> {part.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

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
            <label>Ürün linki (opsiyonel)</label>
            <input
              type="url"
              inputMode="url"
              placeholder="https://..."
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
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
      {deleteMutation.isError && <p className="error-text">Fiyat notu silinemedi</p>}

      <ul className={styles.entryGrid}>
        {entries?.map((entry) => (
          <li
            key={entry.id}
            className={`${styles.entry} ${entry.isPreferred ? styles.entryPreferred : ""} ${
              editingEntryId === entry.id ? styles.entryEditing : ""
            }`}
          >
            {entry.isPreferred && <span className={styles.preferredRibbon}>✓ Kullanılan fiyat</span>}
            {entry.photoUrl && (
              <img src={resolveUploadUrl(entry.photoUrl)} alt={entry.storeName} className={styles.entryPhoto} />
            )}
            {editingEntryId === entry.id ? (
              <EntryEditForm
                entry={entry}
                productId={productId}
                onDone={() => setEditingEntryId(null)}
              />
            ) : (
            <div className={styles.entryBody}>
              <div className={styles.entryHead}>
                <span className={styles.storeName}>{entry.storeName}</span>
                <span className="badge badge-neutral">{priceTypeLabels[entry.priceType]}</span>
              </div>
              {entry.url && (
                <div className={styles.entryLink}>
                  <ExternalLink url={entry.url} />
                </div>
              )}

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
                  type="button"
                  onClick={() => setEditingEntryId(entry.id)}
                  className="btn btn-ghost"
                  title="Fiyat notunu düzenle"
                >
                  ✎ Düzenle
                </button>
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
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Fiyat notunu yerinde düzenler: mağaza, ödeme tipi, fiyatlar, plan notu ve link. Fotoğraf ve "kullanılan"
// işareti değişmez.
function EntryEditForm({
  entry,
  productId,
  onDone,
}: {
  entry: PriceEntry;
  productId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({
    storeName: entry.storeName,
    priceType: entry.priceType,
    cashPrice: entry.cashPrice != null ? String(entry.cashPrice) : "",
    installmentCount: entry.installmentCount != null ? String(entry.installmentCount) : "",
    installmentAmount: entry.installmentAmount != null ? String(entry.installmentAmount) : "",
    paymentPlanNote: entry.paymentPlanNote ?? "",
    url: entry.url ?? "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      updatePriceEntry(entry.id, {
        storeName: draft.storeName.trim(),
        priceType: draft.priceType,
        cashPrice: draft.cashPrice ? Number(draft.cashPrice) : null,
        installmentCount: draft.priceType === "TAKSITLI" && draft.installmentCount ? Number(draft.installmentCount) : null,
        installmentAmount: draft.priceType === "TAKSITLI" && draft.installmentAmount ? Number(draft.installmentAmount) : null,
        paymentPlanNote: draft.paymentPlanNote.trim() || null,
        url: draft.url.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priceEntries", productId] });
      queryClient.invalidateQueries({ queryKey: ["listSummary"] });
      queryClient.invalidateQueries({ queryKey: ["paymentPlan"] });
      onDone();
    },
  });

  return (
    <form
      className={styles.editForm}
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.storeName.trim()) return;
        mutation.mutate();
      }}
    >
      <div className="form-grid">
        <div className="field">
          <label>Mağaza</label>
          <input
            type="text"
            value={draft.storeName}
            onChange={(e) => setDraft({ ...draft, storeName: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label>Ödeme Tipi</label>
          <select
            value={draft.priceType}
            onChange={(e) => setDraft({ ...draft, priceType: e.target.value as PriceType })}
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
            value={draft.cashPrice}
            onChange={(e) => setDraft({ ...draft, cashPrice: e.target.value })}
          />
        </div>
        {draft.priceType === "TAKSITLI" && (
          <>
            <div className="field">
              <label>Taksit Sayısı</label>
              <input
                type="number"
                inputMode="numeric"
                value={draft.installmentCount}
                onChange={(e) => setDraft({ ...draft, installmentCount: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Taksit Tutarı (TL)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={draft.installmentAmount}
                onChange={(e) => setDraft({ ...draft, installmentAmount: e.target.value })}
              />
            </div>
          </>
        )}
        <div className="field form-grid-full">
          <label>Ürün linki (opsiyonel)</label>
          <input
            type="url"
            inputMode="url"
            placeholder="https://..."
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          />
        </div>
        <div className="field form-grid-full">
          <label>Ödeme Planı Notu</label>
          <textarea
            rows={3}
            value={draft.paymentPlanNote}
            onChange={(e) => setDraft({ ...draft, paymentPlanNote: e.target.value })}
          />
        </div>
      </div>
      {mutation.isError && <p className="error-text">Kaydedilemedi, bilgileri ve linki kontrol et.</p>}
      <div className={styles.editActions}>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Vazgeç
        </button>
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
