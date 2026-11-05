const express = require('express');
const router = express.Router();
const pptxgen = require('pptxgenjs');
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { getSheetUrls } = require('../lib/sheetUrls');
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

function parseFormFlow(raw) {
  return Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
}

// 글자 하나의 대략적인 폭(인치, 12pt 기준) — 커버 슬라이드 흐름/코멘트 요약 줄바꿈 방지용
function estimateTextWidth(text, ptSize = 12) {
  const charW = (ch) => (/[가-힣ㄱ-ㅣ]/.test(ch) ? 0.155 : /[A-Za-z0-9]/.test(ch) ? 0.09 : 0.08) * (ptSize / 12);
  return [...text].reduce((w, ch) => w + charW(ch), 0);
}

function truncateToWidth(text, maxWidthIn, ptSize = 12) {
  if (maxWidthIn <= 0) return '';
  let w = 0, out = '';
  for (const ch of text) {
    const cw = estimateTextWidth(ch, ptSize);
    if (w + cw > maxWidthIn) return out + '…';
    w += cw;
    out += ch;
  }
  return out;
}

// 코멘트를 줄바꿈(\n) 기준으로 나누고, 최대 줄 수를 넘으면 말줄임 처리
function splitCommentLines(comment, maxLines) {
  const lines = comment.split('\n');
  if (lines.length <= maxLines) return lines;
  const shown = lines.slice(0, maxLines);
  shown[maxLines - 1] = shown[maxLines - 1] + ' …';
  return shown;
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
  pptx.theme = { headFontFace: 'Noto Sans KR', bodyFontFace: 'Noto Sans KR' };

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

  // 노래 목록: 제목 행 + (흐름/코멘트가 있으면) 요약 행
  const SONG_START_Y = 5.18;
  const LIST_BOTTOM = 9.85;
  const TITLE_H = 0.30;
  const COMMENT_LINE_H = 0.16;
  const MAX_COMMENT_LINES = 3;
  const ROW_GAP = 0.04;
  const LIST_W = 6.25;

  const coverRows = [];
  let cursor = SONG_START_Y;
  for (let i = 0; i < songs.length; i++) {
    const s = songs[i];
    const comment = (s.comment || '').trim();
    const commentLines = comment ? splitCommentLines(comment, MAX_COMMENT_LINES) : [];
    const subH = commentLines.length * COMMENT_LINE_H;
    const h = TITLE_H + subH;
    if (coverRows.length > 0 && cursor + h > LIST_BOTTOM) break;
    coverRows.push({ song: s, index: i, top: cursor, titleH: TITLE_H, subH, commentLines });
    cursor += h + ROW_GAP;
  }
  const overflowCount = songs.length - coverRows.length;

  for (const row of coverRows) {
    const s = row.song;
    // 번호
    slide1.addText(`${row.index + 1}`, {
      x: 0.4, y: row.top, w: 0.35, h: row.titleH,
      fontSize: 14, color: '3B82F6', bold: true, align: 'center', valign: 'middle',
    });
    // 제목 + 키 인라인
    const titleParts = [
      { text: s.song_title, options: { color: '1E293B', fontSize: 14 } },
      ...(s.performance_key ? [{ text: ` - ${s.performance_key}`, options: { color: '3B82F6', fontSize: 14, bold: true } }] : []),
    ];
    slide1.addText(titleParts, {
      x: 0.85, y: row.top, w: LIST_W, h: row.titleH,
      align: 'left', valign: 'middle',
    });

    // 송폼 흐름 (1줄) + 코멘트 (줄바꿈 반영, 최대 MAX_COMMENT_LINES줄)
    if (row.subH > 0) {
      const lineCount = row.commentLines.length;
      let lineIdx = 0;
      const subParts = [];
      row.commentLines.forEach(line => {
        lineIdx++;
        subParts.push({ text: truncateToWidth(line, LIST_W, 12), options: { color: '64748B', fontSize: 12, breakLine: lineIdx < lineCount } });
      });
      slide1.addText(subParts, {
        x: 0.85, y: row.top + row.titleH, w: LIST_W, h: row.subH,
        align: 'left', valign: 'top', wrap: false,
      });
    }
  }
  if (overflowCount > 0) {
    const lastRow = coverRows[coverRows.length - 1];
    const y = lastRow ? lastRow.top + lastRow.titleH + lastRow.subH + 0.06 : SONG_START_Y;
    slide1.addText(`외 ${overflowCount}곡`, {
      x: 0.4, y, w: 6.7, h: 0.3,
      fontSize: 12, color: 'A8B4C0', align: 'center',
    });
  }

  // ── 슬라이드 2+: 노래별 ─────────────────────────────────────────
  // 레이아웃: 악보가 슬라이드 전체를 채우고, 흐름 아이콘은 악보 위에 오버레이
  for (let si = 0; si < songs.length; si++) {
    const song = songs[si];
    // 악보 한 장당 한 슬라이드 (악보가 없으면 안내 슬라이드 1장)
    const sheetUrls = getSheetUrls(song);
    const pageCount = Math.max(sheetUrls.length, 1);
    for (let pi = 0; pi < pageCount; pi++) {
    const slide = pptx.addSlide();

    // 악보 위에 직접 배치한 송폼 요소
    const allMarks = parseFormFlow(song.sheet_flow_marks);
    const pageMarks = allMarks.filter(m => (m.page || 0) === pi);

    // ── ① 악보 이미지: 5% 축소 후 슬라이드 중앙 배치 ──
    const IMG_W = 7.5 * 0.95;          // 7.125"
    const IMG_H = 10.0 * 0.95;         // 9.5"
    const IMG_X = (7.5 - IMG_W) / 2;   // 0.1875" (좌우 여백)
    const IMG_Y = (10.0 - IMG_H) / 2;  // 0.25"   (상하 여백)

    let hasImage = false;
    const sheetUrl = sheetUrls[pi];
    if (sheetUrl) {
      const relativePath = sheetUrl.startsWith('/uploads/')
        ? sheetUrl.slice('/uploads/'.length)
        : path.basename(sheetUrl);
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
      fill: { type: 'none' },
      line: { color: '4B5563', pt: 1.5 },
    });
    slide.addText(`${si + 1}`, {
      x: BADGE_X, y: BADGE_Y, w: BADGE_W, h: BADGE_H,
      fontSize: 15, bold: true, color: '000000',
      align: 'center', valign: 'middle',
    });

    // ── ③-2 악보 위에 배치된 송폼 요소 (x,y = 요소 중심, 슬라이드 비율) ──
    pageMarks.forEach(m => {
      const name = m.name || '?';
      const rSuffix = m.repeat && m.repeat > 1 ? `x${m.repeat}` : '';
      const cw = (ch) => /[가-힣ㄱ-ㅣ]/.test(ch) ? 0.18 : /[A-Za-z]/.test(ch) ? 0.14 : 0.11;
      const tw = (t) => Math.max([...t].reduce((a, c) => a + cw(c), 0) + 0.06, 0.15);
      const w = tw(name) + (rSuffix ? tw(rSuffix) + 0.02 : 0);
      const h = 0.4;
      const x = Math.min(Math.max(m.x * 7.5 - w / 2, 0), 7.5 - w);
      const y = Math.min(Math.max(m.y * 10 - h / 2, 0), 10 - h);
      const runs = [{ text: name, options: { fontSize: 16, bold: true, color: 'DC2626', fontFace: 'Noto Sans KR' } }];
      if (rSuffix) runs.push({ text: rSuffix, options: { fontSize: 12, bold: true, color: 'DC2626', fontFace: 'Noto Sans KR' } });
      slide.addText(runs, { x, y, w, h, align: 'center', valign: 'middle', wrap: false });
    });

    // ── ④ 코멘트: 슬라이드 최하단, 우측 정렬 (12pt = 미리보기 26px × 0.75 보정) ──
    if (song.comment && song.comment.trim()) {
      const COMMENT_H = 1.2;                         // 20pt 최대 3줄 수용
      const COMMENT_Y = 10.0 - COMMENT_H - 0.04;   // 슬라이드 바닥 밀착
      slide.addText(song.comment.trim(), {
        x: IMG_X, y: COMMENT_Y, w: IMG_W - 0.08, h: COMMENT_H,
        fontSize: 12, bold: true, color: 'DC2626',
        align: 'left', valign: 'bottom',
        wrap: true,
      });
    }
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
