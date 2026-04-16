import { useState } from 'react'
import { GripVertical, Trash2, Music, Search, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import KeySelector from './KeySelector'
import FormFlowBuilder from './FormFlowBuilder'
import SheetMusicModal from './SheetMusicModal'
import api from '../../api/client'

export default function SongCard({ song, index, total = 20, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(true)
  const [showSheetMusic, setShowSheetMusic] = useState(false)
  const [titleSuggestions, setTitleSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.uid })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const searchSongs = async (query) => {
    if (!query || query.length < 1) { setTitleSuggestions([]); return }
    try {
      const results = await api.get(`/songs?q=${encodeURIComponent(query)}&limit=8`)
      setTitleSuggestions(results)
    } catch (e) { setTitleSuggestions([]) }
  }

  const handleTitleChange = (e) => {
    const val = e.target.value
    onUpdate({ song_title: val })
    searchSongs(val)
    setShowSuggestions(true)
  }

  const handleSelectSuggestion = (s) => {
    onUpdate({
      song_id: s.id,
      song_title: s.title,
      performance_key: s.default_key || 'C',
      semitone_adjustment: 0,
    })
    setTitleSuggestions([])
    setShowSuggestions(false)
  }

  const handleKeyChange = ({ key, semitone }) => {
    onUpdate({ performance_key: key, semitone_adjustment: semitone })
  }

  const handleSheetMusicSelect = (data) => {
    onUpdate({
      song_id: data.song_id,
      song_title: data.song_title || song.song_title,
      performance_key: data.performance_key || song.performance_key,
      sheet_music_url: data.sheet_music_url,
      sheet_music_snapshot: data.sheet_music_data,
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        position: 'relative',
        zIndex: isDragging ? 999 : (total - index + 1),
      }}
      className="card border-gray-800"
    >
      {/* 카드 헤더 */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* 드래그 핸들 */}
        <div
          className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 flex-shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </div>

        {/* 번호 뱃지 */}
        <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-white">{index + 1}</span>
        </div>

        {/* 노래 제목 입력 */}
        <div className="flex-1 relative">
          <input
            className="input"
            placeholder="노래 제목 (필수)"
            value={song.song_title || ''}
            onChange={handleTitleChange}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {/* 자동완성 드롭다운 */}
          {showSuggestions && titleSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden" style={{ zIndex: 9999 }}>
              {titleSuggestions.map(s => (
                <button
                  key={s.id}
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors flex items-center justify-between"
                  onMouseDown={() => handleSelectSuggestion(s)}
                >
                  <div>
                    <div className="text-sm text-white">{s.title}</div>
                    {s.artist && <div className="text-xs text-gray-400">{s.artist}</div>}
                  </div>
                  {s.default_key && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-900 text-blue-300 rounded font-mono">{s.default_key}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 악보 검색 버튼 */}
        <button
          type="button"
          className="btn btn-ghost p-2 flex-shrink-0"
          title="악보 검색"
          onClick={() => setShowSheetMusic(true)}
        >
          <Search size={16} />
        </button>

        {/* 악보 링크 있으면 표시 */}
        {song.sheet_music_url && (
          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="악보 연결됨" />
        )}

        {/* 접기/펼치기 */}
        <button
          type="button"
          className="btn btn-ghost p-2 flex-shrink-0"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* 삭제 버튼 */}
        <button
          type="button"
          className="btn btn-ghost p-2 hover:text-red-400 flex-shrink-0"
          onClick={onRemove}
          title="곡 삭제"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* 카드 바디 (접기 가능) */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
          {/* 키 선택 */}
          <KeySelector
            value={song.performance_key || 'C'}
            semitone={song.semitone_adjustment || 0}
            onChange={handleKeyChange}
          />

          {/* 송폼 흐름 빌더 */}
          <FormFlowBuilder
            flow={song.form_flow || []}
            onChange={(flow) => onUpdate({ form_flow: flow })}
          />

          {/* 송폼 코멘트 */}
          <div>
            <label className="label flex items-center gap-1.5">
              <MessageSquare size={11} />
              송폼 코멘트
              <span className="text-gray-600 font-normal">(PPT 악보 하단에 적색으로 표시)</span>
            </label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="악보 연주 시 참고 사항, 특이사항 등..."
              value={song.comment || ''}
              onChange={e => onUpdate({ comment: e.target.value })}
            />
          </div>

          {/* 악보 이미지 미리보기 */}
          {song.sheet_music_url && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Music size={12} />
                <span>첨부 악보</span>
                <button
                  type="button"
                  className="ml-auto text-xs text-gray-600 hover:text-red-400 transition-colors"
                  onClick={() => onUpdate({ sheet_music_url: null })}
                  title="악보 제거"
                >
                  ✕
                </button>
              </div>
              <a
                href={song.sheet_music_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={song.sheet_music_url}
                  alt="악보"
                  className="max-h-56 w-auto rounded-lg border border-gray-700 hover:border-blue-500 transition-colors object-contain bg-gray-800"
                />
              </a>
            </div>
          )}
        </div>
      )}

      {/* 악보 검색 모달 */}
      {showSheetMusic && (
        <SheetMusicModal
          songTitle={song.song_title}
          songId={song.song_id}
          onSelect={handleSheetMusicSelect}
          onClose={() => setShowSheetMusic(false)}
        />
      )}
    </div>
  )
}
