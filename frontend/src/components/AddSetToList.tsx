import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getListProductPaths } from "../api/listProducts";
import { getMyLists } from "../api/lists";
import { addSetToList, attachSetToProduct, previewSetPlacement } from "../api/setTemplates";
import type { AddSetToListResult, PriceType, SetPlacementPreview, SetTemplate } from "../types";
import styles from "./AddSetToList.module.scss";

const priceTypeLabels: Record<PriceType, string> = {
  PESIN: "Peşin",
  TAKSITLI: "Taksitli",
  ELDEN_KREDI_KARTI: "Elden Kredi Kartı",
};

const tlFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

type Mode = "product" | "categories";

type Done =
  | { kind: "product"; productId: string; productName: string; added: number }
  | { kind: "categories"; listId: string; added: AddSetToListResult };

function errorMessage(error: unknown): string {
  if (isAxiosError(error) && typeof error.response?.data?.error === "string") {
    return error.response.data.error;
  }
  return "Listeye eklenemedi, tekrar dene.";
}

function normalize(text: string): string {
  return text.trim().toLocaleLowerCase("tr");
}

// Katalogdaki seti kullanıcının listesine ekler; katalog seti olduğu gibi kalır. İki yol var:
//  - Mevcut ürüne ekle: setin fiyat(lar)ı listedeki bir ürüne (ör. "Çelik tencere seti") fiyat notu olarak
//    girer, set içeriği nota yazılır. Yeni ürün açılmaz.
//  - Parçaları kategorilere dağıt: set (tek fiyatla) ve parçaları ürün olarak eklenir; önizlemede her
//    parçanın kategorisi seçilir.
export default function AddSetToList({ set }: { set: SetTemplate }) {
  const queryClient = useQueryClient();
  const { data: lists } = useQuery({ queryKey: ["lists"], queryFn: getMyLists });
  const editableLists = (lists ?? []).filter((list) => list.role !== "VIEWER");
  const [mode, setMode] = useState<Mode>("product");
  const [listId, setListId] = useState("");
  const [priceId, setPriceId] = useState("");
  const [done, setDone] = useState<Done | null>(null);
  const selectedListId = listId || editableLists[0]?.id || "";

  // --- Mevcut ürüne ekle
  const [productFilter, setProductFilter] = useState("");
  const [productId, setProductId] = useState("");
  const { data: productPaths, isLoading: productsLoading } = useQuery({
    queryKey: ["listProductPaths", selectedListId],
    queryFn: () => getListProductPaths(selectedListId),
    enabled: mode === "product" && selectedListId !== "",
  });
  const filteredProducts = (productPaths ?? []).filter(
    (option) => !productFilter.trim() || normalize(option.path).includes(normalize(productFilter))
  );
  const selectedProductId = filteredProducts.some((p) => p.productId === productId)
    ? productId
    : (filteredProducts[0]?.productId ?? "");

  const attachMutation = useMutation({
    mutationFn: () => attachSetToProduct(selectedProductId, set.id, priceId || null),
    onSuccess: (result) => {
      setDone({ kind: "product", productId: result.productId, productName: result.productName, added: result.addedPriceCount });
      queryClient.invalidateQueries({ queryKey: ["priceEntries"] });
      queryClient.invalidateQueries({ queryKey: ["listSummary"] });
      queryClient.invalidateQueries({ queryKey: ["paymentPlan"] });
    },
  });

  // --- Parçaları kategorilere dağıt: önizlemede parça başına seçilen hedef (anahtar).
  const [preview, setPreview] = useState<SetPlacementPreview | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});

  const previewMutation = useMutation({
    mutationFn: () => previewSetPlacement(selectedListId, set.id),
    onSuccess: (loaded) => {
      setPreview(loaded);
      setChoices(Object.fromEntries(loaded.items.map((item) => [item.id, item.suggestedKey])));
    },
  });

  const addMutation = useMutation({
    mutationFn: () =>
      addSetToList(
        selectedListId,
        set.id,
        priceId || null,
        Object.entries(choices).map(([setTemplateItemId, destinationKey]) => ({ setTemplateItemId, destinationKey }))
      ),
    onSuccess: (added) => {
      setPreview(null);
      setDone({ kind: "categories", listId: selectedListId, added });
      // Yeni kategoriler/ürünler ve set fiyatı listede, özette ve ödeme planında görünsün.
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["listSummary"] });
      queryClient.invalidateQueries({ queryKey: ["paymentPlan"] });
    },
  });

  if (lists && editableLists.length === 0) {
    return <p className="muted">Sete eklemek için düzenleyebildiğin bir liste yok.</p>;
  }

  function reset() {
    setPreview(null);
    setDone(null);
  }

  const priceSelect = set.prices.length > 1 && (
    <select aria-label="Fiyat" value={priceId} onChange={(e) => setPriceId(e.target.value)}>
      <option value="">{mode === "product" ? "Tüm fiyatları ekle" : "En ucuz fiyat"}</option>
      {set.prices.map((price) => (
        <option key={price.id} value={price.id}>
          {priceTypeLabels[price.priceType]}
          {price.storeName ? ` · ${price.storeName}` : ""}
          {price.priceType === "TAKSITLI" && price.installmentCount && price.installmentAmount
            ? ` · ${price.installmentCount} × ${tlFormatter.format(price.installmentAmount)}`
            : price.cashPrice != null
              ? ` · ${tlFormatter.format(price.cashPrice)}`
              : ""}
        </option>
      ))}
    </select>
  );

  return (
    <div className={styles.box}>
      <h4 className={styles.heading}>Listeme ekle</h4>
      <p className={styles.hint}>Set katalogda kalır; listene nasıl ekleneceğini seç.</p>

      <div className={styles.modes} role="radiogroup" aria-label="Ekleme şekli">
        <label className={styles.mode}>
          <input
            type="radio"
            name={`mode-${set.id}`}
            checked={mode === "product"}
            onChange={() => {
              setMode("product");
              reset();
            }}
          />
          <span>
            <strong>Mevcut ürüne ekle</strong>
            <small>Setin fiyatı listendeki bir ürüne (ör. Çelik tencere seti) fiyat notu olarak girer.</small>
          </span>
        </label>
        <label className={styles.mode}>
          <input
            type="radio"
            name={`mode-${set.id}`}
            checked={mode === "categories"}
            onChange={() => {
              setMode("categories");
              reset();
            }}
          />
          <span>
            <strong>Parçaları kategorilere dağıt</strong>
            <small>Her parça yeni ürün olur; hangi kategoriye gideceğini önizlemede seçersin.</small>
          </span>
        </label>
      </div>

      <div className={styles.row}>
        <select
          aria-label="Liste"
          value={selectedListId}
          onChange={(e) => {
            setListId(e.target.value);
            setProductId("");
            reset();
          }}
        >
          {editableLists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
        {priceSelect}
      </div>

      {mode === "product" ? (
        <>
          <input
            type="search"
            aria-label="Ürün ara"
            placeholder="Ürün ara, ör. tencere"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
          />
          <select
            aria-label="Hedef ürün"
            value={selectedProductId}
            size={Math.min(Math.max(filteredProducts.length, 2), 7)}
            onChange={(e) => {
              setProductId(e.target.value);
              setDone(null);
            }}
          >
            {filteredProducts.map((option) => (
              <option key={option.productId} value={option.productId}>
                {option.path}
              </option>
            ))}
          </select>
          {productsLoading && <p className="muted">Ürünler yükleniyor...</p>}
          {!productsLoading && filteredProducts.length === 0 && (
            <p className="muted">
              {productPaths && productPaths.length > 0 ? "Aramana uyan ürün yok." : "Bu listede henüz ürün yok."}
            </p>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={!selectedProductId || attachMutation.isPending}
            onClick={() => {
              setDone(null);
              attachMutation.mutate();
            }}
          >
            {attachMutation.isPending ? "Ekleniyor..." : "Seçili ürüne ekle"}
          </button>
          {attachMutation.isError && <p className="error-text">{errorMessage(attachMutation.error)}</p>}
        </>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!selectedListId || previewMutation.isPending || addMutation.isPending}
            onClick={() => {
              setDone(null);
              previewMutation.mutate();
            }}
          >
            {previewMutation.isPending ? "Hazırlanıyor..." : "Parçaları göster"}
          </button>
          {previewMutation.isError && <p className="error-text">{errorMessage(previewMutation.error)}</p>}

          {preview && (
            <div className={styles.preview}>
              <p className={styles.previewTitle}>Her parça hangi kategoriye gitsin?</p>
              {preview.items.map((item) => (
                <div key={item.id} className={styles.previewRow}>
                  <span>
                    {item.quantity > 1 && <strong>{item.quantity}× </strong>}
                    {item.itemName}
                  </span>
                  <select
                    aria-label={`${item.itemName} kategorisi`}
                    value={choices[item.id] ?? item.suggestedKey}
                    onChange={(e) => setChoices((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  >
                    {preview.destinations.map((destination) => (
                      <option key={destination.key} value={destination.key}>
                        {destination.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <div className={styles.previewActions}>
                <button type="button" className="btn btn-ghost" onClick={() => setPreview(null)}>
                  Vazgeç
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={addMutation.isPending}
                  onClick={() => addMutation.mutate()}
                >
                  {addMutation.isPending ? "Ekleniyor..." : "Onayla ve ekle"}
                </button>
              </div>
            </div>
          )}
          {addMutation.isError && <p className="error-text">{errorMessage(addMutation.error)}</p>}
        </>
      )}

      {done?.kind === "product" && (
        <p className={styles.success}>
          ✓ "{done.productName}" ürününe {done.added} fiyat notu eklendi.{" "}
          <Link to={`/products/${done.productId}`}>Ürüne git</Link>
        </p>
      )}
      {done?.kind === "categories" && (
        <p className={styles.success}>
          ✓ Eklendi: {done.added.newProductCount} yeni ürün
          {done.added.existingProductCount > 0 && `, ${done.added.existingProductCount} mevcut ürüne bağlandı`}.{" "}
          <Link to={`/lists/${done.listId}`}>Listeye git</Link>
        </p>
      )}
    </div>
  );
}
