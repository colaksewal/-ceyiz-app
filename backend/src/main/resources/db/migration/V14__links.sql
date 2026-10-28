-- Set, set parçası ve listedeki ürün için ürün sayfası linki. Linkler çok uzun olabildiği için TEXT.
ALTER TABLE set_templates ADD COLUMN url TEXT;
ALTER TABLE set_template_items ADD COLUMN url TEXT;
ALTER TABLE products ADD COLUMN url TEXT;

-- Şimdiye kadar parça notlarına yapıştırılan linkler ayrı alana taşınır: nottaki ilk link url olur ve
-- nottan çıkarılır (nottaki başka bir link varsa notta kalır). Not boş kalırsa NULL olur.
UPDATE set_template_items
SET url = substring(note from 'https?://[^[:space:]]+'),
    note = NULLIF(btrim(regexp_replace(note, 'https?://[^[:space:]]+', '')), '')
WHERE note ~ 'https?://[^[:space:]]+';
