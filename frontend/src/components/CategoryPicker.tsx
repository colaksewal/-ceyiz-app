import type { SetPlacementPreview } from "../types";
import styles from "./PartTargetSelect.module.scss";

type PreviewCategory = SetPlacementPreview["categories"][number];

function byName(a: PreviewCategory, b: PreviewCategory): number {
  return a.name.localeCompare(b.name, "tr");
}

function label(category: PreviewCategory): string {
  return category.isNew ? `${category.name} (yeni)` : category.name;
}

// Seti tek ürün olarak eklerken ürünün gireceği yer: Kategori (ör. Mutfak) › Alan (ör. Sofra Ürünleri).
// Değer, sunucunun beklediği kategori anahtarıdır ("c:" mevcut, "n:" eklenirken açılacak kategori).
export default function CategoryPicker({
  preview,
  value,
  onChange,
}: {
  preview: SetPlacementPreview;
  value: string;
  onChange: (key: string) => void;
}) {
  const byKey = new Map(preview.categories.map((category) => [category.key, category]));
  const node = byKey.get(value);
  const parent = node?.parentKey ? byKey.get(node.parentKey) : undefined;
  const top = parent ?? node;
  const sub = parent ? node : undefined;

  const tops = preview.categories.filter((c) => !c.parentKey || !byKey.has(c.parentKey)).sort(byName);
  const subs = top ? preview.categories.filter((c) => c.parentKey === top.key).sort(byName) : [];

  return (
    <div className={styles.targets} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))" }}>
      <label className={styles.field}>
        <span>Kategori</span>
        <select aria-label="Kategori" value={top?.key ?? ""} onChange={(e) => onChange(e.target.value)}>
          {!top && <option value="">Seç…</option>}
          {tops.map((category) => (
            <option key={category.key} value={category.key}>
              {label(category)}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Alan</span>
        <select
          aria-label="Alan"
          disabled={!top || subs.length === 0}
          value={sub?.key ?? ""}
          onChange={(e) => top && onChange(e.target.value || top.key)}
        >
          <option value="">{top && subs.length > 0 ? "Doğrudan bu kategoride" : "Alt alan yok"}</option>
          {subs.map((category) => (
            <option key={category.key} value={category.key}>
              {label(category)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
