/**
 * CLIENT_ORIGIN — comma-separated list of allowed browser origins.
 * Examples:
 *   http://localhost:5173
 *   https://quizz-lear.vercel.app
 *   https://quizz-lear-8k3t.vercel.app,https://quizz-lear.vercel.app
 *   *.vercel.app   (any https origin whose host is *.vercel.app)
 */
function normalizeOrigin(origin) {
  if (!origin) return '';
  return origin.replace(/\/$/, '');
}

function parseAllowedOrigins(raw) {
  return (raw || 'http://localhost:5173')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function hostMatchesWildcard(hostname, pattern) {
  if (!pattern.startsWith('*.')) return false;
  const suffix = pattern.slice(1);
  return hostname === suffix.slice(1) || hostname.endsWith(suffix);
}

export function isOriginAllowed(origin, allowedList) {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return true;

  let hostname;
  try {
    hostname = new URL(normalized).hostname;
  } catch {
    return false;
  }

  for (const entry of allowedList) {
    if (entry.startsWith('*.')) {
      if (hostMatchesWildcard(hostname, entry)) return true;
      continue;
    }
    if (normalizeOrigin(entry) === normalized) return true;
  }

  return false;
}

export function createCorsOptions() {
  const allowedOrigins = parseAllowedOrigins(process.env.CLIENT_ORIGIN);

  return {
    origin(origin, callback) {
      if (isOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
      } else {
        console.warn(`[cors] Blocked origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
  };
}

export function logAllowedOrigins() {
  const list = parseAllowedOrigins(process.env.CLIENT_ORIGIN);
  console.info(`[cors] Allowed origins: ${list.join(', ')}`);
}
