import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, Trash2, GripVertical, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'

const BW = 750
const BH = 1000
const MARK_MIME = 'application/x-songform-mark'
const DOCK_KEY = 'songform-markeditor-dock'
const DOCK_W = 192
const DOCK_W_COLLAPSED = 44

const clamp = (v) => Math.min(1, Math.max(0, v))
const newUid = () => `mk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

// 악보 한 장 위에 송폼 요소를 끌어다 배치하는 편집기
// 송폼 요소 팔레트는 세로 도크(기본 좌측, 끌어서 우측 이동 / 접기 가능)
export default function SheetMarkEditor({ sheetUrl, page, pageCount, marks, onSave, onClose }) {
  const formElements = useSettingsStore(s => s.formElements)
  // 이 장의 마커만 편집하고, 나머지 장의 마커는 그대로 보존
  const [pageMarks, setPageMarks] = useState(() => marks.filter(m => (m.page || 0) === page))
  const [selected, setSelected] = useState(null)
  const bodyRef = useRef(null)
  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const [scale, setScale] = useState(0.6)

  const [dock, setDockState] = useState(() => {
    try { return { side: 'left', collapsed: false, ...JSON.parse(localStorage.getItem(DOCK_KEY)) } }
    catch { return { side: 'left', collapsed: false } }
  })
  const setDock = (next) => setDockState(prev => {
    const v = { ...prev, ...next }
    try { localStorage.setItem(DOCK_KEY, JSON.stringify(v)) } catch { /* ignore */ }
    return v
  })
  const [dockDrag, setDockDrag] = useState(null)   // 도크 이동 중 포인터 x 좌표

  // 악보 한 장이 세로로 모두 보이도록 높이 기준으로 배율 계산
  useEffect(() => {
    const update = () => {
      if (!bodyRef.current) return
      const { clientWidth: w, clientHeight: h } = bodyRef.current
      setScale(Math.max(0.2, Math.min((h - 8) / BH, (w - 8) / BW)))
    }
    update()
    const ro = new ResizeObserver(update)
    if (bodyRef.current) ro.observe(bodyRef.current)
    return () => ro.disconnect()
  }, [])

  const pointToRatio = (clientX, clientY) => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: clamp((clientX - r.left) / r.width), y: clamp((clientY - r.top) / r.height) }
  }

  const addMark = (el, pos = { x: 0.5, y: 0.5 }) => {
    const mark = { uid: newUid(), page, x: pos.x, y: pos.y, id: el.id, name: el.name, color: el.color, repeat: 1 }
    setPageMarks(prev => [...prev, mark])
    setSelected(mark.uid)
  }

  // 팔레트 → 악보로 드롭
  const handleDrop = (e) => {
    const raw = e.dataTransfer.getData(MARK_MIME)
    if (!raw) return
    e.preventDefault()
    try { addMark(JSON.parse(raw), pointToRatio(e.clientX, e.clientY)) } catch { /* ignore */ }
  }

  // 악보 위 마커 이동 (pointer 이벤트)
  const startMove = (e, uid) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setSelected(uid)
    dragRef.current = uid
  }
  const moveMark = (e) => {
    const uid = dragRef.current
    if (!uid) return
    const pos = pointToRatio(e.clientX, e.clientY)
    setPageMarks(prev => prev.map(m => m.uid === uid ? { ...m, ...pos } : m))
  }
  const endMove = () => { dragRef.current = null }

  const updateSelected = (patch) => setPageMarks(prev => prev.map(m => m.uid === selected ? { ...m, ...patch } : m))
  const removeSelected = () => { setPageMarks(prev => prev.filter(m => m.uid !== selected)); setSelected(null) }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) {
        removeSelected()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    const others = marks.filter(m => (m.page || 0) !== page)
    onSave([...others, ...pageMarks])
  }

  const sel = pageMarks.find(m => m.uid === selected)
  const dockW = dock.collapsed ? DOCK_W_COLLAPSED : DOCK_W
  // 접기 아이콘: 도크가 붙은 쪽으로 접히는 방향
  const CollapseIcon = (dock.side === 'left') === !dock.collapsed ? ChevronsLeft : ChevronsRight
  const overRight = dockDrag !== null && dockDrag > window.innerWidth / 2

  const dockPanel = (
    <div
      className="flex-none flex flex-col bg-gray-900 select-none"
      style={{ width: dockW, [dock.side === 'left' ? 'borderRight' : 'borderLeft']: '1px solid #1f2937' }}
    >
      {/* 헤더: 잡고 끌어서 좌/우로 이동 */}
      <div
        className={`flex items-center gap-1 px-1.5 py-2 touch-none border-b border-gray-800 ${dockDrag !== null ? 'cursor-grabbing' : 'cursor-grab'} ${dock.collapsed ? 'flex-col' : 'justify-between'}`}
        title="끌어서 좌/우 이동"
        onPointerDown={(e) => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); setDockDrag(e.clientX) }}
        onPointerMove={(e) => { if (dockDrag !== null) setDockDrag(e.clientX) }}
        onPointerUp={(e) => {
          if (dockDrag === null) return
          setDock({ side: e.clientX > window.innerWidth / 2 ? 'right' : 'left' })
          setDockDrag(null)
        }}
        onPointerCancel={() => setDockDrag(null)}
      >
        <GripVertical size={14} className="text-gray-600 shrink-0" />
        {!dock.collapsed && (
          <span className="flex-1 text-xs font-semibold text-gray-400">
            송폼 요소{pageCount > 1 ? ` · ${page + 1}/${pageCount}장` : ''}
          </span>
        )}
        <button
          type="button"
          className="p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-gray-800"
          title={dock.collapsed ? '펼치기' : '접기'}
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setDock({ collapsed: !dock.collapsed })}
        >
          <CollapseIcon size={14} />
        </button>
      </div>

      {/* 요소 목록 (세로) */}
      {!dock.collapsed ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-3">
          <div>
            <div className="flex flex-col gap-1.5" title="악보로 끌어다 놓기 (클릭: 가운데에 추가)">
              {formElements.map(el => (
                <div
                  key={el.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData(MARK_MIME, JSON.stringify(el)); e.dataTransfer.effectAllowed = 'copy' }}
                  onClick={() => addMark(el)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border cursor-grab active:cursor-grabbing transition-transform hover:scale-[1.03]"
                  style={{ backgroundColor: el.color + '22', borderColor: el.color + '88', color: el.color }}
                >
                  <span className="truncate">{el.name}</span>
                  {el.name_ko && <span className="opacity-70 truncate">({el.name_ko})</span>}
                </div>
              ))}
              {formElements.length === 0 && <span className="text-xs text-gray-600">환경설정에서 송폼 요소를 추가해주세요.</span>}
            </div>
          </div>

          {/* 선택한 요소 설정 */}
          {sel && (
            <div className="pt-2 border-t border-gray-800 space-y-2 text-xs text-gray-300">
              <div className="font-bold" style={{ color: sel.color }}>선택: {sel.name}</div>
              <label className="flex items-center gap-1">반복 ×
                <input
                  type="number" min="1" max="9" value={sel.repeat || 1}
                  onChange={e => updateSelected({ repeat: Math.min(9, Math.max(1, parseInt(e.target.value) || 1)) })}
                  className="w-12 text-center bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-200"
                />
              </label>
              <button type="button" className="flex items-center gap-1 text-gray-400 hover:text-red-400" onClick={removeSelected}>
                <Trash2 size={13} /> 삭제
              </button>
            </div>
          )}
        </div>
      ) : <div className="flex-1" />}

      {/* 적용 / 취소 */}
      <div className={`flex-none p-2 border-t border-gray-800 flex gap-1.5 ${dock.collapsed ? 'flex-col' : ''}`}>
        <button type="button" className="btn btn-ghost flex-1 justify-center px-2 text-gray-400" onClick={onClose} title="취소 (Esc)">
          <X size={15} />{!dock.collapsed && ' 취소'}
        </button>
        <button type="button" className="btn btn-primary flex-1 justify-center px-2" onClick={handleSave} title="적용">
          <Check size={15} />{!dock.collapsed && ' 적용'}
        </button>
      </div>
    </div>
  )

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex" style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}>
      {dock.side === 'left' && dockPanel}

      {/* 악보 캔버스: 세로 한 장이 모두 보이도록 높이에 맞춤 */}
      <div ref={bodyRef} className="flex-1 min-w-0 flex items-center justify-center overflow-hidden relative">
        {dockDrag !== null && (
          <div className={`absolute inset-y-0 w-1/2 z-10 pointer-events-none bg-blue-500/15 border-blue-500 ${overRight ? 'right-0 border-l-2' : 'left-0 border-r-2'}`} />
        )}
        <div style={{ width: BW * scale, height: BH * scale, flexShrink: 0 }}>
          <div
            ref={canvasRef}
            style={{ width: BW, height: BH, transform: `scale(${scale})`, transformOrigin: 'top left', backgroundColor: '#fff', position: 'relative', overflow: 'hidden', fontFamily: '"Noto Sans KR", sans-serif', touchAction: 'none' }}
            onDragOver={(e) => { if (Array.from(e.dataTransfer.types).includes(MARK_MIME)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } }}
            onDrop={handleDrop}
            onPointerDown={() => setSelected(null)}
          >
            <img
              src={sheetUrl} alt="악보" draggable={false}
              style={{ position: 'absolute', left: '2.5%', top: '2.5%', width: '95%', height: '95%', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }}
            />
            {pageMarks.map(m => (
              <div
                key={m.uid}
                onPointerDown={(e) => startMove(e, m.uid)}
                onPointerMove={moveMark}
                onPointerUp={endMove}
                onPointerCancel={endMove}
                style={{
                  position: 'absolute', left: `${m.x * 100}%`, top: `${m.y * 100}%`,
                  transform: 'translate(-50%, -50%)', cursor: 'grab', whiteSpace: 'nowrap',
                  padding: '0 6px', color: '#DC2626', fontWeight: 'bold', fontSize: 22, lineHeight: 1.3,
                  border: m.uid === selected ? '2px solid #3B82F6' : '2px dashed rgba(220,38,38,0.45)',
                  borderRadius: 6, background: 'rgba(255,255,255,0.55)', userSelect: 'none',
                }}
              >
                {m.name}
                {m.repeat > 1 && <span style={{ fontSize: 17 }}>x{m.repeat}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {dock.side === 'right' && dockPanel}
    </div>,
    document.body
  )
}
