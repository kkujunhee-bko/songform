const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/song-form-presets
router.get('/', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT p.*, c.name AS category_name
     FROM song_form_presets p
     LEFT JOIN song_form_preset_categories c ON p.category_id = c.id
     ORDER BY p.sort_order ASC, p.id ASC`
  );
  res.json(result.rows);
}));

// GET /api/song-form-presets/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT p.*, c.name AS category_name
     FROM song_form_presets p
     LEFT JOIN song_form_preset_categories c ON p.category_id = c.id
     WHERE p.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: '프리셋을 찾을 수 없습니다.' });
  res.json(result.rows[0]);
}));

// POST /api/song-form-presets
router.post('/', asyncHandler(async (req, res) => {
  const { title, category_id = null, form_flow = [], sort_order = 0 } = req.body;
  if (!title) return res.status(400).json({ error: '타이틀을 입력해주세요.' });
  const result = await query(
    `INSERT INTO song_form_presets (title, category_id, form_flow, sort_order)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [title.trim(), category_id || null, JSON.stringify(form_flow), sort_order]
  );
  res.status(201).json(result.rows[0]);
}));

// PUT /api/song-form-presets/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, category_id, form_flow } = req.body;
  if (!title) return res.status(400).json({ error: '타이틀을 입력해주세요.' });
  const result = await query(
    `UPDATE song_form_presets
     SET title = $1, category_id = $2, form_flow = $3, updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [title.trim(), category_id || null, JSON.stringify(form_flow ?? []), id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: '프리셋을 찾을 수 없습니다.' });
  res.json(result.rows[0]);
}));

// DELETE /api/song-form-presets/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM song_form_presets WHERE id = $1', [req.params.id]);
  res.json({ message: '삭제되었습니다.' });
}));

module.exports = router;
