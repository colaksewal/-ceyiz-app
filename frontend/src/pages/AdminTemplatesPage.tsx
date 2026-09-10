import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategoryTemplate,
  createProductTemplate,
  deleteCategoryTemplate,
  deleteProductTemplate,
} from "../api/adminTemplates";
import { getAllTemplates } from "../api/templates";
import AiSuggestionPanel from "../components/AiSuggestionPanel";
import { useAuthStore } from "../store/authStore";
import styles from "./AdminTemplatesPage.module.scss";

export default function AdminTemplatesPage() {
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const queryClient = useQueryClient();
  const [categoryName, setCategoryName] = useState("");

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ["adminTemplates"],
    queryFn: getAllTemplates,
    enabled: isAdmin,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["adminTemplates"] });
  }

  const createCategoryMutation = useMutation({
    mutationFn: () => createCategoryTemplate(categoryName, (categories?.length ?? 0) + 1),
    onSuccess: () => {
      invalidate();
      setCategoryName("");
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryTemplateId: string) => deleteCategoryTemplate(categoryTemplateId),
    onSuccess: invalidate,
  });

  const deleteProductMutation = useMutation({
    mutationFn: (productTemplateId: string) => deleteProductTemplate(productTemplateId),
    onSuccess: invalidate,
  });

  function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryName.trim()) return;
    createCategoryMutation.mutate();
  }

  if (!isAdmin) {
    return <Navigate to="/lists" replace />;
  }

  return (
    <div>
      <h1>Şablon Yönetimi</h1>
      <p className="muted">
        Burada eklediğin kategori/ürünler, yeni bir liste oluşturulduğunda otomatik olarak
        o listeye kopyalanır.
      </p>

      <AiSuggestionPanel
        onAdd={async (aiCategoryName, items) => {
          const category = await createCategoryTemplate(aiCategoryName, (categories?.length ?? 0) + 1);
          for (let i = 0; i < items.length; i++) {
            await createProductTemplate(category.id, items[i], i + 1);
          }
          invalidate();
        }}
      />

      <form onSubmit={handleCreateCategory} className={`form-row ${styles.form}`}>
        <div className="field">
          <label>Yeni kategori adı</label>
          <input
            type="text"
            placeholder="ör. Mutfak"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={createCategoryMutation.isPending}>
          {createCategoryMutation.isPending ? "Ekleniyor..." : "Kategori Ekle"}
        </button>
      </form>

      {isLoading && <p className="muted">Yükleniyor...</p>}
      {error && <p className="error-text">Şablonlar yüklenemedi</p>}
      {categories && categories.length === 0 && (
        <p className="empty-state">Henüz hiç şablon kategorisi yok — yukarıdan ekleyebilirsin.</p>
      )}

      <div className={styles.categoryList}>
        {categories?.map((category) => (
          <CategoryTemplateCard
            key={category.id}
            categoryId={category.id}
            categoryName={category.name}
            products={category.products}
            onDeleteCategory={() => deleteCategoryMutation.mutate(category.id)}
            onDeleteProduct={(productTemplateId) => deleteProductMutation.mutate(productTemplateId)}
            onProductAdded={invalidate}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryTemplateCard({
  categoryId,
  categoryName,
  products,
  onDeleteCategory,
  onDeleteProduct,
  onProductAdded,
}: {
  categoryId: string;
  categoryName: string;
  products: { id: string; name: string }[];
  onDeleteCategory: () => void;
  onDeleteProduct: (productTemplateId: string) => void;
  onProductAdded: () => void;
}) {
  const [productName, setProductName] = useState("");

  const createProductMutation = useMutation({
    mutationFn: () => createProductTemplate(categoryId, productName, products.length + 1),
    onSuccess: () => {
      onProductAdded();
      setProductName("");
    },
  });

  function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim()) return;
    createProductMutation.mutate();
  }

  return (
    <div className={`card ${styles.categoryCard}`}>
      <div className={styles.categoryHeader}>
        <h3>{categoryName}</h3>
        <button type="button" className="btn btn-secondary" onClick={onDeleteCategory}>
          Kategoriyi Sil
        </button>
      </div>

      <ul className={styles.productList}>
        {products.map((product) => (
          <li key={product.id} className={styles.productRow}>
            <span>{product.name}</span>
            <button type="button" className="btn btn-secondary" onClick={() => onDeleteProduct(product.id)}>
              Sil
            </button>
          </li>
        ))}
        {products.length === 0 && <li className="muted">Bu kategoride henüz ürün yok.</li>}
      </ul>

      <form onSubmit={handleCreateProduct} className={`form-row ${styles.form}`}>
        <div className="field">
          <input
            type="text"
            placeholder="ör. Tencere Seti"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={createProductMutation.isPending}>
          {createProductMutation.isPending ? "Ekleniyor..." : "Ürün Ekle"}
        </button>
      </form>
    </div>
  );
}
