import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getMyLists } from "../api/lists";
import { addPartToList, previewSetPlacement } from "../api/setTemplates";
import type { AddPartResult, SetTemplate, SetTemplateItem } from "../types";
import CategoryPicker from "./CategoryPicker";
import styles from "./AddPartToList.module.scss";

type Way = "new" | "existing";

function errorMessage(error: unknown): string {
  if (isAxiosError(error) && typeof error.response?.data?.error === "string") {
    return error.response.data.error;
  }
  return "Eklenemedi, tekrar dene.";
}

// Setin tek bir kalemini listeye ekler. İki yol: "Ürün olarak ekle" (kalem seçilen Kategori › Alan'da yeni ürün
// olur, adını yazabilirsin) ya da "Mevcut ürüne ekle" (kalem listendeki bir ürüne girer). İkisinde de kalemin
// ayrı fiyatı ürüne fiyat notu, linki ürünün linki olur.
export default function AddPartToList({ set, item }: { set: SetTemplate; item: SetTemplateItem }) {
  const queryClient = useQueryClient();
  const { data: lists } = useQuery({ queryKey: ["lists"], queryFn: getMyLists });
  const editableLists = (lists ?? []).filter((list) => list.role !== "VIEWER");
  const [listId, setListId] = useState("");
  const selectedListId = listId || editableLists[0]?.id || "";
  const [way, setWay] = useState<Way>("new");
  const [chosenKey, setChosenKey] = useState<string | null>(null);
  const [chosenProduct, setChosenProduct] = useState<string | null>(null);
  const defaultName = item.quantity > 1 ? `${item.itemName} (${item.quantity} adet)` : item.itemName;
  const [name, setName] = useState(defaultName);
  const [done, setDone] = useState<AddPartResult | null>(null);

  const { data: preview, isLoading } = useQuery({
    queryKey: ["setPlacement", selectedListId, set.id],
    queryFn: () => previewSetPlacement(selectedListId, set.id),
    enabled: selectedListId !== "",
  });

  // Önerilen hedef: parçayla aynı adlı ürün varsa o (p:), değilse sınıflandırıcının bulduğu kategori.
  const suggested = preview?.items.find((entry) => entry.id === item.id)?.suggestedKey ?? "";
  const suggestedProduct = preview?.products.find((product) => product.key === suggested);
  const categoryKey = chosenKey ?? suggestedProduct?.categoryKey ?? (suggested.startsWith("p:") ? "" : suggested);
  const productsHere = (preview?.products ?? [])
    .filter((product) => product.categoryKey === categoryKey)
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const productKey = productsHere.some((p) => p.key === chosenProduct)
    ? (chosenProduct as string)
    : suggestedProduct && suggestedProduct.categoryKey === categoryKey
      ? suggestedProduct.key
      : (productsHere[0]?.key ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      addPartToList(selectedListId, {
        setTemplateItemId: item.id,
        destinationKey: way === "new" ? categoryKey : productKey,
        newProductName: way === "new" ? name.trim() || null : null,
      }),
    onSuccess: (result) => {
      setDone(result);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["priceEntries"] });
      queryClient.invalidateQueries({ queryKey: ["setPlacement"] });
      queryClient.invalidateQueries({ queryKey: ["listSummary"] });
      queryClient.invalidateQueries({ queryKey: ["paymentPlan"] });
    },
  });

  if (lists && editableLists.length === 0) {
    return <p className="muted">Eklemek için düzenleyebildiğin bir liste yok.</p>;
  }

  const canSubmit = way === "new" ? categoryKey !== "" : productKey !== "";

  return (
    <div className={styles.panel}>
      <div className={styles.tabs} role="tablist" aria-label="Ekleme şekli">
        <button
          type="button"
          role="tab"
          aria-selected={way === "new"}
          className={`${styles.tab} ${way === "new" ? styles.tabActive : ""}`}
          onClick={() => {
            setWay("new");
            setDone(null);
          }}
        >
          Ürün olarak ekle
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={way === "existing"}
          className={`${styles.tab} ${way === "existing" ? styles.tabActive : ""}`}
          onClick={() => {
            setWay("existing");
            setDone(null);
          }}
        >
          Mevcut ürüne ekle
        </button>
      </div>

      {editableLists.length > 1 && (
        <label className={styles.field}>
          <span>Liste</span>
          <select
            aria-label="Liste"
            value={selectedListId}
            onChange={(e) => {
              setListId(e.target.value);
              setChosenKey(null);
              setChosenProduct(null);
              setDone(null);
            }}
          >
            {editableLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {isLoading && <p className="muted">Hazırlanıyor...</p>}
      {preview && (
        <>
          <CategoryPicker
            preview={preview}
            value={categoryKey}
            onChange={(key) => {
              setChosenKey(key);
              setChosenProduct(null);
              setDone(null);
            }}
          />

          {way === "new" ? (
            <label className={styles.field}>
              <span>Ürün adı</span>
              <input type="text" maxLength={255} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          ) : (
            <label className={styles.field}>
              <span>Ürün</span>
              <select
                aria-label="Ürün"
                disabled={productsHere.length === 0}
                value={productKey}
                onChange={(e) => {
                  setChosenProduct(e.target.value);
                  setDone(null);
                }}
              >
                {productsHere.length === 0 && <option value="">Bu alanda ürün yok</option>}
                {productsHere.map((product) => (
                  <option key={product.key} value={product.key}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canSubmit || mutation.isPending}
              onClick={() => {
                setDone(null);
                mutation.mutate();
              }}
            >
              {mutation.isPending ? "Ekleniyor..." : way === "new" ? "Ürün olarak ekle" : "Ürüne ekle"}
            </button>
          </div>
        </>
      )}

      {mutation.isError && <p className="error-text">{errorMessage(mutation.error)}</p>}
      {done && (
        <p className={styles.success}>
          ✓ {done.created ? "Yeni ürün açıldı" : "Ürüne eklendi"}: "{done.productName}".{" "}
          <Link to={`/products/${done.productId}`}>Ürüne git</Link>
        </p>
      )}
    </div>
  );
}
