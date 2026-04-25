-- 곡별 연주 정보 컬럼 추가
ALTER TABLE worship_form_songs
  ADD COLUMN IF NOT EXISTS bpm                INTEGER,
  ADD COLUMN IF NOT EXISTS keyboard1_sound_no  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS keyboard1_sound_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS keyboard2_sound_no  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS keyboard2_sound_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS play_style          VARCHAR(100);
