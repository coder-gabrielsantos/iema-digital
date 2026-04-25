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

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export const ACCESS_KEYS: Record<string, 'admin' | 'portaria' | 'cantina'> = {
  'ADMIN-IEMA': 'admin',
  'PORTARIA-IEMA': 'portaria',
  'CANTINA-IEMA': 'cantina',
};

export type UserRole = 'admin' | 'portaria' | 'cantina';
