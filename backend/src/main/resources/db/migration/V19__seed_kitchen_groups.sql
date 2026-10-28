-- Alt kategorileri artık admin belirler (şablonlardaki alt şablonlar). Mevcut Mutfak alt kategorileri (Pişirme,
-- Küçük Ev Aletleri, Sofra Ürünleri, Mutfak Gereçleri) Mutfak şablonunun alt şablonu olarak eklenir; böylece
-- kullanıcıların listelerindeki mevcut alt kategoriler ve AI sınıflandırması çalışmaya devam eder.
--  1) Mutfak üst şablonu yoksa oluşturulur (FROM'suz SELECT: koşul sağlanmazsa hiç satır üretmez).
INSERT INTO category_templates (name, display_order, parent_id)
SELECT 'Mutfak', (SELECT COALESCE(MAX(display_order), 0) + 1 FROM category_templates), NULL
WHERE NOT EXISTS (
    SELECT 1 FROM category_templates WHERE parent_id IS NULL AND lower(btrim(name)) = 'mutfak'
);

--  2) Alt şablonu olmayan Mutfak şablonuna 4 alt kategori eklenir (admin sonra değiştirebilir).
INSERT INTO category_templates (name, display_order, parent_id)
SELECT g.name, g.ord, p.id
FROM category_templates p
CROSS JOIN (VALUES ('Pişirme', 1), ('Küçük Ev Aletleri', 2), ('Sofra Ürünleri', 3), ('Mutfak Gereçleri', 4)) AS g(name, ord)
WHERE p.parent_id IS NULL
  AND lower(btrim(p.name)) = 'mutfak'
  AND NOT EXISTS (SELECT 1 FROM category_templates c WHERE c.parent_id = p.id);
