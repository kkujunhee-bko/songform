import { useState, useRef, useCallback, useEffect } from 'react'
import { GripVertical, ChevronsLeft, ChevronsRight, ChevronUp, ChevronDown } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { PALETTE_MIME } from './FormFlowBuilder'

const STORAGE_KEY = 'songform-palette-dock'
const WIDTH = 192          // 펼친 너비 (w-48)
const WIDTH_COLLAPSED = 40 // 접힌 너비 (w-10)
const SNAP = 48            // 화면 가장자리에서 이 거리 안에 놓으면 자석처럼 붙음

const DEFAULT_DOCK = { mode: 'right', x: 0, y: 96, collapsed: false } // mode: left | right | float

// 도킹 상태에 따라 본문에 확보할 여백 (lg 이상에서만 툴바 표시)
export function dockPaddingClass(dock) {
  if (dock.mode === 'left') return dock.collapsed ? 'lg:pl-10' : 'lg:pl-48'
  if (dock.mode === 'right') return dock.collapsed ? 'lg:pr-10' : 'lg:pr-48'
  return ''
}

export function usePaletteDock() {
  const [dock, setDockState] = useState(() => {
    try { return { ...DEFAULT_DOCK, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) } }
    catch { return DEFAULT_DOCK }
  })
  const setDock = useCallback((next) => {
    setDockState(prev => {
      const value = typeof next === 'function' ? next(prev) : next
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)) } catch { /* ignore */ }
      return value
    })
  }, [])
  return [dock, setDock]
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

// 툴바가 움직일 수 있는 가로 범위: 메인 영역 (LNB 오른쪽 ~ 세로 스크롤바 왼쪽)
function measureBounds() {
  const main = document.querySelector('main')
  if (!main) return { left: 0, right: document.documentElement.clientWidth }
  const rect = main.getBoundingClientRect()
  return { left: rect.left, right: rect.left + main.clientWidth }
}

function useMainBounds() {
  const [bounds, setBounds] = useState(measureBounds)
  useEffect(() => {
    const update = () => setBounds(prev => {
      const next = measureBounds()
      return next.left === prev.left && next.right === prev.right ? prev : next
    })
    update()
    window.addEventListener('resize', update)
    const main = document.querySelector('main')
    const ro = main && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(main)
    if (main?.firstElementChild) ro?.observe(main.firstElementChild)
    return () => {
      window.removeEventListener('resize', update)
      ro?.disconnect()
    }
  }, [])
  return bounds
}

