import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategoryTemplate,
  createProductTemplate,
  deleteCategoryTemplate,
  deleteProductTemplate,
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

  const existingNames = new Set(categories?.map((c) => normalize(c.name)));
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
          {categories && <span className="badge badge-neutral">{categories.length}</span>}
        </div>

        {isLoading && <p className="muted">Yükleniyor...</p>}
        {error && <p className="error-text">Şablonlar yüklenemedi</p>}

        {categories && (
          <div className={styles.grid}>
            {categories.map((category) => (
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
                  {category.products.length === 0 ? "Ürün yok" : `${category.products.length} ürün`}
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
                <span className="muted">{openCategory.products.length} ürün</span>
              </div>
            </div>
          )
        }
      >
        {openCategory && (
          <CategoryDetail
            key={openCategory.id}
            category={openCategory}
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

function CategoryDetail({
  category,
  onChanged,
  onDeleted,
}: {
  category: CategoryTemplate;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [productName, setProductName] = useState("");

  const createProductMutation = useMutation({
    mutationFn: () => createProductTemplate(category.id, productName.trim(), category.products.length + 1),
    onSuccess: () => {
      onChanged();
      setProductName("");
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (productTemplateId: string) => deleteProductTemplate(productTemplateId),
    onSuccess: onChanged,
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: () => deleteCategoryTemplate(category.id),
    onSuccess: onDeleted,
  });

  function handleDeleteCategory() {
    const message =
      category.products.length > 0
        ? `"${category.name}" kategorisi ve içindeki ${category.products.length} ürün silinecek. Emin misin?`
        : `"${category.name}" kategorisi silinecek. Emin misin?`;
    if (window.confirm(message)) deleteCategoryMutation.mutate();
  }

  return (
    <div className={styles.detail}>
      <div className={styles.chips}>
        {category.products.map((product) => (
          <span key={product.id} className={styles.chip}>
            {product.name}
            <button
              type="button"
              className={styles.chipRemove}
              aria-label={`${product.name} sil`}
              disabled={deleteProductMutation.isPending && deleteProductMutation.variables === product.id}
              onClick={() => deleteProductMutation.mutate(product.id)}
            >
              ✕
            </button>
          </span>
        ))}
        {category.products.length === 0 && (
          <p className="muted">Henüz ürün yok. Aşağıdan elle ekle ya da AI'dan öneri al.</p>
        )}
      </div>

      <form
        className={styles.addRow}
        onSubmit={(e) => {
          e.preventDefault();
          if (productName.trim()) createProductMutation.mutate();
        }}
      >
        <input
          type="text"
          placeholder="Ürün ekle, ör. Tencere Seti"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!productName.trim() || createProductMutation.isPending}
        >
          {createProductMutation.isPending ? "..." : "Ekle"}
        </button>
      </form>
      {createProductMutation.isError && <p className="error-text">Ürün eklenemedi.</p>}

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
