import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, Trash2, GripVertical, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { onSheetError } from '../../lib/sheetFallback'

const BW = 750
const BH = 1000
const MARK_MIME = 'application/x-songform-mark'
const DOCK_KEY = 'songform-markeditor-dock-v2'   // v2: 기본 위치 우측
const DOCK_W = 192
const DOCK_W_FLOOR = 110
const DOCK_W_COLLAPSED = 44

function measureMain() {
  const main = document.querySelector('main')
  if (!main) return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
  const r = main.getBoundingClientRect()
  return { left: r.left, top: r.top, width: main.clientWidth, height: main.clientHeight }
}

const clamp = (v) => Math.min(1, Math.max(0, v))
const newUid = () => `mk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

// 악보 한 장 위에 송폼 요소를 끌어다 배치하는 편집기
// LNB 오른쪽 메인 영역 전체를 덮는 작업 화면으로 열린다 (LNB는 그대로 보임)
// 송폼 요소 팔레트는 세로 도크(기본 좌측, 끌어서 우측 이동 / 접기 가능)
export default function SheetMarkEditor({ sheetUrl, page, pageCount, marks, onSave, onClose }) {
  const formElements = useSettingsStore(s => s.formElements)
  // 이 장의 마커만 편집하고, 나머지 장의 마커는 그대로 보존
  const [pageMarks, setPageMarks] = useState(() => marks.filter(m => (m.page || 0) === page))
  const [selected, setSelected] = useState(null)
  const rootRef = useRef(null)
  const bodyRef = useRef(null)
  const measureFullRef = useRef(null)
  const measureNameRef = useRef(null)
  const [limits, setLimits] = useState({ min: DOCK_W_FLOOR, max: DOCK_W })
  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const [scale, setScale] = useState(0.6)

  const [dock, setDockState] = useState(() => {
    try { return { side: 'right', collapsed: false, ...JSON.parse(localStorage.getItem(DOCK_KEY)) } }
    catch { return { side: 'right', collapsed: false } }
  })
  const setDock = (next) => setDockState(prev => {
    const v = { ...prev, ...next }
    try { localStorage.setItem(DOCK_KEY, JSON.stringify(v)) } catch { /* ignore */ }
    return v
  })
  // 너비 범위 측정: 최소 = 이니셜(이름)까지 보이는 폭, 최대 = 버튼 내용이 모두 보이는 폭
  useEffect(() => {
    const widest = (el) => Math.max(0, ...Array.from(el?.children || []).map(c => c.offsetWidth))
    const extra = 16 + 8 + 1   // 패딩 + 스크롤바 + 경계선
    const min = Math.max(DOCK_W_FLOOR, Math.ceil(widest(measureNameRef.current)) + extra)
    const max = Math.max(min, Math.ceil(widest(measureFullRef.current)) + extra)
    setLimits({ min, max })
  }, [formElements])
  const [resizing, setResizing] = useState(false)

  const [dockDrag, setDockDrag] = useState(null)   // 팔레트 이동 중 {x, y(편집기 기준 좌상단), cx(포인터 x)}
  const grabRef = useRef({ dx: 0, dy: 0 })

  // 메인 영역(LNB 오른쪽) 좌표를 따라가는 오버레이 영역
  const [area, setArea] = useState(() => measureMain())
  useEffect(() => {
    const update = () => setArea(measureMain())
    update()
    window.addEventListener('resize', update)
    const main = document.querySelector('main')
    const ro = main && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(main)
    return () => { window.removeEventListener('resize', update); ro?.disconnect() }
  }, [])

  // 팔레트 가장자리가 편집기 테두리 SNAP px 이내로 오면 그쪽으로 도킹, 그 외에는 현재 위치 유지
  const SNAP = 64
  const snapSide = (panelX) => {
    const r = rootRef.current?.getBoundingClientRect()
    if (!r) return null
    if (panelX <= SNAP) return 'left'
    if (panelX + dockW >= r.width - SNAP) return 'right'
    return null
  }

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
  const dockW = dock.collapsed ? DOCK_W_COLLAPSED : Math.min(limits.max, Math.max(limits.min, dock.width || limits.max))
  // 접기 아이콘: 도크가 붙은 쪽으로 접히는 방향
  const CollapseIcon = (dock.side === 'left') === !dock.collapsed ? ChevronsLeft : ChevronsRight
  const dropSide = dockDrag !== null ? snapSide(dockDrag.x) : null

  const dockPanel = (
    <div
      className="absolute z-30 flex flex-col bg-gray-900 border border-gray-800 shadow-xl rounded-xl overflow-hidden select-none"
      style={{
        width: dockW,
        maxHeight: 'calc(100% - 24px)',
        top: dockDrag ? dockDrag.y : (dock.y ?? 12),
        ...(dockDrag ? { left: dockDrag.x } : dock.side === 'left' ? { left: 0 } : { right: 0 }),
      }}
    >
      {/* 너비 조절 핸들 (캔버스와 맞닿은 쪽 가장자리) */}
      {!dock.collapsed && (
        <div
          className={`absolute inset-y-0 w-1.5 z-10 cursor-col-resize touch-none hover:bg-blue-500/40 ${resizing ? 'bg-blue-500/50' : ''} ${dock.side === 'left' ? 'right-0' : 'left-0'}`}
          title="좌우로 끌어서 너비 조절"
          onPointerDown={(e) => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setResizing(true) }}
          onPointerMove={(e) => {
            if (!resizing) return
            const r = rootRef.current.getBoundingClientRect()
            const w = dock.side === 'left' ? e.clientX - r.left : r.right - e.clientX
            setDock({ width: Math.round(Math.min(limits.max, Math.max(limits.min, w))) })
          }}
          onPointerUp={() => setResizing(false)}
          onPointerCancel={() => setResizing(false)}
        />
      )}

      {/* 너비 범위 측정용 (화면에 보이지 않음) */}
      {[['full', measureFullRef], ['name', measureNameRef]].map(([mode, ref]) => (
        <div key={mode} ref={ref} aria-hidden className="absolute invisible pointer-events-none flex flex-col" style={{ left: 0, top: 0 }}>
          {formElements.map(el => (
            <div key={el.id} className="flex items-center gap-1.5 px-2 py-1.5 border text-xs font-medium whitespace-nowrap w-max">
              <span>{el.name}</span>{mode === 'full' && el.name_ko && <span>({el.name_ko})</span>}
            </div>
          ))}
        </div>
      ))}

      {/* 헤더: 잡고 끌어서 좌/우로 이동 */}
      <div
        className={`flex items-center gap-1 px-1.5 py-2 touch-none border-b border-gray-800 ${dockDrag ? 'cursor-grabbing' : 'cursor-grab'} ${dock.collapsed ? 'flex-col' : 'justify-between'}`}
        title="끌어서 위치 이동 (좌/우 끝에 놓으면 붙습니다)"
        onPointerDown={(e) => {
          if (e.button !== 0) return
          const pr = e.currentTarget.parentElement.getBoundingClientRect()
          const rr = rootRef.current.getBoundingClientRect()
          grabRef.current = { dx: e.clientX - pr.left, dy: e.clientY - pr.top }
          e.currentTarget.setPointerCapture(e.pointerId)
          setDockDrag({ x: pr.left - rr.left, y: pr.top - rr.top, cx: e.clientX })
        }}
        onPointerMove={(e) => {
          if (!dockDrag) return
          const rr = rootRef.current.getBoundingClientRect()
          setDockDrag({
            x: Math.max(0, Math.min(rr.width - dockW, e.clientX - grabRef.current.dx - rr.left)),
            y: Math.max(0, Math.min(rr.height - 48, e.clientY - grabRef.current.dy - rr.top)),
            cx: e.clientX,
          })
        }}
        onPointerUp={(e) => {
          if (!dockDrag) return
          const side = snapSide(dockDrag.x)
          setDock({ y: Math.round(dockDrag.y), ...(side ? { side } : {}) })
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
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap overflow-hidden cursor-grab active:cursor-grabbing transition-transform hover:scale-[1.03]"
                  style={{ backgroundColor: el.color + '22', borderColor: el.color + '88', color: el.color }}
                >
                  <span className="shrink-0">{el.name}</span>
                  {el.name_ko && <span className="opacity-70 truncate min-w-0">({el.name_ko})</span>}
                </div>
              ))}
              {formElements.length === 0 && <span className="text-xs text-gray-600">환경설정에서 송폼 요소를 추가해주세요.</span>}
            </div>
          </div>

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
    <div
      ref={rootRef}
      className="fixed z-[60] flex overflow-hidden bg-[#F1F5F9] dark:bg-gray-950"
      style={{ left: area.left, top: area.top, width: area.width, height: area.height }}
    >
      {dockDrag && ['left', 'right'].map(side => (
        <div
          key={side}
          style={{ width: SNAP }}
          className={`absolute inset-y-0 z-20 pointer-events-none transition-colors ${side === 'left' ? 'left-0 border-r-2' : 'right-0 border-l-2'} ${dropSide === side ? 'bg-blue-500/25 border-blue-500' : 'border-transparent'}`}
        />
      ))}

      {/* 악보 캔버스: 세로 한 장이 모두 보이도록 높이에 맞춤 */}
      <div ref={bodyRef} className="flex-1 min-w-0 flex items-center justify-center overflow-hidden relative">
        <div style={{ width: BW * scale, height: BH * scale, flexShrink: 0 }}>
          <div
            ref={canvasRef}
            style={{ width: BW, height: BH, transform: `scale(${scale})`, transformOrigin: 'top left', backgroundColor: '#fff', position: 'relative', overflow: 'hidden', fontFamily: '"Noto Sans KR", sans-serif', touchAction: 'none' }}
            onDragOver={(e) => { if (Array.from(e.dataTransfer.types).includes(MARK_MIME)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } }}
            onDrop={handleDrop}
            onPointerDown={() => setSelected(null)}
          >
            <img
              src={sheetUrl} alt="악보" draggable={false} onError={onSheetError}
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

      {dockPanel}
      {/* 선택한 요소 서브 툴바: 팔레트 상단 옆(캔버스 쪽)에 붙어서 표시 */}
      {sel && !dockDrag && (
        <div
          className={`absolute z-30 flex flex-col items-start gap-2 px-3 py-2 bg-gray-900 border border-gray-800 shadow-xl text-xs text-gray-300 select-none ${dock.side === 'left' ? 'rounded-r-xl border-l-0' : 'rounded-l-xl border-r-0'}`}
          style={{
            top: dock.y ?? 12,
            [dock.side === 'left' ? 'left' : 'right']: dockW,
          }}
        >
          <span className="font-bold whitespace-nowrap" style={{ color: sel.color }}>선택: {sel.name}</span>
          <label className="flex items-center gap-1 whitespace-nowrap">반복 ×
            <input
              type="number" min="1" max="9" value={sel.repeat || 1}
              onChange={e => updateSelected({ repeat: Math.min(9, Math.max(1, parseInt(e.target.value) || 1)) })}
              className="w-12 text-center bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-200"
            />
          </label>
          <button type="button" className="flex items-center gap-1 whitespace-nowrap text-gray-400 hover:text-red-400" onClick={removeSelected}>
            <Trash2 size={13} /> 삭제
          </button>
        </div>
      )}
    </div>,
    document.body
  )
}
