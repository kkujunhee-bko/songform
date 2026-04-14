const express = require('express');
const router = express.Router();
const pptxgen = require('pptxgenjs');
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// 요소별 색상 (FormFlowBuilder와 동일)
const ELEMENT_COLORS = {
  'Intro':      'C77DFF',
  'Verse':      '4ADE80',
  'Pre-Chorus': 'FCD34D',
  'Chorus':     'F87171',
  'Bridge':     'A78BFA',
  'Interlude':  '22D3EE',
  'Outro':      '9CA3AF',
  'Tag':        'F472B6',
  'Vamp':       '2DD4BF',
};

// hex 색상에 투명도 접미사 붙이기 (PPT fill용, 16진수 00~FF)
function hexAlpha(hex6, alpha255) {
  return hex6.replace('#', '') + Math.round(alpha255).toString(16).padStart(2, '0');
}

// POST /api/export/pptx/:formId
router.post('/pptx/:formId', asyncHandler(async (req, res) => {
  const { formId } = req.params;

  // ── 데이터 조회 ──────────────────────────────────────────────────
  const formResult = await query(
    `SELECT wf.*, d.name as denomination_name, wc.name as category_name,
            COALESCE(
              (SELECT STRING_AGG(u.name, ' · ' ORDER BY u.name)
               FROM users u
               WHERE u.id = ANY(wf.leader_ids)),
              ''
            ) AS leader_names_str
     FROM worship_forms wf
     LEFT JOIN denominations d ON wf.denomination_id = d.id
     LEFT JOIN worship_categories wc ON wf.category_id = wc.id
     WHERE wf.id = $1`,
    [formId]
  );
  if (!formResult.rows[0]) return res.status(404).json({ error: '예배 송폼을 찾을 수 없습니다.' });
  const form = formResult.rows[0];

  const songsResult = await query(
    `SELECT wfs.*, s.artist, COALESCE(wfs.sheet_music_url, s.sheet_music_url) as sheet_music_url
     FROM worship_form_songs wfs
     LEFT JOIN songs s ON wfs.song_id = s.id
     WHERE wfs.form_id = $1
     ORDER BY wfs.sort_order ASC`,
    [formId]
  );
  const songs = songsResult.rows;

  // ── PPT 초기화 (세로 모드 7.5" × 10") ───────────────────────────
  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'PORTRAIT', width: 7.5, height: 10.0 });
  pptx.layout = 'PORTRAIT';

  // 날짜 문자열
  const worshipDate = new Date(form.worship_date + 'T00:00:00');
  const dateStr = `${worshipDate.getFullYear()}년 ${worshipDate.getMonth() + 1}월 ${worshipDate.getDate()}일`;

  // ── 슬라이드 1: 커버 (흰 배경) ──────────────────────────────────
  const slide1 = pptx.addSlide();

  // 예배 카테고리 (대제목) — 교단명 제거, 상단으로 이동
  slide1.addText(form.category_name || '예배', {
    x: 0.4, y: 0.7, w: 6.7, h: 1.6,
    fontSize: 54, bold: true, color: '1E293B', align: 'center', valign: 'middle',
  });

  // 날짜
  slide1.addText(dateStr, {
    x: 0.4, y: 2.5, w: 6.7, h: 0.55,
    fontSize: 22, color: '475569', align: 'center',
  });

  // 인도자 (있을 때만)
  const leaderStr = form.leader_names_str || '';
  if (leaderStr) {
    slide1.addText(`인도자 : ${leaderStr}`, {
      x: 0.4, y: 3.15, w: 6.7, h: 0.45,
      fontSize: 16, color: '334155', align: 'center', valign: 'middle',
    });
  }

  // 절기 배지
  const seasonY = leaderStr ? 3.75 : 3.2;
  if (form.liturgical_season_name) {
    const hexColor = (form.liturgical_season_color || '#6366F1').replace('#', '');
    slide1.addShape(pptx.ShapeType.roundRect, {
      x: 2.3, y: seasonY, w: 2.9, h: 0.52,
      fill: { color: hexColor },
      line: { color: hexColor, pt: 0 },
    });
    slide1.addText(form.liturgical_season_name, {
      x: 2.3, y: seasonY, w: 2.9, h: 0.52,
      fontSize: 15, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle',
    });
  }

  // 구분선
  slide1.addShape(pptx.ShapeType.line, {
    x: 0.4, y: 4.55, w: 6.7, h: 0,
    line: { color: 'E2E8F0', pt: 1.2 },
  });

  // 예배 순서 레이블
  slide1.addText('[ 예배 순서 ]', {
    x: 0.4, y: 4.72, w: 6.7, h: 0.38,
    fontSize: 12, color: 'A8B4C0', align: 'center',
  });

  // 노래 목록
  const SONG_START_Y = 5.18;
  const maxSongs = Math.min(songs.length, 10);
  const lineH = songs.length > 8 ? 0.42 : 0.48;
  for (let i = 0; i < maxSongs; i++) {
    const s = songs[i];
    // 번호
    slide1.addText(`${i + 1}`, {
      x: 0.4, y: SONG_START_Y + i * lineH, w: 0.35, h: lineH,
      fontSize: 14, color: '3B82F6', bold: true, align: 'center', valign: 'middle',
    });
    // 제목
    slide1.addText(s.song_title, {
      x: 0.85, y: SONG_START_Y + i * lineH, w: 5.1, h: lineH,
      fontSize: 14, color: '1E293B', align: 'left', valign: 'middle',
    });
    // 키
    slide1.addText(s.performance_key, {
      x: 6.0, y: SONG_START_Y + i * lineH, w: 1.1, h: lineH,
      fontSize: 13, color: '3B82F6', bold: true, align: 'right', valign: 'middle',
    });
  }
  if (songs.length > 10) {
    slide1.addText(`외 ${songs.length - 10}곡`, {
      x: 0.4, y: SONG_START_Y + 10 * lineH, w: 6.7, h: 0.38,
      fontSize: 12, color: 'A8B4C0', align: 'center',
    });
  }

  // ── 슬라이드 2+: 노래별 ─────────────────────────────────────────
  // 레이아웃: 악보가 슬라이드 전체를 채우고, 흐름 아이콘은 악보 위에 오버레이
  for (let si = 0; si < songs.length; si++) {
    const song = songs[si];
    const slide = pptx.addSlide();

    const formFlow = Array.isArray(song.form_flow)
      ? song.form_flow
      : JSON.parse(song.form_flow || '[]');

    // ── ① 악보 이미지: 5% 축소 후 슬라이드 중앙 배치 ──
    const IMG_W = 7.5 * 0.95;          // 7.125"
    const IMG_H = 10.0 * 0.95;         // 9.5"
    const IMG_X = (7.5 - IMG_W) / 2;   // 0.1875" (좌우 여백)
    const IMG_Y = (10.0 - IMG_H) / 2;  // 0.25"   (상하 여백)

    let hasImage = false;
    if (song.sheet_music_url) {
      const relativePath = song.sheet_music_url.startsWith('/uploads/')
        ? song.sheet_music_url.slice('/uploads/'.length)
        : path.basename(song.sheet_music_url);
      const imgPath = path.join(UPLOADS_DIR, relativePath);

      if (fs.existsSync(imgPath)) {
        slide.addImage({
          path: imgPath,
          x: IMG_X, y: IMG_Y, w: IMG_W, h: IMG_H,
          sizing: { type: 'contain', w: IMG_W, h: IMG_H },
        });
        hasImage = true;
      }
    }

    if (!hasImage) {
      slide.addText('악보가 첨부되지 않았습니다.', {
        x: 0.5, y: 4.75, w: 6.5, h: 0.5,
        fontSize: 15, color: 'CBD5E1', align: 'center', italic: true,
      });
    }

    // ── ② 번호 뱃지 + 흐름 아이콘: 최대한 상단으로 ──
    const BADGE_X = 0.10;
    const BADGE_Y = 0.05;   // 슬라이드 최상단에 밀착
    const BADGE_W = 0.50;
    const BADGE_H = 0.50;

    slide.addShape(pptx.ShapeType.roundRect, {
      x: BADGE_X, y: BADGE_Y, w: BADGE_W, h: BADGE_H,
      fill: { color: '2563EB' },
      line: { color: '2563EB', pt: 0 },
    });
    slide.addText(`${si + 1}`, {
      x: BADGE_X, y: BADGE_Y, w: BADGE_W, h: BADGE_H,
      fontSize: 20, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'middle',
    });

    // ── ③ 흐름 아이콘: 빨간 bold 텍스트만, 박스/배경 없음 ──
    if (formFlow.length > 0) {
      const ICON_W  = 0.55;
      const ICON_H  = BADGE_H;
      const ARR_W   = 0.20;
      const GAP     = 0.02;
      const ICON_Y  = BADGE_Y;        // 뱃지 상단에 정렬 (최상단)
      let fx = BADGE_X + BADGE_W + 0.10;
      const displayCount = Math.min(formFlow.length, 8);

      for (let fi = 0; fi < displayCount; fi++) {
        const el = formFlow[fi];

        // 이니셜(1글자) + 반복  예: V  Vx2  Cx3
        const initial      = (el.name || '?').charAt(0).toUpperCase();
        const repeatSuffix = el.repeat && el.repeat > 1 ? `x${el.repeat}` : '';
        const label        = initial + repeatSuffix;

        // 빨간 bold 텍스트 (박스/배경 없음, wrap:false 로 단행 강제)
        slide.addText(label, {
          x: fx, y: ICON_Y, w: ICON_W, h: ICON_H,
          fontSize: 26, bold: true, color: 'DC2626',
          wrap: false,
          align: 'center', valign: 'middle',
        });

        fx += ICON_W + GAP;

        // 화살표 → (마지막 요소 제외, red)
        if (fi < displayCount - 1) {
          slide.addText('→', {
            x: fx, y: ICON_Y, w: ARR_W, h: ICON_H,
            fontSize: 16, bold: true, color: 'DC2626',
            align: 'center', valign: 'middle',
          });
          fx += ARR_W + GAP;
        }
      }

      // 8개 초과 표시
      if (formFlow.length > 8) {
        slide.addText(`+${formFlow.length - 8}`, {
          x: fx + 0.02, y: ICON_Y, w: 0.42, h: ICON_H,
          fontSize: 18, bold: true, color: 'DC2626', align: 'left', valign: 'middle',
        });
      }
    }

    // ── ④ 코멘트: 슬라이드 최하단, 우측 정렬, 흐름 아이콘과 동일 폰트(26pt) ──
    if (song.comment && song.comment.trim()) {
      const COMMENT_H = 0.58;                       // 26pt 1~2줄 수용
      const COMMENT_Y = 10.0 - COMMENT_H - 0.04;   // 슬라이드 바닥 밀착
      slide.addText(song.comment.trim(), {
        x: IMG_X, y: COMMENT_Y, w: IMG_W - 0.08, h: COMMENT_H,
        fontSize: 26, bold: true, color: 'DC2626',
        align: 'right', valign: 'bottom',
        wrap: true,
      });
    }
  }

  // ── PPT 버퍼 생성 및 전송 ────────────────────────────────────────
  const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' });
  const safeName = `worship_${form.worship_date}_${form.category_name || 'form'}.pptx`.replace(/\s/g, '_');

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`);
  res.send(pptxBuffer);
}));

module.exports = router;
