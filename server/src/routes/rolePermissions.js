const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAdmin } = require('../middleware/authMiddleware');

// GET /api/role-permissions/my — 현재 유저 역할의 권한 (모든 로그인 유저 접근 가능)
router.get('/my', asyncHandler(async (req, res) => {
  const { role } = req.user;
  if (role === 'admin') {
    // admin은 모든 권한 보유 — 빈 배열 반환 (프론트에서 admin 여부로 판단)
    return res.json({ role: 'admin', permissions: [] });
  }
  const result = await query(
    `SELECT menu_key, can_read, can_create, can_edit, can_delete
     FROM role_permissions WHERE role = $1`,
    [role]
  );
  res.json({ role, permissions: result.rows });
}));

// 이하 관리자 전용
router.use(requireAdmin);

// GET /api/role-permissions — 전체 역할별 권한 목록
router.get('/', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT role, menu_key, can_read, can_create, can_edit, can_delete
     FROM role_permissions ORDER BY role, menu_key`
  );
  res.json(result.rows);
}));

// PUT /api/role-permissions — 전체 일괄 저장 (upsert)
router.put('/', asyncHandler(async (req, res) => {
  const { permissions } = req.body;
  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: '권한 데이터가 없습니다.' });
  }

  for (const p of permissions) {
    await query(
      `INSERT INTO role_permissions (role, menu_key, can_read, can_create, can_edit, can_delete, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (role, menu_key) DO UPDATE SET
         can_read   = EXCLUDED.can_read,
         can_create = EXCLUDED.can_create,
         can_edit   = EXCLUDED.can_edit,
         can_delete = EXCLUDED.can_delete,
         updated_at = NOW()`,
      [p.role, p.menu_key, !!p.can_read, !!p.can_create, !!p.can_edit, !!p.can_delete]
    );
  }

  res.json({ success: true });
}));

module.exports = router;
