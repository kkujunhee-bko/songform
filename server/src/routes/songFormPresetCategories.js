const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/song-form-preset-categories
router.get('/', asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT * FROM song_form_preset_categories WHERE is_active = TRUE ORDER BY sort_order ASC, id ASC'
  );
  res.json(result.rows);
}));

// POST /api/song-form-preset-categories
router.post('/', asyncHandler(async (req, res) => {
  const { name, sort_order = 0 } = req.body;
  if (!name) return res.status(400).json({ error: '카테고리명을 입력해주세요.' });
  const result = await query(
    'INSERT INTO song_form_preset_categories (name, sort_order) VALUES ($1, $2) RETURNING *',
    [name.trim(), sort_order]
  );
  res.status(201).json(result.rows[0]);
}));

// PUT /api/song-form-preset-categories/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '카테고리명을 입력해주세요.' });
  const result = await query(
    'UPDATE song_form_preset_categories SET name = $1 WHERE id = $2 RETURNING *',
    [name.trim(), id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
  res.json(result.rows[0]);
}));

// DELETE /api/song-form-preset-categories/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await query('UPDATE song_form_preset_categories SET is_active = FALSE WHERE id = $1', [req.params.id]);
  res.json({ message: '삭제되었습니다.' });
}));

// POST /api/song-form-preset-categories/reorder
router.post('/reorder', asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids 배열을 전달해주세요.' });
  for (let i = 0; i < ids.length; i++) {
    await query('UPDATE song_form_preset_categories SET sort_order = $1 WHERE id = $2', [i, ids[i]]);
  }
  res.json({ message: '순서가 업데이트되었습니다.' });
}));

module.exports = router;
