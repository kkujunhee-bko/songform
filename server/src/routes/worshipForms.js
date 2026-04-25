const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/worship-forms
router.get('/', asyncHandler(async (req, res) => {
  const { year, month, category_id, denomination_id, limit = 50, offset = 0 } = req.query;
  const conditions = [];
  const params = [];
  let i = 1;

  if (year)           { conditions.push(`EXTRACT(YEAR  FROM wf.worship_date) = $${i++}`); params.push(year); }
  if (month)          { conditions.push(`EXTRACT(MONTH FROM wf.worship_date) = $${i++}`); params.push(month); }
  if (category_id)    { conditions.push(`wf.category_id    = $${i++}`); params.push(category_id); }
  if (denomination_id){ conditions.push(`wf.denomination_id = $${i++}`); params.push(denomination_id); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const result = await query(
    `SELECT wf.*, d.name AS denomination_name, wc.name AS category_name,
            COUNT(wfs.id)::int AS song_count,
            COALESCE(
              JSON_AGG(wfs.song_title ORDER BY wfs.sort_order)
              FILTER (WHERE wfs.song_title IS NOT NULL AND wfs.song_title <> ''),
              '[]'::json
            ) AS song_titles,
            COALESCE(
              (SELECT JSON_AGG(u.name ORDER BY u.name)
               FROM users u
               WHERE u.id = ANY(wf.leader_ids)),
              '[]'::json
            ) AS leader_names
     FROM worship_forms wf
     LEFT JOIN denominations d  ON wf.denomination_id = d.id
     LEFT JOIN worship_categories wc ON wf.category_id = wc.id
     LEFT JOIN worship_form_songs wfs ON wf.id = wfs.form_id
     ${where}
     GROUP BY wf.id, d.name, wc.name
     ORDER BY wf.worship_date DESC
     LIMIT $${i++} OFFSET $${i}`,
    params
  );
  res.json(result.rows);
}));

// GET /api/worship-forms/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const formResult = await query(
    `SELECT wf.*, d.name AS denomination_name, wc.name AS category_name
     FROM worship_forms wf
     LEFT JOIN denominations d  ON wf.denomination_id = d.id
     LEFT JOIN worship_categories wc ON wf.category_id = wc.id
     WHERE wf.id = $1`,
    [req.params.id]
  );
  if (!formResult.rows[0]) return res.status(404).json({ error: '예배 송폼을 찾을 수 없습니다.' });

  const songsResult = await query(
    `SELECT wfs.*, s.artist, COALESCE(wfs.sheet_music_url, s.sheet_music_url) AS sheet_music_url
     FROM worship_form_songs wfs
     LEFT JOIN songs s ON wfs.song_id = s.id
     WHERE wfs.form_id = $1
     ORDER BY wfs.sort_order ASC`,
    [req.params.id]
  );

  res.json({ ...formResult.rows[0], songs: songsResult.rows });
}));

