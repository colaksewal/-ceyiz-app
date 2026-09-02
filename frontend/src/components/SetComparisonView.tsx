import { useQuery } from "@tanstack/react-query";
import { getSetComparison } from "../api/sets";
import styles from "./SetComparisonView.module.scss";

export default function SetComparisonView({ setId }: { setId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["setComparison", setId],
    queryFn: () => getSetComparison(setId),
  });

  if (isLoading) return <p className="muted">Hesaplanıyor...</p>;
  if (error) return <p className="error-text">Karşılaştırma yüklenemedi</p>;
  if (!data) return null;

  const cheaper = data.savingsAmount > 0 ? "set" : data.savingsAmount < 0 ? "individual" : null;

  return (
    <div className={styles.result}>
      <div className={styles.row}>
        <span>Set fiyatı</span>
        <span>{data.setPrice} TL</span>
      </div>
      <div className={styles.row}>
        <span>Parça parça toplam</span>
        <span>{data.individualTotal} TL</span>
      </div>
      <div className={`${styles.row} ${styles.diffRow}`}>
        <span>Fark</span>
        <span className={cheaper === "set" ? styles.cheaperSet : cheaper === "individual" ? styles.cheaperIndividual : ""}>
          {Math.abs(data.savingsAmount)} TL
          {cheaper && ` (${cheaper === "set" ? "set daha ucuz" : "parça parça daha ucuz"})`}
        </span>
      </div>
      {data.missingItemsCount > 0 && (
        <div className={styles.missing}>{data.missingItemsCount} ürün için fiyat verisi eksik.</div>
      )}
    </div>
  );
}
