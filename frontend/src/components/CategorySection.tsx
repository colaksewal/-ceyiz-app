import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createProduct, getProducts } from "../api/products";
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

  return (
    <div className={styles.section}>
      <button className={styles.toggle} onClick={() => setExpanded((v) => !v)}>
        <span className={styles.chevron}>{expanded ? "▾" : "▸"}</span>
        {category.name}
      </button>

      {expanded && (
        <div className={styles.body}>
          <form onSubmit={handleSubmit} className={`form-row ${styles.form}`}>
            <div className={`field ${styles.nameField}`}>
              <label>Ürün adı</label>
              <input
                type="text"
                placeholder="ör. Tencere Seti"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={createMutation.isPending} className="btn btn-primary">
              {createMutation.isPending ? "Ekleniyor..." : "Ürün Ekle"}
            </button>
          </form>

          {isLoading && <p className="muted">Yükleniyor...</p>}
          {products && products.length === 0 && (
            <p className="empty-state">Bu kategoride henüz ürün yok.</p>
          )}

          <ul className={styles.productList}>
            {products?.map((product) => (
              <li key={product.id} className={styles.productRow}>
                <Link to={`/products/${product.id}`} className={styles.productLink}>
                  {product.name}
                </Link>
                <span className={statusBadgeClass[product.status]}>
                  {statusLabels[product.status] ?? product.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
