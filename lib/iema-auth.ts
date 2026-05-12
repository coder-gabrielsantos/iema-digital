import { NextRequest } from 'next/server';
import { ACCESS_KEYS, UserRole, normalizeAccessKey } from '@/lib/auth-keys';

export function getRoleFromAccessKeyHeader(req: NextRequest): UserRole | null {
  const raw = req.headers.get('x-iema-key');
  if (!raw || typeof raw !== 'string') return null;
  return ACCESS_KEYS[normalizeAccessKey(raw)] ?? null;
}
