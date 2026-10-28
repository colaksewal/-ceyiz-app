-- Mutfak'ın alt kategorilerini 8 standart gruba indirir (bkz. KitchenGroups.java). Eski AI
-- çalıştırmalarından kalan Servis, Saklama, Küçük Ev Aletleri, Bardaklar, Mutfak Eşyaları, Diğer
-- gibi kategoriler ile aynı adlı tekrarlar temizlenir. Ürünler hiçbir zaman silinmez: kategori
-- silinince ürünler CASCADE ile gideceği için ürünler her zaman SİLMEDEN ÖNCE taşınır.
--
-- Kurallar (her "Mutfak" üst kategorisi için):
--   * Standart ad (büyük/küçük harf farkı önemsiz): standart yazıma çevrilir; aynı adlı tekrar varsa
--     ürünler ilkine birleştirilir.
--   * Eski ad eşlemesi: Servis, Bardaklar -> Sofra & Servis; Küçük Ev Aletleri -> Beyaz Eşya & Küçük Ev
--     Aletleri; Saklama -> Saklama & Düzen.
--   * Diğer her şey: ürünleri üst kategoriye (kategorisiz) taşınır, alt kategori silinir. Kullanıcı elle
--     taşır ya da "AI ile alt kategorilere ayır"ı yeniden çalıştırır.
DO $$
DECLARE
    standard TEXT[] := ARRAY[
        'Pişirme', 'Hazırlık Gereçleri', 'Sofra & Servis', 'Çay & Kahve',
        'Beyaz Eşya & Küçük Ev Aletleri', 'Saklama & Düzen', 'Mutfak Tekstili', 'Temizlik'
    ];
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
                WHEN 'servis' THEN 'Sofra & Servis'
                WHEN 'bardaklar' THEN 'Sofra & Servis'
                WHEN 'küçük ev aletleri' THEN 'Beyaz Eşya & Küçük Ev Aletleri'
                WHEN 'saklama' THEN 'Saklama & Düzen'
                ELSE NULL
            END;

            IF target_name IS NULL THEN
                SELECT s INTO target_name FROM unnest(standard) AS s
                WHERE lower(s) = lower(btrim(child.name)) LIMIT 1;
            END IF;

            IF target_name IS NULL THEN
                -- Standart dışı: ürünler üst kategoriye, sonra alt kategori silinir.
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
