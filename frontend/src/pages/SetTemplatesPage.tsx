import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSetTemplate,
  deleteSetTemplate,
  getSetTemplates,
  suggestSet,
  updateSetTemplate,
} from "../api/setTemplates";
import { reportAiOutcome } from "../api/aiJobs";
import type { AiInput } from "../api/aiSuggestions";
import { resolveUploadUrl, uploadFile } from "../api/uploads";
import AddSetToList from "../components/AddSetToList";
import AiWaiting from "../components/AiWaiting";
import Sheet from "../components/Sheet";
import { isJobActive, useAiJob, useAiJobStore } from "../store/aiJobStore";
import { useAuthStore } from "../store/authStore";
import type {
  CreateSetTemplatePayload,
  PriceType,
  SetTemplate,
  SetTemplatePrice,
  SetTemplateSuggestion,
} from "../types";
import styles from "./SetTemplatesPage.module.scss";

// Yeni set formundaki AI isteğinin anahtarı (bkz. aiJobStore).
const SET_JOB_KEY = "set:new";

const priceTypeLabels: Record<PriceType, string> = {
  PESIN: "Peşin",
  TAKSITLI: "Taksitli",
  ELDEN_KREDI_KARTI: "Elden Kredi Kartı",
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

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

// Herkes set oluşturabilir. Adminin setleri herkese görünür; kullanıcının kendi setleri
// sadece kendisine. Adminin oluşturduğu her set ortak katalog sayılır.
export default function SetTemplatesPage() {
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const queryClient = useQueryClient();
  const setJob = useAiJobStore((state) => state.jobs[SET_JOB_KEY]);
  const removeJob = useAiJobStore((state) => state.remove);
  // Arka planda AI isteği varsa (kullanıcı sayfaya geri döndüyse) form açık gelir.
  const [formOpen, setFormOpen] = useState(() => setJob !== undefined);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form kapalıyken öneri hazır olursa form açılır ve sonuçla dolar.
  useEffect(() => {
    if (setJob && !isJobActive(setJob)) setFormOpen(true);
  }, [setJob]);

  const { data: sets, isLoading, error } = useQuery({
    queryKey: ["setTemplates"],
    queryFn: getSetTemplates,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["setTemplates"] });
  }, [queryClient]);

  const closeSheet = useCallback(() => setOpenId(null), []);

  const openSet = sets?.find((s) => s.id === openId) ?? null;
  const editingSet = sets?.find((s) => s.id === editingId) ?? null;
  const adminSets = sets?.filter((s) => s.createdByAdmin);
  const mySets = sets?.filter((s) => !s.createdByAdmin);

  return (
    <div>
      <div className={styles.hero}>
        <h1>Hazır Setler</h1>
        <p className="muted">
          "Karaca 64 parça yemek takımı" gibi setleri parçaları ve fiyatlarıyla gir; tek tek alınsa
          ne tutacağı otomatik hesaplanır.
        </p>
      </div>

      {editingSet ? (
        <SetTemplateForm
          key={editingSet.id}
          editing={editingSet}
          nextOrder={editingSet.displayOrder}
          onCancel={() => setEditingId(null)}
          onCreated={() => {
            setEditingId(null);
            invalidate();
          }}
        />
      ) : formOpen ? (
        <SetTemplateForm
          nextOrder={(isAdmin ? adminSets : mySets)?.length ?? 0}
          onCancel={() => {
            // Vazgeçmek süren AI isteğini de bırakır.
            removeJob(SET_JOB_KEY);
            setFormOpen(false);
          }}
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

      {isLoading && <p className="muted">Yükleniyor...</p>}
      {error && <p className="error-text">Setler yüklenemedi</p>}

      {/* Adminin setleri onun için zaten "kendi setleri"; ayrı bölüm göstermiyoruz. */}
      {!isAdmin && mySets && (
        <SetSection title="Benim setlerim" sets={mySets} onOpen={setOpenId} emptyText="Henüz kendi setin yok. Yukarıdan oluşturabilirsin; sadece sen görürsün." />
      )}
      {adminSets && (
        <SetSection title="Adminin eklediği setler" sets={adminSets} onOpen={setOpenId} emptyText="Henüz admin set eklemedi." />
      )}

      <Sheet
        open={openSet !== null}
        onClose={closeSheet}
        title={
          openSet && (
            <div className={styles.sheetTitle}>
              <h2>{openSet.name}</h2>
              <span className="muted">
                {[
                  openSet.brand,
                  `${openSet.totalPieceCount} parça`,
                  openSet.createdByAdmin ? "Adminin eklediği set" : "Senin setin",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          )
        }
      >
        {openSet && (
          <SetTemplateDetail
            key={openSet.id}
            set={openSet}
            onEdit={() => {
              setOpenId(null);
              setEditingId(openSet.id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
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

function SetSection({
  title,
  sets,
  onOpen,
  emptyText,
}: {
  title: string;
  sets: SetTemplate[];
  onOpen: (id: string) => void;
  emptyText: string;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>{title}</h2>
        <span className="badge badge-neutral">{sets.length}</span>
      </div>

      {sets.length === 0 && <p className="empty-state">{emptyText}</p>}

      <ul className={styles.setList}>
        {sets.map((set) => (
          <li key={set.id}>
            <button type="button" className={styles.setCard} onClick={() => onOpen(set.id)}>
              <SetCardSummary set={set} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SetCardSummary({ set }: { set: SetTemplate }) {
  const setPrice = referenceSetPrice(set.prices);
  return (
    <>
      {set.imageUrl && (
        <img src={resolveUploadUrl(set.imageUrl)} alt="" className={styles.setCardImage} loading="lazy" />
      )}
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

// editing verilirse form o setin bilgileriyle dolu açılır ve kaydedince seti günceller.
function SetTemplateForm({
  editing,
  nextOrder,
  onCancel,
  onCreated,
}: {
  editing?: SetTemplate;
  nextOrder: number;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [brand, setBrand] = useState(editing?.brand ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(editing?.imageUrl ?? null);
  // Formu dolduran AI işi; set kaydedilince kaydedilen hal bu işe bildirilir (admin ölçümü).
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemRow[]>(() =>
    editing && editing.items.length > 0
      ? editing.items.map((item) => ({
          key: nextRowKey++,
          itemName: item.itemName,
          quantity: String(item.quantity),
          separatePrice: toInputValue(item.estimatedSeparatePrice),
          note: item.note ?? "",
        }))
      : [emptyItemRow()]
  );
  const [prices, setPrices] = useState<PriceRow[]>(() =>
    editing
      ? editing.prices.map((price) => ({
          key: nextRowKey++,
          priceType: price.priceType,
          storeName: price.storeName ?? "",
          cashPrice: toInputValue(price.cashPrice),
          installmentCount: toInputValue(price.installmentCount),
          installmentAmount: toInputValue(price.installmentAmount),
          paymentPlanNote: price.paymentPlanNote ?? "",
        }))
      : [emptyPriceRow()]
  );

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

  // AI önerisi formun tamamını değiştirir; kullanıcı kaydetmeden önce her alanı düzeltebilir.
  // jobImageUrl: form AI beklerken kapanıp açıldıysa, AI'ya verilen görselin yüklendiği adres.
  function fillFromSuggestion(suggestion: SetTemplateSuggestion, jobImageUrl: string | null, jobId: string) {
    const hasContent = name.trim() !== "" || filledItems.length > 0;
    if (hasContent && !window.confirm("Formdaki mevcut bilgiler AI önerisiyle değiştirilecek. Devam edilsin mi?")) {
      return;
    }
    setAiJobId(jobId);
    if (!imageUrl && jobImageUrl) setImageUrl(jobImageUrl);
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

  // Seçilen görsel hemen sunucuya yüklenir; set kaydedilince sadece adresi sete yazılır.
  const imageUploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(file),
    onSuccess: setImageUrl,
  });

  function uploadImage(file: File) {
    if (IMAGE_TYPES.includes(file.type)) imageUploadMutation.mutate(file);
  }

  function buildPayload(): CreateSetTemplatePayload {
    return {
      name: name.trim(),
      brand: brand.trim() || null,
      imageUrl,
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
    };
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreateSetTemplatePayload) =>
      editing ? updateSetTemplate(editing.id, payload) : createSetTemplate(payload),
    onSuccess: (_saved, payload) => {
      if (aiJobId) reportAiOutcome(aiJobId, payload);
      onCreated();
    },
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
    createMutation.mutate(buildPayload());
  }

  return (
    <form className={`card ${styles.form}`} onSubmit={handleSubmit}>
      <h3 className={styles.formTitle}>{editing ? "Seti düzenle" : "Yeni set"}</h3>

      {/* AI isteği yeni set formuna bağlı (SET_JOB_KEY); düzenlerken alanlar elle değiştirilir. */}
      {!editing && <SetAiFill imageUrl={imageUrl} onFill={fillFromSuggestion} onFileChosen={uploadImage} />}

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
          <h4>Kart görseli</h4>
          <span className="muted">AI için yüklediğin görsel otomatik buraya gelir</span>
        </div>
        {imageUrl ? (
          <div className={styles.imageField}>
            <img src={resolveUploadUrl(imageUrl)} alt="Set görseli" className={styles.imagePreview} />
            <button type="button" className="btn btn-ghost" onClick={() => setImageUrl(null)}>
              Görseli kaldır
            </button>
          </div>
        ) : (
          <label className={styles.filePick}>
            <input
              type="file"
              accept={IMAGE_TYPES.join(",")}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file);
              }}
            />
            <span>{imageUploadMutation.isPending ? "Yükleniyor..." : "📷 Görsel seç (opsiyonel)"}</span>
          </label>
        )}
        {imageUploadMutation.isError && <p className="error-text">Görsel yüklenemedi.</p>}
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
          disabled={
            !name.trim() || filledItems.length === 0 || createMutation.isPending || imageUploadMutation.isPending
          }
        >
          {createMutation.isPending ? "Kaydediliyor..." : editing ? "Değişiklikleri kaydet" : "Seti kaydet"}
        </button>
      </div>
    </form>
  );
}

type AiFillOutcome = { kind: "filled" } | { kind: "empty" } | { kind: "failed"; message: string };

// İstek arka planda çalışır (bkz. aiJobStore): kullanıcı sayfadan çıkıp dönerse ya da formu
// kapatmadan başka sayfaya geçerse, sonuç gelince form yine dolar.
function SetAiFill({
  imageUrl,
  onFill,
  onFileChosen,
}: {
  imageUrl: string | null;
  onFill: (suggestion: SetTemplateSuggestion, jobImageUrl: string | null, jobId: string) => void;
  onFileChosen: (file: File) => void;
}) {
  const location = useLocation();
  const job = useAiJob(SET_JOB_KEY);
  const startJob = useAiJobStore((state) => state.start);
  const updateJob = useAiJobStore((state) => state.update);
  const removeJob = useAiJobStore((state) => state.remove);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [outcome, setOutcome] = useState<AiFillOutcome | null>(null);
  const canSuggest = file !== null || text.trim() !== "";

  const suggestMutation = useMutation({
    mutationFn: (input: AiInput) => suggestSet(input),
    onSuccess: ({ jobId }) =>
      startJob({ key: SET_JOB_KEY, jobId, label: "Set için AI önerisi", returnTo: location.pathname, imageUrl }),
  });

  // Görsel, iş başladıktan sonra yüklenmeyi bitirirse işe de yazılır.
  useEffect(() => {
    if (job && isJobActive(job) && imageUrl && job.imageUrl !== imageUrl) {
      updateJob(SET_JOB_KEY, job.jobId, { imageUrl });
    }
  }, [job, imageUrl, updateJob]);

  // İş bitince formu doldur ve store'dan sil (bildirim de böylece kapanır).
  useEffect(() => {
    if (!job || isJobActive(job)) return;
    if (job.status === "DONE" && job.result) {
      onFill(job.result as SetTemplateSuggestion, job.imageUrl ?? null, job.jobId);
      setOutcome({ kind: "filled" });
    } else if (job.status === "EMPTY") {
      setOutcome({ kind: "empty" });
    } else {
      setOutcome({ kind: "failed", message: job.error ?? "Öneri alınamadı, tekrar dene." });
    }
    removeJob(SET_JOB_KEY);
  }, [job, onFill, removeJob]);

  const thinking = suggestMutation.isPending || isJobActive(job);

  function startSuggestion() {
    if (!canSuggest) return;
    setOutcome(null);
    suggestMutation.mutate({ file, text });
  }

  return (
    <div className={styles.aiBox}>
      <div className={styles.aiText}>
        <strong>✨ AI ile doldur</strong>
        <span className="muted">
          Setin ürün sayfası ekran görüntüsünü ya da PDF'ini yükle veya açıklamasını yapıştır; AI
          parçaları ve fiyatları forma yazsın. Kaydetmeden önce kontrol et. Sadece metin daha hızlı,
          görsel 1-2 dakika sürebilir.
        </span>
      </div>
      <textarea
        className={styles.aiTextInput}
        rows={4}
        maxLength={10000}
        placeholder="ya da buraya yaz / yapıştır, ör. Karaca 24 parça yemek takımı: 6 düz tabak, 6 çukur tabak... Peşin 4.999 TL"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          suggestMutation.reset();
          setOutcome(null);
        }}
      />
      <div className={styles.aiActions}>
        <label className={styles.filePick}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => {
              const chosen = e.target.files?.[0] ?? null;
              setFile(chosen);
              suggestMutation.reset();
              setOutcome(null);
              if (chosen) onFileChosen(chosen);
              e.target.value = "";
            }}
          />
          <span>{file ? `📎 ${file.name}` : "📷 Dosya seç (opsiyonel)"}</span>
        </label>
        {file && (
          <button type="button" className={styles.removeButton} aria-label="Dosyayı kaldır" onClick={() => setFile(null)}>
            ✕
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canSuggest || thinking}
          onClick={startSuggestion}
        >
          {thinking ? "Düşünüyor..." : "Doldur"}
        </button>
      </div>
      {thinking && <AiWaiting startedAt={job?.startedAt} queuePosition={job?.queuePosition} />}
      {suggestMutation.isError && (
        <p className="error-text">{errorMessage(suggestMutation.error, "Öneri alınamadı, tekrar dene.")}</p>
      )}
      {outcome?.kind === "failed" && <p className="error-text">{outcome.message}</p>}
      {outcome?.kind === "empty" && (
        <p className="error-text">AI şu an yanıt veremedi ya da dosyadan set bilgisi çıkaramadı. Formu elle doldurabilirsin.</p>
      )}
      {outcome?.kind === "filled" && (
        <p className={styles.aiDone}>✓ Form dolduruldu, aşağıdan kontrol et.</p>
      )}
    </div>
  );
}

function SetTemplateDetail({
  set,
  onEdit,
  onDeleted,
}: {
  set: SetTemplate;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const deleteMutation = useMutation({
    mutationFn: () => deleteSetTemplate(set.id),
    onSuccess: onDeleted,
  });

  function handleDelete() {
    if (window.confirm(`"${set.name}" seti silinecek. Emin misin?`)) deleteMutation.mutate();
  }

  return (
    <div className={styles.detail}>
      {set.imageUrl && <img src={resolveUploadUrl(set.imageUrl)} alt={set.name} className={styles.detailImage} />}

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

      <AddSetToList set={set} />

      {set.canDelete && (
        <div className={styles.dangerZone}>
          {deleteMutation.isError && <p className="error-text">Set silinemedi.</p>}
          <button type="button" className="btn btn-secondary" onClick={onEdit}>
            ✎ Seti düzenle
          </button>
          <button
            type="button"
            className="btn btn-danger-ghost"
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
          >
            🗑 Seti sil
          </button>
        </div>
      )}
    </div>
  );
}
