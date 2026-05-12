export type UserRole = 'gestao' | 'servidores';

export function normalizeAccessKey(value: string) {
  return value.trim().toUpperCase();
}

export const ACCESS_KEYS: Record<string, UserRole> = {};

const envKeys: Array<[string | undefined, UserRole]> = [
  [process.env.LOGIN_KEY_GESTAO, 'gestao'],
  [process.env.LOGIN_KEY_SERVIDORES, 'servidores'],
];

for (const [rawKey, role] of envKeys) {
  if (!rawKey) continue;
  ACCESS_KEYS[normalizeAccessKey(rawKey)] = role;
}
