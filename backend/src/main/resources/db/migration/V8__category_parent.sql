-- Alt kategori: tek seviye (üst kategori ya da üst kategorisi olmayan). Üst kategori silinince
-- alt kategorileri ve onların ürünleri de silinir.
ALTER TABLE categories
    ADD COLUMN parent_id UUID REFERENCES categories(id) ON DELETE CASCADE;

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
