import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllTemplates } from "../api/templates";
import { createCategory } from "../api/categories";
import { createProduct, getProducts } from "../api/products";
import { pickCategoryEmoji, pickTileColor } from "../lib/listAccent";
import type { Category, CategoryTemplate } from "../types";
import styles from "./TemplatePicker.module.scss";

function normalize(name: string): string {
  return name.trim().toLocaleLowerCase("tr");
}

// Listede aynı adlı kategori varsa ürünler ona eklenir (yeni kopya açılmaz); listede zaten
// olan ürünler "listede var" olarak gösterilir ve tekrar eklenmez.
export default function TemplatePicker({
  listId,
  existingCategories,
  onDone,
}: {
  listId: string;
  existingCategories: Category[];
  onDone: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ["templates"],
    queryFn: getAllTemplates,
  });

  // Şablonlar ve liste kategorileri tek seviyeli ağaçtır: alt kategori "üst|ad" anahtarıyla eşleşir.
  const templateById = new Map((templates ?? []).map((t) => [t.id, t]));
  const categoryById = new Map(existingCategories.map((c) => [c.id, c]));

  function parentOf(template: CategoryTemplate): CategoryTemplate | undefined {
    return template.parentId ? templateById.get(template.parentId) : undefined;
  }

  function keyOfTemplate(template: CategoryTemplate): string {
    const parent = parentOf(template);
    return `${parent ? normalize(parent.name) : ""}|${normalize(template.name)}`;
  }

  const existingByKey = new Map<string, Category>(
    existingCategories.map((c): [string, Category] => {
      const parent = c.parentId ? categoryById.get(c.parentId) : undefined;
      return [`${parent ? normalize(parent.name) : ""}|${normalize(c.name)}`, c];
    })
  );

  function existingFor(template: CategoryTemplate): Category | undefined {
    return existingByKey.get(keyOfTemplate(template));
  }

  // Üst şablon, hemen ardından alt şablonları (liste sırası bozulmaz).
  const ordered = (templates ?? [])
    .filter((t) => !t.parentId)
    .flatMap((t) => [t, ...(templates ?? []).filter((child) => child.parentId === t.id)]);

  // Şablonla aynı adı taşıyan liste kategorilerinin ürünlerini çekiyoruz ki zaten olanları
  // işaretleyebilelim. ["products", id] cache'ini paylaşır.
  const matchedIds = (templates ?? [])
    .map((t) => existingFor(t)?.id)
    .filter((id): id is string => !!id);

  const { data: existingProducts, isLoading: existingLoading } = useQuery({
    queryKey: ["templatePickerExisting", listId, matchedIds],
    enabled: !!templates,
    queryFn: async () => {
      const entries = await Promise.all(
        matchedIds.map(async (id) => {
          const products = await queryClient.fetchQuery({
            queryKey: ["products", id],
            queryFn: () => getProducts(id),
          });
          return [id, new Set(products.map((p) => normalize(p.name)))] as const;
        })
      );
      return new Map(entries);
    },
  });

  function isAlreadyInList(template: CategoryTemplate, productName: string): boolean {
    const category = existingFor(template);
    if (!category) return false;
    return existingProducts?.get(category.id)?.has(normalize(productName)) ?? false;
  }

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(templateId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      return next;
    });
  }

  // Varsayılan: listede olmayan her şey seçili gelir — kullanıcı istemediğini kaldırır.
  useEffect(() => {
    if (!templates || !existingProducts) return;
    setSelected(
      new Set(
        templates.flatMap((t) => t.products.filter((p) => !isAlreadyInList(t, p.name)).map((p) => p.id))
      )
    );
    // isAlreadyInList templates/existingProducts'tan türüyor, ayrıca bağımlılık gerekmez.
  }, [templates, existingProducts]);

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
      // Kategori listede yoksa açılır; alt kategorinin üst kategorisi de (ürün seçilmemiş olsa bile) açılır. Aynı
      // üst kategori paralel isteklerde iki kez açılmasın diye açılan kategoriler şablon kimliğiyle paylaşılır.
      const opening = new Map<string, Promise<string>>();
      function ensureCategory(template: CategoryTemplate): Promise<string> {
        const existing = existingFor(template);
        if (existing) return Promise.resolve(existing.id);
        let pending = opening.get(template.id);
        if (!pending) {
          pending = (async () => {
            const parent = parentOf(template);
            const parentId = parent ? await ensureCategory(parent) : undefined;
            return (await createCategory(listId, template.name, parentId)).id;
          })();
          opening.set(template.id, pending);
        }
        return pending;
      }

      // İstekler paralel gider — her biri ~150ms sürdüğü için sırayla göndermek çok yavaş.
      await Promise.all(
        templates.map(async (template) => {
          const chosenProducts = template.products.filter((p) => selected.has(p.id));
          if (chosenProducts.length === 0) return;

          const categoryId = await ensureCategory(template);
          await Promise.all(chosenProducts.map((product) => createProduct(categoryId, product.name)));
          queryClient.invalidateQueries({ queryKey: ["products", categoryId] });
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", listId] });
      queryClient.invalidateQueries({ queryKey: ["templatePickerExisting", listId] });
      onDone();
    },
  });

  if (isLoading || (templates && existingLoading)) return <p className="muted">Şablonlar yükleniyor...</p>;
  if (error) return <p className="error-text">Şablonlar yüklenemedi</p>;
  if (!templates || templates.length === 0) {
    return <p className="muted">Admin henüz şablon eklememiş.</p>;
  }

  const newCategoryCount = templates.filter(
    (t) => !existingFor(t) && t.products.some((p) => selected.has(p.id))
  ).length;

  return (
    <div className={styles.picker}>
      {ordered.map((template) => {
        const selectable = template.products.filter((p) => !isAlreadyInList(template, p.name));
        const selectableIds = selectable.map((p) => p.id);
        const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
        const inList = !!existingFor(template);
        const isOpen = expanded.has(template.id);
        const selectedCount = selectableIds.filter((id) => selected.has(id)).length;

        return (
          <div
            key={template.id}
            className={`${styles.category} ${isOpen ? styles.categoryOpen : ""} ${template.parentId ? styles.child : ""}`}
            style={{ "--tile": pickTileColor(template.name) } as CSSProperties}
          >
            <div className={styles.categoryHeader}>
              <button
                type="button"
                className={styles.expandToggle}
                aria-expanded={isOpen}
                onClick={() => toggleExpanded(template.id)}
              >
                <span className={styles.emoji}>{pickCategoryEmoji(template.id, template.name)}</span>
                <span className={styles.categoryTitle}>
                  <strong>{template.name}</strong>
                  {inList && <span className={styles.inListTag}>Listende var</span>}
                  <span className={styles.countText}>
                    {selectableIds.length === 0
                      ? template.products.length === 0
                        ? "Ürün yok"
                        : "Hepsi listede"
                      : `${selectedCount}/${selectableIds.length} seçili`}
                  </span>
                </span>
                <span className={styles.chevron} aria-hidden="true">
                  ›
                </span>
              </button>
              {selectableIds.length > 0 && (
                <button
                  type="button"
                  className={styles.toggleAll}
                  onClick={() => toggleCategory(selectableIds, allSelected)}
                >
                  {allSelected ? "Hiçbiri" : "Hepsi"}
                </button>
              )}
            </div>

            {isOpen && (
              <div className={styles.chips}>
                {template.products.map((product) => {
                  if (isAlreadyInList(template, product.name)) {
                    return (
                      <span key={product.id} className={`${styles.chip} ${styles.chipDone}`}>
                        ✓ {product.name}
                      </span>
                    );
                  }
                  const on = selected.has(product.id);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      className={`${styles.chip} ${on ? styles.chipOn : ""}`}
                      aria-pressed={on}
                      onClick={() => toggleProduct(product.id)}
                    >
                      {on ? "✓ " : "+ "}
                      {product.name}
                    </button>
                  );
                })}
                {template.products.length === 0 && <span className="muted">Bu şablonda ürün yok.</span>}
              </div>
            )}
          </div>
        );
      })}

      {addMutation.isError && <p className="error-text">Eklenemedi, tekrar dene.</p>}

      <div className={styles.footer}>
        <button
          type="button"
          className={`btn btn-primary btn-block ${styles.pill}`}
          disabled={selected.size === 0 || addMutation.isPending}
          onClick={() => addMutation.mutate()}
        >
          {addMutation.isPending
            ? "Ekleniyor..."
            : selected.size === 0
              ? "Ürün seç"
              : newCategoryCount > 0
                ? `${selected.size} ürünü ekle (${newCategoryCount} yeni kategori)`
                : `${selected.size} ürünü ekle`}
        </button>
      </div>
    </div>
  );
}
