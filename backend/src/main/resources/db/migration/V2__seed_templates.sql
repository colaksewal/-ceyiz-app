ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE category_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    display_order INT NOT NULL DEFAULT 0
);

CREATE TABLE product_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_template_id UUID NOT NULL REFERENCES category_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    display_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_product_templates_category_template_id ON product_templates(category_template_id);
