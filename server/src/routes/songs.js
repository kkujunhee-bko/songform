const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/songs?q=&limit=&offset=
router.get('/', asyncHandler(async (req, res) => {
  const { q = '', limit = 20, offset = 0 } = req.query;
  let result;
  if (q.trim()) {
    result = await query(
      `SELECT * FROM songs
       WHERE title ILIKE $1
       ORDER BY similarity(title, $2) DESC, created_at DESC
       LIMIT $3 OFFSET $4`,
      [`%${q}%`, q, limit, offset]
    );
  } else {
    result = await query(
      'SELECT * FROM songs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
  }
  res.json(result.rows);
}));

// GET /api/songs/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM songs WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: '노래를 찾을 수 없습니다.' });
  res.json(result.rows[0]);
}));

// POST /api/songs
router.post('/', asyncHandler(async (req, res) => {
  const { title, artist, default_key, sheet_music_url, sheet_music_data, source = 'manual' } = req.body;
  if (!title) return res.status(400).json({ error: '노래 제목을 입력해주세요.' });
  const result = await query(
    'INSERT INTO songs (title, artist, default_key, sheet_music_url, sheet_music_data, source) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [title, artist, default_key, sheet_music_url, sheet_music_data ? JSON.stringify(sheet_music_data) : null, source]
  );
  res.status(201).json(result.rows[0]);
}));

// PUT /api/songs/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const { title, artist, default_key, sheet_music_url, sheet_music_data } = req.body;
  const result = await query(
    `UPDATE songs
     SET title = COALESCE($1, title), artist = COALESCE($2, artist),
         default_key = COALESCE($3, default_key), sheet_music_url = COALESCE($4, sheet_music_url),
         sheet_music_data = COALESCE($5, sheet_music_data), updated_at = NOW()
     WHERE id = $6 RETURNING *`,
    [title, artist, default_key, sheet_music_url, sheet_music_data ? JSON.stringify(sheet_music_data) : null, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: '노래를 찾을 수 없습니다.' });
  res.json(result.rows[0]);
}));

// DELETE /api/songs/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM songs WHERE id = $1', [req.params.id]);
  res.json({ message: '삭제되었습니다.' });
}));

module.exports = router;
