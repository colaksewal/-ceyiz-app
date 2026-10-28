import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategoryTemplate,
  createProductTemplate,
  deleteCategoryTemplate,
  deleteProductTemplate,
  moveProductTemplate,
} from "../api/adminTemplates";
import { getAllTemplates } from "../api/templates";
import CategoryAiSuggest from "../components/CategoryAiSuggest";
import Sheet from "../components/Sheet";
import { pickCategoryEmoji, pickTileColor } from "../lib/listAccent";
import { isJobActive, useAiJobStore, type TrackedAiJob } from "../store/aiJobStore";
import { useAuthStore } from "../store/authStore";
import type { CategoryTemplate } from "../types";
import styles from "./AdminTemplatesPage.module.scss";

// Admin'in tek dokunuşla ekleyebileceği hazır oda/kategori adları. Zaten eklenmiş olanlar
// listede gösterilmez.
const PRESET_CATEGORIES = [
  "Mutfak",
  "Banyo",
  "Yatak Odası",
  "Salon",
  "Yemek Odası",
  "Çocuk Odası",
  "Antre",
  "Balkon",
  "Beyaz Eşya",
  "Elektronik",
  "Ev Tekstili",
  "Temizlik",
];

function normalize(name: string): string {
  return name.trim().toLocaleLowerCase("tr");
}

// Kutunun rengi CSS'e değişken olarak verilir; tonlar SCSS'te color-mix ile türetilir.
function tileStyle(color: string): CSSProperties {
  return { "--tile": color } as CSSProperties;
}

// Şablon kategorisindeki AI isteğinin anahtarı; sayfaya dönünce o kategorinin penceresi açılır.
const TEMPLATE_JOB_PREFIX = "template:";

function templateJobCategoryId(jobs: Record<string, TrackedAiJob>, finishedOnly: boolean): string | null {
  const job = Object.values(jobs).find(
    (j) => j.key.startsWith(TEMPLATE_JOB_PREFIX) && (!finishedOnly || !isJobActive(j))
  );
  return job ? job.key.slice(TEMPLATE_JOB_PREFIX.length) : null;
}

