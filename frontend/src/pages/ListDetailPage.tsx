import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCategory, getCategories } from "../api/categories";
import CategorySection from "../components/CategorySection";
import ProposeTemplate from "../components/ProposeTemplate";
import Sheet from "../components/Sheet";
import TemplatePicker from "../components/TemplatePicker";
import styles from "./ListDetailPage.module.scss";

export default function ListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const [categoryName, setCategoryName] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const closeTemplates = useCallback(() => setTemplatesOpen(false), []);
  const [proposeOpen, setProposeOpen] = useState(false);
  const closePropose = useCallback(() => setProposeOpen(false), []);
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

  // Alt kategoriler üst kategorinin içinde gösterilir; sayfada, sayıda ve şablon eşleşmesinde sadece üst kategoriler.
  const topLevel = (categories ?? []).filter((category) => category.parentId === null);

  if (!listId) return null;

  return (
    <div>
      <Link to="/lists" className="back-link">
        ← Listelerim
      </Link>
      <div className={`page-header ${styles.header}`}>
        <div>
          <h1 className={styles.title}>Kategoriler</h1>
          {topLevel.length > 0 && <p className={styles.subtitle}>{topLevel.length} kategori</p>}
        </div>
      </div>

      <button type="button" className={styles.templateCta} onClick={() => setTemplatesOpen(true)}>
        <span className={styles.templateCtaIcon} aria-hidden="true">
          📋
        </span>
        <span className={styles.templateCtaText}>
          <strong>Şablonlardan getir</strong>
          <span>Hazır oda ve ürün listelerinden seçerek ekle</span>
        </span>
        <span className={styles.templateCtaArrow} aria-hidden="true">
          ›
        </span>
      </button>

      <button type="button" className={styles.templateCta} onClick={() => setProposeOpen(true)}>
        <span className={styles.templateCtaIcon} aria-hidden="true">
          📤
        </span>
        <span className={styles.templateCtaText}>
          <strong>Listemi şablon olarak öner</strong>
          <span>Kategori ve ürün adlarını admine gönder; uygun görürse herkese şablon olur</span>
        </span>
        <span className={styles.templateCtaArrow} aria-hidden="true">
          ›
        </span>
      </button>

      <form onSubmit={handleSubmit} className={`card form-row ${styles.form}`}>
        <div className={`field ${styles.nameField}`}>
          <label>Yeni kategori</label>
          <input
            type="text"
            placeholder="ör. Mutfak"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={createMutation.isPending} className="btn btn-primary">
          {createMutation.isPending ? "Ekleniyor..." : "+ Kategori Ekle"}
        </button>
      </form>

      {isLoading && <p className="muted">Yükleniyor...</p>}
      {error && <p className="error-text">Kategoriler yüklenemedi</p>}
      {categories && categories.length === 0 && (
        <>
          <p className="empty-state">
            Henüz kategori yok. Yukarıdan elle ekleyebilir ya da aşağıdaki şablondan
            istediklerini seçip ekleyebilirsin.
          </p>
          <TemplatePicker listId={listId} existingCategories={[]} onDone={() => {}} />
        </>
      )}

      <div className="stack">
        {topLevel.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            subcategories={(categories ?? []).filter((sub) => sub.parentId === category.id)}
          />
        ))}
      </div>

      <Sheet open={templatesOpen} onClose={closeTemplates} title={<h2 className={styles.sheetTitle}>📋 Şablonlardan getir</h2>}>
        <TemplatePicker listId={listId} existingCategories={categories ?? []} onDone={closeTemplates} />
      </Sheet>

      <Sheet open={proposeOpen} onClose={closePropose} title={<h2 className={styles.sheetTitle}>📤 Şablon olarak öner</h2>}>
        <ProposeTemplate listId={listId} categories={categories ?? []} />
      </Sheet>
    </div>
  );
}
