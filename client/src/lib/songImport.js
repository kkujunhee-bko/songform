import { parseKey, buildKey } from './keyUtils'

const HEADER_RE = /^(\d{1,2})\s*[/.]\s*(\d{1,2})\s*(.*?)\s*\]?\s*$/        // [11/8 주일예배]
const SONG_RE = /^([A-G](?:#|b)?)\s+(.+)$/                                  // A 예수 우리 왕이여
const LABEL_RE = /[:：]\s*$/                                                // 설교결단 :
const BULLET_RE = /^[-–—•·*]\s*/

// 오늘과 가장 가까운 해를 선택 (연말/연초에 다음/이전 해 날짜를 입력하는 경우 대응)
function resolveDate(month, day, today = new Date()) {
  const m = Number(month), d = Number(day)
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  let best = null
  for (const y of [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1]) {
    const diff = Math.abs(new Date(y, m - 1, d) - today)
    if (!best || diff < best.diff) best = { y, diff }
  }
  const pad = (n) => String(n).padStart(2, '0')
  return `${best.y}-${pad(m)}-${pad(d)}`
}

/**
 * 예배 곡 목록 텍스트 분석
 * - 머리줄  : "[11/8 주일예배]"  → 날짜, 구분 이름
 * - 곡 줄   : "A 예수 우리 왕이여" → 키, 제목
 * - 코멘트  : 곡 바로 아래 줄 ("- (엔딩) …" 의 "- "는 제거)
 * - 구간 제목("설교결단 :")과 그 밖의 줄은 무시
 */
export function parseSongList(text, today = new Date()) {
  const result = { header: null, songs: [], ignored: [] }
  let current = null

  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/[♯]/g, '#').replace(/[♭]/g, 'b').trim()
    if (!line) { current = null; continue }

    const song = line.match(SONG_RE)
    if (song) {
      const p = parseKey(song[1])
      current = { key: buildKey(p.base, p.accidental), title: song[2].trim(), comment: '' }
      result.songs.push(current)
      continue
    }

    if (!result.header && !current && result.songs.length === 0) {
      const h = line.match(HEADER_RE)
      if (h) {
        result.header = { date: resolveDate(h[1], h[2], today), categoryText: h[3].trim() }
        continue
      }
    }

    if (LABEL_RE.test(line)) { current = null; result.ignored.push(line); continue }

    if (current) {
      const comment = line.replace(BULLET_RE, '').trim()
      current.comment = current.comment ? `${current.comment}\n${comment}` : comment
    } else {
      result.ignored.push(line)
    }
  }
  return result
}

const normTitle = (t) => String(t || '').replace(/\([^)]*\)/g, '').replace(/\s+/g, '').toLowerCase()

/** 제목이 일치하는 등록된 곡을 찾는다 (공백/괄호 설명 무시). 없으면 null */
export async function findSongByTitle(api, title) {
  const target = normTitle(title)
  const queries = [...new Set([title, title.replace(/\([^)]*\)/g, '').trim()])].filter(Boolean)
  for (const q of queries) {
    try {
      const rows = await api.get(`/songs?q=${encodeURIComponent(q)}&limit=10`)
      const hit = rows.find(r => normTitle(r.title) === target)
      if (hit) return hit
    } catch { /* 매칭 실패는 무시하고 제목만 사용 */ }
  }
  return null
}

/** 구분 이름이 일치(또는 포함)하는 구분 찾기 */
export function findCategory(categories, text) {
  const t = (text || '').replace(/\s+/g, '')
  if (!t) return null
  return categories.find(c => c.name.replace(/\s+/g, '') === t)
    || categories.find(c => c.name.replace(/\s+/g, '').includes(t) || t.includes(c.name.replace(/\s+/g, '')))
    || null
}
