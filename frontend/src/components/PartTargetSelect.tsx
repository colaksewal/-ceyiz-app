import type { SetPlacementPreview } from "../types";
import styles from "./PartTargetSelect.module.scss";

const SKIP = "skip";
const NEW_PRODUCT = "__new__";

type PreviewCategory = SetPlacementPreview["categories"][number];

function byName(a: PreviewCategory, b: PreviewCategory): number {
  return a.name.localeCompare(b.name, "tr");
}

function categoryLabel(category: PreviewCategory): string {
  return category.isNew ? `${category.name} (yeni)` : category.name;
}

// Bir set parçasının hedefi üç kademeli seçilir: Kategori (ör. Mutfak) › Alan (ör. Pişirme) › Ürün.
// Ürün listesinin en sonunda "Yeni ekle" vardır: parça seçilen kategoride (parça adıyla) yeni ürün olur;
// listeden bir ürün seçilirse parçanın fiyatı ve linki o ürüne girer. Değer, sunucunun beklediği hedef
// anahtarıdır ("c:" / "n:" kategoride yeni ürün, "p:" mevcut ürün, "skip" listeye ekleme).
export default function PartTargetSelect({
  preview,
  value,
  onChange,
  newName,
  onNewNameChange,
}: {
  preview: SetPlacementPreview;
  value: string;
  onChange: (key: string) => void;
  // "Yeni ekle" seçiliyken açılacak yeni ürünün adı.
  newName: string;
  onNewNameChange: (name: string) => void;
}) {
  const categoriesByKey = new Map(preview.categories.map((category) => [category.key, category]));
  const productsByKey = new Map(preview.products.map((product) => [product.key, product]));

  // Mevcut değerden kademeleri çöz: ürünse bulunduğu kategoriden, kategoriyse kendisinden.
  let top: PreviewCategory | undefined;
  let sub: PreviewCategory | undefined;
  let productKey = NEW_PRODUCT;
  if (value !== SKIP) {
    const node = value.startsWith("p:")
      ? categoriesByKey.get(productsByKey.get(value)?.categoryKey ?? "")
      : categoriesByKey.get(value);
    if (value.startsWith("p:")) productKey = value;
    const parent = node?.parentKey ? categoriesByKey.get(node.parentKey) : undefined;
    if (parent) {
      top = parent;
      sub = node;
    } else {
      top = node;
    }
  }

  const tops = preview.categories.filter((c) => !c.parentKey || !categoriesByKey.has(c.parentKey)).sort(byName);
  const subs = top ? preview.categories.filter((c) => c.parentKey === top!.key).sort(byName) : [];
  const target = sub ?? top;
  const products = target
    ? preview.products.filter((p) => p.categoryKey === target.key).sort((a, b) => a.name.localeCompare(b.name, "tr"))
    : [];

  return (
    <div className={styles.targets}>
      <label className={styles.field}>
        <span>Kategori</span>
        <select
          aria-label="Kategori"
          value={value === SKIP ? SKIP : (top?.key ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          {!top && value !== SKIP && <option value="">Seç…</option>}
          {tops.map((category) => (
            <option key={category.key} value={category.key}>
              {categoryLabel(category)}
            </option>
          ))}
          <option value={SKIP}>Listeye ekleme (sadece sette kalsın)</option>
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
              {categoryLabel(category)}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Ürün</span>
        <select
          aria-label="Ürün"
          disabled={!target}
          value={productKey}
          onChange={(e) => target && onChange(e.target.value === NEW_PRODUCT ? target.key : e.target.value)}
        >
          {products.map((product) => (
            <option key={product.key} value={product.key}>
              {product.name}
            </option>
          ))}
          <option value={NEW_PRODUCT}>➕ Yeni ekle</option>
        </select>
      </label>

      {target && productKey === NEW_PRODUCT && (
        <label className={`${styles.field} ${styles.fullRow}`}>
          <span>Yeni ürün adı</span>
          <input
            type="text"
            aria-label="Yeni ürün adı"
            maxLength={255}
            placeholder="Ürünün adını yaz"
            value={newName}
            onChange={(e) => onNewNameChange(e.target.value)}
          />
        </label>
      )}
    </div>
  );
}
