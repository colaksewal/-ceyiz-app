CREATE TABLE users (
                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                       email VARCHAR(255) NOT NULL UNIQUE,
                       password_hash VARCHAR(255) NOT NULL,
                       name VARCHAR(255) NOT NULL,
                       created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lists (
                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                       owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                       name VARCHAR(255) NOT NULL,
                       wedding_date DATE,
                       created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE list_shares (
                             id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                             list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
                             user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                             role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER')),
                             UNIQUE (list_id, user_id)
);

CREATE TABLE categories (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
                            name VARCHAR(255) NOT NULL
);

CREATE TABLE products (
                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                          name VARCHAR(255) NOT NULL,
                          status VARCHAR(20) NOT NULL DEFAULT 'PLANNED'
                              CHECK (status IN ('PLANNED', 'PURCHASED', 'SKIPPED'))
);
CREATE TABLE price_entries (
                               id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                               product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                               store_name VARCHAR(255) NOT NULL,
                               price_type VARCHAR(30) NOT NULL
                                   CHECK (price_type IN ('PESIN', 'TAKSITLI', 'ELDEN_KREDI_KARTI')),
                               cash_price NUMERIC(12, 2),
                               installment_count INT,
                               installment_amount NUMERIC(12, 2),
                               payment_plan_note TEXT,
                               photo_url VARCHAR(500),
                               visited_at TIMESTAMPTZ,
                               is_preferred BOOLEAN NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX uq_price_entries_one_preferred_per_product
    ON price_entries (product_id)
    WHERE is_preferred = true;

CREATE TABLE product_sets (
                              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                              list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
                              name VARCHAR(255) NOT NULL,
                              store_name VARCHAR(255),
                              set_price NUMERIC(12, 2) NOT NULL
);

CREATE TABLE set_items (
                           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                           set_id UUID NOT NULL REFERENCES product_sets(id) ON DELETE CASCADE,
                           product_id UUID REFERENCES products(id) ON DELETE SET NULL,
                           item_name VARCHAR(255) NOT NULL,
                           quantity INT NOT NULL DEFAULT 1,
                           estimated_individual_price NUMERIC(12, 2)
);

CREATE INDEX idx_lists_owner_id ON lists(owner_id);
CREATE INDEX idx_list_shares_user_id ON list_shares(user_id);
CREATE INDEX idx_categories_list_id ON categories(list_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_price_entries_product_id ON price_entries(product_id);
CREATE INDEX idx_set_items_set_id ON set_items(set_id);
