import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X, Plus, LayoutTemplate, ChevronRight } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import api from '../../api/client'

function FlowItem({ item, onRemove, onRepeatChange }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.uid })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col items-center gap-1 group"
    >
      {/* 흐름 아이템 박스 */}
      <div
        className="relative flex flex-col items-center justify-center w-8 h-8 sm:w-12 sm:h-10 rounded-xl border-2 cursor-grab active:cursor-grabbing select-none transition-all"
        style={{
          backgroundColor: item.color + '22',
          borderColor: item.color,
        }}
        {...attributes}
        {...listeners}
      >
        <span className="text-xs font-bold leading-tight text-center px-1" style={{ color: item.color }}>
          {item.name}
        </span>

        <button
          type="button"
          className="absolute -top-2 -right-2 w-5 h-5 bg-gray-700 hover:bg-red-600 rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
          onClick={() => onRemove(item.uid)}
        >
          <X size={10} className="text-white" />
        </button>
      </div>

      {/* 반복 횟수 */}
      <div className="flex items-center gap-0.5">
        <span className="text-sm font-bold text-gray-600">×</span>
        <input
          type="number"
          min="1"
          max="9"
          value={item.repeat || 1}
          onChange={(e) => onRepeatChange(item.uid, parseInt(e.target.value) || 1)}
          className="w-8 h-8 text-center text-sm font-bold bg-gray-800 border border-gray-700 rounded px-0 py-0 text-gray-300 focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>
    </div>
  )
}

// 프리셋 선택 모달
function PresetModal({ onClose, onSelect }) {
  const [presets, setPresets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/song-form-presets')
      .then(data => setPresets(data))
      .catch(e => alert(e.message))
      .finally(() => setLoading(false))
  }, [])

  // 카테고리별 그룹핑
  const grouped = presets.reduce((acc, preset) => {
    const key = preset.category_name || '미분류'
    if (!acc[key]) acc[key] = []
    acc[key].push(preset)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <LayoutTemplate size={18} className="text-indigo-400" />
            <span className="font-semibold text-white">송폼 흐름 프리셋 선택</span>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500 text-sm">불러오는 중...</div>
          ) : presets.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm">
              등록된 프리셋이 없습니다.<br />
              <span className="text-xs">관리자가 프리셋을 등록하면 여기서 선택할 수 있습니다.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                    {category}
                  </div>
                  <div className="space-y-2">
                    {items.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        className="w-full text-left p-3 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-indigo-600 rounded-xl transition-all group"
                        onClick={() => onSelect(preset)}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-white">{preset.title}</span>
                          <ChevronRight size={14} className="text-gray-600 group-hover:text-indigo-400 transition-colors" />
                        </div>
                        {Array.isArray(preset.form_flow) && preset.form_flow.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {preset.form_flow.map((item, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-1.5 py-0.5 rounded border font-medium"
                                style={{
                                  backgroundColor: item.color + '22',
                                  borderColor: item.color + '88',
                                  color: item.color,
                                }}
                              >
                                {item.name}
                                {item.repeat > 1 && <span className="opacity-60">×{item.repeat}</span>}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600">흐름 없음</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function FormFlowBuilder({ flow, onChange, enablePreset = false }) {
  const formElements = useSettingsStore(s => s.formElements)
  const [showPresetModal, setShowPresetModal] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIdx = flow.findIndex(i => i.uid === active.id)
      const newIdx = flow.findIndex(i => i.uid === over.id)
      onChange(arrayMove(flow, oldIdx, newIdx))
    }
  }

  const addElement = (element) => {
    const uid = `${element.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    onChange([...flow, { ...element, uid, repeat: 1 }])
  }

  const removeElement = (uid) => {
    onChange(flow.filter(i => i.uid !== uid))
  }

  const changeRepeat = (uid, repeat) => {
    onChange(flow.map(i => i.uid === uid ? { ...i, repeat } : i))
  }

  const applyPreset = (preset) => {
    if (!Array.isArray(preset.form_flow) || preset.form_flow.length === 0) {
      setShowPresetModal(false)
      return
    }
    // uid를 새로 발급하여 기존 flow와 충돌 방지
    const newFlow = preset.form_flow.map(item => ({
      ...item,
      uid: `${item.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    }))
    onChange(newFlow)
    setShowPresetModal(false)
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* 팔레트 */}
      <div>
        <label className="label">
          송폼 요소 팔레트
          <span className="hidden sm:inline opacity-70 font-normal"> (클릭하여 추가)</span>
        </label>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-gray-950 rounded-lg border border-gray-800 form-inner-section">
          {formElements.map(el => (
            <button
              key={el.id}
              type="button"
              className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium border transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: el.color + '22',
                borderColor: el.color + '88',
                color: el.color,
              }}
              onClick={() => addElement(el)}
            >
              <Plus size={9} />
              {el.name}
              {el.name_ko && (
                <span className="opacity-70 hidden sm:inline">({el.name_ko})</span>
              )}
            </button>
          ))}
          {formElements.length === 0 && (
            <span className="text-xs text-gray-600">환경설정에서 송폼 요소를 추가해주세요.</span>
          )}
        </div>
      </div>

      {/* 드롭존 - 현재 흐름 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">
            송폼 흐름
            {flow.length > 0 && (
              <>
                <span className="ml-1 text-gray-600">({flow.length}개</span>
                <span className="hidden sm:inline text-gray-600"> · 드래그로 순서 변경</span>
                <span className="text-gray-600">)</span>
              </>
            )}
          </label>
          {/* 프리셋 불러오기 버튼 (enablePreset=true 일 때만 표시) */}
          {enablePreset && (
            <button
              type="button"
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-indigo-900/40 text-indigo-300 border border-indigo-800 hover:bg-indigo-800/50 transition-colors"
              onClick={() => setShowPresetModal(true)}
              title="프리셋 불러오기"
            >
              <LayoutTemplate size={12} />
              <span className="hidden sm:inline">프리셋 불러오기</span>
              <span className="sm:hidden">프리셋</span>
            </button>
          )}
        </div>
        <div className="min-h-20 sm:min-h-24 p-2 sm:p-3 bg-gray-950 rounded-lg border border-dashed border-gray-700 form-inner-section">
          {flow.length === 0 ? (
            <div className="flex items-center justify-center h-14 sm:h-16 text-xs sm:text-sm text-gray-600">
              위 팔레트에서 요소를 클릭하여 추가하세요
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={flow.map(i => i.uid)} strategy={horizontalListSortingStrategy}>
                <div className="flex flex-wrap gap-[5px] sm:gap-[7px]">
                  {flow.map(item => (
                    <FlowItem
                      key={item.uid}
                      item={item}
                      onRemove={removeElement}
                      onRepeatChange={changeRepeat}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {showPresetModal && (
        <PresetModal
          onClose={() => setShowPresetModal(false)}
          onSelect={applyPreset}
        />
      )}
    </div>
  )
}
