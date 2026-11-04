// 곡의 악보 URL 목록: sheet_music_urls(배열) 우선, 없으면 단일 sheet_music_url
export function getSheetUrls(song) {
  const list = Array.isArray(song?.sheet_music_urls) ? song.sheet_music_urls.filter(Boolean) : []
  if (list.length > 0) return list
  return song?.sheet_music_url ? [song.sheet_music_url] : []
}

// 곡 상태 갱신용: 배열과 대표(첫 장) URL을 항상 함께 맞춘다
export function sheetPatch(urls) {
  return { sheet_music_urls: urls, sheet_music_url: urls[0] || null }
}
