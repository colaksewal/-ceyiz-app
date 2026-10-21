import { useCallback, useState } from "react";
import { Navigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSetTemplate,
  deleteSetTemplate,
  getSetTemplates,
  suggestSetFromFile,
} from "../api/adminSetTemplates";
import Sheet from "../components/Sheet";
import { useAuthStore } from "../store/authStore";
import type { PriceType, SetTemplate, SetTemplatePrice, SetTemplateSuggestion } from "../types";
import styles from "./AdminSetTemplatesPage.module.scss";

const priceTypeLabels: Record<PriceType, string> = {
  PESIN: "Peşin",
  TAKSITLI: "Taksitli",
  ELDEN_KREDI_KARTI: "Elden Kredi Kartı",
};

const tlFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

function formatTl(value: number) {
  return tlFormatter.format(value);
}

// Form satırları input değerlerini string tutar (boş input = ""); sayıya kayıt anında çevrilir.
// `key` sadece React listesi için — satır silinince diğer satırların state'i karışmasın.
interface ItemRow {
  key: number;
  itemName: string;
  quantity: string;
  separatePrice: string;
  note: string;
}

interface PriceRow {
  key: number;
  priceType: PriceType;
  storeName: string;
  cashPrice: string;
  installmentCount: string;
  installmentAmount: string;
  paymentPlanNote: string;
}

let nextRowKey = 0;

function emptyItemRow(): ItemRow {
  return { key: nextRowKey++, itemName: "", quantity: "1", separatePrice: "", note: "" };
}

function emptyPriceRow(): PriceRow {
  return {
    key: nextRowKey++,
    priceType: "PESIN",
    storeName: "",
    cashPrice: "",
    installmentCount: "",
    installmentAmount: "",
    paymentPlanNote: "",
  };
}

function toNumberOrNull(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function toInputValue(value: number | null): string {
  return value == null ? "" : String(value);
}

// Set adındaki "64 parça" gibi ilan edilen sayı; girilen parçaların toplamıyla karşılaştırmak için.
function advertisedPieceCount(name: string): number | null {
  const match = name.match(/(\d+)\s*parça/i);
  return match ? Number(match[1]) : null;
}

// Set fiyatı olarak karşılaştırmada en düşük peşin fiyat kullanılır; peşin yoksa herhangi
// bir satırdaki en düşük toplam fiyat.
function referenceSetPrice(prices: Pick<SetTemplatePrice, "priceType" | "cashPrice">[]): number | null {
  const withCash = prices.filter((p) => p.cashPrice != null && p.cashPrice > 0);
  const cash = withCash.filter((p) => p.priceType === "PESIN");
  const pool = cash.length > 0 ? cash : withCash;
  if (pool.length === 0) return null;
  return Math.min(...pool.map((p) => p.cashPrice as number));
}

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error === "string") {
    return error.response.data.error;
  }
  return fallback;
}

