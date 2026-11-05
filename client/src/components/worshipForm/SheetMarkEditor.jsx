import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, Trash2, Plus } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'

const BW = 750
const BH = 1000
const MARK_MIME = 'application/x-songform-mark'

const clamp = (v) => Math.min(1, Math.max(0, v))
const newUid = () => `mk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

// 악보 한 장 위에 송폼 요소를 끌어다 배치하는 편집기
export default function SheetMarkEditor({ sheetUrl, page, pageCount, marks, onSave, onClose }) {
  const formElements = useSettingsStore(s => s.formElements)
  // 이 장의 마커만 편집하고, 나머지 장의 마커는 그대로 보존
  const [pageMarks, setPageMarks] = useState(() => marks.filter(m => (m.page || 0) === page))
  const [selected, setSelected] = useState(null)
  const bodyRef = useRef(null)
  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const [scale, setScale] = useState(0.6)

  useEffect(() => {
    const update = () => {
      if (!bodyRef.current) return
      const { clientWidth: w, clientHeight: h } = bodyRef.current
      setScale(Math.max(0.2, Math.min((h - 16) / BH, (w - 16) / BW)))
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

  // 툴바 → 악보로 드롭
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}>
      {/* 헤더 */}
      <div className="flex-none flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-700">
        <span className="font-semibold text-white text-sm">
          송폼 배치{pageCount > 1 ? ` · 악보 ${page + 1}/${pageCount}장` : ''}
        </span>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-ghost text-gray-400" onClick={onClose}>
            <X size={15} /> 취소
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            <Check size={15} /> 적용
          </button>
        </div>
      </div>

      {/* 송폼 요소 툴바 */}
      <div className="flex-none px-4 py-2 bg-gray-900/95 border-b border-gray-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-500 mr-1">끌어서 악보에 놓기 (클릭하면 가운데에 추가)</span>
          {formElements.map(el => (
            <div
              key={el.id}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData(MARK_MIME, JSON.stringify(el)); e.dataTransfer.effectAllowed = 'copy' }}
              onClick={() => addMark(el)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-grab active:cursor-grabbing select-none hover:scale-105 transition-transform"
              style={{ backgroundColor: el.color + '22', borderColor: el.color + '88', color: el.color }}
            >
              <Plus size={9} />{el.name}
            </div>
          ))}
          {formElements.length === 0 && <span className="text-xs text-gray-600">환경설정에서 송폼 요소를 추가해주세요.</span>}
        </div>
        {sel && (
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-300">
            <span className="font-bold" style={{ color: sel.color }}>{sel.name}</span>
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

      {/* 악보 캔버스 */}
      <div ref={bodyRef} className="flex-1 flex items-center justify-center overflow-hidden">
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
    </div>,
    document.body
  )
}
