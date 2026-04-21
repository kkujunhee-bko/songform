import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, Database, Loader, ImageIcon, ExternalLink, RefreshCw, Upload } from 'lucide-react'
import api from '../../api/client'

export default function SheetMusicModal({ songTitle, songId, onSelect, onClose }) {
  const [tab, setTab] = useState('db')
  const [query, setQuery] = useState(songTitle || '')

  // DB 탭
  const [dbResults, setDbResults] = useState([])
  const [dbLoading, setDbLoading] = useState(false)

  // 이미지 탭
  const [images, setImages] = useState([])
  const [imgLoading, setImgLoading] = useState(false)
  const [imgError, setImgError] = useState('')
  const [savingIdx, setSavingIdx] = useState(null)
  const [searchOffset, setSearchOffset] = useState(0)

  // 직접 올리기 탭
  const [uploadPreview, setUploadPreview] = useState(null)
  const [uploadSaving, setUploadSaving] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // ── DB 검색 (query 없으면 저장된 악보 전체 조회) ─────────
  const handleDbSearch = useCallback(async (searchQuery = query) => {
    setDbLoading(true)
    try {
      const q = searchQuery.trim()
      const url = q
        ? `/sheet-music/search?q=${encodeURIComponent(q)}`
        : '/sheet-music/search'
      const result = await api.get(url)
      setDbResults(result.db || [])
    } catch (e) {
      console.error(e)
      setDbResults([])
    } finally {
      setDbLoading(false)
    }
  }, [query])

  // "저장된 악보" 탭으로 전환 시 자동 로드
  useEffect(() => {
    if (tab === 'db') {
      handleDbSearch()
    }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── DB 탭에서 악보 선택 (form_flow, 키 정보도 함께 전달) ──
  const handleSelectDb = (song) => {
    const payload = { sheet_music_url: song.sheet_music_url }
    if (Array.isArray(song.form_flow) && song.form_flow.length > 0) {
      payload.form_flow = song.form_flow
    }
    if (song.performance_key) {
      payload.performance_key = song.performance_key
      payload.semitone_adjustment = song.semitone_adjustment ?? 0
    } else if (song.default_key) {
      payload.performance_key = song.default_key
      payload.semitone_adjustment = 0
    }
    onSelect(payload)
    onClose()
  }

  // ── Naver 이미지 검색 ─────────────────────────────────────
  const handleImageSearch = async () => {
    if (!query.trim()) return
    setImgLoading(true)
    setImgError('')
    setImages([])
    setSearchOffset(0)
    try {
      const result = await api.get(`/sheet-music/image-search?q=${encodeURIComponent(query)}&offset=0`)
      if (!result.images || result.images.length === 0) {
        setImgError('검색 결과 이미지가 없습니다. 검색어를 변경해 보세요.')
      } else {
        setImages(result.images)
        setSearchOffset(result.images.length)
      }
    } catch (e) {
      setImgError(e.message || '이미지 검색 중 오류가 발생했습니다.')
    } finally {
      setImgLoading(false)
    }
  }

  const handleMoreSearch = async () => {
    if (!query.trim() || imgLoading) return
    setImgLoading(true)
    setImgError('')
    try {
      const result = await api.get(`/sheet-music/image-search?q=${encodeURIComponent(query)}&offset=${searchOffset}`)
      if (!result.images || result.images.length === 0) {
        setImgError('추가 검색 결과가 없습니다.')
      } else {
        setImages(prev => [...prev, ...result.images])
        setSearchOffset(prev => prev + result.images.length)
      }
    } catch (e) {
      setImgError(e.message || '이미지 검색 중 오류가 발생했습니다.')
    } finally {
      setImgLoading(false)
    }
  }

  // ── 직접 올리기 ──────────────────────────────────────────
  const handleFileSelect = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 선택할 수 있습니다.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setUploadPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const handleUploadSave = async () => {
    if (!uploadPreview) return
    setUploadSaving(true)
    try {
      const result = await api.post('/sheet-music/save-image', {
        dataUrl: uploadPreview,
        songId: songId || null,
      })
      onSelect({ sheet_music_url: result.url })
      onClose()
    } catch (e) {
      alert('이미지 저장 실패: ' + e.message)
    } finally {
      setUploadSaving(false)
    }
  }

  const handleSelectImage = async (dataUrl, idx) => {
    setSavingIdx(idx)
    try {
      const result = await api.post('/sheet-music/save-image', {
        dataUrl,
        songId: songId || null,
      })
      onSelect({ sheet_music_url: result.url })
      onClose()
    } catch (e) {
      alert('이미지 저장 실패: ' + e.message)
    } finally {
      setSavingIdx(null)
    }
  }

  // ── 탭 전환 핸들러 ───────────────────────────────────────
  const handleTabChange = (newTab) => {
    setTab(newTab)
    // db 탭은 useEffect에서 자동 로드
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">악보 검색</h2>
          <button className="btn btn-ghost p-1.5" onClick={onClose}><X size={18} /></button>
        </div>

        {/* 검색 입력 (upload 탭 제외) */}
        {tab !== 'upload' && (
          <div className="px-5 py-3 border-b border-gray-800">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  className="input pl-9"
                  placeholder="노래 제목을 입력하세요..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key !== 'Enter') return
                    if (tab === 'image') handleImageSearch()
                    else handleDbSearch(e.currentTarget.value)
                  }}
                  autoFocus
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={() => tab === 'image' ? handleImageSearch() : handleDbSearch()}
              >
                검색
              </button>
            </div>
          </div>
        )}

        {/* 탭 */}
        <div className="flex border-b border-gray-800">
          <button
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors
              ${tab === 'db' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => handleTabChange('db')}
          >
            <Database size={14} />저장된 악보
            {dbResults.length > 0 && (
              <span className="text-xs bg-blue-600/30 text-blue-400 px-1.5 py-0.5 rounded-full">
                {dbResults.length}
              </span>
            )}
          </button>
          <button
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors
              ${tab === 'image' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => handleTabChange('image')}
          >
            <ImageIcon size={14} />Naver 이미지
          </button>
          <button
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors
              ${tab === 'upload' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => handleTabChange('upload')}
          >
            <Upload size={14} />직접 올리기
          </button>
        </div>

        {/* 결과 영역 */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* ── Naver 이미지 탭 ── */}
          {tab === 'image' && (
            <div>
              {imgLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                  <Loader size={24} className="animate-spin" />
                  <p className="text-sm">Naver 이미지 검색 중... (10~20초 소요)</p>
                </div>
              )}
              {!imgLoading && imgError && (
                <div className="text-center py-8 text-red-400 text-sm">{imgError}</div>
              )}
              {!imgLoading && images.length === 0 && !imgError && (
                <div className="text-center py-12 text-gray-500">
                  <ImageIcon size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">검색 버튼을 눌러 Naver 이미지를 가져오세요.</p>
                  <p className="text-xs mt-1 text-gray-600">"{query} 악보" 로 검색합니다.</p>
                </div>
              )}
              {images.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-3">
                    이미지를 클릭하면 악보로 저장됩니다. ({images.length}건)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((src, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectImage(src, idx)}
                        disabled={savingIdx !== null}
                        className="relative group overflow-hidden border-2 border-gray-700 hover:border-blue-500 transition-all bg-gray-800 aspect-[1/1.414] p-[3px]"
                      >
                        <img
                          src={src}
                          alt={`검색결과 ${idx + 1}`}
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous"
                        />
                        {savingIdx === idx && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <Loader size={20} className="animate-spin text-white" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/20 transition-all" />
                        <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                          {idx + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                  {!imgLoading && (
                    <div className="mt-4 flex justify-center">
                      <button
                        className="btn btn-ghost text-sm flex items-center gap-2 border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg"
                        onClick={handleMoreSearch}
                        disabled={savingIdx !== null}
                      >
                        <RefreshCw size={14} />
                        더 검색하기 (현재 {images.length}건 → +5건 추가)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── 저장된 악보 탭 ── */}
          {tab === 'db' && (
            <div>
              {dbLoading && (
                <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
                  <Loader size={16} className="animate-spin" />
                  <span className="text-sm">불러오는 중...</span>
                </div>
              )}

              {!dbLoading && dbResults.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Database size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">저장된 악보가 없습니다.</p>
                  <p className="text-xs mt-1 text-gray-600">
                    Naver 이미지 탭에서 검색 후 선택하면 자동 저장됩니다.
                  </p>
                </div>
              )}

              {!dbLoading && dbResults.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-3">
                    클릭하면 해당 악보를 현재 곡에 바로 적용합니다. ({dbResults.length}건)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {dbResults.map(song => (
                      <button
                        key={song.sheet_music_url}
                        onClick={() => handleSelectDb(song)}
                        className="group flex flex-col rounded-xl overflow-hidden border-2 border-gray-700 hover:border-blue-500 transition-all bg-gray-800 text-left"
                      >
                        {/* 악보 이미지 */}
                        <div className="relative aspect-[4/3] bg-gray-900 overflow-hidden">
                          <img
                            src={song.sheet_music_url}
                            alt={song.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            onError={e => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling.style.display = 'flex'
                            }}
                          />
                          {/* 이미지 로드 실패 시 플레이스홀더 */}
                          <div
                            className="absolute inset-0 items-center justify-center bg-gray-800 text-gray-600 text-xs hidden"
                            style={{ display: 'none' }}
                          >
                            <ImageIcon size={24} className="opacity-30" />
                          </div>
                          {/* 호버 오버레이 */}
                          <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/15 transition-all flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
                              이 악보 사용
                            </span>
                          </div>
                        </div>
                        {/* 곡 정보 */}
                        <div className="px-2.5 py-2 flex items-center justify-between gap-1 min-w-0">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white truncate">{song.title}</p>
                            {song.artist && (
                              <p className="text-xs text-gray-500 truncate">{song.artist}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            {song.default_key && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-900/60 text-blue-300 rounded font-mono">
                                {song.default_key}
                              </span>
                            )}
                            {Array.isArray(song.form_flow) && song.form_flow.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-green-900/60 text-green-400 rounded">
                                흐름 {song.form_flow.length}개
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 직접 올리기 탭 ── */}
          {tab === 'upload' && (
            <div className="flex flex-col items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleFileSelect(e.target.files[0])}
              />
              {!uploadPreview ? (
                <div
                  className={`w-full border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors
                    ${isDragging ? 'border-blue-400 bg-blue-900/20' : 'border-gray-600 hover:border-gray-400'}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <Upload size={36} className="text-gray-500" />
                  <p className="text-sm text-gray-400">클릭하거나 이미지를 여기에 드래그하세요</p>
                  <p className="text-xs text-gray-600">PNG, JPG, GIF, WebP 지원</p>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-4">
                  <div className="relative w-full rounded-xl overflow-hidden border border-gray-700 bg-gray-800">
                    <img
                      src={uploadPreview}
                      alt="미리보기"
                      className="w-full max-h-80 object-contain"
                    />
                  </div>
                  <div className="flex gap-2 w-full">
                    <button
                      className="flex-1 btn btn-ghost border border-gray-700 text-sm"
                      onClick={() => { setUploadPreview(null); fileInputRef.current.value = '' }}
                      disabled={uploadSaving}
                    >
                      다시 선택
                    </button>
                    <button
                      className="flex-1 btn btn-primary text-sm flex items-center justify-center gap-2"
                      onClick={handleUploadSave}
                      disabled={uploadSaving}
                    >
                      {uploadSaving ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                      {uploadSaving ? '저장 중...' : '이 이미지로 저장'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
