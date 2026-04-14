const express = require('express');
const router = express.Router();
const axios = require('axios');
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// GET /api/sheet-music/search?q=
router.get('/search', asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  if (!q.trim()) return res.json({ db: [] });

  const dbResult = await query(
    `SELECT id, title, artist, default_key, sheet_music_url, source
     FROM songs WHERE title ILIKE $1 ORDER BY title ASC LIMIT 20`,
    [`%${q}%`]
  );
  res.json({ db: dbResult.rows });
}));

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const NAVER_HEADERS = {
  'User-Agent': BROWSER_UA,
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Referer': 'https://www.naver.com',
};

// GET /api/sheet-music/image-search?q=&offset=0
// 네이버 이미지 검색 → 썸네일을 서버에서 다운로드 후 base64 반환
// offset: 페이지 오프셋 (0=1번째 5건, 5=2번째 5건, ...)
router.get('/image-search', asyncHandler(async (req, res) => {
  const { q = '', offset = '0' } = req.query;
  if (!q.trim()) return res.status(400).json({ error: '검색어를 입력해주세요.' });

  const pageOffset = Math.max(0, parseInt(offset) || 0);
  // 네이버 start 파라미터는 1-based
  const naverStart = pageOffset + 1;

  const searchUrl = `https://search.naver.com/search.naver?where=image&query=${encodeURIComponent(q.trim() + ' 악보')}&start=${naverStart}`;
  const searchResp = await axios.get(searchUrl, { headers: NAVER_HEADERS, timeout: 10000 });

  // 썸네일 URL 추출 (더 많이 추출해서 충분한 결과 확보)
  const thumbMatches = searchResp.data.match(/"thumb":"(https?:[^"]+)"/g) || [];
  const thumbUrls = thumbMatches
    .slice(0, 10)
    .map(m => m.replace('"thumb":"', '').replace(/"$/, ''));

  if (thumbUrls.length === 0) {
    return res.json({ images: [], message: '검색 결과가 없습니다. 검색어를 변경해 보세요.' });
  }

  // 썸네일을 서버에서 다운로드 → base64 (프론트 CORS 우회)
  const images = [];
  await Promise.allSettled(
    thumbUrls.map(async (url) => {
      try {
        const imgResp = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 6000,
          headers: { 'User-Agent': BROWSER_UA, 'Referer': 'https://search.naver.com/' },
        });
        const ct = imgResp.headers['content-type'] || 'image/jpeg';
        const b64 = Buffer.from(imgResp.data).toString('base64');
        images.push(`data:${ct};base64,${b64}`);
      } catch (e) { /* skip */ }
    })
  );

  res.json({ images: images.slice(0, 5) });
}));

// POST /api/sheet-music/save-image
// 선택한 이미지(base64 또는 외부 URL)를 서버에 저장하고 로컬 URL 반환
router.post('/save-image', asyncHandler(async (req, res) => {
  const { dataUrl, songId } = req.body;
  if (!dataUrl) return res.status(400).json({ error: '이미지 데이터가 없습니다.' });

  let buffer, ext;

  if (dataUrl.startsWith('data:image')) {
    const m = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/s);
    if (!m) return res.status(400).json({ error: '유효하지 않은 이미지 형식입니다.' });
    ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    buffer = Buffer.from(m[2], 'base64');
  } else if (dataUrl.startsWith('http')) {
    // 외부 URL → 서버에서 다운로드
    const axios = require('axios');
    const resp = await axios.get(dataUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const ct = resp.headers['content-type'] || 'image/jpeg';
    ext = ct.includes('png') ? 'png' : ct.includes('gif') ? 'gif' : 'jpg';
    buffer = Buffer.from(resp.data);
  } else {
    return res.status(400).json({ error: '지원하지 않는 이미지 형식입니다.' });
  }

  const filename = `sheet_${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  const url = `/uploads/${filename}`;

  if (songId) {
    await query(
      'UPDATE songs SET sheet_music_url = $1, updated_at = NOW() WHERE id = $2',
      [url, songId]
    );
  }

  res.json({ url });
}));

module.exports = router;
