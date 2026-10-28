import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getMyLists } from "../api/lists";
import { addSetToList, previewSetPlacement } from "../api/setTemplates";
import PartTargetSelect from "./PartTargetSelect";
import type { AddSetToListResult, PriceType, SetPlacementPreview, SetTemplate } from "../types";
import styles from "./AddSetToList.module.scss";

const priceTypeLabels: Record<PriceType, string> = {
  PESIN: "Peşin",
  TAKSITLI: "Taksitli",
  ELDEN_KREDI_KARTI: "Elden Kredi Kartı",
};

const tlFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

function errorMessage(error: unknown): string {
  if (isAxiosError(error) && typeof error.response?.data?.error === "string") {
    return error.response.data.error;
  }
  return "Listeye eklenemedi, tekrar dene.";
}

// Katalogdaki seti kullanıcının listesine ekler; katalog seti olduğu gibi kalır. Önizlemede her parça için
// Kategori › Alan › Ürün seçilir ("Yeni ekle" parçayı yeni ürün yapar, listeden ürün seçilirse parça o ürüne
// girer); set tek fiyatla listeye yazılır.
//
// "Set ürün olarak ekle" ve "Mevcut ürüne ekle" yolları şimdilik arayüzden kaldırıldı; backend uç noktaları
// (addSetAsProduct, attachSetToProduct) ve api fonksiyonları duruyor, geri açmak için bu bileşene eklenir.
export default function AddSetToList({ set }: { set: SetTemplate }) {
  const queryClient = useQueryClient();
  const { data: lists } = useQuery({ queryKey: ["lists"], queryFn: getMyLists });
  const editableLists = (lists ?? []).filter((list) => list.role !== "VIEWER");
  const [listId, setListId] = useState("");
  const [priceId, setPriceId] = useState("");
  const [done, setDone] = useState<{ listId: string; added: AddSetToListResult } | null>(null);
  const selectedListId = listId || editableLists[0]?.id || "";

  // Önizleme: parça başına seçilen hedef (anahtar) ve "Yeni ekle" seçilen parçalarda açılacak ürünün adı.
  const [preview, setPreview] = useState<SetPlacementPreview | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [newNames, setNewNames] = useState<Record<string, string>>({});

  const previewMutation = useMutation({
    mutationFn: () => previewSetPlacement(selectedListId, set.id),
    onSuccess: (loaded) => {
      setPreview(loaded);
      setChoices(Object.fromEntries(loaded.items.map((item) => [item.id, item.suggestedKey])));
      setNewNames(
        Object.fromEntries(
          loaded.items.map((item) => [
            item.id,
            item.quantity > 1 ? `${item.itemName} (${item.quantity} adet)` : item.itemName,
          ])
        )
      );
    },
  });

  const addMutation = useMutation({
    mutationFn: () =>
      addSetToList(
        selectedListId,
        set.id,
        priceId || null,
        Object.entries(choices).map(([setTemplateItemId, destinationKey]) => ({
          setTemplateItemId,
          destinationKey,
          newProductName: newNames[setTemplateItemId]?.trim() || null,
        }))
      ),
    onSuccess: (added) => {
      setPreview(null);
      setDone({ listId: selectedListId, added });
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

  return (
    <div className={styles.box}>
      <h4 className={styles.heading}>Listeme ekle</h4>
      <p className={styles.hint}>
        Set katalogda kalır. Her parçanın listede nereye gideceğini seçersin: Kategori › Alan › Ürün; "Yeni ekle"
        parçayı yeni ürün yapar, listeden ürün seçersen parça o ürüne girer.
      </p>

      <div className={styles.row}>
        <label className={styles.field}>
          <span>Liste</span>
          <select
            aria-label="Liste"
            value={selectedListId}
            onChange={(e) => {
              setListId(e.target.value);
              setPreview(null);
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

        {set.prices.length > 1 && (
          <label className={styles.field}>
            <span>Fiyat</span>
            <select aria-label="Fiyat" value={priceId} onChange={(e) => setPriceId(e.target.value)}>
              <option value="">En ucuz fiyat</option>
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
          </label>
        )}
      </div>

      <div className={styles.actions}>
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
      </div>
      {previewMutation.isError && <p className="error-text">{errorMessage(previewMutation.error)}</p>}

      {preview && (
        <div className={styles.preview}>
          <p className={styles.previewTitle}>Her parça nereye gitsin? Kategori › Alan › Ürün (en sonda "Yeni ekle")</p>
          {preview.items.map((item) => (
            <div key={item.id} className={styles.previewRow}>
              <span>
                {item.quantity > 1 && <strong>{item.quantity}× </strong>}
                {item.itemName}
              </span>
              <PartTargetSelect
                preview={preview}
                value={choices[item.id] ?? item.suggestedKey}
                onChange={(key) => setChoices((prev) => ({ ...prev, [item.id]: key }))}
                newName={newNames[item.id] ?? item.itemName}
                onNewNameChange={(name) => setNewNames((prev) => ({ ...prev, [item.id]: name }))}
              />
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

      {done && (
        <p className={styles.success}>
          ✓ Eklendi: {done.added.newProductCount} yeni ürün
          {done.added.existingProductCount > 0 && `, ${done.added.existingProductCount} mevcut ürüne bağlandı`}.{" "}
          <Link to={`/lists/${done.listId}`}>Listeye git</Link>
        </p>
      )}
    </div>
  );
}
