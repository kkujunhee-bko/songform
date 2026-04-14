const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth, JWT_SECRET } = require('../middleware/authMiddleware');

const JWT_EXPIRES = '7d';

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }

  const result = await query(
    'SELECT * FROM users WHERE email = $1 AND is_active = true',
    [email.trim()]
  );
  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  const payload = {
    id: user.id, email: user.email, name: user.name,
    role: user.role, theme: user.theme,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

  res.json({ token, user: payload });
}));

// GET /api/auth/me
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT id, name, email, phone, role, theme FROM users WHERE id = $1 AND is_active = true',
    [req.user.id]
  );
  if (!result.rows[0]) {
    return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
  }
  res.json(result.rows[0]);
}));

// PATCH /api/auth/theme  — 테마 저장 (로그인 유지 중)
router.patch('/theme', requireAuth, asyncHandler(async (req, res) => {
  const { theme } = req.body;
  if (!['dark', 'light'].includes(theme)) {
    return res.status(400).json({ error: '잘못된 테마 값입니다.' });
  }
  await query(
    'UPDATE users SET theme = $1, updated_at = NOW() WHERE id = $2',
    [theme, req.user.id]
  );
  res.json({ theme });
}));

module.exports = router;
