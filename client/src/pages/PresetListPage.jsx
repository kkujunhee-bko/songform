import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, LayoutTemplate } from 'lucide-react'
import api from '../api/client'

export default function PresetListPage() {
  const navigate = useNavigate()
  const [presets, setPresets] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const data = await api.get('/song-form-presets')
      setPresets(data)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('프리셋을 삭제하시겠습니까?')) return
    try {
      await api.delete(`/song-form-presets/${id}`)
      await load()
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <LayoutTemplate size={22} className="text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">송폼 프리셋 관리</h1>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/presets/new')}
        >
          <Plus size={14} />새 프리셋 등록
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">불러오는 중...</div>
      ) : presets.length === 0 ? (
        <div className="card text-center py-12">
          <LayoutTemplate size={32} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">등록된 프리셋이 없습니다.</p>
          <button
            className="btn btn-primary mt-4"
            onClick={() => navigate('/presets/new')}
          >
            <Plus size={14} />첫 프리셋 등록하기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {presets.map(preset => (
            <div key={preset.id} className="card flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium">{preset.title}</span>
                  {preset.category_name && (
                    <span className="text-xs px-2 py-0.5 bg-indigo-900/50 text-indigo-300 rounded-full border border-indigo-800">
                      {preset.category_name}
                    </span>
                  )}
                </div>
                {/* 흐름 미리보기 */}
                {Array.isArray(preset.form_flow) && preset.form_flow.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
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
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  className="btn btn-ghost p-2"
                  title="수정"
                  onClick={() => navigate(`/presets/${preset.id}/edit`)}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="btn btn-ghost p-2 hover:text-red-400"
                  title="삭제"
                  onClick={() => handleDelete(preset.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
