import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSet, getSets } from "../api/sets";
import { getListProductOptions } from "../api/listProducts";
import type { SetItem } from "../types";
import SetComparisonView from "../components/SetComparisonView";
import styles from "./SetsPage.module.scss";

const FREE_TEXT = "__free_text__";

function emptyItem(): SetItem {
  return { productId: null, itemName: "", quantity: 1, estimatedIndividualPrice: null };
}

export default function SetsPage() {
  const { listId } = useParams<{ listId: string }>();
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [setPrice, setSetPrice] = useState("");
  const [items, setItems] = useState<SetItem[]>([emptyItem()]);
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: sets, isLoading, error } = useQuery({
    queryKey: ["sets", listId],
    queryFn: () => getSets(listId!),
    enabled: !!listId,
  });

  const { data: productOptions } = useQuery({
    queryKey: ["listProductOptions", listId],
    queryFn: () => getListProductOptions(listId!),
    enabled: !!listId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createSet(listId!, {
        name,
        storeName,
        setPrice: Number(setPrice),
        items: items
          .filter((item) => item.itemName.trim())
          .map((item) => ({
            productId: item.productId,
            itemName: item.itemName,
            quantity: item.quantity,
            estimatedIndividualPrice: item.productId ? null : item.estimatedIndividualPrice,
          })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sets", listId] });
      setName("");
      setStoreName("");
      setSetPrice("");
      setItems([emptyItem()]);
    },
  });

  function updateItem(index: number, patch: Partial<SetItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function handleProductSelect(index: number, value: string) {
    if (value === FREE_TEXT) {
      updateItem(index, { productId: null });
    } else {
      const option = productOptions?.find((o) => o.productId === value);
      updateItem(index, { productId: value, itemName: option?.productName ?? "" });
    }
  }

  function addItemRow() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !setPrice) return;
    createMutation.mutate();
  }

  if (!listId) return null;

  return (
    <div>
      <Link to={`/lists/${listId}`} className="back-link">
        ← Kategorilere dön
      </Link>
      <h1>Set Karşılaştırma</h1>

      <form onSubmit={handleSubmit} className={`card ${styles.form}`}>
        <div className={styles.summaryGrid}>
          <div className="field">
            <label>Set Adı</label>
            <input
              type="text"
              placeholder="ör. 12 Parça Yemek Takımı"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Mağaza</label>
            <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </div>
          <div className="field">
            <label>Set Fiyatı (TL)</label>
            <input
              type="number"
              step="0.01"
              value={setPrice}
              onChange={(e) => setSetPrice(e.target.value)}
              required
            />
          </div>
        </div>

        <h3 className={styles.itemsTitle}>Set İçeriği</h3>
        {items.map((item, index) => (
          <div key={index} className={styles.itemRow}>
            <select value={item.productId ?? FREE_TEXT} onChange={(e) => handleProductSelect(index, e.target.value)}>
              <option value={FREE_TEXT}>Serbest metin</option>
              {productOptions?.map((option) => (
                <option key={option.productId} value={option.productId}>
                  {option.categoryName} / {option.productName}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Kalem adı"
              value={item.itemName}
              onChange={(e) => updateItem(index, { itemName: e.target.value })}
              disabled={!!item.productId}
            />
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Tahmini birim fiyat"
              value={item.estimatedIndividualPrice ?? ""}
              onChange={(e) =>
                updateItem(index, {
                  estimatedIndividualPrice: e.target.value ? Number(e.target.value) : null,
                })
              }
              disabled={!!item.productId}
            />
            <button
              type="button"
              onClick={() => removeItemRow(index)}
              disabled={items.length === 1}
              className="btn btn-ghost"
            >
              Sil
            </button>
          </div>
        ))}
        <button type="button" onClick={addItemRow} className={`btn btn-secondary ${styles.addItemBtn}`}>
          + Kalem Ekle
        </button>

        <div>
          <button type="submit" disabled={createMutation.isPending} className="btn btn-primary">
            {createMutation.isPending ? "Kaydediliyor..." : "Set Oluştur"}
          </button>
        </div>
      </form>

      {isLoading && <p className="muted">Yükleniyor...</p>}
      {error && <p className="error-text">Setler yüklenemedi</p>}
      {sets && sets.length === 0 && <p className="empty-state">Henüz set yok.</p>}

      <ul className={styles.setList}>
        {sets?.map((set) => (
          <li key={set.id} className="card">
            <div className={styles.setRow}>
              <div>
                <span className={styles.setName}>{set.name}</span>
                {set.storeName && <span className={styles.setStore}> — {set.storeName}</span>}
                <span className={styles.setPrice}> ({set.setPrice} TL)</span>
              </div>
              <button
                onClick={() => setExpandedSetId(expandedSetId === set.id ? null : set.id)}
                className="btn btn-secondary"
              >
                {expandedSetId === set.id ? "Gizle" : "Karşılaştır"}
              </button>
            </div>
            {expandedSetId === set.id && <SetComparisonView setId={set.id} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
