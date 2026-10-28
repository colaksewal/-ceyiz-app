-- Mutfak alt kategorileri 8'den 4 standart gruba indi (bkz. KitchenGroups.java):
-- Pişirme, Küçük Ev Aletleri, Sofra Ürünleri, Mutfak Gereçleri. V11'den kalan 8'li gruplar ile
-- eski AI kategorileri bu 4'e birleştirilir. Ürünler hiçbir zaman silinmez: kategori silinince
-- ürünler CASCADE ile gideceği için ürünler her zaman SİLMEDEN ÖNCE taşınır.
--
-- Eşleme (her "Mutfak" üst kategorisi için):
--   Pişirme                                              -> Pişirme
--   Küçük Ev Aletleri, Beyaz Eşya & Küçük Ev Aletleri    -> Küçük Ev Aletleri
--   Sofra & Servis, Servis, Bardaklar, Çay & Kahve       -> Sofra Ürünleri
--   Hazırlık Gereçleri, Saklama & Düzen, Saklama,
--   Mutfak Tekstili, Temizlik, Mutfak Eşyaları           -> Mutfak Gereçleri
--   Diğer her şey (ör. Diğer)                            -> ürünleri üst kategoriye (kategorisiz)
-- Aynı hedefe düşen kategoriler tek kategoride birleşir.
DO $$
DECLARE
    kitchen RECORD;
    child RECORD;
    target_name TEXT;
    canonical_id UUID;
BEGIN
    FOR kitchen IN
        SELECT id FROM categories WHERE parent_id IS NULL AND lower(btrim(name)) = 'mutfak'
    LOOP
        FOR child IN
            SELECT id, name FROM categories WHERE parent_id = kitchen.id ORDER BY id
        LOOP
            target_name := CASE lower(btrim(child.name))
                WHEN 'pişirme' THEN 'Pişirme'
                WHEN 'küçük ev aletleri' THEN 'Küçük Ev Aletleri'
                WHEN 'beyaz eşya & küçük ev aletleri' THEN 'Küçük Ev Aletleri'
                WHEN 'sofra ürünleri' THEN 'Sofra Ürünleri'
                WHEN 'sofra & servis' THEN 'Sofra Ürünleri'
                WHEN 'servis' THEN 'Sofra Ürünleri'
                WHEN 'bardaklar' THEN 'Sofra Ürünleri'
                WHEN 'çay & kahve' THEN 'Sofra Ürünleri'
                WHEN 'mutfak gereçleri' THEN 'Mutfak Gereçleri'
                WHEN 'hazırlık gereçleri' THEN 'Mutfak Gereçleri'
                WHEN 'saklama & düzen' THEN 'Mutfak Gereçleri'
                WHEN 'saklama' THEN 'Mutfak Gereçleri'
                WHEN 'mutfak tekstili' THEN 'Mutfak Gereçleri'
                WHEN 'temizlik' THEN 'Mutfak Gereçleri'
                WHEN 'mutfak eşyaları' THEN 'Mutfak Gereçleri'
                ELSE NULL
            END;

            IF target_name IS NULL THEN
                -- Eşlenemeyen: ürünler üst kategoriye, sonra alt kategori silinir.
                UPDATE products SET category_id = kitchen.id WHERE category_id = child.id;
                DELETE FROM categories WHERE id = child.id;
            ELSE
                SELECT id INTO canonical_id FROM categories
                WHERE parent_id = kitchen.id AND name = target_name
                ORDER BY id LIMIT 1;

                IF canonical_id IS NULL THEN
                    -- Standart yazımlı kategori henüz yok: bu kategori standart ada çevrilir.
                    UPDATE categories SET name = target_name WHERE id = child.id;
                ELSIF canonical_id <> child.id THEN
                    UPDATE products SET category_id = canonical_id WHERE category_id = child.id;
                    DELETE FROM categories WHERE id = child.id;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END $$;
