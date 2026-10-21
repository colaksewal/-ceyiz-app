-- Set kartında gösterilen görsel. Dosya diskte (uploads), burada sadece "/uploads/xxx.jpg" yolu durur.
ALTER TABLE set_templates ADD COLUMN image_url VARCHAR(500);
