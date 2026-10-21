-- Parça fiyatının anlamı değişiyor: artık "1 adedin fiyatı" değil, o ürünün setten ayrı
-- alınırsa TAMAMININ fiyatı (ör. "Düz tabak × 12" → 12'li düz tabak takımı ayrıca 1.500 TL).
-- Var olan kayıtlar adet başı girildiği için adetle çarpılarak yeni anlama taşınıyor.
ALTER TABLE set_template_items RENAME COLUMN estimated_individual_price TO estimated_separate_price;

UPDATE set_template_items
SET estimated_separate_price = estimated_separate_price * quantity
WHERE estimated_separate_price IS NOT NULL;
