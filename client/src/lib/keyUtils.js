export const MAJOR_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

export const ACCIDENTAL_LIST = [
  { value: 'b', label: '♭', title: '플랫' },
  { value: 'n', label: '♮', title: '제자리표' },
  { value: '#', label: '♯', title: '샵' },
]

/**
 * 키 문자열 → { base, accidental } 파싱
 * 지원 형식: 'C', 'C#', 'Cb', 'Db', 'D#', 'Bb', 'A#' 등
 * base  : 'C'~'B' (MAJOR_NOTES 중 하나)
 * accidental : 'b' | 'n' | '#'
 */
export function parseKey(key = 'C') {
  if (!key || typeof key !== 'string') return { base: 'C', accidental: 'n' }
  const base = key[0].toUpperCase()
  if (!MAJOR_NOTES.includes(base)) return { base: 'C', accidental: 'n' }
  const rest = key.slice(1)
  if (rest === '#') return { base, accidental: '#' }
  if (rest === 'b') return { base, accidental: 'b' }
  return { base, accidental: 'n' }
}

/**
 * { base, accidental } → 키 문자열
 * 'n' (제자리표) 는 base 이름만 반환 ('C', 'D' 등)
 */
export function buildKey(base, accidental) {
  if (accidental === '#') return `${base}#`
  if (accidental === 'b') return `${base}b`
  return base
}

/**
 * 반음 전조 (PPT 내보내기 등 호환용)
 * semitones === 0 이면 원래 키를 그대로 반환
 */
const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_TO_SHARP = { Cb:'B', Db:'C#', Eb:'D#', Fb:'E', Gb:'F#', Ab:'G#', Bb:'A#' }

export function transposeKey(key, semitones) {
  if (!semitones || semitones === 0) return key
  const sharp = FLAT_TO_SHARP[key] ?? key
  const idx = CHROMATIC.indexOf(sharp)
  if (idx === -1) return key
  return CHROMATIC[((idx + semitones) % 12 + 12) % 12]
}

// 구버전 호환 (chromatic KEYS 배열)
export const KEYS = CHROMATIC
