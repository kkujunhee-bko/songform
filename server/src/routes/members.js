const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/members — 인도자 선택용 활성 회원 목록 (일반 회원도 접근 가능)
router.get('/', asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT id, name FROM users WHERE is_active = true ORDER BY name ASC'
  );
  res.json(result.rows);
}));

module.exports = router;
