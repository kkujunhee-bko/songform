const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// 모든 /api/users 라우트는 admin 전용
router.use(requireAuth, requireAdmin);

// GET /api/users
router.get('/', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, name, email, phone, role, theme, is_active, created_at
     FROM users
     ORDER BY role DESC, created_at ASC`
  );
  res.json(result.rows);
}));

// POST /api/users
router.post('/', asyncHandler(async (req, res) => {
  const { name, email, phone, password, role = 'user' } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: '이름, 아이디(이메일), 비밀번호는 필수입니다.' });
  }

  const dup = await query('SELECT id FROM users WHERE email = $1', [email.trim()]);
  if (dup.rows.length > 0) {
    return res.status(400).json({ error: '이미 사용 중인 아이디(이메일)입니다.' });
  }

  const hash = await bcrypt.hash(password, 10);
  const result = await query(
    `INSERT INTO users (name, email, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, phone, role, theme, is_active, created_at`,
    [name, email.trim(), phone || null, hash, role]
  );
  res.status(201).json(result.rows[0]);
}));

// PUT /api/users/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, password, role, is_active } = req.body;

  if (String(id) === String(req.user.id) && is_active === false) {
    return res.status(400).json({ error: '자신의 계정을 비활성화할 수 없습니다.' });
  }

  const fields = [
    'name = $1', 'email = $2', 'phone = $3',
    'role = $4', 'is_active = $5', 'updated_at = NOW()',
  ];
  const params = [name, email.trim(), phone || null, role, is_active ?? true];

  if (password) {
    const hash = await bcrypt.hash(password, 10);
    fields.push(`password_hash = $${params.length + 1}`);
    params.push(hash);
  }

  params.push(id);
  const result = await query(
    `UPDATE users SET ${fields.join(', ')}
     WHERE id = $${params.length}
     RETURNING id, name, email, phone, role, theme, is_active, created_at`,
    params
  );

  if (!result.rows[0]) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  res.json(result.rows[0]);
}));

// DELETE /api/users/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (String(id) === String(req.user.id)) {
    return res.status(400).json({ error: '자신의 계정은 삭제할 수 없습니다.' });
  }
  await query('DELETE FROM users WHERE id = $1', [id]);
  res.json({ success: true });
}));

module.exports = router;
