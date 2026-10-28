-- Katalog setini kullanıcının listesine ekleme: liste setinin hangi katalog setinden geldiği ve
-- seçilen fiyatın tipi tutulur ki özet/ödeme planı set fiyatını (taksit dahil) bir kez sayabilsin.
-- Katalog seti silinirse liste seti kalır (SET NULL). Aynı katalog seti bir listeye bir kez eklenir.
ALTER TABLE product_sets
    ADD COLUMN set_template_id UUID REFERENCES set_templates(id) ON DELETE SET NULL,
    ADD COLUMN price_type VARCHAR(30)
        CHECK (price_type IN ('PESIN', 'TAKSITLI', 'ELDEN_KREDI_KARTI')),
    ADD COLUMN installment_count INT CHECK (installment_count > 0),
    ADD COLUMN installment_amount NUMERIC(12, 2);

CREATE UNIQUE INDEX uq_product_sets_list_template
    ON product_sets (list_id, set_template_id)
    WHERE set_template_id IS NOT NULL;
