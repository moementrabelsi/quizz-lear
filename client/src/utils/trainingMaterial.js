export function materialProgressKey(quizId) {
  return `lear_training_material_${String(quizId)}`;
}

export function readMaterialProgress(quizId) {
  try {
    const raw = localStorage.getItem(materialProgressKey(quizId));
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p?.completed === true && Number.isInteger(p.pageCount) && p.pageCount > 0) return p;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeMaterialProgress(quizId, pageCount) {
  localStorage.setItem(
    materialProgressKey(quizId),
    JSON.stringify({ completed: true, pageCount })
  );
}

export function clearMaterialProgress(quizId) {
  localStorage.removeItem(materialProgressKey(quizId));
}

/**
 * Normalizes admin-entered paths: trims, flips backslashes, ensures a leading slash for app-relative URLs.
 * Examples: "materials/x.pdf" -> "/materials/x.pdf", "/materials/x.pdf" unchanged.
 */
export function normalizeMaterialPdfPath(raw) {
  if (raw == null || typeof raw !== 'string') return '';
  let u = raw.trim().replace(/\\/g, '/');
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return u.startsWith('/') ? u : `/${u}`;
}

export function resolveMaterialPdfUrl(raw) {
  const u = normalizeMaterialPdfPath(raw);
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) {
    try {
      return new URL(u).href;
    } catch {
      return u;
    }
  }
  try {
    return new URL(u, window.location.origin).href;
  } catch {
    return `${window.location.origin}${u}`;
  }
}
