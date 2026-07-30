ALTER TABLE worship_forms ADD COLUMN IF NOT EXISTS share_token UUID;
CREATE UNIQUE INDEX IF NOT EXISTS idx_worship_forms_share_token ON worship_forms(share_token) WHERE share_token IS NOT NULL;
