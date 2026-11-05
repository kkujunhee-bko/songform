// 악보 이미지가 없거나 불러오지 못할 때 보여줄 대체 이미지 (화이트 톤 + 블루 포인트 + 오선/음표)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1000" width="750" height="1000">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#F8FAFC"/>
    </linearGradient>
  </defs>
  <rect width="750" height="1000" fill="url(#bg)"/>
  <rect x="24" y="24" width="702" height="952" rx="24" fill="none" stroke="#CBD5E1" stroke-width="3" stroke-dasharray="14 10"/>
  <g stroke="#E2E8F0" stroke-width="3">
    <g transform="translate(0,170)"><line x1="70" y1="0" x2="680" y2="0"/><line x1="70" y1="22" x2="680" y2="22"/><line x1="70" y1="44" x2="680" y2="44"/><line x1="70" y1="66" x2="680" y2="66"/><line x1="70" y1="88" x2="680" y2="88"/></g>
    <g transform="translate(0,280)"><line x1="70" y1="0" x2="680" y2="0"/><line x1="70" y1="22" x2="680" y2="22"/><line x1="70" y1="44" x2="680" y2="44"/><line x1="70" y1="66" x2="680" y2="66"/><line x1="70" y1="88" x2="680" y2="88"/></g>
    <g transform="translate(0,720)"><line x1="70" y1="0" x2="680" y2="0"/><line x1="70" y1="22" x2="680" y2="22"/><line x1="70" y1="44" x2="680" y2="44"/><line x1="70" y1="66" x2="680" y2="66"/><line x1="70" y1="88" x2="680" y2="88"/></g>
    <g transform="translate(0,830)"><line x1="70" y1="0" x2="680" y2="0"/><line x1="70" y1="22" x2="680" y2="22"/><line x1="70" y1="44" x2="680" y2="44"/><line x1="70" y1="66" x2="680" y2="66"/><line x1="70" y1="88" x2="680" y2="88"/></g>
  </g>
  <circle cx="375" cy="470" r="118" fill="#DBEAFE" stroke="#93C5FD" stroke-width="4"/>
  <g fill="#3B82F6">
    <ellipse cx="350" cy="510" rx="30" ry="22" transform="rotate(-20 350 510)"/>
    <rect x="372" y="405" width="9" height="102"/>
    <path d="M381 405 C 400 420, 430 430, 424 470 C 420 445, 402 440, 381 436 Z"/>
  </g>
  <text x="375" y="650" text-anchor="middle" font-family="'Noto Sans KR', sans-serif" font-size="34" font-weight="700" fill="#64748B">악보 이미지를 찾을 수 없습니다</text>
  <text x="375" y="696" text-anchor="middle" font-family="'Noto Sans KR', sans-serif" font-size="22" fill="#94A3B8">파일이 없거나 불러오지 못했어요</text>
</svg>`

export const SHEET_FALLBACK = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

// <img onError={onSheetError} /> 로 사용: 한 번만 대체 이미지로 교체 (무한 루프 방지)
export function onSheetError(e) {
  const img = e.currentTarget
  if (img.dataset.fallback) return
  img.dataset.fallback = '1'
  img.src = SHEET_FALLBACK
}
