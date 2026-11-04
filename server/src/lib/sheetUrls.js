// 곡의 악보 URL 목록: sheet_music_urls(배열)가 있으면 우선, 없으면 단일 sheet_music_url 사용
function getSheetUrls(row) {
  let urls = row && row.sheet_music_urls;
  if (typeof urls === 'string') {
    try { urls = JSON.parse(urls); } catch { urls = null; }
  }
  if (Array.isArray(urls)) {
    const list = urls.filter(u => typeof u === 'string' && u);
    if (list.length > 0) return list;
  }
  return row && row.sheet_music_url ? [row.sheet_music_url] : [];
}

module.exports = { getSheetUrls };
