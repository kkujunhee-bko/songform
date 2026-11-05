import { useState } from 'react'
import { GripVertical, Trash2, Copy, Music, Search, ChevronDown, ChevronUp, Drum, MapPin } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import KeySelector from './KeySelector'
import SheetMusicModal from './SheetMusicModal'
import SheetMarkEditor from './SheetMarkEditor'
import api from '../../api/client'
import { getSheetUrls, sheetPatch } from '../../lib/sheetUrls'
import { getSheetMarks, marksOfPage } from '../../lib/sheetMarks'

export default function SongCard({ song, index, total = 20, onUpdate, onRemove, onDuplicate }) {
  const [expanded, setExpanded] = useState(true)
  const [showSheetMusic, setShowSheetMusic] = useState(false)
  const [markPage, setMarkPage] = useState(null)   // 송폼 배치 편집 중인 악보 장 인덱스
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
    })
    setTitleSuggestions([])
    setShowSuggestions(false)
  }

  const sheetUrls = getSheetUrls(song)
  const sheetMarks = getSheetMarks(song)

  const handleKeyChange = ({ key, semitone }) => {
    onUpdate({ performance_key: key, semitone_adjustment: semitone })
  }

  const handleSheetMusicSelect = (data) => {
    onUpdate({
      song_id: data.song_id,
      song_title: data.song_title || song.song_title,
      performance_key: data.performance_key || song.performance_key,
      semitone_adjustment: data.semitone_adjustment ?? song.semitone_adjustment ?? 0,
      // 직접 올리기(append)는 기존 악보 뒤에 이어 붙이고, 그 외 선택은 해당 악보 1장으로 교체
      ...sheetPatch(
        data.sheet_music_urls
          ? (data.append ? [...getSheetUrls(song), ...data.sheet_music_urls] : data.sheet_music_urls)
          : (data.sheet_music_url ? [data.sheet_music_url] : [])
      ),
      sheet_flow_marks: data.append ? sheetMarks : [],
      sheet_music_snapshot: data.sheet_music_data,
      ...(data.form_flow ? { form_flow: data.form_flow } : {}),
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

        {/* 찬양 제목 입력 */}
        <div className="flex-1 relative">
          <input
            className="input"
            placeholder="찬양 제목 (필수)"
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

        {/* 복제 버튼 */}
        <button
          type="button"
          className="btn btn-ghost p-2 hover:text-blue-400 flex-shrink-0"
          onClick={() => {
            if (window.confirm('복사 하시겠습니까?')) {
              onDuplicate()
            }
          }}
          title="곡 복제"
        >
          <Copy size={16} />
        </button>

        {/* 삭제 버튼 */}
        <button
          type="button"
          className="btn btn-ghost p-2 hover:text-red-400 flex-shrink-0"
          onClick={() => {
            const hasData = song.song_title ||
              (song.form_flow && song.form_flow.length > 0) ||
              song.comment ||
              song.sheet_music_url
            if (!hasData || window.confirm('곡을 삭제 하시겠습니까?')) {
              onRemove()
            }
          }}
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

          {/* 연주 정보 */}
          <div className="space-y-2">
            <label className="label flex items-center gap-1.5">
              <Drum size={11} />
              연주 정보
            </label>
            <div className="flex gap-2">
              {/* BPM (음원번호 입력과 같은 너비) */}
              <div className="w-48 flex-shrink-0">
                <span className="text-xs text-gray-500 mb-1 block">연주 속도(BPM)</span>
                <input
                  type="number"
                  className="input"
                  placeholder="예) 120"
                  min={1} max={300}
                  value={song.bpm || ''}
                  onChange={e => onUpdate({ bpm: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              {/* 연주 스타일 */}
              <div className="flex-1">
                <span className="text-xs text-gray-500 mb-1 block">연주 스타일</span>
                <input
                  type="text"
                  className="input"
                  placeholder="예) 발라드, 팝, 록..."
                  value={song.play_style || ''}
                  onChange={e => onUpdate({ play_style: e.target.value })}
                />
              </div>
            </div>
            {/* 송폼 코멘트 */}
            <div>
              <label className="label flex items-center gap-1.5">
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
            {/* 건반1 */}
            <div>
              <span className="text-xs text-gray-500 mb-1 block">건반 1 <span className="text-gray-600">(선택)</span></span>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input w-48 flex-shrink-0"
                  placeholder="음원번호"
                  value={song.keyboard1_sound_no || ''}
                  onChange={e => onUpdate({ keyboard1_sound_no: e.target.value })}
                />
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="음원명"
                  value={song.keyboard1_sound_name || ''}
                  onChange={e => onUpdate({ keyboard1_sound_name: e.target.value })}
                />
              </div>
            </div>
            {/* 건반2 */}
            <div>
              <span className="text-xs text-gray-500 mb-1 block">건반 2 <span className="text-gray-600">(선택)</span></span>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input w-48 flex-shrink-0"
                  placeholder="음원번호"
                  value={song.keyboard2_sound_no || ''}
                  onChange={e => onUpdate({ keyboard2_sound_no: e.target.value })}
                />
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="음원명"
                  value={song.keyboard2_sound_name || ''}
                  onChange={e => onUpdate({ keyboard2_sound_name: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* 첨부 악보 (여러 장: 한 장당 PPT 한 페이지) */}
          {sheetUrls.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Music size={12} />
                <span>첨부 악보 {sheetUrls.length > 1 && `(${sheetUrls.length}장)`}</span>
                <button
                  type="button"
                  className="ml-auto text-xs text-gray-600 hover:text-red-400 transition-colors"
                  onClick={() => {
                    if (window.confirm(sheetUrls.length > 1 ? '첨부 악보를 모두 삭제 하시겠습니까?' : '첨부 악보를 삭제 하시겠습니까?')) {
                      onUpdate({ ...sheetPatch([]), sheet_flow_marks: [] })
                    }
                  }}
                  title="악보 모두 제거"
                >
                  {sheetUrls.length > 1 ? '모두 삭제' : '✕'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sheetUrls.map((url, i) => (
                  <div key={`${url}-${i}`} className="relative group">
                    <div className="relative">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                          src={url}
                          alt={`악보 ${i + 1}`}
                          className="max-h-56 w-auto rounded-lg border border-gray-700 hover:border-blue-500 transition-colors object-contain bg-gray-800"
                        />
                      </a>
                      {/* 배치된 송폼 요소 미리보기 */}
                      {marksOfPage(sheetMarks, i).map(m => (
                        <span
                          key={m.uid}
                          className="absolute pointer-events-none text-red-600 font-bold text-[10px] leading-none whitespace-nowrap bg-white/60 rounded px-0.5"
                          style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, transform: 'translate(-50%, -50%)' }}
                        >
                          {m.name}{m.repeat > 1 ? `x${m.repeat}` : ''}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mt-1 w-full flex items-center justify-center gap-1 text-xs px-2 py-1 rounded-lg bg-indigo-900/40 text-indigo-300 border border-indigo-800 hover:bg-indigo-800/50 transition-colors"
                      onClick={() => setMarkPage(i)}
                      title="악보 위에 송폼 요소를 끌어서 배치"
                    >
                      <MapPin size={12} />
                      송폼 설정{marksOfPage(sheetMarks, i).length > 0 && ` (${marksOfPage(sheetMarks, i).length})`}
                    </button>
                    {sheetUrls.length > 1 && (
                      <>
                        <span className="absolute top-1 left-1 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">{i + 1}</span>
                        <button
                          type="button"
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-red-600 text-white text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                          title="이 악보만 삭제"
                          onClick={() => onUpdate({
                            ...sheetPatch(sheetUrls.filter((_, j) => j !== i)),
                            sheet_flow_marks: sheetMarks
                              .filter(m => (m.page || 0) !== i)
                              .map(m => (m.page || 0) > i ? { ...m, page: m.page - 1 } : m),
                          })}
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 악보 위 송폼 배치 편집기 */}
      {markPage !== null && sheetUrls[markPage] && (
        <SheetMarkEditor
          sheetUrl={sheetUrls[markPage]}
          page={markPage}
          pageCount={sheetUrls.length}
          marks={sheetMarks}
          onSave={(next) => { onUpdate({ sheet_flow_marks: next }); setMarkPage(null) }}
          onClose={() => setMarkPage(null)}
        />
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
