ALTER TABLE worship_forms
  ADD COLUMN IF NOT EXISTS leader_ids INTEGER[] DEFAULT '{}';
