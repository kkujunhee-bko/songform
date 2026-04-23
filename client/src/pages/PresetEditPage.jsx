import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, ArrowLeft, LayoutTemplate } from 'lucide-react'
import FormFlowBuilder from '../components/worshipForm/FormFlowBuilder'
import api from '../api/client'

export default function PresetEditPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [flow, setFlow] = useState([])
  const [categories, setCategories] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    const loadCategories = api.get('/song-form-preset-categories')
    const loadPreset = isEdit ? api.get(`/song-form-presets/${id}`) : Promise.resolve(null)

    Promise.all([loadCategories, loadPreset])
      .then(([cats, preset]) => {
        setCategories(cats)
        if (preset) {
          setTitle(preset.title)
          setCategoryId(preset.category_id ? String(preset.category_id) : '')
          setFlow(preset.form_flow || [])
        }
      })
      .catch(e => alert(e.message))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const handleSave = async () => {
    if (!title.trim()) { alert('타이틀을 입력해주세요.'); return }
    setSaving(true)
    try {
      const body = {
        title: title.trim(),
        category_id: categoryId ? Number(categoryId) : null,
        form_flow: flow,
      }
      if (isEdit) {
        await api.put(`/song-form-presets/${id}`, body)
      } else {
        await api.post('/song-form-presets', body)
      }
      navigate('/presets')
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        불러오는 중...
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          className="btn btn-ghost p-2"
          onClick={() => navigate('/presets')}
          title="목록으로"
        >
          <ArrowLeft size={18} />
        </button>
        <LayoutTemplate size={22} className="text-indigo-400" />
        <h1 className="text-2xl font-bold text-white">
          {isEdit ? '프리셋 수정' : '새 프리셋 등록'}
        </h1>
      </div>

      <div className="space-y-5">
        {/* 타이틀 + 카테고리 */}
        <div className="card space-y-4">
          <div>
            <label className="label">타이틀 *</label>
            <input
              className="input"
              placeholder="프리셋 이름을 입력하세요"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="label">카테고리</label>
            <select
              className="input"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
            >
              <option value="">-- 카테고리 없음 --</option>
              {categories.map(cat => (
                <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 송폼 흐름 빌더 */}
        <div className="card">
          <FormFlowBuilder flow={flow} onChange={setFlow} />
        </div>

        {/* 저장 버튼 */}
        <div className="flex gap-3 justify-end">
          <button className="btn btn-ghost" onClick={() => navigate('/presets')}>
            취소
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !title.trim()}
          >
            <Save size={14} />{saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