export default function AdminSetTemplatesPage() {
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: sets, isLoading, error } = useQuery({
    queryKey: ["adminSetTemplates"],
    queryFn: getSetTemplates,
    enabled: isAdmin,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["adminSetTemplates"] });
  }, [queryClient]);

  const closeSheet = useCallback(() => setOpenId(null), []);

  if (!isAdmin) {
    return <Navigate to="/lists" replace />;
  }

  const openSet = sets?.find((s) => s.id === openId) ?? null;

  return (
    <div>
      <div className={styles.hero}>
        <h1>Hazır Setler</h1>
        <p className="muted">
          "Karaca 64 parça yemek takımı" gibi setleri parçaları ve fiyatlarıyla gir; tek tek alınsa
          ne tutacağı otomatik hesaplanır.
        </p>
      </div>

      {formOpen ? (
        <SetTemplateForm
          nextOrder={sets?.length ?? 0}
          onCancel={() => setFormOpen(false)}
          onCreated={() => {
            setFormOpen(false);
            invalidate();
          }}
        />
      ) : (
        <button type="button" className={`btn btn-primary ${styles.newSetButton}`} onClick={() => setFormOpen(true)}>
          ＋ Yeni set oluştur
        </button>
      )}

      <section>
        <div className={styles.sectionHeader}>
          <h2>Setler</h2>
          {sets && <span className="badge badge-neutral">{sets.length}</span>}
        </div>

        {isLoading && <p className="muted">Yükleniyor...</p>}
        {error && <p className="error-text">Setler yüklenemedi</p>}
        {sets && sets.length === 0 && <p className="empty-state">Henüz set yok.</p>}

        <ul className={styles.setList}>
          {sets?.map((set) => (
            <li key={set.id}>
              <button type="button" className={styles.setCard} onClick={() => setOpenId(set.id)}>
                <SetCardSummary set={set} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Sheet
        open={openSet !== null}
        onClose={closeSheet}
        title={
          openSet && (
            <div className={styles.sheetTitle}>
              <h2>{openSet.name}</h2>
              <span className="muted">
                {[openSet.brand, `${openSet.totalPieceCount} parça`].filter(Boolean).join(" · ")}
              </span>
            </div>
          )
        }
      >
        {openSet && (
          <SetTemplateDetail
            key={openSet.id}
            set={openSet}
            onDeleted={() => {
              setOpenId(null);
              invalidate();
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

function SetCardSummary({ set }: { set: SetTemplate }) {
  const setPrice = referenceSetPrice(set.prices);
  return (
    <>
      <div className={styles.setCardHeader}>
        <span className={styles.setName}>{set.name}</span>
        {set.brand && <span className="badge badge-neutral">{set.brand}</span>}
      </div>
      <div className={styles.setCardMeta}>
        <span>🧩 {set.totalPieceCount} parça</span>
        {setPrice != null && <span>💳 {formatTl(setPrice)}</span>}
        {set.pricedItemCount > 0 && <span>🧮 Tek tek: {formatTl(set.individualTotal)}</span>}
      </div>
    </>
  );
}

function ComparisonLine({
  setPrice,
  individualTotal,
  pricedItemCount,
  itemCount,
}: {
  setPrice: number | null;
  individualTotal: number;
  pricedItemCount: number;
  itemCount: number;
}) {
  if (setPrice == null || pricedItemCount === 0) return null;

  const diff = individualTotal - setPrice;
  const missing = itemCount - pricedItemCount;
  return (
    <p className={diff >= 0 ? styles.comparisonGood : styles.comparisonBad}>
      {diff >= 0
        ? `Set, tek tek almaktan ${formatTl(diff)} daha ucuz`
        : `Tek tek almak ${formatTl(-diff)} daha ucuz`}
      {missing > 0 && <span className={styles.comparisonNote}> ({missing} ürünün ayrı fiyatı girilmedi)</span>}
    </p>
  );
}

function SetTemplateForm({
  nextOrder,
  onCancel,
  onCreated,
}: {
  nextOrder: number;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [items, setItems] = useState<ItemRow[]>(() => [emptyItemRow()]);
  const [prices, setPrices] = useState<PriceRow[]>(() => [emptyPriceRow()]);

  // Adı boş satırlar (ör. sona eklenip doldurulmamış olan) gönderilmez.
  const filledItems = items.filter((row) => row.itemName.trim() !== "");

  const totalPieces = filledItems.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  // Satır fiyatı o ürünün setten ayrı alınırsa tamamının fiyatı; adetle çarpılmaz.
  const pricedItems = filledItems.filter((row) => row.separatePrice.trim() !== "");
  const individualTotal = pricedItems.reduce((sum, row) => sum + Number(row.separatePrice), 0);
  const setPrice = referenceSetPrice(
    prices.map((row) => ({ priceType: row.priceType, cashPrice: toNumberOrNull(row.cashPrice) }))
  );
  const advertised = advertisedPieceCount(name);

  // AI önerisi formun tamamını değiştirir; admin kaydetmeden önce her alanı düzeltebilir.
  function fillFromSuggestion(suggestion: SetTemplateSuggestion) {
    const hasContent = name.trim() !== "" || filledItems.length > 0;
    if (hasContent && !window.confirm("Formdaki mevcut bilgiler AI önerisiyle değiştirilecek. Devam edilsin mi?")) {
      return;
    }
    setName(suggestion.name ?? "");
    setBrand(suggestion.brand ?? "");
    setItems(
      suggestion.items.length > 0
        ? suggestion.items.map((item) => ({
            key: nextRowKey++,
            itemName: item.itemName,
            quantity: String(item.quantity),
            separatePrice: toInputValue(item.estimatedSeparatePrice),
            note: "",
          }))
        : [emptyItemRow()]
    );
    setPrices(
      suggestion.prices.map((price) => ({
        key: nextRowKey++,
        priceType: price.priceType,
        storeName: "",
        cashPrice: toInputValue(price.cashPrice),
        installmentCount: toInputValue(price.installmentCount),
        installmentAmount: toInputValue(price.installmentAmount),
        paymentPlanNote: "",
      }))
    );
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createSetTemplate({
        name: name.trim(),
        brand: brand.trim() || null,
        displayOrder: nextOrder,
        items: filledItems.map((row) => ({
          itemName: row.itemName.trim(),
          quantity: Number(row.quantity),
          estimatedSeparatePrice: toNumberOrNull(row.separatePrice),
          note: row.note.trim() || null,
        })),
        prices: prices.map((row) => ({
          priceType: row.priceType,
          storeName: row.storeName.trim() || null,
          cashPrice: toNumberOrNull(row.cashPrice),
          installmentCount: row.priceType === "TAKSITLI" ? toNumberOrNull(row.installmentCount) : null,
          installmentAmount: row.priceType === "TAKSITLI" ? toNumberOrNull(row.installmentAmount) : null,
          paymentPlanNote: row.paymentPlanNote.trim() || null,
        })),
      }),
    onSuccess: onCreated,
  });

  function updateItem(key: number, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function updatePrice(key: number, patch: Partial<PriceRow>) {
    setPrices((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || filledItems.length === 0) return;
    createMutation.mutate();
  }

  return (
    <form className={`card ${styles.form}`} onSubmit={handleSubmit}>
      <h3 className={styles.formTitle}>Yeni set</h3>

      <SetAiFill onFill={fillFromSuggestion} />

      <div className="form-grid">
        <div className="field">
          <label>Set adı</label>
          <input
            type="text"
            placeholder="ör. 64 Parça Yemek Takımı"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Marka (opsiyonel)</label>
          <input type="text" placeholder="ör. Karaca" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>
      </div>

      <div className={styles.block}>
        <div className={styles.blockHeader}>
          <h4>Parçalar</h4>
          <span className="muted">Fiyat = o ürün setten ayrı alınsa tamamı kaç TL (ör. 12 düz tabak birlikte)</span>
        </div>
        {items.map((row) => (
          <div key={row.key} className={styles.itemRow}>
            <input
              className={styles.itemName}
              type="text"
              placeholder="Parça adı, ör. Düz tabak"
              value={row.itemName}
              onChange={(e) => updateItem(row.key, { itemName: e.target.value })}
            />
            <input
              className={styles.itemQty}
              type="number"
              min="1"
              aria-label="Adet"
              value={row.quantity}
              onChange={(e) => updateItem(row.key, { quantity: e.target.value })}
            />
            <input
              className={styles.itemPrice}
              type="number"
              min="0"
              step="0.01"
              placeholder="Ayrı fiyatı ₺"
              aria-label="Setten ayrı alınırsa fiyatı"
              value={row.separatePrice}
              onChange={(e) => updateItem(row.key, { separatePrice: e.target.value })}
            />
            <input
              className={styles.itemNote}
              type="text"
              placeholder="Not, ör. orta kalite"
              value={row.note}
              onChange={(e) => updateItem(row.key, { note: e.target.value })}
            />
            <button
              type="button"
              className={styles.removeButton}
              aria-label="Parçayı kaldır"
              disabled={items.length === 1}
              onClick={() => setItems((rows) => rows.filter((r) => r.key !== row.key))}
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost" onClick={() => setItems((rows) => [...rows, emptyItemRow()])}>
          ＋ Parça ekle
        </button>
      </div>

      <div className={styles.block}>
        <div className={styles.blockHeader}>
          <h4>Ödeme seçenekleri</h4>
          <span className="muted">Peşin, taksitli ya da elden kredi kartı</span>
        </div>
        {prices.map((row) => {
          const installmentTotal =
            row.priceType === "TAKSITLI" && row.installmentCount && row.installmentAmount
              ? Number(row.installmentCount) * Number(row.installmentAmount)
              : null;
          return (
            <div
              key={row.key}
              className={`${styles.priceRow} ${row.priceType === "TAKSITLI" ? styles.priceRowInstallment : ""}`}
            >
              <select
                value={row.priceType}
                onChange={(e) => updatePrice(row.key, { priceType: e.target.value as PriceType })}
              >
                {Object.entries(priceTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Mağaza (opsiyonel)"
                value={row.storeName}
                onChange={(e) => updatePrice(row.key, { storeName: e.target.value })}
              />
              {row.priceType === "TAKSITLI" ? (
                <>
                  <input
                    type="number"
                    min="1"
                    placeholder="Taksit sayısı"
                    value={row.installmentCount}
                    onChange={(e) => updatePrice(row.key, { installmentCount: e.target.value })}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Aylık ₺"
                    value={row.installmentAmount}
                    onChange={(e) => updatePrice(row.key, { installmentAmount: e.target.value })}
                  />
                </>
              ) : (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Fiyat ₺"
                  value={row.cashPrice}
                  onChange={(e) => updatePrice(row.key, { cashPrice: e.target.value })}
                />
              )}
              <input
                type="text"
                placeholder="Not, ör. vade farksız"
                value={row.paymentPlanNote}
                onChange={(e) => updatePrice(row.key, { paymentPlanNote: e.target.value })}
              />
              <button
                type="button"
                className={styles.removeButton}
                aria-label="Ödeme seçeneğini kaldır"
                onClick={() => setPrices((rows) => rows.filter((r) => r.key !== row.key))}
              >
                ✕
              </button>
              {installmentTotal != null && (
                <span className={styles.installmentTotal}>Toplam: {formatTl(installmentTotal)}</span>
              )}
            </div>
          );
        })}
        <button type="button" className="btn btn-ghost" onClick={() => setPrices((rows) => [...rows, emptyPriceRow()])}>
          ＋ Ödeme seçeneği ekle
        </button>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryStats}>
          <span>
            <strong>{totalPieces}</strong> parça
            {advertised != null && advertised !== totalPieces && (
              <span className={styles.pieceWarning}> ⚠ set adında {advertised} parça yazıyor</span>
            )}
          </span>
          <span>
            Tek tek: <strong>{formatTl(individualTotal)}</strong>
            {pricedItems.length < filledItems.length && (
              <span className="muted">
                {" "}
                ({filledItems.length} ürünün {pricedItems.length} tanesi için fiyat var)
              </span>
            )}
          </span>
          {setPrice != null && (
            <span>
              Set: <strong>{formatTl(setPrice)}</strong>
            </span>
          )}
        </div>
        <ComparisonLine
          setPrice={setPrice}
          individualTotal={individualTotal}
          pricedItemCount={pricedItems.length}
          itemCount={filledItems.length}
        />
      </div>

      {createMutation.isError && (
        <p className="error-text">{errorMessage(createMutation.error, "Set kaydedilemedi, tekrar dene.")}</p>
      )}

      <div className={styles.formActions}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Vazgeç
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!name.trim() || filledItems.length === 0 || createMutation.isPending}
        >
          {createMutation.isPending ? "Kaydediliyor..." : "Seti kaydet"}
        </button>
      </div>
    </form>
  );
}

function SetAiFill({ onFill }: { onFill: (suggestion: SetTemplateSuggestion) => void }) {
  const [file, setFile] = useState<File | null>(null);

  const suggestMutation = useMutation({
    mutationFn: (f: File) => suggestSetFromFile(f),
    onSuccess: (result) => {
      if (result) onFill(result);
    },
  });

  return (
    <div className={styles.aiBox}>
      <div className={styles.aiText}>
        <strong>✨ AI ile doldur</strong>
        <span className="muted">
          Setin ürün sayfası ekran görüntüsünü ya da PDF'ini yükle; AI parçaları ve fiyatları
          forma yazsın. Kaydetmeden önce kontrol et. 1-2 dakika sürebilir.
        </span>
      </div>
      <div className={styles.aiActions}>
        <label className={styles.filePick}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              suggestMutation.reset();
            }}
          />
          <span>{file ? `📎 ${file.name}` : "📷 Dosya seç"}</span>
        </label>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!file || suggestMutation.isPending}
          onClick={() => file && suggestMutation.mutate(file)}
        >
          {suggestMutation.isPending ? "Düşünüyor..." : "Doldur"}
        </button>
      </div>
      {suggestMutation.isError && (
        <p className="error-text">{errorMessage(suggestMutation.error, "Öneri alınamadı, tekrar dene.")}</p>
      )}
      {suggestMutation.isSuccess && suggestMutation.data === null && (
        <p className="error-text">AI şu an yanıt veremedi ya da dosyadan set bilgisi çıkaramadı. Formu elle doldurabilirsin.</p>
      )}
      {suggestMutation.isSuccess && suggestMutation.data && (
        <p className={styles.aiDone}>✓ Form dolduruldu, aşağıdan kontrol et.</p>
      )}
    </div>
  );
}

function SetTemplateDetail({ set, onDeleted }: { set: SetTemplate; onDeleted: () => void }) {
  const deleteMutation = useMutation({
    mutationFn: () => deleteSetTemplate(set.id),
    onSuccess: onDeleted,
  });

  function handleDelete() {
    if (window.confirm(`"${set.name}" seti silinecek. Emin misin?`)) deleteMutation.mutate();
  }

  return (
    <div className={styles.detail}>
      <ComparisonLine
        setPrice={referenceSetPrice(set.prices)}
        individualTotal={set.individualTotal}
        pricedItemCount={set.pricedItemCount}
        itemCount={set.items.length}
      />

      <div>
        <h4 className={styles.detailHeading}>Parçalar</h4>
        <ul className={styles.detailList}>
          {set.items.map((item) => (
            <li key={item.id}>
              <span>
                <strong>{item.quantity}×</strong> {item.itemName}
                {item.note && <span className={styles.detailNote}> · {item.note}</span>}
              </span>
              {item.estimatedSeparatePrice != null && (
                <span className="muted">ayrı: {formatTl(item.estimatedSeparatePrice)}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {set.prices.length > 0 && (
        <div>
          <h4 className={styles.detailHeading}>Ödeme seçenekleri</h4>
          <ul className={styles.detailList}>
            {set.prices.map((price) => (
              <li key={price.id}>
                <span>
                  <strong>{priceTypeLabels[price.priceType]}</strong>
                  {price.storeName && <span className="muted"> · {price.storeName}</span>}
                  {price.paymentPlanNote && <span className={styles.detailNote}> · {price.paymentPlanNote}</span>}
                </span>
                <span>
                  {price.priceType === "TAKSITLI" && price.installmentCount && price.installmentAmount
                    ? `${price.installmentCount} × ${formatTl(price.installmentAmount)} = ${formatTl(
                        price.installmentCount * price.installmentAmount
                      )}`
                    : price.cashPrice != null && formatTl(price.cashPrice)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.dangerZone}>
        {deleteMutation.isError && <p className="error-text">Set silinemedi.</p>}
        <button
          type="button"
          className="btn btn-danger-ghost"
          disabled={deleteMutation.isPending}
          onClick={handleDelete}
        >
          🗑 Seti sil
        </button>
      </div>
    </div>
  );
}
