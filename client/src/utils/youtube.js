export function extractYoutubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return m[1];
  }
  return null;
}

export function isYoutubeThresholdMet(url) {
  const id = extractYoutubeVideoId(url);
  if (!id) return false;
  return localStorage.getItem(`yt_progress_unlocked_${id}`) === '1';
}
