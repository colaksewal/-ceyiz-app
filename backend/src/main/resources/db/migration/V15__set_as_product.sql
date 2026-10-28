-- Set, listede tek bir ÜRÜN olarak eklenebilir ("Cam Bardak Seti"): ürün setin adı, linki ve fiyat notlarıyla
-- açılır, setin parçaları (adetleriyle) ürünün altında listelenir. Parçalar product_sets/set_items'ta durur;
-- ürün hangi sete ait olduğunu product_set_id ile bilir. as_product = true olan liste setleri özet ve ödeme
-- planında ayrıca sayılmaz (fiyat zaten ürünün fiyat notlarında).
ALTER TABLE product_sets ADD COLUMN as_product BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN product_set_id UUID REFERENCES product_sets(id) ON DELETE SET NULL;

CREATE INDEX idx_products_product_set_id ON products(product_set_id);
