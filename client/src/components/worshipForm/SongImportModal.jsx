import { useState, useMemo } from 'react'
import { X, ClipboardPaste, Loader } from 'lucide-react'
import { parseSongList } from '../../lib/songImport'

const PLACEHOLDER = `[11/8 주일예배]

A 예수 우리 왕이여
    (엔딩) 박수로 주께 영광!

E 우리 함께 기뻐해
    (엔딩) 바로 다음곡 인트로 연결`

// 곡 목록 텍스트 붙여넣기 → 미리보기 → 찬양 목록에 반영
export default function SongImportModal({ onClose, onImport }) {
  const [text, setText] = useState('')
  const [working, setWorking] = useState(false)
  const parsed = useMemo(() => parseSongList(text), [text])

  const handleImport = async () => {
    setWorking(true)
    try {
      await onImport(parsed)
      onClose()
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <ClipboardPaste size={18} className="text-blue-400" />
            <span className="font-semibold text-white">곡 목록 붙여넣기로 가져오기</span>
          </div>
          <button type="button" className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="label">곡 정보 텍스트</label>
            <textarea
              className="input font-mono text-sm resize-y"
              rows={9}
              autoFocus
              placeholder={PLACEHOLDER}
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <p className="text-xs text-gray-600 mt-1">
              "키 제목" 형식의 줄이 곡이 되고, 그 아래 줄은 송폼 코멘트가 됩니다.
              첫 줄 "[11/8 주일예배]"는 예배 날짜/구분에 반영됩니다.
            </p>
          </div>

          {/* 미리보기 */}
          {text.trim() && (
            <div>
              <div className="label">
                미리보기
                <span className="ml-1.5 text-gray-600 font-normal">({parsed.songs.length}곡)</span>
              </div>
              {parsed.header && (
                <div className="text-xs text-gray-400 mb-2">
                  예배 정보:{' '}
                  <span className="text-gray-200">{parsed.header.date || '날짜 인식 실패'}</span>
                  {parsed.header.categoryText && <> · <span className="text-gray-200">{parsed.header.categoryText}</span></>}
                </div>
              )}
              {parsed.songs.length === 0 ? (
                <div className="text-sm text-gray-600 py-3">인식된 곡이 없습니다. "A 곡제목" 형식인지 확인해 주세요.</div>
              ) : (
                <div className="space-y-1.5">
                  {parsed.songs.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-gray-800 border border-gray-700">
                      <span className="w-5 text-xs text-gray-500 pt-0.5 text-right">{i + 1}</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-600 text-xs font-bold text-white">{s.key}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-gray-100 break-words">{s.title}</div>
                        {s.comment && <div className="text-xs text-red-400 whitespace-pre-line break-words">{s.comment}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {parsed.ignored.length > 0 && (
                <div className="text-xs text-gray-600 mt-2">
                  무시된 줄: {parsed.ignored.join(' / ')}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-gray-800">
          <span className="text-xs text-gray-600">빈 곡 칸을 먼저 채우고, 남는 곡은 아래에 추가됩니다.</span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>취소</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={parsed.songs.length === 0 || working}
              onClick={handleImport}
            >
              {working && <Loader size={14} className="animate-spin" />}
              {parsed.songs.length}곡 가져오기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
