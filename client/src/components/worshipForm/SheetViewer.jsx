import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { onSheetError } from '../../lib/sheetFallback'

// 첨부 악보 크게 보기 (이미지가 없거나 불러오지 못하면 대체 이미지 표시)
export default function SheetViewer({ url, title, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute top-3 right-3 p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
        onClick={onClose}
        title="닫기 (Esc)"
      >
        <X size={20} />
      </button>
      <img
        key={url}
        src={url}
        alt={title || '악보'}
        onError={onSheetError}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full object-contain rounded-lg bg-white shadow-2xl"
      />
    </div>,
    document.body
  )
}
