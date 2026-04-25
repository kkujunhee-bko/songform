import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, FileDown, Pencil, Trash2, Music, Search, X, User } from 'lucide-react'
import api from '../api/client'
import { useSettingsStore } from '../store/settingsStore'
import { usePermission } from '../hooks/usePermission'

// 검색 키워드를 텍스트 내에서 찾아 노란 배경으로 하이라이트
function Highlight({ text, query }) {
  if (!query || !text) return <>{text}</>
  const q = query.toLowerCase()
  const parts = []
  let src = text.toLowerCase()
  let lastIdx = 0
  let key = 0
  let idx
  while ((idx = src.indexOf(q, lastIdx)) !== -1) {
    if (idx > lastIdx) parts.push(<span key={key++}>{text.slice(lastIdx, idx)}</span>)
    parts.push(
      <mark key={key++} className="bg-yellow-400/30 text-red-500 rounded-sm not-italic">
        {text.slice(idx, idx + q.length)}
      </mark>
    )
    lastIdx = idx + q.length
  }
  if (lastIdx < text.length) parts.push(<span key={key++}>{text.slice(lastIdx)}</span>)
  return <>{parts}</>
}

export default function WorshipFormListPage() {
  const navigate = useNavigate()
  const { defaultDenominationId } = useSettingsStore()
  const perm = usePermission('forms_list')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: forms = [], isLoading, refetch } = useQuery({
    queryKey: ['worship-forms', defaultDenominationId],
    queryFn: () => api.get(`/worship-forms?denomination_id=${defaultDenominationId}&limit=100`),
    enabled: !!defaultDenominationId,
  })

  const handleExport = async (formId, e) => {
    e.stopPropagation()
    try {
      const token = localStorage.getItem('songform-token')
      const response = await fetch(`/api/export/pptx/${formId}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) throw new Error('내보내기 실패')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = response.headers.get('content-disposition') || ''
      const filenameMatch = cd.match(/filename\*=UTF-8''(.+)/)
      a.download = filenameMatch ? decodeURIComponent(filenameMatch[1]) : `worship_form_${formId}.pptx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('PPT 내보내기 실패: ' + err.message)
    }
  }

  const handleDelete = async (formId, e) => {
    e.stopPropagation()
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await api.delete(`/worship-forms/${formId}`)
      refetch()
    } catch (err) {
      alert('삭제 실패: ' + err.message)
    }
  }

  // 'YYYY-MM-DD' → local midnight 파싱
  const parseDateStr = (dateStr) => new Date(dateStr + 'T00:00:00')

  // 요일 표시: 일요일 → "주일", 나머지 → 앞글자만 (월/화/수/목/금/토)
  // 절기가 있으면 뒤에 "(부활절)" 형태로 붙임
  const getDayLabel = (dateStr, seasonName) => {
    const day = parseDateStr(dateStr).getDay()
    const dayLabel = day === 0 ? '주일' : ['일','월','화','수','목','금','토'][day]
    return seasonName ? `${dayLabel}(${seasonName})` : dayLabel
  }

  // 검색 필터링 (날짜·카테고리·절기·곡제목·메모 전체 대상)
  const filteredForms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return forms
    return forms.filter(form => {
      const d = parseDateStr(form.worship_date)
      const dateText = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
      const targets = [
        dateText,
        form.worship_date,
        form.category_name || '',
        form.liturgical_season_name || '',
        form.notes || '',
        ...(Array.isArray(form.song_titles)  ? form.song_titles  : []),
        ...(Array.isArray(form.leader_names) ? form.leader_names : []),
      ]
      return targets.some(t => t.toLowerCase().includes(q))
    })
  }, [forms, searchQuery])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">예배 송폼 목록</h1>
          <p className="text-sm text-gray-500 mt-1">
            총 {forms.length}개
            {searchQuery && ` · 검색결과 ${filteredForms.length}개`}
          </p>
        </div>
        {perm.can_create && (
          <Link to="/forms/new" className="btn btn-primary self-start sm:self-auto">
            <Plus size={16} />
            새 송폼 만들기
          </Link>
        )}
      </div>

      {/* 검색바 */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          type="text"
          className="input pl-9 pr-9"
          placeholder="날짜, 카테고리, 곡 제목, 절기, 메모로 검색..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            onClick={() => setSearchQuery('')}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* 목록 */}
      {forms.length === 0 ? (
        <div className="text-center py-20">
          <Music size={48} className="mx-auto text-gray-700 mb-4" />
          <p className="text-gray-500 mb-4">아직 작성된 송폼이 없습니다.</p>
          {perm.can_create && (
            <Link to="/forms/new" className="btn btn-primary">
              첫 번째 송폼 만들기
            </Link>
          )}
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="text-center py-16">
          <Search size={40} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-500 mb-2">"{searchQuery}"에 대한 검색 결과가 없습니다.</p>
          <button className="text-sm text-blue-400 hover:text-blue-300" onClick={() => setSearchQuery('')}>
            검색 초기화
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredForms.map((form) => (
            <div
              key={form.id}
              className="card hover:border-gray-700 transition-colors cursor-pointer group"
              onClick={() => navigate(`/forms/${form.id}/edit`)}
            >
              {/* 메인 행: 날짜 + 구분선 + 내용 + (sm+ 액션버튼) */}
              <div className="flex items-start gap-3">
                {/* 날짜 영역 */}
                <div className="w-14 sm:w-20 text-center flex-shrink-0 pt-0.5">
                  <div className="text-base sm:text-lg font-bold text-blue-400 leading-tight">
                    {parseDateStr(form.worship_date).getMonth() + 1}월 {parseDateStr(form.worship_date).getDate()}일
                  </div>
                  <div className="text-xs text-gray-500 leading-snug">
                    {getDayLabel(form.worship_date, form.liturgical_season_name)}
                  </div>
                  <div className="text-xs text-gray-600">{parseDateStr(form.worship_date).getFullYear()}</div>
                </div>

                <div className="w-px self-stretch bg-gray-800 flex-shrink-0" />

                {/* 내용 영역 */}
                <div className="flex-1 min-w-0">
                  {/* 카테고리 + 곡 수 */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-semibold text-white text-sm">
                      <Highlight text={form.category_name} query={searchQuery.trim()} />
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Music size={11} />
                      {form.song_count}곡
                    </span>
                    {form.notes && (
                      <span className="text-xs text-gray-600 truncate hidden sm:inline max-w-xs">
                        <Highlight text={form.notes} query={searchQuery.trim()} />
                      </span>
                    )}
                  </div>
                  {/* 인도자 */}
                  {Array.isArray(form.leader_names) && form.leader_names.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <User size={10} className="text-gray-600 flex-shrink-0" />
                      <span className="text-xs text-gray-400 truncate">
                        <Highlight text={form.leader_names.join(' · ')} query={searchQuery.trim()} />
                      </span>
                    </div>
                  )}
                  {/* 곡 제목 목록 */}
                  {Array.isArray(form.song_titles) && form.song_titles.length > 0 && (
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {form.song_titles.map((title, idx) => (
                        <span key={idx} className="text-xs text-gray-500">
                          <span className="text-gray-600 mr-0.5">{idx + 1}.</span>
                          <Highlight text={title} query={searchQuery.trim()} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 액션 버튼: sm+ hover 시 표시 */}
                <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    className="btn btn-ghost p-2"
                    onClick={(e) => handleExport(form.id, e)}
                    title="PPT 내보내기"
                  >
                    <FileDown size={16} />
                  </button>
                  {perm.can_edit && (
                    <button
                      className="btn btn-ghost p-2"
                      onClick={(e) => { e.stopPropagation(); navigate(`/forms/${form.id}/edit`) }}
                      title="편집"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {perm.can_delete && (
                    <button
                      className="btn btn-ghost p-2 hover:text-red-400"
                      onClick={(e) => handleDelete(form.id, e)}
                      title="삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* 모바일 전용 액션 버튼 행 */}
              <div className="flex sm:hidden justify-end gap-1 mt-2 pt-2 border-t border-gray-800">
                <button
                  className="btn btn-ghost p-2"
                  onClick={(e) => handleExport(form.id, e)}
                  title="PPT 내보내기"
                >
                  <FileDown size={15} />
                </button>
                {perm.can_edit && (
                  <button
                    className="btn btn-ghost p-2"
                    onClick={(e) => { e.stopPropagation(); navigate(`/forms/${form.id}/edit`) }}
                    title="편집"
                  >
                    <Pencil size={15} />
                  </button>
                )}
                {perm.can_delete && (
                  <button
                    className="btn btn-ghost p-2 hover:text-red-400"
                    onClick={(e) => handleDelete(form.id, e)}
                    title="삭제"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
