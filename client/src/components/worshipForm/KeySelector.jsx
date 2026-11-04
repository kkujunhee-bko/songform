import { useState, useEffect, useRef } from 'react'
import { MAJOR_NOTES, ACCIDENTAL_LIST, parseKey, buildKey } from '../../lib/keyUtils'

const N = MAJOR_NOTES.length
const ITEM_W = 44   // 다이얼 한 칸 너비(px)
const mod = (i) => ((i % N) + N) % N

/**
 * 키(Key) 선택기
 * - 키 이름(C~B) : 좌우로 드래그/휠/방향키로 돌리는 다이얼 (가운데 오는 음이 선택됨, 양끝 순환)
 * - 변화표(♭ ♮ ♯) : 독립 라디오 그룹
 * - 두 그룹은 서로 간섭 없음
 */
export default function KeySelector({ value = 'C', onChange }) {
  const parsed = parseKey(value)

  // 각각 독립적인 로컬 상태
  const [base, setBase]             = useState(parsed.base)
  const [accidental, setAccidental] = useState(parsed.accidental)
  const [offset, setOffset]         = useState(MAJOR_NOTES.indexOf(parsed.base)) // 다이얼 위치(소수 가능)
  const [dragging, setDragging]     = useState(false)
  const drag = useRef({ startX: 0, startOffset: 0, moved: false })

  // 외부(DB 로드 등)에서 value가 변경될 때만 동기화
  const prevValue = useRef(value)
  useEffect(() => {
    if (prevValue.current !== value) {
      const p = parseKey(value)
      setBase(p.base)
      setAccidental(p.accidental)
      // 가장 가까운 방향으로 회전
      setOffset(o => {
        const cur = Math.round(o)
        let diff = MAJOR_NOTES.indexOf(p.base) - mod(cur)
        if (diff > N / 2) diff -= N
        if (diff < -N / 2) diff += N
        return cur + diff
      })
      prevValue.current = value
    }
  }, [value])

  // C, F는 플랫 불필요 / B, E는 샵 불필요
  const disabledAccidentals = (b) => {
    if (b === 'C' || b === 'F') return ['b']
    if (b === 'B' || b === 'E') return ['#']
    return []
  }

  const handleBase = (newBase) => {
    const disabled = disabledAccidentals(newBase)
    const newAcc = disabled.includes(accidental) ? 'n' : accidental
    setBase(newBase)
    setAccidental(newAcc)
    onChange({ key: buildKey(newBase, newAcc) })
  }

  const handleAccidental = (newAcc) => {
    if (disabledAccidentals(base).includes(newAcc)) return
    setAccidental(newAcc)
    onChange({ key: buildKey(base, newAcc) })
  }

  const disabled = disabledAccidentals(base)

  // 다이얼 위치(정수 칸)에 해당하는 음 선택
  const selectIndex = (idx) => {
    const note = MAJOR_NOTES[mod(idx)]
    if (note !== base) handleBase(note)
  }

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { startX: e.clientX, startOffset: offset, moved: false }
    setDragging(true)
  }
  const onPointerMove = (e) => {
    if (!dragging) return
    const dx = e.clientX - drag.current.startX
    if (Math.abs(dx) > 3) drag.current.moved = true
    const next = drag.current.startOffset - dx / ITEM_W
    setOffset(next)
    selectIndex(Math.round(next)) // 가운데 오는 음을 실시간 반영
  }
  const onPointerUp = (e) => {
    if (!dragging) return
    setDragging(false)
    let target = Math.round(offset)
    if (!drag.current.moved && e.type === 'pointerup') {
      // 끌지 않고 클릭만 한 경우: 클릭한 칸을 가운데로
      const rect = e.currentTarget.getBoundingClientRect()
      target = Math.round(offset + (e.clientX - (rect.left + rect.width / 2)) / ITEM_W)
    }
    setOffset(target) // 가장 가까운 음으로 스냅
    selectIndex(target)
  }
  const step = (d) => {
    const target = Math.round(offset) + d
    setOffset(target)
    selectIndex(target)
  }
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
  }
  const onWheel = (e) => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    if (d === 0) return
    step(d > 0 ? 1 : -1)
  }

  const center = Math.round(offset)
  const visible = []
  for (let i = center - 3; i <= center + 3; i++) visible.push(i)

  return (
    <div>
      <label className="label mb-2">키(Key)</label>

      <div className="flex items-center gap-1">
        {/* ── 키 이름 다이얼 ── */}
        <div
          tabIndex={0}
          role="slider"
          aria-label="키 선택 다이얼"
          aria-valuetext={base}
          className={`relative h-10 w-[220px] overflow-hidden rounded-lg border border-gray-700 bg-gray-900 select-none touch-none outline-none focus:border-blue-500 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, #000 22%, #000 78%, transparent)', maskImage: 'linear-gradient(to right, transparent, #000 22%, #000 78%, transparent)' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          onWheel={onWheel}
          title="좌우로 끌어서 키 선택"
        >
          {/* 가운데 선택 표시 */}
          <div className="absolute top-1 bottom-1 left-1/2 -translate-x-1/2 rounded-md bg-blue-600 pointer-events-none" style={{ width: ITEM_W - 4 }} />

          {visible.map(i => {
            const dist = i - offset
            const near = Math.abs(dist) < 0.5
            return (
              <div
                key={i}
                className="absolute top-0 h-full flex items-center justify-center font-bold"
                style={{
                  width: ITEM_W,
                  left: `calc(50% + ${dist * ITEM_W}px - ${ITEM_W / 2}px)`,
                  transition: dragging ? 'none' : 'left 0.2s ease-out',
                  fontSize: near ? '1.05rem' : '0.85rem',
                  color: near ? '#fff' : '#9ca3af',
                  opacity: Math.max(0.25, 1 - Math.abs(dist) * 0.3),
                }}
              >
                {MAJOR_NOTES[mod(i)]}
              </div>
            )
          })}
        </div>

        {/* 구분 공백 */}
        <div className="w-3" />

        {/* ── 변화표 라디오 ── */}
        {ACCIDENTAL_LIST.map(acc => {
          const isDisabled = disabled.includes(acc.value)
          const isSelected = accidental === acc.value
          return (
            <button
              key={acc.value}
              type="button"
              title={isDisabled ? `${acc.title} (이 키에서 사용 불가)` : acc.title}
              disabled={isDisabled}
              onClick={() => handleAccidental(acc.value)}
              className={`w-10 h-8 flex items-center justify-center rounded text-base font-semibold border transition-colors
                ${isDisabled
                  ? 'border-gray-700 text-gray-600 bg-gray-800 cursor-not-allowed opacity-40'
                  : isSelected
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white'}`}
            >
              {acc.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
