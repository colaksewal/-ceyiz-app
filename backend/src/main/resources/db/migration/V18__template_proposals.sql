-- Şablonlarda alt kategori: bir kategori şablonu başka bir (üst) kategori şablonunun altında olabilir (tek seviye).
-- Üst şablon silinince alt şablonları ve ürünleri de silinir.
ALTER TABLE category_templates
    ADD COLUMN parent_id UUID REFERENCES category_templates(id) ON DELETE CASCADE;

CREATE INDEX idx_category_templates_parent_id ON category_templates(parent_id);

-- Kullanıcının "listemi şablon olarak öner" ile gönderdiği öneriler. Liste, gönderildiği andaki halinin kopyası
-- (content, JSON) olarak saklanır; sonradan liste değişse de öneri değişmez. Admin inceleyip düzenleyerek
-- yayınlar (ortak şablonlara eklenir) ya da reddeder.
CREATE TABLE template_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    note TEXT,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PUBLISHED', 'REJECTED')),
    admin_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_template_proposals_status ON template_proposals(status);
CREATE INDEX idx_template_proposals_submitted_by ON template_proposals(submitted_by);
