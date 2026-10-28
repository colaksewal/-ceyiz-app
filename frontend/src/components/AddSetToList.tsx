import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getMyLists } from "../api/lists";
import { addSetToList } from "../api/setTemplates";
import type { AddSetToListResult, PriceType, SetTemplate } from "../types";
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

// Katalogdaki seti kullanıcının listesine ekler: katalog seti olduğu gibi kalır, listeye set (tek
// fiyatla) ve parçaları kategorilere dağılmış ürünler olarak gelir. Birden çok fiyat varsa hangisinin
// yazılacağı seçilir (varsayılan: en ucuz).
export default function AddSetToList({ set }: { set: SetTemplate }) {
  const queryClient = useQueryClient();
  const { data: lists } = useQuery({ queryKey: ["lists"], queryFn: getMyLists });
  const editableLists = (lists ?? []).filter((list) => list.role !== "VIEWER");
  const [listId, setListId] = useState("");
  const [priceId, setPriceId] = useState("");
  const [result, setResult] = useState<{ listId: string; added: AddSetToListResult } | null>(null);
  const selectedListId = listId || editableLists[0]?.id || "";

  const mutation = useMutation({
    mutationFn: () => addSetToList(selectedListId, set.id, priceId || null),
    onSuccess: (added) => {
      setResult({ listId: selectedListId, added });
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
        Set katalogda kalır. Listene set (tek fiyatla) ve parçaları kategorilere dağılmış ürünler olarak eklenir;
        yerleşmeyen parçaları sonra elle taşırsın.
      </p>

      <div className={styles.row}>
        <select
          aria-label="Liste"
          value={selectedListId}
          onChange={(e) => {
            setListId(e.target.value);
            setResult(null);
          }}
        >
          {editableLists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>

        {set.prices.length > 1 && (
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
        )}

        <button
          type="button"
          className="btn btn-primary"
          disabled={!selectedListId || mutation.isPending}
          onClick={() => {
            setResult(null);
            mutation.mutate();
          }}
        >
          {mutation.isPending ? "Ekleniyor..." : "Listeme ekle"}
        </button>
      </div>

      {mutation.isError && <p className="error-text">{errorMessage(mutation.error)}</p>}
      {result && (
        <p className={styles.success}>
          ✓ Eklendi: {result.added.newProductCount} yeni ürün
          {result.added.existingProductCount > 0 && `, ${result.added.existingProductCount} mevcut ürüne bağlandı`}.{" "}
          <Link to={`/lists/${result.listId}`}>Listeye git</Link>
        </p>
      )}
    </div>
  );
}
