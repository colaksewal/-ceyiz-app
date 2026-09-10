import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getAllTemplates } from "../api/templates";
import { createCategory } from "../api/categories";
import { createProduct } from "../api/products";
import styles from "./TemplatePicker.module.scss";

export default function TemplatePicker({ listId, onDone }: { listId: string; onDone: () => void }) {
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ["templates"],
    queryFn: getAllTemplates,
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Şablon yüklenince varsayılan olarak her şey işaretli gelir — kullanıcı istemediğini
  // tek tek kaldırır, hepsini elle işaretlemek zorunda kalmaz.
  useEffect(() => {
    if (templates) {
      setSelected(new Set(templates.flatMap((category) => category.products.map((p) => p.id))));
    }
  }, [templates]);

  function toggleProduct(productId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  function toggleCategory(productIds: string[], allSelected: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of productIds) {
        if (allSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });
  }

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!templates) return;
      for (const category of templates) {
        const chosenProducts = category.products.filter((p) => selected.has(p.id));
        if (chosenProducts.length === 0) continue;

        const createdCategory = await createCategory(listId, category.name);
        for (const product of chosenProducts) {
          await createProduct(createdCategory.id, product.name);
        }
      }
    },
    onSuccess: onDone,
  });

  if (isLoading) return <p className="muted">Şablonlar yükleniyor...</p>;
  if (error) return <p className="error-text">Şablonlar yüklenemedi</p>;
  if (!templates || templates.length === 0) {
    return <p className="muted">Admin henüz şablon eklememiş.</p>;
  }

  return (
    <div className={styles.picker}>
      {templates.map((category) => {
        const productIds = category.products.map((p) => p.id);
        const allSelected = productIds.length > 0 && productIds.every((id) => selected.has(id));

        return (
          <div key={category.id} className={styles.category}>
            <label className={styles.categoryHeader}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => toggleCategory(productIds, allSelected)}
              />
              <strong>{category.name}</strong>
            </label>

            <ul className={styles.productList}>
              {category.products.map((product) => (
                <li key={product.id} className={styles.productRow}>
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={() => toggleProduct(product.id)}
                    />
                    {product.name}
                  </label>
                </li>
              ))}
              {category.products.length === 0 && <li className="muted">Bu kategoride ürün yok.</li>}
            </ul>
          </div>
        );
      })}

      {addMutation.isError && <p className="error-text">Eklenemedi, tekrar dene.</p>}

      <button
        type="button"
        className="btn btn-primary"
        disabled={selected.size === 0 || addMutation.isPending}
        onClick={() => addMutation.mutate()}
      >
        {addMutation.isPending ? "Ekleniyor..." : "Seçilenleri Ekle"}
      </button>
    </div>
  );
}
