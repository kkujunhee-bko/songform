-- worship_form_songs: 악보 위에 직접 배치하는 송폼 요소(마커) 목록
-- [{ uid, page, x, y, id, name, color, repeat }]  (page: 악보 장 인덱스, x/y: 슬라이드 기준 0~1 비율, 요소 중심점)
ALTER TABLE worship_form_songs ADD COLUMN IF NOT EXISTS sheet_flow_marks JSONB;
