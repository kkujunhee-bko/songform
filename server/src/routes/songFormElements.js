const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/song-form-elements?denomination_id=
router.get('/', asyncHandler(async (req, res) => {
  const { denomination_id } = req.query;
  // 글로벌(denomination_id IS NULL) + 해당 교단 요소 모두 반환
  const result = await query(
    `SELECT * FROM song_form_elements
     WHERE is_active = TRUE AND (denomination_id IS NULL OR denomination_id = $1)
     ORDER BY sort_order ASC, name ASC`,
    [denomination_id || null]
  );
  res.json(result.rows);
}));

// POST /api/song-form-elements
router.post('/', asyncHandler(async (req, res) => {
  const { denomination_id = null, name, name_ko, icon = 'music', color = '#6366F1', sort_order = 0 } = req.body;
  if (!name) return res.status(400).json({ error: '요소명을 입력해주세요.' });
  const result = await query(
    'INSERT INTO song_form_elements (denomination_id, name, name_ko, icon, color, sort_order) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [denomination_id, name, name_ko, icon, color, sort_order]
  );
  res.status(201).json(result.rows[0]);
}));

// PUT /api/song-form-elements/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, name_ko, icon, color, sort_order, is_active } = req.body;
  const result = await query(
    `UPDATE song_form_elements
     SET name = COALESCE($1, name), name_ko = COALESCE($2, name_ko),
         icon = COALESCE($3, icon), color = COALESCE($4, color),
         sort_order = COALESCE($5, sort_order), is_active = COALESCE($6, is_active)
     WHERE id = $7 RETURNING *`,
    [name, name_ko, icon, color, sort_order, is_active, id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: '요소를 찾을 수 없습니다.' });
  res.json(result.rows[0]);
}));

// DELETE /api/song-form-elements/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await query('UPDATE song_form_elements SET is_active = FALSE WHERE id = $1', [req.params.id]);
  res.json({ message: '삭제되었습니다.' });
}));

// POST /api/song-form-elements/reorder
router.post('/reorder', asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids 배열을 전달해주세요.' });
  for (let i = 0; i < ids.length; i++) {
    await query('UPDATE song_form_elements SET sort_order = $1 WHERE id = $2', [i, ids[i]]);
  }
  res.json({ message: '순서가 업데이트되었습니다.' });
}));

module.exports = router;
