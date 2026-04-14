-- Enable pg_trgm for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- DENOMINATIONS (교단)
-- ============================================================
CREATE TABLE IF NOT EXISTS denominations (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one default allowed
CREATE UNIQUE INDEX IF NOT EXISTS uq_denominations_default
  ON denominations (is_default)
  WHERE is_default = TRUE;

-- ============================================================
-- WORSHIP CATEGORIES (예배 카테고리)
-- ============================================================
CREATE TABLE IF NOT EXISTS worship_categories (
  id               SERIAL PRIMARY KEY,
  denomination_id  INTEGER NOT NULL REFERENCES denominations(id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  sort_order       SMALLINT NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (denomination_id, name)
);

-- ============================================================
-- SONG FORM ELEMENTS (송폼 요소)
-- ============================================================
CREATE TABLE IF NOT EXISTS song_form_elements (
  id               SERIAL PRIMARY KEY,
  denomination_id  INTEGER REFERENCES denominations(id) ON DELETE CASCADE,
  name             VARCHAR(50) NOT NULL,
  name_ko          VARCHAR(50),
  icon             VARCHAR(50) NOT NULL DEFAULT 'music',
  color            CHAR(7) NOT NULL DEFAULT '#6366F1',
  sort_order       SMALLINT NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- SONGS (노래)
-- ============================================================
CREATE TABLE IF NOT EXISTS songs (
  id               SERIAL PRIMARY KEY,
  title            VARCHAR(200) NOT NULL,
  artist           VARCHAR(200),
  default_key      VARCHAR(3),
  sheet_music_url  TEXT,
  sheet_music_data JSONB,
  source           VARCHAR(50) DEFAULT 'manual',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_songs_title_trgm ON songs USING GIN (title gin_trgm_ops);

-- ============================================================
-- WORSHIP FORMS (예배 송폼)
-- ============================================================
CREATE TABLE IF NOT EXISTS worship_forms (
  id                     SERIAL PRIMARY KEY,
  worship_date           DATE NOT NULL,
  denomination_id        INTEGER NOT NULL REFERENCES denominations(id),
  category_id            INTEGER NOT NULL REFERENCES worship_categories(id),
  liturgical_season_name VARCHAR(100),
  liturgical_season_color CHAR(7),
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worship_forms_date ON worship_forms (worship_date DESC);

-- ============================================================
-- WORSHIP FORM SONGS (예배 송폼 노래 목록)
-- ============================================================
CREATE TABLE IF NOT EXISTS worship_form_songs (
  id                   SERIAL PRIMARY KEY,
  form_id              INTEGER NOT NULL REFERENCES worship_forms(id) ON DELETE CASCADE,
  song_id              INTEGER REFERENCES songs(id) ON DELETE SET NULL,
  song_title           VARCHAR(200) NOT NULL,
  sort_order           SMALLINT NOT NULL DEFAULT 0,
  performance_key      VARCHAR(3) NOT NULL DEFAULT 'C',
  semitone_adjustment  SMALLINT NOT NULL DEFAULT 0,
  form_flow            JSONB NOT NULL DEFAULT '[]',
  sheet_music_snapshot JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worship_form_songs_form ON worship_form_songs (form_id, sort_order);

-- ============================================================
-- APP SETTINGS (앱 설정)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key    VARCHAR(100) PRIMARY KEY,
  value  JSONB NOT NULL
);
