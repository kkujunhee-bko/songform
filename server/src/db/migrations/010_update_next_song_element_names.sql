-- 다음곡 연결 요소: 긴 한국어 이름 → 짧은 코드명으로 변경
-- name_ko에 기존 한국어 설명 보존

UPDATE song_form_elements
SET name = 'Ne-V', name_ko = COALESCE(NULLIF(name_ko, ''), '다음곡 절 연결')
WHERE name = '다음곡 절 연결' AND is_active = TRUE;

UPDATE song_form_elements
SET name = 'Ne-C', name_ko = COALESCE(NULLIF(name_ko, ''), '다음곡 후렴 연결')
WHERE name = '다음곡 후렴 연결' AND is_active = TRUE;

UPDATE song_form_elements
SET name = 'Ne-I', name_ko = COALESCE(NULLIF(name_ko, ''), '다음곡 전주 연결')
WHERE name = '다음곡 전주 연결' AND is_active = TRUE;