export default function AdminTemplatesPage() {
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(() =>
    templateJobCategoryId(useAiJobStore.getState().jobs, false)
  );
  // Pencere kapalıyken öneri hazır olursa o kategorinin penceresi açılır.
  const finishedJobCategoryId = useAiJobStore((state) => templateJobCategoryId(state.jobs, true));
  useEffect(() => {
    if (finishedJobCategoryId) setOpenId(finishedJobCategoryId);
  }, [finishedJobCategoryId]);
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ["adminTemplates"],
    queryFn: getAllTemplates,
    enabled: isAdmin,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["adminTemplates"] });
  }, [queryClient]);

  const closeSheet = useCallback(() => setOpenId(null), []);

  const addPresetsMutation = useMutation({
    mutationFn: async (names: string[]) => {
      const start = categories?.length ?? 0;
      await Promise.all(names.map((name, i) => createCategoryTemplate(name, start + i + 1)));
    },
    onSuccess: () => {
      setSelectedPresets(new Set());
      invalidate();
    },
  });

  if (!isAdmin) {
    return <Navigate to="/lists" replace />;
  }

  // Alt kategori şablonları üst şablonun detayında gösterilir; kutular sadece üst şablonlar.
  const topLevel = categories?.filter((c) => !c.parentId) ?? [];
  const childrenOf = (id: string) => categories?.filter((c) => c.parentId === id) ?? [];
  const existingNames = new Set(topLevel.map((c) => normalize(c.name)));
  const missingPresets = PRESET_CATEGORIES.filter((p) => !existingNames.has(normalize(p)));
  const openCategory = categories?.find((c) => c.id === openId) ?? null;

  function togglePreset(name: string) {
    setSelectedPresets((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  return (
    <div>
      <div className={styles.hero}>
        <h1>Şablon Yönetimi</h1>
        <p className="muted">
          Buradaki kategori ve ürünler, kullanıcılar yeni bir liste oluşturduğunda o listeye
          şablon olarak sunulur.
        </p>
      </div>

      {categories && missingPresets.length > 0 && (
        <section className={`card ${styles.presetCard}`}>
          <div className={styles.sectionHeader}>
            <h2>Hazır oda şablonları</h2>
            <span className="muted">Eklemek istediklerini seç</span>
          </div>
          <div className={styles.presetGrid}>
            {missingPresets.map((name) => {
              const selected = selectedPresets.has(name);
              return (
                <button
                  key={name}
                  type="button"
                  className={`${styles.presetChip} ${selected ? styles.presetChipSelected : ""}`}
                  style={tileStyle(pickTileColor(name))}
                  aria-pressed={selected}
                  onClick={() => togglePreset(name)}
                >
                  <span className={styles.presetEmoji}>{pickCategoryEmoji(name, name)}</span>
                  <span>{name}</span>
                  <span className={styles.presetCheck} aria-hidden="true">
                    {selected ? "✓" : "+"}
                  </span>
                </button>
              );
            })}
          </div>
          {addPresetsMutation.isError && <p className="error-text">Eklenemedi, tekrar dene.</p>}
          <div className={styles.presetActions}>
            {selectedPresets.size > 0 && (
              <button type="button" className="btn btn-ghost" onClick={() => setSelectedPresets(new Set())}>
                Temizle
              </button>
            )}
            <button
              type="button"
              className={`btn btn-primary ${styles.funButton}`}
              disabled={selectedPresets.size === 0 || addPresetsMutation.isPending}
              onClick={() => addPresetsMutation.mutate(PRESET_CATEGORIES.filter((p) => selectedPresets.has(p)))}
            >
              {addPresetsMutation.isPending
                ? "Ekleniyor..."
                : selectedPresets.size > 0
                  ? `${selectedPresets.size} kategoriyi ekle`
                  : "Kategori seç"}
            </button>
          </div>
        </section>
      )}

      <section>
        <div className={styles.sectionHeader}>
          <h2>Kategoriler</h2>
          {categories && <span className="badge badge-neutral">{topLevel.length}</span>}
        </div>

        {isLoading && <p className="muted">Yükleniyor...</p>}
        {error && <p className="error-text">Şablonlar yüklenemedi</p>}

        {categories && (
          <div className={styles.grid}>
            {topLevel.map((category) => (
              <button
                key={category.id}
                type="button"
                className={styles.tile}
                style={tileStyle(pickTileColor(category.name))}
                onClick={() => setOpenId(category.id)}
              >
                <span className={styles.tileEmoji}>{pickCategoryEmoji(category.id, category.name)}</span>
                <span className={styles.tileName}>{category.name}</span>
                <span className={styles.tileCount}>
                  {(() => {
                    const total =
                      category.products.length + childrenOf(category.id).reduce((sum, c) => sum + c.products.length, 0);
                    return total === 0 ? "Ürün yok" : `${total} ürün`;
                  })()}
                </span>
              </button>
            ))}
            <NewCategoryTile nextOrder={categories.length + 1} onCreated={invalidate} />
          </div>
        )}
      </section>

      <Sheet
        open={openCategory !== null}
        onClose={closeSheet}
        title={
          openCategory && (
            <div className={styles.sheetTitle}>
              <span className={styles.sheetEmoji} style={tileStyle(pickTileColor(openCategory.name))}>
                {pickCategoryEmoji(openCategory.id, openCategory.name)}
              </span>
              <div>
                <h2>{openCategory.name}</h2>
                <span className="muted">
                  {openCategory.products.length + childrenOf(openCategory.id).reduce((sum, c) => sum + c.products.length, 0)} ürün
                </span>
              </div>
            </div>
          )
        }
      >
        {openCategory && (
          <CategoryDetail
            key={openCategory.id}
            category={openCategory}
            subTemplates={childrenOf(openCategory.id)}
            onChanged={invalidate}
            onDeleted={() => {
              setOpenId(null);
              invalidate();
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

function NewCategoryTile({ nextOrder, onCreated }: { nextOrder: number; onCreated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  const createMutation = useMutation({
    mutationFn: () => createCategoryTemplate(name.trim(), nextOrder),
    onSuccess: () => {
      onCreated();
      setName("");
      setEditing(false);
    },
  });

  if (!editing) {
    return (
      <button type="button" className={`${styles.tile} ${styles.newTile}`} onClick={() => setEditing(true)}>
        <span className={styles.tileEmoji}>＋</span>
        <span className={styles.tileName}>Yeni kategori</span>
      </button>
    );
  }

  return (
    <form
      className={`${styles.tile} ${styles.newTile} ${styles.newTileEditing}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) createMutation.mutate();
      }}
    >
      <input
        autoFocus
        type="text"
        placeholder="ör. Mutfak"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
      />
      {createMutation.isError && <span className="error-text">Eklenemedi</span>}
      <div className={styles.newTileActions}>
        <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
          Vazgeç
        </button>
        <button type="submit" className="btn btn-primary" disabled={!name.trim() || createMutation.isPending}>
          {createMutation.isPending ? "..." : "Ekle"}
        </button>
      </div>
    </form>
  );
}

// Bir kategori şablonunun ürünleri: her ürün silinebilir ya da aynı ailedeki başka bir (alt) kategoriye taşınabilir;
// altında ürün ekleme satırı var. Üst şablon ve alt şablonlar aynı bileşenle gösterilir.
function TemplateProducts({
  template,
  family,
  onChanged,
}: {
  template: CategoryTemplate;
  // Aynı ailenin tüm şablonları (üst + alt): taşıma hedefleri.
  family: CategoryTemplate[];
  onChanged: () => void;
}) {
  const [productName, setProductName] = useState("");

  const createMutation = useMutation({
    mutationFn: () => createProductTemplate(template.id, productName.trim(), template.products.length + 1),
    onSuccess: () => {
      onChanged();
      setProductName("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (productTemplateId: string) => deleteProductTemplate(productTemplateId),
    onSuccess: onChanged,
  });

  const moveMutation = useMutation({
    mutationFn: ({ productId, targetId }: { productId: string; targetId: string }) =>
      moveProductTemplate(productId, targetId),
    onSuccess: onChanged,
  });

  return (
    <div className={styles.templateProducts}>
      <div className={styles.chips}>
        {template.products.map((product) => (
          <span key={product.id} className={styles.chip}>
            {product.name}
            {family.length > 1 && (
              <select
                className={styles.chipMove}
                aria-label={`${product.name} kategorisini değiştir`}
                title="Başka kategoriye taşı"
                value={template.id}
                disabled={moveMutation.isPending}
                onChange={(e) => moveMutation.mutate({ productId: product.id, targetId: e.target.value })}
              >
                {family.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.parentId ? `↳ ${member.name}` : `${member.name} (genel)`}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              className={styles.chipRemove}
              aria-label={`${product.name} sil`}
              disabled={deleteMutation.isPending && deleteMutation.variables === product.id}
              onClick={() => deleteMutation.mutate(product.id)}
            >
              ✕
            </button>
          </span>
        ))}
        {template.products.length === 0 && <p className="muted">Bu kategoride henüz ürün yok.</p>}
      </div>

      <form
        className={styles.addRow}
        onSubmit={(e) => {
          e.preventDefault();
          if (productName.trim()) createMutation.mutate();
        }}
      >
        <input
          type="text"
          placeholder={`${template.name} için ürün ekle, ör. Tencere Seti`}
          aria-label={`${template.name} için ürün adı`}
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={!productName.trim() || createMutation.isPending}>
          {createMutation.isPending ? "..." : "Ekle"}
        </button>
      </form>
      {(createMutation.isError || moveMutation.isError) && (
        <p className="error-text">{createMutation.isError ? "Ürün eklenemedi." : "Ürün taşınamadı."}</p>
      )}
    </div>
  );
}

function CategoryDetail({
  category,
  subTemplates,
  onChanged,
  onDeleted,
}: {
  category: CategoryTemplate;
  // Bu şablonun alt kategori şablonları (ör. Mutfak > Pişirme).
  subTemplates: CategoryTemplate[];
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [subName, setSubName] = useState("");
  const family = [category, ...subTemplates];
  const totalProducts = family.reduce((sum, template) => sum + template.products.length, 0);

  const createSubMutation = useMutation({
    mutationFn: () => createCategoryTemplate(subName.trim(), subTemplates.length + 1, category.id),
    onSuccess: () => {
      onChanged();
      setSubName("");
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: () => deleteCategoryTemplate(category.id),
    onSuccess: onDeleted,
  });

  const deleteSubMutation = useMutation({
    mutationFn: (subId: string) => deleteCategoryTemplate(subId),
    onSuccess: onChanged,
  });

  function handleDeleteCategory() {
    const message =
      totalProducts > 0
        ? `"${category.name}" kategorisi${subTemplates.length > 0 ? ", alt kategorileri" : ""} ve içindeki ${totalProducts} ürün silinecek. Emin misin?`
        : `"${category.name}" kategorisi silinecek. Emin misin?`;
    if (window.confirm(message)) deleteCategoryMutation.mutate();
  }

  return (
    <div className={styles.detail}>
      <div>
        {subTemplates.length > 0 && <h4 className={styles.subHeading}>Genel (alt kategorisiz)</h4>}
        <TemplateProducts template={category} family={family} onChanged={onChanged} />
      </div>

      {subTemplates.map((sub) => (
        <div key={sub.id} className={styles.subBlock}>
          <h4 className={styles.subHeading}>
            ↳ {sub.name} <span className="muted">· {sub.products.length} ürün</span>
            <button
              type="button"
              className="btn btn-danger-ghost"
              title="Alt kategoriyi sil"
              disabled={deleteSubMutation.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `"${sub.name}" alt kategorisi ve içindeki ${sub.products.length} ürün silinecek. Emin misin?`
                  )
                ) {
                  deleteSubMutation.mutate(sub.id);
                }
              }}
            >
              🗑
            </button>
          </h4>
          <TemplateProducts template={sub} family={family} onChanged={onChanged} />
        </div>
      ))}
      {deleteSubMutation.isError && <p className="error-text">Alt kategori silinemedi.</p>}

      <form
        className={styles.addRow}
        onSubmit={(e) => {
          e.preventDefault();
          if (subName.trim()) createSubMutation.mutate();
        }}
      >
        <input
          type="text"
          placeholder="Alt kategori ekle, ör. Pişirme"
          aria-label="Alt kategori adı"
          value={subName}
          onChange={(e) => setSubName(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary" disabled={!subName.trim() || createSubMutation.isPending}>
          {createSubMutation.isPending ? "..." : "＋ Alt kategori"}
        </button>
      </form>
      {createSubMutation.isError && <p className="error-text">Alt kategori eklenemedi.</p>}

      <CategoryAiSuggest
        jobKey={`${TEMPLATE_JOB_PREFIX}${category.id}`}
        jobLabel={`${category.name} şablonu için ürün önerisi`}
        existingNames={category.products.map((p) => p.name)}
        onAddItems={async (items) => {
          const start = category.products.length;
          await Promise.all(items.map((item, i) => createProductTemplate(category.id, item, start + i + 1)));
          onChanged();
        }}
      />

      <div className={styles.dangerZone}>
        {deleteCategoryMutation.isError && <p className="error-text">Kategori silinemedi.</p>}
        <button
          type="button"
          className="btn btn-danger-ghost"
          disabled={deleteCategoryMutation.isPending}
          onClick={handleDeleteCategory}
        >
          🗑 Kategoriyi sil
        </button>
      </div>
    </div>
  );
}
