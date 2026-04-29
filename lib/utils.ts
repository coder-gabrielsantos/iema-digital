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
const LOCAL_STUDENT_ID_PATTERN = /\blocal-student-[a-fA-F0-9]{16}\b/;

export function parseStudentIdFromQr(rawValue: string): string | null {
  const trimmedValue = rawValue.trim();
  if (!trimmedValue) return null;

  const directId = extractStudentId(trimmedValue);
  if (directId) return directId;

  try {
    const parsedUrl = new URL(trimmedValue);
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    for (const segment of pathSegments) {
      const segmentId = extractStudentId(segment);
      if (segmentId) return segmentId;
    }
  } catch {
    // Value is not an URL, continue with other parsing strategies.
  }

  try {
    const json = JSON.parse(trimmedValue) as Record<string, unknown>;
    const candidates = [json.studentId, json._id, json.id];
    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue;
      const candidateId = extractStudentId(candidate.trim());
      if (candidateId) return candidateId;
    }
  } catch {
    // Value is not JSON, continue with regex fallback.
  }

  return extractStudentId(trimmedValue);
}

function extractStudentId(value: string): string | null {
  return (
    value.match(MONGODB_OBJECT_ID_PATTERN)?.[0] ??
    value.match(LOCAL_STUDENT_ID_PATTERN)?.[0] ??
    null
  );
}
