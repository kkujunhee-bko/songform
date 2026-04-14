const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/denominations
router.get('/', asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM denominations ORDER BY is_default DESC, name ASC');
  res.json(result.rows);
}));

// POST /api/denominations
router.post('/', asyncHandler(async (req, res) => {
  const { name, is_default = false } = req.body;
  if (!name) return res.status(400).json({ error: '교단명을 입력해주세요.' });

  if (is_default) {
    await query('UPDATE denominations SET is_default = FALSE WHERE is_default = TRUE');
  }
  const result = await query(
    'INSERT INTO denominations (name, is_default) VALUES ($1, $2) RETURNING *',
    [name, is_default]
  );
  res.status(201).json(result.rows[0]);
}));

// PUT /api/denominations/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, is_default } = req.body;

  if (is_default) {
    await query('UPDATE denominations SET is_default = FALSE WHERE is_default = TRUE AND id != $1', [id]);
  }
  const result = await query(
    'UPDATE denominations SET name = COALESCE($1, name), is_default = COALESCE($2, is_default) WHERE id = $3 RETURNING *',
    [name, is_default, id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: '교단을 찾을 수 없습니다.' });
  res.json(result.rows[0]);
}));

// PATCH /api/denominations/:id/set-default
router.patch('/:id/set-default', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query('UPDATE denominations SET is_default = FALSE');
  const result = await query('UPDATE denominations SET is_default = TRUE WHERE id = $1 RETURNING *', [id]);
  if (!result.rows[0]) return res.status(404).json({ error: '교단을 찾을 수 없습니다.' });

  // 앱 설정에도 저장
  await query(
    `INSERT INTO app_settings (key, value) VALUES ('default_denomination_id', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1`,
    [JSON.stringify(parseInt(id))]
  );
  res.json(result.rows[0]);
}));

// DELETE /api/denominations/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const check = await query('SELECT is_default FROM denominations WHERE id = $1', [id]);
  if (!check.rows[0]) return res.status(404).json({ error: '교단을 찾을 수 없습니다.' });
  if (check.rows[0].is_default) return res.status(400).json({ error: '기본 교단은 삭제할 수 없습니다.' });
  await query('DELETE FROM denominations WHERE id = $1', [id]);
  res.json({ message: '삭제되었습니다.' });
}));

module.exports = router;