// 드래그하여 송폼 흐름에 요소를 추가하는 이동/접기/도킹 가능 툴바
export default function FormElementPalette({ dock, setDock }) {
  const formElements = useSettingsStore(s => s.formElements)
  const panelRef = useRef(null)
  const grab = useRef({ dx: 0, dy: 0 })
  const [drag, setDrag] = useState(null) // 이동 중 좌표 {x, y}
  const bounds = useMainBounds()

  const width = dock.collapsed ? WIDTH_COLLAPSED : WIDTH

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    const rect = panelRef.current.getBoundingClientRect()
    grab.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ x: rect.left, y: rect.top })
  }

  const onPointerMove = (e) => {
    if (!drag) return
    setDrag({
      x: clamp(e.clientX - grab.current.dx, bounds.left, Math.max(bounds.left, bounds.right - width)),
      y: clamp(e.clientY - grab.current.dy, 0, window.innerHeight - 48),
    })
  }

  const onPointerUp = () => {
    if (!drag) return
    const { x, y } = drag
    if (x < bounds.left + SNAP) setDock(d => ({ ...d, mode: 'left', y }))
    else if (x + width > bounds.right - SNAP) setDock(d => ({ ...d, mode: 'right', y }))
    else setDock(d => ({ ...d, mode: 'float', x, y }))
    setDrag(null)
  }

  // 위치 계산 (이동 중 > 도킹 > 자유 배치)
  let pos
  if (drag) pos = { left: drag.x, top: drag.y }
  else if (dock.mode === 'left') pos = { left: bounds.left, top: dock.y }
  else if (dock.mode === 'right') pos = { left: bounds.right - width, top: dock.y }
  else pos = { left: clamp(dock.x, bounds.left, Math.max(bounds.left, bounds.right - width)), top: dock.y }

  const nearLeft = drag && drag.x < bounds.left + SNAP
  const nearRight = drag && drag.x + width > bounds.right - SNAP

  const CollapseIcon = dock.mode === 'left'
    ? (dock.collapsed ? ChevronsRight : ChevronsLeft)
    : dock.mode === 'right'
      ? (dock.collapsed ? ChevronsLeft : ChevronsRight)
      : (dock.collapsed ? ChevronDown : ChevronUp)

  const toggle = (
    <button
      type="button"
      className="p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-gray-800"
      title={dock.collapsed ? '펼치기' : '접기'}
      onPointerDown={e => e.stopPropagation()}
      onClick={() => setDock(d => ({ ...d, collapsed: !d.collapsed }))}
    >
      <CollapseIcon size={14} />
    </button>
  )

  return (
    <>
      {/* 도킹 가이드 */}
      {drag && (
        <>
          <div style={{ left: bounds.left }} className={`hidden lg:block fixed inset-y-0 w-12 z-40 pointer-events-none border-r-2 transition-colors ${nearLeft ? 'bg-blue-500/20 border-blue-500' : 'border-transparent'}`} />
          <div style={{ left: bounds.right - SNAP }} className={`hidden lg:block fixed inset-y-0 w-12 z-40 pointer-events-none border-l-2 transition-colors ${nearRight ? 'bg-blue-500/20 border-blue-500' : 'border-transparent'}`} />
        </>
      )}

      <div
        ref={panelRef}
        className="hidden lg:block fixed z-50 bg-gray-900 border border-gray-800 shadow-xl rounded-xl select-none"
        style={{ ...pos, width }}
      >
        {/* 헤더: 잡고 끌어서 이동 */}
        <div
          className={`flex items-center gap-1 px-1.5 py-1.5 touch-none ${drag ? 'cursor-grabbing' : 'cursor-grab'} ${dock.collapsed ? 'flex-col' : 'border-b border-gray-800 justify-between'}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          title="끌어서 위치 이동 (화면 좌/우 끝에 놓으면 붙습니다)"
        >
          <GripVertical size={14} className="text-gray-600 shrink-0" />
          {!dock.collapsed && <span className="flex-1 text-xs font-semibold text-gray-400">송폼 요소</span>}
          {toggle}
          {dock.collapsed && (
            <span className="text-[11px] font-semibold text-gray-500 py-1" style={{ writingMode: 'vertical-rl' }}>
              송폼 요소
            </span>
          )}
        </div>

        {!dock.collapsed && (
          <div className="p-2">
            <div className="text-[11px] text-gray-600 mb-2">끌어서 송폼 흐름에 놓으세요</div>
            <div className="flex flex-col gap-1.5 max-h-[calc(100vh-10rem)] overflow-y-auto pr-0.5">
              {formElements.map(el => (
                <div
                  key={el.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'copy'
                    e.dataTransfer.setData(PALETTE_MIME, JSON.stringify(el))
                    e.dataTransfer.setData('text/plain', el.name)
                  }}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border cursor-grab active:cursor-grabbing transition-transform hover:scale-[1.03]"
                  style={{ backgroundColor: el.color + '22', borderColor: el.color + '88', color: el.color }}
                >
                  <span className="truncate">{el.name}</span>
                  {el.name_ko && <span className="opacity-70 truncate">({el.name_ko})</span>}
                </div>
              ))}
              {formElements.length === 0 && (
                <span className="text-xs text-gray-600">환경설정에서 송폼 요소를 추가해주세요.</span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
