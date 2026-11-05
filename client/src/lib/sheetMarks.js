// 악보 위에 직접 배치한 송폼 요소(마커)
// mark: { uid, page, x, y, id, name, color, repeat }
//   page: 악보 장 인덱스, x/y: 슬라이드 기준 0~1 비율(요소의 중심점)
export function getSheetMarks(song) {
  const m = song?.sheet_flow_marks
  if (Array.isArray(m)) return m
  if (typeof m === 'string') {
    try { const p = JSON.parse(m); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

export const marksOfPage = (marks, page) => marks.filter(m => (m.page || 0) === page)

// 악보 장수가 줄어들었을 때 범위를 벗어난 마커 제거
export const pruneMarks = (marks, pageCount) => marks.filter(m => (m.page || 0) < pageCount)
