'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { readStoredRole } from '@/lib/stored-role';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const role = readStoredRole();
    if (!role) {
      router.replace('/login');
      return;
    }
    if (role === 'gestao' || role === 'servidores') router.replace('/alunos');
    else router.replace('/login');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/60">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
    </div>
  );
}
