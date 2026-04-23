-- ============================================================
-- SONG FORM PRESET CATEGORIES (송폼 프리셋 구분)
-- ============================================================
CREATE TABLE IF NOT EXISTS song_form_preset_categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO song_form_preset_categories (name, sort_order) VALUES
  ('선택1', 0),
  ('선택2', 1),
  ('선택3', 2)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SONG FORM PRESETS (송폼 프리셋)
-- ============================================================
CREATE TABLE IF NOT EXISTS song_form_presets (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  category_id INTEGER REFERENCES song_form_preset_categories(id) ON DELETE SET NULL,
  form_flow   JSONB NOT NULL DEFAULT '[]',
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
