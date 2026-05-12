'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from './navbar';
import { UserRole } from '@/lib/auth-keys';
import { readStoredRole } from '@/lib/stored-role';

export const ViewerRoleContext = createContext<string | null>(null);

export function useViewerRole() {
  return useContext(ViewerRoleContext);
}

interface ProtectedLayoutProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
}

export function ProtectedLayout({ children, requiredRole }: ProtectedLayoutProps) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedRole = readStoredRole();
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

    const syncState = window.setTimeout(() => {
      setRole(storedRole);
      setLoading(false);
    }, 0);

    return () => {
      window.clearTimeout(syncState);
    };
  }, [router, requiredRole]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50/60">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!role) return null;

  return (
    <ViewerRoleContext.Provider value={role}>
      <div className="min-h-screen bg-[radial-gradient(110%_55%_at_50%_-20%,rgba(99,102,241,0.14),transparent_56%),linear-gradient(180deg,#f8fafc_0%,#f8fafc_40%,#f3f4f6_100%)]">
        <Navbar role={role} />
        <main className="pt-16 app-shell-main">{children}</main>
      </div>
    </ViewerRoleContext.Provider>
  );
}
