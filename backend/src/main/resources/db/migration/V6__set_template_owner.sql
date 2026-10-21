-- Setleri artık herkes oluşturabiliyor. Kullanıcının seti sadece kendisine görünür, adminin
-- setleri herkese. Şimdiye kadarki setlerin hepsini admin girdi (created_by_admin = TRUE).
-- Admin hesabı silinse bile ortak setler kaybolmasın diye SET NULL.
ALTER TABLE set_templates ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE set_templates ADD COLUMN created_by_admin BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX idx_set_templates_created_by ON set_templates(created_by);
