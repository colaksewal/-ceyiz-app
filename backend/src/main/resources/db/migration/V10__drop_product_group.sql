-- V9'da eklenen product_group sütunu kullanılmaktan vazgeçildi: Mutfak grupları artık AI'nın
-- oluşturduğu alt kategoriler (bkz. CategoryOrganizeService). V9 bir ortamda zaten çalışmış olabilir,
-- bu yüzden dosyası silinmedi; sütun burada düşürülür.
ALTER TABLE products DROP COLUMN IF EXISTS product_group;