// POST /api/worship-forms
router.post('/', asyncHandler(async (req, res) => {
  const {
    worship_date, denomination_id, category_id,
    liturgical_season_name, liturgical_season_color,
    notes, songs = [], leader_ids = [],
  } = req.body;

  if (!worship_date || !denomination_id || !category_id) {
    return res.status(400).json({ error: '날짜, 교단, 카테고리는 필수입니다.' });
  }

  const formResult = await query(
    `INSERT INTO worship_forms
       (worship_date, denomination_id, category_id, liturgical_season_name, liturgical_season_color, notes, leader_ids)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [worship_date, denomination_id, category_id,
     liturgical_season_name, liturgical_season_color, notes,
     leader_ids.map(Number)]
  );
  const form = formResult.rows[0];

  for (let i = 0; i < songs.length; i++) {
    const { song_id, song_title, performance_key = 'C', semitone_adjustment = 0,
            form_flow = [], sheet_music_url, sheet_music_snapshot, comment,
            bpm, keyboard1_sound_no, keyboard1_sound_name,
            keyboard2_sound_no, keyboard2_sound_name, play_style } = songs[i];
    if (!song_title) continue;
    await query(
      `INSERT INTO worship_form_songs
         (form_id, song_id, song_title, sort_order, performance_key, semitone_adjustment,
          form_flow, sheet_music_url, sheet_music_snapshot, comment,
          bpm, keyboard1_sound_no, keyboard1_sound_name,
          keyboard2_sound_no, keyboard2_sound_name, play_style)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [form.id, song_id || null, song_title, i, performance_key, semitone_adjustment,
       JSON.stringify(form_flow), sheet_music_url || null,
       sheet_music_snapshot ? JSON.stringify(sheet_music_snapshot) : null,
       comment || null,
       bpm || null, keyboard1_sound_no || null, keyboard1_sound_name || null,
       keyboard2_sound_no || null, keyboard2_sound_name || null, play_style || null]
    );
    if (!song_id && song_title) {
      const ex = await query('SELECT id FROM songs WHERE title ILIKE $1 LIMIT 1', [song_title]);
      if (!ex.rows[0]) {
        await query('INSERT INTO songs (title, default_key, source) VALUES ($1,$2,$3)',
          [song_title, performance_key, 'worship_form']);
      }
    }
  }

  const fullForm = await query(
    `SELECT wf.*, d.name AS denomination_name, wc.name AS category_name
     FROM worship_forms wf
     LEFT JOIN denominations d  ON wf.denomination_id = d.id
     LEFT JOIN worship_categories wc ON wf.category_id = wc.id
     WHERE wf.id = $1`,
    [form.id]
  );
  const formSongs = await query(
    'SELECT * FROM worship_form_songs WHERE form_id = $1 ORDER BY sort_order ASC', [form.id]
  );
  res.status(201).json({ ...fullForm.rows[0], songs: formSongs.rows });
}));

// PUT /api/worship-forms/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    worship_date, category_id, liturgical_season_name, liturgical_season_color,
    notes, songs, leader_ids,
  } = req.body;

  await query(
    `UPDATE worship_forms SET
       worship_date            = COALESCE($1, worship_date),
       category_id             = COALESCE($2, category_id),
       liturgical_season_name  = COALESCE($3, liturgical_season_name),
       liturgical_season_color = COALESCE($4, liturgical_season_color),
       notes                   = COALESCE($5, notes),
       leader_ids              = $6,
       updated_at              = NOW()
     WHERE id = $7`,
    [worship_date, category_id, liturgical_season_name, liturgical_season_color,
     notes, (leader_ids || []).map(Number), id]
  );

  if (songs !== undefined) {
    await query('DELETE FROM worship_form_songs WHERE form_id = $1', [id]);
    for (let i = 0; i < songs.length; i++) {
      const { song_id, song_title, performance_key = 'C', semitone_adjustment = 0,
              form_flow = [], sheet_music_url, sheet_music_snapshot, comment,
              bpm, keyboard1_sound_no, keyboard1_sound_name,
              keyboard2_sound_no, keyboard2_sound_name, play_style } = songs[i];
      if (!song_title) continue;
      await query(
        `INSERT INTO worship_form_songs
           (form_id, song_id, song_title, sort_order, performance_key, semitone_adjustment,
            form_flow, sheet_music_url, sheet_music_snapshot, comment,
            bpm, keyboard1_sound_no, keyboard1_sound_name,
            keyboard2_sound_no, keyboard2_sound_name, play_style)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [id, song_id || null, song_title, i, performance_key, semitone_adjustment,
         JSON.stringify(form_flow), sheet_music_url || null,
         sheet_music_snapshot ? JSON.stringify(sheet_music_snapshot) : null,
         comment || null,
         bpm || null, keyboard1_sound_no || null, keyboard1_sound_name || null,
         keyboard2_sound_no || null, keyboard2_sound_name || null, play_style || null]
      );
    }
  }

  const fullForm = await query(
    `SELECT wf.*, d.name AS denomination_name, wc.name AS category_name
     FROM worship_forms wf
     LEFT JOIN denominations d  ON wf.denomination_id = d.id
     LEFT JOIN worship_categories wc ON wf.category_id = wc.id
     WHERE wf.id = $1`,
    [id]
  );
  const formSongs = await query(
    'SELECT * FROM worship_form_songs WHERE form_id = $1 ORDER BY sort_order ASC', [id]
  );
  res.json({ ...fullForm.rows[0], songs: formSongs.rows });
}));

// DELETE /api/worship-forms/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM worship_forms WHERE id = $1', [req.params.id]);
  res.json({ message: '삭제되었습니다.' });
}));

module.exports = router;
