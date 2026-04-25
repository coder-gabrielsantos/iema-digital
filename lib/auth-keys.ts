export type UserRole = 'admin' | 'portaria' | 'cantina';

function normalizeAccessKey(value: string) {
  return value.trim().toUpperCase();
}

export const ACCESS_KEYS: Record<string, UserRole> = {};

const envKeys: Array<[string | undefined, UserRole]> = [
  [process.env.LOGIN_KEY_ADMIN, 'admin'],
  [process.env.LOGIN_KEY_PORTARIA, 'portaria'],
  [process.env.LOGIN_KEY_CANTINA, 'cantina'],
];

for (const [rawKey, role] of envKeys) {
  if (!rawKey) continue;
  ACCESS_KEYS[normalizeAccessKey(rawKey)] = role;
}
