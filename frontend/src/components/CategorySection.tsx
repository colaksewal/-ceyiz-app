import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteCategory, renameCategory } from "../api/categories";
import { createProduct, deleteProduct, getProducts, updateProduct } from "../api/products";
import { isKitchenCategory } from "../lib/kitchen";
import { pickCategoryEmoji } from "../lib/listAccent";
import { isJobActive, useAiJobStore } from "../store/aiJobStore";
import CategoryAiSuggest from "./CategoryAiSuggest";
import ExternalLink from "./ExternalLink";
import CategoryOrganize from "./CategoryOrganize";
import type { Category, Product, ProductStatus } from "../types";
import styles from "./CategorySection.module.scss";

const statusLabels: Record<ProductStatus, string> = {
  PLANNED: "Planlandı",
  PURCHASED: "Alındı",
  SKIPPED: "Atlandı",
};

const statusSelectClass: Record<ProductStatus, string> = {
  PLANNED: styles.statusPlanned,
  PURCHASED: styles.statusPurchased,
  SKIPPED: styles.statusSkipped,
};

// subcategories: üst kategorinin altında gösterilen alt kategoriler. isSub: bu bölümün kendisi
// alt kategori (tek seviye olduğu için altına alt kategori ya da AI düzenlemesi eklenmez).
export default function CategorySection({
  category,
  subcategories = [],
  isSub = false,
  moveTargets,
}: {
  category: Category;
  subcategories?: Category[];
  isSub?: boolean;
  // Alt kategorideki bir bölüm için: ürünün elle taşınabileceği aile (üst kategori + alt kategoriler).
  moveTargets?: Category[];
}) {
  const aiJobKey = `products:${category.id}`;
  const aiJob = useAiJobStore((state) => state.jobs[aiJobKey]);
  // Bu kategoride arka planda AI isteği varsa (kullanıcı sayfaya geri döndüyse) açık gelir.
  const [expanded, setExpanded] = useState(() => aiJob !== undefined);

  // Kategori kapalıyken öneri hazır olursa açılır ki sonuç kutusu görünsün.
  useEffect(() => {
    if (aiJob && !isJobActive(aiJob)) setExpanded(true);
  }, [aiJob]);
  const [productName, setProductName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(category.name);
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

  // Category tipinde listId yok; "categories" önekiyle tüm liste sorgularını tazeliyoruz.
  const renameMutation = useMutation({
    mutationFn: () => renameCategory(category.id, draftName.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setRenaming(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCategory(category.id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["products", category.id] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim()) return;
    createMutation.mutate();
  }

  function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draftName.trim() || draftName.trim() === category.name) {
      setRenaming(false);
      return;
    }
    renameMutation.mutate();
  }

  function startRenaming() {
    setDraftName(category.name);
    setRenaming(true);
  }

  function handleDelete() {
    const ok = window.confirm(
      `"${category.name}" kategorisi, ${subcategories.length > 0 ? "alt kategorileri, " : ""}içindeki tüm ürünler ve fiyat notlarıyla birlikte silinecek. Emin misin?`
    );
    if (ok) deleteMutation.mutate();
  }

  // Ürünler ilk açılışta yükleniyor; o zamana kadar özet satırı gösterilmez.
  const purchasedCount = products?.filter((p) => p.status === "PURCHASED").length ?? 0;
  const progress = products && products.length > 0 ? (purchasedCount / products.length) * 100 : 0;
  const emoji = pickCategoryEmoji(category.id, category.name);
  // Ürünler üst kategori ile alt kategorileri arasında elle taşınabilir (AI'nın yerleştirmediklerini atamak için).
  const targets = isSub ? moveTargets : subcategories.length > 0 ? [category, ...subcategories] : undefined;

  return (
    <div className={`${styles.section} ${expanded ? styles.sectionOpen : ""}`}>
      {renaming ? (
        <form onSubmit={handleRenameSubmit} className={styles.renameForm}>
          <span className={styles.emoji}>{emoji}</span>
          <input
            type="text"
            aria-label="Kategori adı"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            autoFocus
            required
          />
          <button type="submit" disabled={renameMutation.isPending} className="btn btn-primary">
            Kaydet
          </button>
          <button type="button" onClick={() => setRenaming(false)} className="btn btn-ghost">
            Vazgeç
          </button>
        </form>
      ) : (
        <div className={styles.header}>
          <button
            className={styles.toggle}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            <span className={styles.emoji}>{emoji}</span>
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
          <div className={styles.headerActions}>
            <button onClick={startRenaming} className="btn btn-ghost" title="Yeniden adlandır">
              ✎
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="btn btn-danger-ghost"
              title="Kategoriyi sil"
            >
              🗑
            </button>
          </div>
        </div>
      )}

      {(renameMutation.isError || deleteMutation.isError) && (
        <p className={`error-text ${styles.headerError}`}>
          {renameMutation.isError ? "Kategori adı güncellenemedi" : "Kategori silinemedi"}
        </p>
      )}

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

          {products && products.length > 0 && !isSub && subcategories.length > 0 && (
            <p className={styles.looseHint}>
              Alt kategoriye girmeyen ürünler — yanındaki menüden bir alt kategori seçerek taşıyabilirsin.
            </p>
          )}

          {products && products.length > 0 && (
            <ul className={styles.productList}>
              {products.map((product) => (
                <ProductRow key={product.id} product={product} categoryId={category.id} moveTargets={targets} />
              ))}
            </ul>
          )}

          {subcategories.length > 0 && (
            <div className="stack">
              {subcategories.map((sub) => (
                <CategorySection key={sub.id} category={sub} isSub moveTargets={[category, ...subcategories]} />
              ))}
            </div>
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

          {products && !isSub && products.length >= 4 && (
            <div className={styles.aiSlot}>
              <CategoryOrganize categoryId={category.id} categoryName={category.name} />
            </div>
          )}

          {products && (
            <div className={styles.aiSlot}>
              <CategoryAiSuggest
                jobKey={aiJobKey}
                jobLabel={`${category.name} için ürün önerisi`}
                existingNames={products.map((p) => p.name)}
                kitchen={!isSub && isKitchenCategory(category.name)}
                onAddItems={async (items) => {
                  await Promise.all(items.map((item) => createProduct(category.id, item)));
                  queryClient.invalidateQueries({ queryKey: ["products", category.id] });
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductRow({
  product,
  categoryId,
  moveTargets,
}: {
  product: Product;
  categoryId: string;
  moveTargets?: Category[];
}) {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(product.name);
  const [draftUrl, setDraftUrl] = useState(product.url ?? "");
  const queryClient = useQueryClient();
  const productsKey = ["products", categoryId];

  // Sunucunun döndürdüğü ürünü cache'e doğrudan yazıyoruz; liste yeniden çekilmeden
  // durum rozeti ve ilerleme çubuğu anında güncellenir.
  const updateMutation = useMutation({
    mutationFn: (changes: { name?: string; status?: ProductStatus; categoryId?: string; url?: string }) =>
      updateProduct(product.id, changes),
    onSuccess: (updated, changes) => {
      if (changes.categoryId) {
        // Başka kategoriye taşındı: hem eski hem yeni kategorinin ürün listesi tazelenir.
        queryClient.invalidateQueries({ queryKey: ["products"] });
        return;
      }
      queryClient.setQueryData<Product[]>(productsKey, (old) =>
        old?.map((p) => (p.id === updated.id ? updated : p))
      );
      setRenaming(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(product.id),
    onSuccess: () => {
      queryClient.setQueryData<Product[]>(productsKey, (old) =>
        old?.filter((p) => p.id !== product.id)
      );
    },
  });

  function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = draftName.trim();
    const url = draftUrl.trim();
    const changes: { name?: string; url?: string } = {};
    if (name && name !== product.name) changes.name = name;
    if (url !== (product.url ?? "")) changes.url = url;
    if (Object.keys(changes).length === 0) {
      setRenaming(false);
      return;
    }
    updateMutation.mutate(changes);
  }

  function startRenaming() {
    setDraftName(product.name);
    setDraftUrl(product.url ?? "");
    setRenaming(true);
  }

  function handleDelete() {
    const ok = window.confirm(
      `"${product.name}" ürünü ve fiyat notları silinecek. Emin misin?`
    );
    if (ok) deleteMutation.mutate();
  }

  if (renaming) {
    return (
      <li>
        <form onSubmit={handleRenameSubmit} className={styles.productRenameForm}>
          <input
            type="text"
            aria-label="Ürün adı"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            autoFocus
            required
          />
          <input
            type="url"
            inputMode="url"
            aria-label="Ürün linki"
            placeholder="Link (opsiyonel), https://..."
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
          />
          <button type="submit" disabled={updateMutation.isPending} className="btn btn-primary">
            Kaydet
          </button>
          <button type="button" onClick={() => setRenaming(false)} className="btn btn-ghost">
            Vazgeç
          </button>
          {updateMutation.isError && <span className="error-text">Kaydedilemedi, linki kontrol et.</span>}
        </form>
      </li>
    );
  }

  return (
    <li className={styles.productRow}>
      <Link
        to={`/products/${product.id}`}
        className={`${styles.productLink} ${product.status === "SKIPPED" ? styles.productSkipped : ""}`}
      >
        <span className={styles.productName}>{product.name}</span>
        <span className={styles.rowArrow} aria-hidden>
          ›
        </span>
      </Link>
      <div className={styles.productMeta}>
        {product.url && <ExternalLink url={product.url} />}
        {moveTargets && moveTargets.length > 1 && (
          <select
            aria-label="Ürünü taşı"
            value={categoryId}
            disabled={updateMutation.isPending}
            onChange={(e) => updateMutation.mutate({ categoryId: e.target.value })}
            className={styles.moveSelect}
          >
            {moveTargets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.parentId === null ? `${target.name} (kategorisiz)` : target.name}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Ürün durumu"
          value={product.status}
          disabled={updateMutation.isPending}
          onChange={(e) => updateMutation.mutate({ status: e.target.value as ProductStatus })}
          className={`${styles.statusSelect} ${statusSelectClass[product.status]}`}
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button onClick={startRenaming} className="btn btn-ghost" title="Yeniden adlandır">
          ✎
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="btn btn-danger-ghost"
          title="Ürünü sil"
        >
          🗑
        </button>
      </div>
      {(updateMutation.isError || deleteMutation.isError) && (
        <span className={`error-text ${styles.rowError}`}>
          {updateMutation.isError ? "Güncellenemedi" : "Silinemedi"}
        </span>
      )}
    </li>
  );
}
