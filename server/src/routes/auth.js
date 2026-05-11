const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth, JWT_SECRET } = require('../middleware/authMiddleware');
const { sendPasswordResetEmail } = require('../utils/mailer');

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

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
    phone: user.phone || null, role: user.role, theme: user.theme,
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

// PATCH /api/auth/profile  — 휴대폰번호 또는 비밀번호 수정 (로그인 필요)
router.patch('/profile', requireAuth, asyncHandler(async (req, res) => {
  const { phone, currentPassword, newPassword } = req.body;

  const result = await query(
    'SELECT * FROM users WHERE id = $1 AND is_active = true',
    [req.user.id]
  );
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });

  const updates = [];
  const values = [];

  if (phone !== undefined) {
    updates.push(`phone = $${values.length + 1}`);
    values.push(phone.trim() || null);
  }

  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: '현재 비밀번호를 입력해주세요.' });
    }
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: '새 비밀번호는 4자 이상이어야 합니다.' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    updates.push(`password_hash = $${values.length + 1}`);
    values.push(hash);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: '수정할 내용이 없습니다.' });
  }

  updates.push(`updated_at = NOW()`);
  values.push(req.user.id);

  await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}`,
    values
  );

  const updated = await query(
    'SELECT id, name, email, phone, role, theme FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json({ user: updated.rows[0] });
}));

// POST /api/auth/forgot-password  — 임시 비밀번호 발송 (공개)
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: '이름과 이메일을 입력해주세요.' });
  }

  const result = await query(
    'SELECT * FROM users WHERE email = $1 AND name = $2 AND is_active = true',
    [email.trim(), name.trim()]
  );
  const user = result.rows[0];

  // 계정이 없어도 동일한 응답 (보안상 존재 여부 노출 방지)
  if (!user) {
    return res.json({ message: '입력하신 정보와 일치하는 계정이 있을 경우 임시 비밀번호를 발송합니다.' });
  }

  const tempPassword = generateTempPassword();
  const hash = await bcrypt.hash(tempPassword, 10);

  await query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [hash, user.id]
  );

  await sendPasswordResetEmail({
    toEmail: user.email,
    toName: user.name,
    newPassword: tempPassword,
  });

  res.json({ message: '임시 비밀번호를 이메일로 발송했습니다. 로그인 후 비밀번호를 변경해 주세요.' });
}));

module.exports = router;
