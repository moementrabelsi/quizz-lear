const LEAR_DOMAIN = '@lear.com';

export function isLearEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(LEAR_DOMAIN);
}

export function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}
