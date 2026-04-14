import { useState } from 'react'
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
import { X, GripHorizontal, Plus } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'

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
      <div
        className="relative flex flex-col items-center justify-center w-20 h-16 rounded-xl border-2 cursor-grab active:cursor-grabbing select-none transition-all"
        style={{
          backgroundColor: item.color + '22',
          borderColor: item.color,
        }}
        {...attributes}
        {...listeners}
      >
        <GripHorizontal size={10} className="absolute top-1 text-gray-600" />
        <span className="text-xs font-bold" style={{ color: item.color }}>
          {item.name}
        </span>
        <span className="text-xs" style={{ color: item.color + 'cc' }}>
          {item.name_ko}
        </span>

        {/* 삭제 버튼 */}
        <button
          type="button"
          className="absolute -top-2 -right-2 w-5 h-5 bg-gray-700 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={() => onRemove(item.uid)}
        >
          <X size={10} className="text-white" />
        </button>
      </div>
      {/* 반복 횟수 */}
      <div className="flex items-center gap-0.5">
        <span className="text-xs text-gray-600">×</span>
        <input
          type="number"
          min="1"
          max="9"
          value={item.repeat || 1}
          onChange={(e) => onRepeatChange(item.uid, parseInt(e.target.value) || 1)}
          className="w-8 text-center text-xs bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-300 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  )
}

export default function FormFlowBuilder({ flow, onChange }) {
  const formElements = useSettingsStore(s => s.formElements)
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

  return (
    <div className="space-y-3">
      {/* 팔레트 - 사용 가능한 요소들 */}
      <div>
        <label className="label">송폼 요소 팔레트 (클릭하여 추가)</label>
        <div className="flex flex-wrap gap-2 p-2 bg-gray-950 rounded-lg border border-gray-800 form-inner-section">
          {formElements.map(el => (
            <button
              key={el.id}
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: el.color + '22',
                borderColor: el.color + '88',
                color: el.color,
              }}
              onClick={() => addElement(el)}
            >
              <Plus size={10} />
              {el.name}
              {el.name_ko && <span className="opacity-70">({el.name_ko})</span>}
            </button>
          ))}
          {formElements.length === 0 && (
            <span className="text-xs text-gray-600">환경설정에서 송폼 요소를 추가해주세요.</span>
          )}
        </div>
      </div>

      {/* 드롭존 - 현재 흐름 */}
      <div>
        <label className="label">
          송폼 흐름 순서
          {flow.length > 0 && <span className="ml-1 text-gray-600">({flow.length}개 · 드래그로 순서 변경)</span>}
        </label>
        <div className="min-h-24 p-3 bg-gray-950 rounded-lg border border-dashed border-gray-700 form-inner-section">
          {flow.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-sm text-gray-600">
              위 팔레트에서 요소를 클릭하여 추가하세요
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={flow.map(i => i.uid)} strategy={horizontalListSortingStrategy}>
                <div className="flex flex-wrap gap-3">
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
    </div>
  )
}
