CREATE TABLE set_templates(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255) ,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE set_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_template_id UUID NOT NULL REFERENCES set_templates(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    estimated_individual_price NUMERIC(12, 2),
    note TEXT
);

CREATE INDEX idx_set_template_items_set_template_id ON set_template_items(set_template_id);

CREATE TABLE set_template_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_template_id UUID NOT NULL REFERENCES set_templates(id) ON DELETE CASCADE,
    store_name VARCHAR(255),
    price_type VARCHAR(30) NOT NULL
        CHECK (price_type IN ('PESIN', 'TAKSITLI', 'ELDEN_KREDI_KARTI')),
    cash_price NUMERIC(12, 2),
    installment_count INT CHECK (installment_count > 0),
    installment_amount NUMERIC(12, 2),
    payment_plan_note TEXT,
    display_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_set_template_prices_set_template_id ON set_template_prices(set_template_id);