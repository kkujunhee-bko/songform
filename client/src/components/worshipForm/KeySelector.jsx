import { useState, useEffect, useRef } from 'react'
import { MAJOR_NOTES, ACCIDENTAL_LIST, parseKey, buildKey } from '../../lib/keyUtils'

/**
 * 키(Key) 선택기
 * - 키 이름(C~B) : 독립 라디오 그룹
 * - 변화표(♭ ♮ ♯) : 독립 라디오 그룹
 * - 두 그룹은 서로 간섭 없음
 */
export default function KeySelector({ value = 'C', onChange }) {
  const parsed = parseKey(value)

  // 각각 독립적인 로컬 상태
  const [base, setBase]             = useState(parsed.base)
  const [accidental, setAccidental] = useState(parsed.accidental)

  // 외부(DB 로드 등)에서 value가 변경될 때만 동기화
  const prevValue = useRef(value)
  useEffect(() => {
    if (prevValue.current !== value) {
      const p = parseKey(value)
      setBase(p.base)
      setAccidental(p.accidental)
      prevValue.current = value
    }
  }, [value])

  const handleBase = (newBase) => {
    setBase(newBase)
    onChange({ key: buildKey(newBase, accidental) })
  }

  const handleAccidental = (newAcc) => {
    setAccidental(newAcc)
    onChange({ key: buildKey(base, newAcc) })
  }

  return (
    <div>
      <label className="label mb-2">키(Key)</label>

      <div className="flex items-center gap-1">
        {/* ── 키 이름 라디오 ── */}
        {MAJOR_NOTES.map(note => (
          <button
            key={note}
            type="button"
            onClick={() => handleBase(note)}
            className={`w-8 h-8 flex items-center justify-center rounded text-sm font-bold border transition-colors
              ${base === note
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white'}`}
          >
            {note}
          </button>
        ))}

        {/* 구분 공백 */}
        <div className="w-3" />

        {/* ── 변화표 라디오 ── */}
        {ACCIDENTAL_LIST.map(acc => (
          <button
            key={acc.value}
            type="button"
            title={acc.title}
            onClick={() => handleAccidental(acc.value)}
            className={`w-10 h-8 flex items-center justify-center rounded text-base font-semibold border transition-colors
              ${accidental === acc.value
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white'}`}
          >
            {acc.label}
          </button>
        ))}
      </div>
    </div>
  )
}
