const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/members?role= — 인도자 선택용 활성 회원 목록 (일반 회원도 접근 가능)
router.get('/', asyncHandler(async (req, res) => {
  const { role } = req.query;
  const params = [];
  let sql = 'SELECT id, name FROM users WHERE is_active = true';
  if (role) {
    sql += ' AND role = $1';
    params.push(role);
  }
  const result = await query(sql + ' ORDER BY sort_order ASC, id ASC', params);
  res.json(result.rows);
}));

module.exports = router;
