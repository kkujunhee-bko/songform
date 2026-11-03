-- 회원 노출 순서 (관리자 회원 관리에서 드래그로 변경)
ALTER TABLE users ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 최초 1회만 기존 정렬(구분 → 가입일) 기준으로 초기 순서 부여
UPDATE users u
SET sort_order = r.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY role DESC, created_at ASC, id ASC) AS rn
  FROM users
) r
WHERE u.id = r.id
  AND NOT EXISTS (SELECT 1 FROM users WHERE sort_order <> 0);
