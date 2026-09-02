import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCategory, getCategories } from "../api/categories";
import CategorySection from "../components/CategorySection";
import styles from "./ListDetailPage.module.scss";

export default function ListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const [categoryName, setCategoryName] = useState("");
  const queryClient = useQueryClient();

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ["categories", listId],
    queryFn: () => getCategories(listId!),
    enabled: !!listId,
  });

  const createMutation = useMutation({
    mutationFn: () => createCategory(listId!, categoryName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", listId] });
      setCategoryName("");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryName.trim()) return;
    createMutation.mutate();
  }

  if (!listId) return null;

  return (
    <div>
      <Link to="/lists" className="back-link">
        ← Listelerim
      </Link>
      <div className="page-header">
        <h1>Kategoriler</h1>
        <Link to={`/lists/${listId}/sets`} className="btn btn-secondary">
          Set Karşılaştırma →
        </Link>
      </div>

      <form onSubmit={handleSubmit} className={`form-row ${styles.form}`}>
        <div className={`field ${styles.nameField}`}>
          <label>Kategori adı</label>
          <input
            type="text"
            placeholder="ör. Mutfak"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={createMutation.isPending} className="btn btn-primary">
          {createMutation.isPending ? "Ekleniyor..." : "Kategori Ekle"}
        </button>
      </form>

      {isLoading && <p className="muted">Yükleniyor...</p>}
      {error && <p className="error-text">Kategoriler yüklenemedi</p>}
      {categories && categories.length === 0 && (
        <p className="empty-state">Henüz kategori yok. Yukarıdan bir tane ekle.</p>
      )}

      <div className="stack">
        {categories?.map((category) => (
          <CategorySection key={category.id} category={category} />
        ))}
      </div>
    </div>
  );
}
