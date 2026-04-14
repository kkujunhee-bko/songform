-- worship_form_songs 테이블에 악보 URL 컬럼 추가
-- (songs 테이블의 sheet_music_url은 곡 전체 공유, 이 컬럼은 예배별 개별 악보)
ALTER TABLE worship_form_songs ADD COLUMN IF NOT EXISTS sheet_music_url TEXT;
