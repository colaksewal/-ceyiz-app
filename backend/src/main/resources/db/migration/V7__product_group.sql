-- Mutfak ürünlerinin standart alt grubu (Pişirme, Sofra & Servis...). NULL = gruplanmamış;
-- sınıflandırıcının eşleştiremediği ürünler kullanıcı tarafından elle atanır.
-- "group" SQL'de ayrılmış kelime olduğu için sütun adı product_group.
ALTER TABLE products ADD COLUMN product_group VARCHAR(100);
