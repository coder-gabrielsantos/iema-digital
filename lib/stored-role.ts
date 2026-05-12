/**
 * Migra papéis antigos no localStorage para gestao | servidores (uma vez por aba).
 */
export function readStoredRole(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('iema_role');
  if (!raw) return null;
  const normalized =
    raw === 'admin'
      ? 'gestao'
      : raw === 'portaria' || raw === 'cantina'
        ? 'servidores'
        : raw;
  if (normalized !== raw) {
    localStorage.setItem('iema_role', normalized);
  }
  return normalized;
}
