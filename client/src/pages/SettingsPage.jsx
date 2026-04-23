import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, GripVertical, Save, Check, Settings, Music, List, Building2, LayoutTemplate } from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSettingsStore } from '../store/settingsStore'
import api from '../api/client'

const ELEMENT_COLORS = [
  '#6366F1','#22C55E','#F59E0B','#EF4444','#8B5CF6',
  '#06B6D4','#6B7280','#EC4899','#14B8A6','#F97316',
]

// ─── 교단 관리 ─────────────────────────────────────────────────────────────
function DenominationSection() {
  const { denominations, defaultDenominationId, refreshDenominations, setDefaultDenomination } = useSettingsStore()
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    try {
      await api.post('/denominations', { name: newName.trim() })
      await refreshDenominations()
      setNewName('')
    } catch (e) { alert(e.message) } finally { setAdding(false) }
  }

  const handleSetDefault = async (id) => {
    try { await setDefaultDenomination(id) }
    catch (e) { alert(e.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await api.delete(`/denominations/${id}`)
      await refreshDenominations()
    } catch (e) { alert(e.message) }
  }

  return (
    <section className="card">
      <div className="flex items-center gap-2 mb-4">
        <Building2 size={18} className="text-blue-400" />
        <h2 className="text-base font-semibold text-white">교단 설정</h2>
      </div>
      <div className="space-y-2">
        {denominations.map(d => (
          <div key={d.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
            <div className="flex-1">
              <span className="text-sm text-white">{d.name}</span>
              {d.is_default && (
                <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-900 text-blue-300 rounded">기본</span>
              )}
            </div>
            {!d.is_default && (
              <button
                className="btn btn-ghost text-xs py-1 px-2"
                onClick={() => handleSetDefault(d.id)}
              >
                기본으로 설정
              </button>
            )}
            {!d.is_default && (
              <button className="btn btn-ghost p-1.5 hover:text-red-400" onClick={() => handleDelete(d.id)}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <div className="flex gap-2 mt-3">
          <input
            className="input flex-1"
            placeholder="새 교단명 입력..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button className="btn btn-primary" onClick={handleAdd} disabled={adding || !newName.trim()}>
            <Plus size={14} />추가
          </button>
        </div>
      </div>
    </section>
  )
}

// ─── 정렬 가능한 카테고리 아이템 ─────────────────────────────────────────────
function SortableCategoryItem({ item, onUpdate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)

  const handleSave = async () => {
    if (!name.trim()) return
    try {
      await api.put(`/worship-categories/${item.id}`, { name: name.trim() })
      onUpdate()
      setEditing(false)
    } catch (e) { alert(e.message) }
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
      <div className="cursor-grab text-gray-600" {...attributes} {...listeners}>
        <GripVertical size={14} />
      </div>
      {editing ? (
        <>
          <input className="input flex-1 text-sm py-1" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} autoFocus />
          <button className="btn btn-primary py-1 px-2 text-xs" onClick={handleSave}><Save size={12} /></button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-white">{item.name}</span>
          <button className="btn btn-ghost py-1 px-2 text-xs" onClick={() => setEditing(true)}>수정</button>
        </>
      )}
      <button className="btn btn-ghost p-1.5 hover:text-red-400" onClick={() => onDelete(item.id)}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function CategorySection() {
  const { categories, defaultDenominationId, refreshCategories } = useSettingsStore()
  const [newName, setNewName] = useState('')
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleAdd = async () => {
    if (!newName.trim()) return
    try {
      await api.post('/worship-categories', {
        denomination_id: defaultDenominationId,
        name: newName.trim(),
        sort_order: categories.length,
      })
      await refreshCategories()
      setNewName('')
    } catch (e) { alert(e.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await api.delete(`/worship-categories/${id}`)
      await refreshCategories()
    } catch (e) { alert(e.message) }
  }

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIdx = categories.findIndex(c => c.id === active.id)
    const newIdx = categories.findIndex(c => c.id === over.id)
    const reordered = arrayMove(categories, oldIdx, newIdx)
    try {
      await api.post('/worship-categories/reorder', { ids: reordered.map(c => c.id) })
      await refreshCategories()
    } catch (e) { alert(e.message) }
  }

  return (
    <section className="card">
      <div className="flex items-center gap-2 mb-4">
        <List size={18} className="text-green-400" />
        <h2 className="text-base font-semibold text-white">예배 카테고리 관리</h2>
        <span className="text-xs text-gray-500">(드래그로 순서 변경)</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 mb-3">
            {categories.map(cat => (
              <SortableCategoryItem key={cat.id} item={cat} onUpdate={refreshCategories} onDelete={handleDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="새 카테고리명 (예: 주일 5부 예배)..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn btn-primary" onClick={handleAdd} disabled={!newName.trim()}>
          <Plus size={14} />추가
        </button>
      </div>
    </section>
  )
}

// ─── 송폼 요소 아이템 ───────────────────────────────────────────────────────
function SortableElementItem({ item, onUpdate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [nameKo, setNameKo] = useState(item.name_ko || '')
  const [color, setColor] = useState(item.color || '#6366F1')

  const handleSave = async () => {
    try {
      await api.put(`/song-form-elements/${item.id}`, { name, name_ko: nameKo, color })
      onUpdate()
      setEditing(false)
    } catch (e) { alert(e.message) }
  }

  return (
    <div ref={setNodeRef} style={style} className="border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-gray-800">
        <div className="cursor-grab text-gray-600" {...attributes} {...listeners}>
          <GripVertical size={14} />
        </div>
        {/* 색상 미리보기 */}
        <div className="w-6 h-6 rounded flex-shrink-0" style={{ backgroundColor: item.color }} />
        <div className="flex-1">
          <span className="text-sm font-medium text-white">{item.name}</span>
          {item.name_ko && <span className="ml-1.5 text-xs text-gray-500">({item.name_ko})</span>}
        </div>
        <button className="btn btn-ghost py-1 px-2 text-xs" onClick={() => setEditing(!editing)}>
          {editing ? '닫기' : '수정'}
        </button>
        <button className="btn btn-ghost p-1.5 hover:text-red-400" onClick={() => onDelete(item.id)}>
          <Trash2 size={13} />
        </button>
      </div>

      {editing && (
        <div className="p-3 border-t border-gray-700 space-y-2 bg-gray-800">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">영문명</label>
              <input className="input text-sm" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">한글명</label>
              <input className="input text-sm" value={nameKo} onChange={e => setNameKo(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">색상</label>
            <div className="flex gap-2 flex-wrap">
              {ELEMENT_COLORS.map(c => (
                <button
                  key={c}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: color === c ? 'white' : 'transparent' }}
                  onClick={() => setColor(c)}
                />
              ))}
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent border-0" />
            </div>
          </div>
          <button className="btn btn-primary text-sm w-full" onClick={handleSave}>
            <Save size={13} />저장
          </button>
        </div>
      )}
    </div>
  )
}

function FormElementSection() {
  const { formElements, defaultDenominationId, refreshFormElements } = useSettingsStore()
  const [newName, setNewName] = useState('')
  const [newNameKo, setNewNameKo] = useState('')
  const [newColor, setNewColor] = useState('#6366F1')
  const [showAdd, setShowAdd] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleAdd = async () => {
    if (!newName.trim()) return
    try {
      await api.post('/song-form-elements', {
        name: newName.trim(),
        name_ko: newNameKo.trim(),
        color: newColor,
        sort_order: formElements.length,
      })
      await refreshFormElements()
      setNewName(''); setNewNameKo(''); setShowAdd(false)
    } catch (e) { alert(e.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await api.delete(`/song-form-elements/${id}`)
      await refreshFormElements()
    } catch (e) { alert(e.message) }
  }

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIdx = formElements.findIndex(e => e.id === active.id)
    const newIdx = formElements.findIndex(e => e.id === over.id)
    const reordered = arrayMove(formElements, oldIdx, newIdx)
    try {
      await api.post('/song-form-elements/reorder', { ids: reordered.map(e => e.id) })
      await refreshFormElements()
    } catch (e) { alert(e.message) }
  }

  return (
    <section className="card">
      <div className="flex items-center gap-2 mb-4">
        <Music size={18} className="text-purple-400" />
        <h2 className="text-base font-semibold text-white">송폼 요소 관리</h2>
        <span className="text-xs text-gray-500">(드래그로 순서 변경)</span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={formElements.map(e => e.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 mb-3">
            {formElements.map(el => (
              <SortableElementItem key={el.id} item={el} onUpdate={refreshFormElements} onDelete={handleDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {showAdd ? (
        <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">영문명 *</label>
              <input className="input text-sm" placeholder="예: Verse" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div>
              <label className="label">한글명</label>
              <input className="input text-sm" placeholder="예: 절/전개" value={newNameKo} onChange={e => setNewNameKo(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">색상</label>
            <div className="flex gap-2 flex-wrap">
              {ELEMENT_COLORS.map(c => (
                <button
                  key={c}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: newColor === c ? 'white' : 'transparent' }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost flex-1" onClick={() => setShowAdd(false)}>취소</button>
            <button className="btn btn-primary flex-1" onClick={handleAdd} disabled={!newName.trim()}>
              <Plus size={14} />추가
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-secondary w-full" onClick={() => setShowAdd(true)}>
          <Plus size={14} />새 요소 추가
        </button>
      )}
    </section>
  )
}

// ─── 정렬 가능한 프리셋 구분 아이템 ─────────────────────────────────────────
function SortablePresetCategoryItem({ item, onUpdate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)

  const handleSave = async () => {
    if (!name.trim()) return
    try {
      await api.put(`/song-form-preset-categories/${item.id}`, { name: name.trim() })
      onUpdate()
      setEditing(false)
    } catch (e) { alert(e.message) }
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
      <div className="cursor-grab text-gray-600" {...attributes} {...listeners}>
        <GripVertical size={14} />
      </div>
      {editing ? (
        <>
          <input className="input flex-1 text-sm py-1" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} autoFocus />
          <button className="btn btn-primary py-1 px-2 text-xs" onClick={handleSave}><Save size={12} /></button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-white">{item.name}</span>
          <button className="btn btn-ghost py-1 px-2 text-xs" onClick={() => setEditing(true)}>수정</button>
        </>
      )}
      <button className="btn btn-ghost p-1.5 hover:text-red-400" onClick={() => onDelete(item.id)}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function PresetCategorySection() {
  const [items, setItems] = useState([])
  const [newName, setNewName] = useState('')
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const load = useCallback(async () => {
    try {
      const data = await api.get('/song-form-preset-categories')
      setItems(data)
    } catch (e) { alert(e.message) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!newName.trim()) return
    try {
      await api.post('/song-form-preset-categories', { name: newName.trim(), sort_order: items.length })
      await load()
      setNewName('')
    } catch (e) { alert(e.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await api.delete(`/song-form-preset-categories/${id}`)
      await load()
    } catch (e) { alert(e.message) }
  }

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIdx = items.findIndex(c => c.id === active.id)
    const newIdx = items.findIndex(c => c.id === over.id)
    const reordered = arrayMove(items, oldIdx, newIdx)
    try {
      await api.post('/song-form-preset-categories/reorder', { ids: reordered.map(c => c.id) })
      await load()
    } catch (e) { alert(e.message) }
  }

  return (
    <section className="card">
      <div className="flex items-center gap-2 mb-4">
        <LayoutTemplate size={18} className="text-indigo-400" />
        <h2 className="text-base font-semibold text-white">송폼 프리셋 구분 관리</h2>
        <span className="text-xs text-gray-500">(드래그로 순서 변경)</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 mb-3">
            {items.map(item => (
              <SortablePresetCategoryItem key={item.id} item={item} onUpdate={load} onDelete={handleDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="새 구분명 (예: 주일예배 패턴)..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn btn-primary" onClick={handleAdd} disabled={!newName.trim()}>
          <Plus size={14} />추가
        </button>
      </div>
    </section>
  )
}

// ─── 메인 설정 페이지 ───────────────────────────────────────────────────────
export default function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Settings size={22} className="text-gray-400" />
        <h1 className="text-2xl font-bold text-white">환경설정</h1>
      </div>
      <div className="space-y-6">
        <DenominationSection />
        <CategorySection />
        <FormElementSection />
        <PresetCategorySection />
      </div>
    </div>
  )
}
