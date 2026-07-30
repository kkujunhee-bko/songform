const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/public/worship-forms/:token — 인증 없이 접근 가능한 공유 뷰
router.get('/worship-forms/:token', asyncHandler(async (req, res) => {
  const formResult = await query(
    `SELECT wf.worship_date, wf.denomination_id, wf.category_id, wf.notes,
            wf.liturgical_season_name, wf.liturgical_season_color, wf.leader_ids,
            wc.name AS category_name,
            COALESCE(
              (SELECT JSON_AGG(JSON_BUILD_OBJECT('id', u.id, 'name', u.name) ORDER BY u.name)
               FROM users u WHERE u.id = ANY(wf.leader_ids)),
              '[]'::json
            ) AS leaders
     FROM worship_forms wf
     LEFT JOIN worship_categories wc ON wf.category_id = wc.id
     WHERE wf.share_token = $1`,
    [req.params.token]
  );
  if (!formResult.rows[0]) {
    return res.status(404).json({ error: '공유 링크를 찾을 수 없습니다.' });
  }

  const form = formResult.rows[0];
  const songsResult = await query(
    `SELECT wfs.id, wfs.song_title, wfs.performance_key, wfs.semitone_adjustment,
            wfs.form_flow, wfs.comment,
            COALESCE(wfs.sheet_music_url, s.sheet_music_url) AS sheet_music_url
     FROM worship_form_songs wfs
     LEFT JOIN songs s ON wfs.song_id = s.id
     WHERE wfs.form_id = (
       SELECT id FROM worship_forms WHERE share_token = $1
     )
     ORDER BY wfs.sort_order ASC`,
    [req.params.token]
  );

  res.json({ ...form, songs: songsResult.rows });
}));

module.exports = router;
