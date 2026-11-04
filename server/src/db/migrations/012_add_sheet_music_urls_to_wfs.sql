-- worship_form_songs: 한 곡에 여러 장의 악보를 등록할 수 있도록 URL 배열 컬럼 추가
-- (sheet_music_url 은 첫 번째 악보로 유지하여 기존 조회/검색과 호환)
ALTER TABLE worship_form_songs ADD COLUMN IF NOT EXISTS sheet_music_urls JSONB;
