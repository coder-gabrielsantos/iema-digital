/** Headers for API routes that validate `X-IEMA-Key` (client components only). */
export function iemaKeyHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const key = localStorage.getItem('iema_key');
  return key ? { 'X-IEMA-Key': key } : {};
}
