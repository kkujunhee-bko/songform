const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/worship-categories?denomination_id=
router.get('/', asyncHandler(async (req, res) => {
  const { denomination_id } = req.query;
  let sql = 'SELECT * FROM worship_categories';
  const params = [];
  if (denomination_id) {
    sql += ' WHERE denomination_id = $1 AND is_active = TRUE';
    params.push(denomination_id);
  } else {
    sql += ' WHERE is_active = TRUE';
  }
  sql += ' ORDER BY sort_order ASC, name ASC';
  const result = await query(sql, params);
  res.json(result.rows);
}));

// POST /api/worship-categories
router.post('/', asyncHandler(async (req, res) => {
  const { denomination_id, name, sort_order = 0 } = req.body;
  if (!denomination_id || !name) return res.status(400).json({ error: '교단과 카테고리명을 입력해주세요.' });
  const result = await query(
    'INSERT INTO worship_categories (denomination_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *',
    [denomination_id, name, sort_order]
  );
  res.status(201).json(result.rows[0]);
}));

// PUT /api/worship-categories/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, sort_order, is_active } = req.body;
  const result = await query(
    `UPDATE worship_categories
     SET name = COALESCE($1, name),
         sort_order = COALESCE($2, sort_order),
         is_active = COALESCE($3, is_active)
     WHERE id = $4 RETURNING *`,
    [name, sort_order, is_active, id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
  res.json(result.rows[0]);
}));

// DELETE /api/worship-categories/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await query('UPDATE worship_categories SET is_active = FALSE WHERE id = $1', [req.params.id]);
  res.json({ message: '삭제되었습니다.' });
}));

// POST /api/worship-categories/reorder
router.post('/reorder', asyncHandler(async (req, res) => {
  const { ids } = req.body; // ordered array of ids
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids 배열을 전달해주세요.' });
  for (let i = 0; i < ids.length; i++) {
    await query('UPDATE worship_categories SET sort_order = $1 WHERE id = $2', [i, ids[i]]);
  }
  res.json({ message: '순서가 업데이트되었습니다.' });
}));

module.exports = router;
