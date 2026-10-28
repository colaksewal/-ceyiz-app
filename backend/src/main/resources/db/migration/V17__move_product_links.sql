-- Link ürüne değil fiyat notuna ait (mağaza/ödeme planı başına ürün sayfası). Ürün düzeyindeki linkler fiyat
-- notlarına taşınır ve ürünün kendi linki kaldırılır.
--  1) Linki olmayan fiyat notları ürünün linkini alır.
UPDATE price_entries pe
SET url = p.url
FROM products p
WHERE pe.product_id = p.id AND p.url IS NOT NULL AND pe.url IS NULL;

--  2) Hiç fiyat notu olmayan ürünün linki kaybolmasın: fiyatsız bir not olarak eklenir.
INSERT INTO price_entries (product_id, store_name, price_type, payment_plan_note, url, visited_at, is_preferred)
SELECT p.id, 'Ürün linki', 'PESIN', 'Ürün linki', p.url, now(), false
FROM products p
WHERE p.url IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM price_entries pe WHERE pe.product_id = p.id);

--  3) Ürünün kendi linki temizlenir (sütun kalır, artık kullanılmıyor).
UPDATE products SET url = NULL WHERE url IS NOT NULL;
