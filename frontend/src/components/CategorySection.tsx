import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createProduct, getProducts } from "../api/products";
import { pickCategoryEmoji } from "../lib/listAccent";
import type { Category, ProductStatus } from "../types";
import styles from "./CategorySection.module.scss";

const statusLabels: Record<ProductStatus, string> = {
  PLANNED: "Planlandı",
  PURCHASED: "Alındı",
  SKIPPED: "Atlandı",
};

const statusBadgeClass: Record<ProductStatus, string> = {
  PLANNED: "badge badge-neutral",
  PURCHASED: "badge badge-success",
  SKIPPED: "badge badge-warning",
};

export default function CategorySection({ category }: { category: Category }) {
  const [expanded, setExpanded] = useState(false);
  const [productName, setProductName] = useState("");
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", category.id],
    queryFn: () => getProducts(category.id),
    enabled: expanded,
  });

  const createMutation = useMutation({
    mutationFn: () => createProduct(category.id, productName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", category.id] });
      setProductName("");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim()) return;
    createMutation.mutate();
  }

  // Ürünler ilk açılışta yükleniyor; o zamana kadar özet satırı gösterilmez.
  const purchasedCount = products?.filter((p) => p.status === "PURCHASED").length ?? 0;
  const progress = products && products.length > 0 ? (purchasedCount / products.length) * 100 : 0;

  return (
    <div className={`${styles.section} ${expanded ? styles.sectionOpen : ""}`}>
      <button
        className={styles.toggle}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className={styles.emoji}>{pickCategoryEmoji(category.id, category.name)}</span>
        <span className={styles.titleBlock}>
          <span className={styles.title}>{category.name}</span>
          {products && (
            <span className={styles.summary}>
              {products.length} ürün · {purchasedCount} alındı
            </span>
          )}
        </span>
        <span className={styles.chevron} aria-hidden>
          ›
        </span>
      </button>

      {products && products.length > 0 && (
        <div className={styles.progressTrack}>
          <div className={styles.progressBar} style={{ width: `${progress}%` }} />
        </div>
      )}

      {expanded && (
        <div className={styles.body}>
          {isLoading && <p className="muted">Yükleniyor...</p>}
          {products && products.length === 0 && (
            <p className={styles.emptyHint}>Bu kategoride henüz ürün yok.</p>
          )}

          {products && products.length > 0 && (
            <ul className={styles.productList}>
              {products.map((product) => (
                <li key={product.id}>
                  <Link to={`/products/${product.id}`} className={styles.productRow}>
                    <span className={styles.productName}>{product.name}</span>
                    <span className={styles.productMeta}>
                      <span className={statusBadgeClass[product.status]}>
                        {statusLabels[product.status] ?? product.status}
                      </span>
                      <span className={styles.rowArrow} aria-hidden>
                        ›
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleSubmit} className={styles.addForm}>
            <input
              type="text"
              placeholder="Yeni ürün ekle, ör. Tencere Seti"
              aria-label="Ürün adı"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
            <button type="submit" disabled={createMutation.isPending} className="btn btn-primary">
              {createMutation.isPending ? "Ekleniyor..." : "Ekle"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
