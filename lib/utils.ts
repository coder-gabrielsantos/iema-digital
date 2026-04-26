import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function getDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function getTodayString(): string {
  return getDateString();
}

const MONGODB_OBJECT_ID_PATTERN = /\b[a-fA-F0-9]{24}\b/;

export function parseStudentIdFromQr(rawValue: string): string | null {
  const trimmedValue = rawValue.trim();
  if (!trimmedValue) return null;

  if (MONGODB_OBJECT_ID_PATTERN.test(trimmedValue)) {
    return trimmedValue.match(MONGODB_OBJECT_ID_PATTERN)?.[0] ?? null;
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    for (const segment of pathSegments) {
      if (MONGODB_OBJECT_ID_PATTERN.test(segment)) {
        return segment.match(MONGODB_OBJECT_ID_PATTERN)?.[0] ?? null;
      }
    }
  } catch {
    // Value is not an URL, continue with other parsing strategies.
  }

  try {
    const json = JSON.parse(trimmedValue) as Record<string, unknown>;
    const candidates = [json.studentId, json._id, json.id];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && MONGODB_OBJECT_ID_PATTERN.test(candidate.trim())) {
        return candidate.trim().match(MONGODB_OBJECT_ID_PATTERN)?.[0] ?? null;
      }
    }
  } catch {
    // Value is not JSON, continue with regex fallback.
  }

  const fallbackMatch = trimmedValue.match(MONGODB_OBJECT_ID_PATTERN);
  return fallbackMatch?.[0] ?? null;
}
