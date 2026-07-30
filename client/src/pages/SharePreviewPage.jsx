import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Music } from 'lucide-react'
import PptPreviewModal from '../components/worshipForm/PptPreviewModal'

export default function SharePreviewPage() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`/api/public/worship-forms/${token}`)
      .then(r => r.json().then(j => r.ok ? j : Promise.reject(j)))
      .then(setData)
      .catch(e => setError(e.error || '공유 링크를 불러오지 못했습니다.'))
  }, [token])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-950 gap-4">
        <Music size={48} className="text-gray-700" />
        <p className="text-gray-400">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-gray-500 text-sm">불러오는 중...</div>
      </div>
    )
  }

  const formData = {
    worship_date: (data.worship_date || '').slice(0, 10),
    denomination_id: data.denomination_id,
    category_id: data.category_id,
    notes: data.notes || '',
  }
  const songs = (data.songs || []).map((s, i) => ({
    ...s,
    uid: `song_${i}`,
    form_flow: Array.isArray(s.form_flow) ? s.form_flow : JSON.parse(s.form_flow || '[]'),
  }))
  const season = data.liturgical_season_name
    ? { name: data.liturgical_season_name, color: data.liturgical_season_color || '#6366F1' }
    : null
  const members = Array.isArray(data.leaders) ? data.leaders : []
  const leaderIds = members.map(m => m.id)
  const categories = [{ id: data.category_id, name: data.category_name || '예배' }]

  return (
    <PptPreviewModal
      onClose={() => window.close()}
      onExport={null}
      exporting={false}
      formData={formData}
      songs={songs}
      season={season}
      members={members}
      leaderIds={leaderIds}
      categories={categories}
    />
  )
}
