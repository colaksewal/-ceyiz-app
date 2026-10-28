-- Fiyat notuna link: aynı ürünün her mağaza/ödeme planı (taksit, peşin) için ayrı ürün sayfası olabilir.
ALTER TABLE price_entries ADD COLUMN url TEXT;
