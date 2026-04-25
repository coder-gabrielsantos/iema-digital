'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from './navbar';
import { UserRole } from '@/lib/utils';

interface ProtectedLayoutProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
}

export function ProtectedLayout({ children, requiredRole }: ProtectedLayoutProps) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedRole = localStorage.getItem('iema_role');
    if (!storedRole) {
      router.replace('/login');
      return;
    }

    if (requiredRole) {
      const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!allowed.includes(storedRole as UserRole)) {
        router.replace('/');
        return;
      }
    }

    setRole(storedRole);
    setLoading(false);
  }, [router, requiredRole]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!role) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar role={role} />
      <main className="pt-16">{children}</main>
    </div>
  );
}
