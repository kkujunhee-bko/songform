-- ============================================================
-- SEED: Denominations (교단)
-- ============================================================
INSERT INTO denominations (name, is_default) VALUES
  ('한국 기독교 장로회', TRUE),
  ('대한예수교장로회(합동)', FALSE),
  ('대한예수교장로회(통합)', FALSE),
  ('기독교대한감리회', FALSE),
  ('기독교한국침례회', FALSE)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED: Worship Categories (예배 카테고리) - 한국 기독교 장로회 기준
-- ============================================================
INSERT INTO worship_categories (denomination_id, name, sort_order) VALUES
  (1, '주일 1부 예배', 1),
  (1, '주일 2부 예배', 2),
  (1, '주일 3부 예배', 3),
  (1, '주일 4부 예배', 4),
  (1, '주일 저녁 예배', 5),
  (1, '수요 예배', 6),
  (1, '금요 기도회', 7),
  (1, '새벽 기도회', 8),
  (1, '청년부 예배', 9),
  (1, '중고등부 예배', 10),
  (1, '어린이부 예배', 11),
  (1, '특별 예배', 12)
ON CONFLICT (denomination_id, name) DO NOTHING;

-- ============================================================
-- SEED: Song Form Elements (송폼 요소)
-- ============================================================
INSERT INTO song_form_elements (denomination_id, name, name_ko, icon, color, sort_order) VALUES
  (NULL, 'Intro',       '전주',           'play-circle',   '#6366F1', 1),
  (NULL, 'Verse',       '절/전개',         'book-open',     '#22C55E', 2),
  (NULL, 'Pre-Chorus',  '후렴 전 단계',    'chevrons-right','#F59E0B', 3),
  (NULL, 'Chorus',      '후렴/주제',       'star',          '#EF4444', 4),
  (NULL, 'Bridge',      '분위기 전환/연결', 'git-branch',    '#8B5CF6', 5),
  (NULL, 'Interlude',   '간주',           'pause-circle',  '#06B6D4', 6),
  (NULL, 'Outro',       '후주',           'stop-circle',   '#6B7280', 7),
  (NULL, 'Tag',         '태그/반복',       'repeat',        '#EC4899', 8),
  (NULL, 'Vamp',        '반복/연장',       'refresh-cw',    '#14B8A6', 9)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: App Settings (기본값 저장)
-- ============================================================
INSERT INTO app_settings (key, value) VALUES
  ('default_denomination_id', '1')
ON CONFLICT (key) DO NOTHING;
