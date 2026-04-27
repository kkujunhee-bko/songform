import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, Eye, FileDown, Loader } from 'lucide-react'

const BW = 750
const BH = 1000

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

function getFlowItems(formFlow) {
  return (Array.isArray(formFlow) ? formFlow : []).map(el => {
    const initial = (el.name || '?')
    const rSuffix = el.repeat && el.repeat > 1 ? `x${el.repeat}` : ''
    return { initial, rSuffix }
  })
}

function CoverSlide({ categoryName, dateStr, leaderStr, season, songs }) {
  const maxSongs = Math.min(songs.length, 10)
  const lineH = songs.length > 8 ? 42 : 48
  const SONG_START_Y = 518
  const seasonY = leaderStr ? 375 : 325

  return (
    <div style={{
      width: BW, height: BH, backgroundColor: '#FFFFFF',
      position: 'relative', overflow: 'hidden',
      fontFamily: '"Noto Sans KR", sans-serif',
    }}>
      <div style={{
        position: 'absolute', left: 40, top: 70, width: 670, height: 160,
        fontSize: 54, fontWeight: 'bold', color: '#1E293B',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', lineHeight: 1.25,
      }}>
        {categoryName}
      </div>
      <div style={{
        position: 'absolute', left: 40, top: 250, width: 670, height: 55,
        fontSize: 22, color: '#475569',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {dateStr}
      </div>
      {leaderStr && (
        <div style={{
          position: 'absolute', left: 40, top: 315, width: 670, height: 45,
          fontSize: 16, color: '#334155',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          인도자 : {leaderStr}
        </div>
      )}
      {season?.name && (
        <div style={{
          position: 'absolute', left: 230, top: seasonY, width: 290, height: 52,
          backgroundColor: season.color || '#6366F1', borderRadius: 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' }}>{season.name}</span>
        </div>
      )}
      <div style={{ position: 'absolute', left: 40, top: 455, width: 670, height: 1.5, backgroundColor: '#E2E8F0' }} />
      <div style={{
        position: 'absolute', left: 40, top: 465, width: 670, height: 40,
        fontSize: 12, color: '#A8B4C0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        [ 예배 순서 ]
      </div>
      {songs.slice(0, maxSongs).map((song, i) => (
        <div key={i} style={{
          position: 'absolute', left: 0, top: SONG_START_Y + i * lineH,
          width: BW, height: lineH, display: 'flex', alignItems: 'center',
        }}>
          <span style={{ position: 'absolute', left: 40, width: 35, fontSize: 14, fontWeight: 'bold', color: '#3B82F6', textAlign: 'center' }}>
            {i + 1}
          </span>
          <span style={{ position: 'absolute', left: 85, right: 40, fontSize: 14, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {song.song_title}
            {song.performance_key && (
              <span style={{ color: '#3B82F6', fontWeight: 'bold' }}> - {song.performance_key}</span>
            )}
          </span>
        </div>
      ))}
      {songs.length > 10 && (
        <div style={{
          position: 'absolute', left: 40, top: SONG_START_Y + 10 * lineH, width: 670, height: 38,
          fontSize: 12, color: '#A8B4C0', textAlign: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          외 {songs.length - 10}곡
        </div>
      )}
    </div>
  )
}

function SongSlide({ song, index }) {
  const flowItems = getFlowItems(song.form_flow)

  // 상단 번호 뱃지 위치/크기 (px, BH=1000 기준)
  const BADGE_X = 10, BADGE_Y = 5, BADGE_W = 50, BADGE_H = 50

  // 송폼 흐름 아이콘 시작 위치 (뱃지 우측)
  const FLOW_START_X = 70, FLOW_Y = 5

  // 코멘트 영역: PPT 12pt 기준 환산 (12 / 72 × 100 ≈ 17px)
  // BH=1000px = 10인치이므로 1인치 = 100px, 1pt = 100/72px
  const COMMENT_FONT = 17
  const COMMENT_H = 180            // 최대 7줄 수용 높이
  const COMMENT_BOTTOM = 5         // 슬라이드 하단 여백

  return (
    <div style={{
      width: BW, height: BH, backgroundColor: '#FFFFFF',
      position: 'relative', overflow: 'hidden',
      fontFamily: '"Noto Sans KR", sans-serif',
    }}>
      {/* 악보 이미지: 슬라이드 전체를 이미지 영역으로 사용, contain으로 비율 유지
          → PPT 출력과 동일하게 여백은 이미지 자체 비율에서 자연 발생 */}
      {song.sheet_music_url ? (
        <img src={song.sheet_music_url} alt="악보" style={{ position: 'absolute', left: '2.5%', top: '2.5%', width: '95%', height: '95%' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#CBD5E1', fontStyle: 'italic' }}>
          악보가 첨부되지 않았습니다.
        </div>
      )}

      {/* 번호 뱃지: 좌상단 고정, 흰 배경 + 진한 회색 테두리 */}
      <div style={{ position: 'absolute', left: BADGE_X, top: BADGE_Y, width: BADGE_W, height: BADGE_H, background: 'transparent', border: '2px solid #4B5563', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <span style={{ fontSize: 20, fontWeight: 'bold', color: '#000000' }}>{index + 1}</span>
      </div>

      {/* 송폼 흐름 아이콘: 뱃지 우측, 최대 2행
          PPT pt → 미리보기 px 환산: pt × (100 / 72)
          메인 16pt→22px / rSuffix 12pt→17px / 화살표 13pt→18px */}
      {flowItems.length > 0 && (
        <div style={{ position: 'absolute', left: FLOW_START_X, top: FLOW_Y, right: 10, maxHeight: BADGE_H * 2 + 6, overflow: 'hidden', display: 'flex', flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', rowGap: '2px', zIndex: 1 }}>
          {flowItems.map((item, fi) => (
            <span key={fi} style={{ display: 'inline-block', whiteSpace: 'nowrap', fontSize: 22, fontWeight: 'bold', color: '#DC2626', lineHeight: 1.2, verticalAlign: 'middle' }}>
              {fi > 0 && <span style={{ fontSize: 18, margin: '0 2px' }}>→</span>}
              {item.initial}
              {item.rSuffix && <span style={{ fontSize: 17 }}>{item.rSuffix}</span>}
            </span>
          ))}
        </div>
      )}

      {/* 코멘트: 하단 고정, 좌측 정렬, 줄바꿈(\n) 적용 */}
      {song.comment?.trim() && (
        <div style={{
          position: 'absolute', left: 18, right: 24, bottom: COMMENT_BOTTOM,
          maxHeight: COMMENT_H,
          fontSize: COMMENT_FONT, fontWeight: 'bold', color: '#DC2626',
          textAlign: 'left',
          whiteSpace: 'pre-wrap',  // \n 줄바꿈 반영
          overflow: 'hidden',
          zIndex: 1,
        }}>
          {song.comment.trim()}
        </div>
      )}
    </div>
  )
}

function ScaledSlide({ children, slideW, slideH }) {
  const scale = slideH / BH
  return (
    <div style={{ width: slideW, height: slideH, flexShrink: 0, overflow: 'hidden', borderRadius: 4, boxShadow: '0 4px 28px rgba(0,0,0,0.6)' }}>
      <div style={{ width: BW, height: BH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  )
}

export default function PptPreviewModal({ onClose, onExport, exporting, formData, songs, season, members, leaderIds, categories }) {
  const [viewMode, setViewMode] = useState('1')
  const [currentPage, setCurrentPage] = useState(0)
  const bodyRef = useRef(null)
  const [bodySize, setBodySize] = useState({ w: 900, h: 640 })

  useEffect(() => {
    const update = () => {
      if (bodyRef.current) setBodySize({ w: bodyRef.current.clientWidth, h: bodyRef.current.clientHeight })
    }
    update()
    const ro = new ResizeObserver(update)
    if (bodyRef.current) ro.observe(bodyRef.current)
    return () => ro.disconnect()
  }, [])

  // Reset page when view mode changes
  useEffect(() => setCurrentPage(0), [viewMode])

  const filteredSongs = songs.filter(s => s.song_title?.trim())
  const categoryName = categories.find(c => c.id === formData.category_id)?.name || '예배'
  const leaderStr = members.filter(m => leaderIds.includes(m.id)).map(m => m.name).join(' · ')
  const dateStr = formatDate(formData.worship_date)

  const slides = [
    { type: 'cover', key: 'cover' },
    ...filteredSongs.map((song, i) => ({ type: 'song', song, index: i, key: song.uid || `song-${i}` })),
  ]

  const ARROW_BTN_W = 36   // 화살표 버튼 너비 (최소화)

  // 1장 보기: 가능한 최대 높이로
  const maxH1 = bodySize.h
  const maxW1 = bodySize.w - ARROW_BTN_W * 2
  const slideH1 = Math.min(maxH1, Math.round(maxW1 * BH / BW))
  const slideW1 = Math.round(slideH1 * BW / BH)

  // 2장 보기: 두 슬라이드 나란히
  const GAP2 = 8
  const availW2 = bodySize.w - ARROW_BTN_W * 2 - GAP2
  const eachW2 = Math.floor(availW2 / 2)
  const slideH2 = Math.min(bodySize.h, Math.round(eachW2 * BH / BW))
  const slideW2 = Math.round(slideH2 * BW / BH)

  const slideH = viewMode === '2' ? slideH2 : slideH1
  const slideW = viewMode === '2' ? slideW2 : slideW1

  const totalPages = viewMode === '2' ? Math.ceil(slides.length / 2) : slides.length
  const safePage = Math.min(currentPage, totalPages - 1)

  const prevPage = () => setCurrentPage(p => Math.max(0, p - 1))
  const nextPage = () => setCurrentPage(p => Math.min(totalPages - 1, p + 1))

  const renderSlide = (sd) => {
    if (sd.type === 'cover') {
      return <CoverSlide categoryName={categoryName} dateStr={dateStr} leaderStr={leaderStr} season={season} songs={filteredSongs} />
    }
    return <SongSlide song={sd.song} index={sd.index} />
  }

  // 현재 페이지에 보여줄 슬라이드
  const visibleSlides = viewMode === '2'
    ? slides.slice(safePage * 2, safePage * 2 + 2)
    : [slides[safePage]]

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ backgroundColor: 'rgba(0,0,0,0.90)' }}>
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-2.5">
          <Eye size={16} className="text-indigo-400" />
          <span className="font-semibold text-white text-sm">PPT 미리보기</span>
          <span className="text-gray-500 text-xs">{safePage + 1} / {totalPages}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExport}
            disabled={exporting}
            className="btn btn-secondary"
          >
            {exporting ? <Loader size={16} className="animate-spin" /> : <FileDown size={16} />}
            PPT 내보내기
          </button>
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-indigo-700 overflow-hidden text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('1')}
              className={`px-3 py-1.5 transition-colors ${
                viewMode === '1'
                  ? 'bg-indigo-400 text-white'
                  : 'text-indigo-300 hover:text-white hover:bg-indigo-700/60'
              }`}
            >
              1장 보기
            </button>
            <div className="w-px bg-indigo-700" />
            <button
              type="button"
              onClick={() => setViewMode('2')}
              className={`px-3 py-1.5 transition-colors ${
                viewMode === '2'
                  ? 'bg-indigo-400 text-white'
                  : 'text-indigo-300 hover:text-white hover:bg-indigo-700/60'
              }`}
            >
              2장 보기
            </button>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Slide area */}
      <div ref={bodyRef} className="flex-1 flex items-center justify-center overflow-hidden">
        {/* Prev button */}
        <button
          type="button"
          onClick={prevPage}
          disabled={safePage === 0}
          className="flex-none flex items-center justify-center p-2 rounded-full transition-colors"
          style={{
            width: ARROW_BTN_W, height: 48,
            color: safePage === 0 ? '#374151' : '#D1D5DB',
            backgroundColor: safePage === 0 ? 'transparent' : 'rgba(31,41,55,0.8)',
          }}
        >
          <ChevronLeft size={24} />
        </button>

        {/* Slides */}
        <div
          className="flex items-center justify-center"
          style={{ gap: viewMode === '2' ? GAP2 : 0, flex: '0 0 auto' }}
        >
          {visibleSlides.filter(Boolean).map(sd => (
            <ScaledSlide key={sd.key} slideW={slideW} slideH={slideH}>
              {renderSlide(sd)}
            </ScaledSlide>
          ))}
        </div>

        {/* Next button */}
        <button
          type="button"
          onClick={nextPage}
          disabled={safePage >= totalPages - 1}
          className="flex-none flex items-center justify-center p-2 rounded-full transition-colors"
          style={{
            width: ARROW_BTN_W, height: 48,
            color: safePage >= totalPages - 1 ? '#374151' : '#D1D5DB',
            backgroundColor: safePage >= totalPages - 1 ? 'transparent' : 'rgba(31,41,55,0.8)',
          }}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Footer */}
      <div className="flex-none py-1.5 flex justify-center gap-1.5">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentPage(i)}
            style={{
              width: i === safePage ? 20 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === safePage ? '#6366F1' : '#374151',
              transition: 'all 0.2s',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>,
    document.body
  )
}
