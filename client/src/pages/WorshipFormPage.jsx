import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { Plus, Save, FileDown, ArrowLeft, Loader, User, Eye } from 'lucide-react'
import api from '../api/client'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'
import SongCard from '../components/worshipForm/SongCard'
import PptPreviewModal from '../components/worshipForm/PptPreviewModal'
import { transposeKey } from '../lib/keyUtils'

const DEFAULT_SONG = () => ({
  uid: `song_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  song_id: null,
  song_title: '',
  performance_key: 'C',
  semitone_adjustment: 0,
  form_flow: [],
  sheet_music_url: null,
  sheet_music_snapshot: null,
  comment: '',
  bpm: '',
  keyboard1_sound_no: '',
  keyboard1_sound_name: '',
  keyboard2_sound_no: '',
  keyboard2_sound_name: '',
  play_style: '',
})

/** 현재 날짜를 로컬 시간 기준 'YYYY-MM-DD' 문자열로 반환 (UTC 변환 없이 timezone 안전) */
function localTodayStr() {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

/**
 * DB에서 온 날짜 값을 'YYYY-MM-DD' 문자열로 정규화.
 * - db.js에서 pg DATE를 string으로 반환하도록 설정했으므로 보통 이미 'YYYY-MM-DD' 형식.
 * - 혹시 ISO timestamp 문자열("2024-11-17T00:00:00.000Z")이 오더라도 안전하게 처리.
 */
function normalizeDateStr(val) {
  if (!val) return localTodayStr()
  if (typeof val === 'string') return val.slice(0, 10)
  // Date 객체인 경우 (혹시 모를 경우)
  const d = new Date(val)
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function SeasonBadge({ season }) {
  const theme = useAuthStore(s => s.user?.theme)
  if (!season?.name) return null

  const color = season.color || '#6366F1'
  const isDark = theme === 'dark'

  // border 색 보정 함수 (라이트 모드에서 확실히 보이게)
  function getBorderColor(hex) {
    const c = hex.substring(1)
    const rgb = parseInt(c, 16)
    const r = (rgb >> 16) & 255
    const g = (rgb >> 8) & 255
    const b = rgb & 255

    // 색을 어둡게 (약 40% 다운)
    const darken = (v) => Math.max(0, Math.floor(v * 0.6))

    return `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`
  }

  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"
      style={{
        backgroundColor: isDark ? color + '28' : color + 'CC',
        color: isDark ? color : '#111827',
        border: isDark
          ? `1.5px solid ${color + '60'}`
          : `1.5px solid ${getBorderColor(color)}`, // 👉 핵심 수정
      }}
    >
      {season.name}
    </span>
  )
}

export default function WorshipFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const { defaultDenominationId, categories } = useSettingsStore()

  const [formData, setFormData] = useState({
    worship_date: localTodayStr(),
    denomination_id: defaultDenominationId || 1,
    category_id: '',
    notes: '',
  })
  const [songs, setSongs] = useState([DEFAULT_SONG(), DEFAULT_SONG(), DEFAULT_SONG(), DEFAULT_SONG(), DEFAULT_SONG(), DEFAULT_SONG()])
  const [season, setSeason] = useState(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [savedFormId, setSavedFormId] = useState(null)
  const [leaderIds, setLeaderIds] = useState([])      // 선택된 인도자 ID 배열
  const [members, setMembers] = useState([])           // 전체 회원 목록

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // 회원 목록 로드 (인도자 선택용)
  useEffect(() => {
    api.get('/members').then(setMembers).catch(() => setMembers([]))
  }, [])

  // 기존 데이터 로드 (편집 모드)
  useEffect(() => {
    if (isEdit) {
      api.get(`/worship-forms/${id}`).then(data => {
        setFormData({
          worship_date: normalizeDateStr(data.worship_date),
          denomination_id: data.denomination_id,
          category_id: data.category_id,
          notes: data.notes || '',
        })
        setSavedFormId(data.id)
        setLeaderIds(Array.isArray(data.leader_ids) ? data.leader_ids : [])
        if (data.songs?.length > 0) {
          setSongs(data.songs.map(s => ({
            ...s,
            uid: `song_${s.id}_${Date.now()}`,
            form_flow: Array.isArray(s.form_flow) ? s.form_flow : JSON.parse(s.form_flow || '[]'),
          })))
        }
      }).catch(err => alert('로드 실패: ' + err.message))
    }
  }, [id, isEdit])

  // 카테고리 기본값 설정
  useEffect(() => {
    if (!formData.category_id && categories.length > 0) {
      setFormData(prev => ({ ...prev, category_id: categories[0].id }))
    }
  }, [categories, formData.category_id])

  // denomination 기본값
  useEffect(() => {
    if (!formData.denomination_id && defaultDenominationId) {
      setFormData(prev => ({ ...prev, denomination_id: defaultDenominationId }))
    }
  }, [defaultDenominationId, formData.denomination_id])

  // 절기 자동 계산
  const loadSeason = useCallback(async (date, denomId) => {
    if (!date || !denomId) return
    try {
      const s = await api.get(`/liturgical-seasons/current?date=${date}&denomination_id=${denomId}`)
      setSeason(s)
    } catch (e) { setSeason(null) }
  }, [])

  useEffect(() => {
    loadSeason(formData.worship_date, formData.denomination_id)
  }, [formData.worship_date, formData.denomination_id, loadSeason])

  const updateSong = (uid, updates) => {
    setSongs(prev => prev.map(s => {
      if (s.uid !== uid) return s
      // undefined 값은 스프레드에서 제외 → 기존 값 유지
      const safeUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      )
      const newSong = { ...s, ...safeUpdates }
      // 반음 전조가 필요한 경우 (semitone_adjustment ≠ 0)
      if (updates.semitone_adjustment !== undefined && updates.semitone_adjustment !== 0) {
        const semitone = updates.semitone_adjustment ?? 0
        newSong.performance_key = transposeKey(
          updates.performance_key ?? s.performance_key,
          semitone
        )
        newSong.semitone_adjustment = semitone
      }
      return newSong
    }))
  }

  const addSong = () => setSongs(prev => [...prev, DEFAULT_SONG()])
  const removeSong = (uid) => setSongs(prev => prev.filter(s => s.uid !== uid))

  const duplicateSong = (uid) => {
    setSongs(prev => {
      const idx = prev.findIndex(s => s.uid === uid)
      if (idx === -1) return prev
      const src = prev[idx]

      const baseTitle = src.song_title || ''
      const newTitle = baseTitle.endsWith('(copy)') ? baseTitle : `${baseTitle}(copy)`

      const duplicate = {
        ...src,
        uid: `song_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        song_title: newTitle,
      }

      const nextIdx = idx + 1
      if (nextIdx < prev.length) {
        const next = prev[nextIdx]
        const isEmpty = !next.song_title &&
          (!next.form_flow || next.form_flow.length === 0) &&
          !next.comment &&
          !next.sheet_music_url
        if (isEmpty) {
          return prev.map((s, i) => i === nextIdx ? duplicate : s)
        }
      }

      const result = [...prev]
      result.splice(idx + 1, 0, duplicate)
      return result
    })
  }

  const handleDragEnd = ({ active, over }) => {
    if (active.id !== over?.id) {
      const oldIdx = songs.findIndex(s => s.uid === active.id)
      const newIdx = songs.findIndex(s => s.uid === over.id)
      setSongs(arrayMove(songs, oldIdx, newIdx))
    }
  }

  const prepareSongsPayload = () =>
    songs
      .filter(s => s.song_title?.trim())
      .map(s => ({
        song_id: s.song_id || null,
        song_title: s.song_title,
        performance_key: s.performance_key || 'C',
        semitone_adjustment: s.semitone_adjustment || 0,
        form_flow: s.form_flow || [],
        sheet_music_url: s.sheet_music_url,
        sheet_music_snapshot: s.sheet_music_snapshot,
        comment: s.comment || '',
        bpm: s.bpm || null,
        keyboard1_sound_no: s.keyboard1_sound_no || '',
        keyboard1_sound_name: s.keyboard1_sound_name || '',
        keyboard2_sound_no: s.keyboard2_sound_no || '',
        keyboard2_sound_name: s.keyboard2_sound_name || '',
        play_style: s.play_style || '',
      }))

  const handleSave = async () => {
    if (!formData.worship_date) return alert('날짜를 선택해주세요.')
    if (!formData.category_id) return alert('예배 카테고리를 선택해주세요.')
    const filteredSongs = songs.filter(s => s.song_title?.trim())
    if (filteredSongs.length === 0) return alert('최소 1곡을 입력해주세요.')

    setSaving(true)
    try {
      const payload = {
        ...formData,
        denomination_id: formData.denomination_id || defaultDenominationId,
        liturgical_season_name: season?.name,
        liturgical_season_color: season?.color,
        leader_ids: leaderIds,
        songs: prepareSongsPayload(),
      }

      let result
      if (isEdit && id) {
        result = await api.put(`/worship-forms/${id}`, payload)
      } else {
        result = await api.post('/worship-forms', payload)
      }
      setSavedFormId(result.id)
      alert(isEdit ? '수정되었습니다.' : '저장되었습니다.')
      if (!isEdit) navigate(`/forms/${result.id}/edit`)
    } catch (err) {
      alert('저장 실패: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async () => {
    const formId = savedFormId || id
    if (!formId) {
      const confirmed = confirm('먼저 저장 후 PPT를 내보낼 수 있습니다. 지금 저장하시겠습니까?')
      if (confirmed) await handleSave()
      return
    }
    setExporting(true)
    try {
      const token = localStorage.getItem('songform-token')
      const response = await fetch(`/api/export/pptx/${formId}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.error || `서버 오류 (${response.status})`)
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = response.headers.get('content-disposition') || ''
      const match = cd.match(/filename\*=UTF-8''(.+)/)
      a.download = match ? decodeURIComponent(match[1]) : `worship_form.pptx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('PPT 내보내기 실패: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <button className="btn btn-ghost p-2" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{isEdit ? '예배 송폼 편집' : '새 예배 송폼'}</h1>
        </div>
        <button
          className="btn hover:bg-gray-200 border border-gray-600 hover:border-gray-400 bg-transparent text-gray-300 hover:text-white"
          onClick={() => setShowPreview(true)}
          title="PPT 미리보기"
        >
          <Eye size={15} />
          미리보기
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? <Loader size={16} className="animate-spin" /> : <FileDown size={16} />}
          PPT 내보내기
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
          저장
        </button>
      </div>

      {/* 예배 헤더 정보 */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">예배 정보</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 날짜 */}
          <div>
            <label className="label">예배 날짜 *</label>
            <input
              type="date"
              className="input"
              value={formData.worship_date}
              onChange={e => setFormData(p => ({ ...p, worship_date: e.target.value }))}
            />
          </div>

          {/* 카테고리 */}
          <div>
            <label className="label">예배 카테고리 *</label>
            <select
              className="select"
              value={formData.category_id}
              onChange={e => setFormData(p => ({ ...p, category_id: parseInt(e.target.value) }))}
            >
              <option value="">카테고리 선택</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 절기 (자동) */}
          <div>
            <label className="label">이번 주 절기 (자동)</label>
            <div className="h-9 flex items-center">
              {season ? (
                <SeasonBadge season={season} />
              ) : (
                <span className="text-sm text-gray-600">날짜를 선택하면 자동으로 표시됩니다</span>
              )}
            </div>
          </div>
        </div>

        {/* 인도자 */}
        <div className="mt-4">
          <label className="label">
            인도자
            {leaderIds.length > 0 && (
              <span className="ml-1.5 text-gray-600 font-normal">
                ({leaderIds.length}명 선택됨)
              </span>
            )}
          </label>
          <div className="flex flex-wrap gap-2 p-2 rounded-lg border border-gray-800 form-inner-section bg-gray-950 min-h-[2.5rem]">
            {members.length === 0 ? (
              <span className="text-xs text-gray-600 self-center">등록된 회원이 없습니다.</span>
            ) : (
              members.map(member => {
                const selected = leaderIds.includes(member.id)
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() =>
                      setLeaderIds(prev =>
                        selected ? prev.filter(x => x !== member.id) : [...prev, member.id]
                      )
                    }
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all hover:scale-105 active:scale-95 ${
                      selected
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <User size={10} />
                    {member.name}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* 메모 */}
        <div className="mt-4">
          <label className="label">메모 (선택)</label>
          <input
            className="input"
            placeholder="예배 관련 메모..."
            value={formData.notes}
            onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
          />
        </div>
      </div>

      {/* 노래 목록 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            찬양 목록 ({songs.filter(s => s.song_title?.trim()).length}/{songs.length}곡)
          </h2>
          <button className="btn btn-ghost text-sm" onClick={addSong}>
            <Plus size={14} />
            곡 추가
          </button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={songs.map(s => s.uid)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {songs.map((song, idx) => (
                <SongCard
                  key={song.uid}
                  song={song}
                  index={idx}
                  total={songs.length}
                  onUpdate={(updates) => updateSong(song.uid, updates)}
                  onRemove={() => removeSong(song.uid)}
                  onDuplicate={() => duplicateSong(song.uid)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <button
          className="w-full py-3 border border-dashed border-gray-700 rounded-xl text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors flex items-center justify-center gap-2 text-sm"
          onClick={addSong}
        >
          <Plus size={16} />
          곡 추가하기
        </button>
      </div>

      {/* 하단 저장 버튼 */}
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn btn-secondary" onClick={() => navigate('/')}>취소</button>
        <button
          className="btn hover:bg-gray-200 border border-gray-600 hover:border-gray-400 bg-transparent text-gray-300 hover:text-white"
          onClick={() => setShowPreview(true)}
          title="PPT 미리보기"
        >
          <Eye size={15} />
          미리보기
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? <Loader size={16} className="animate-spin" /> : <FileDown size={16} />}
          PPT 내보내기
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
          저장
        </button>
      </div>

      {/* PPT 미리보기 모달 */}
      {showPreview && (
        <PptPreviewModal
          onClose={() => setShowPreview(false)}
          onExport={handleExport}
          exporting={exporting}
          formData={formData}
          songs={songs}
          season={season}
          members={members}
          leaderIds={leaderIds}
          categories={categories}
        />
      )}
    </div>
  )
}
