'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  DoorOpen,
  UtensilsCrossed,
  Users,
  LogOut,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  portaria: 'Portaria',
  cantina: 'Cantina',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-indigo-100 text-indigo-700 border border-indigo-200/80',
  portaria: 'bg-emerald-100 text-emerald-700 border border-emerald-200/80',
  cantina: 'bg-amber-100 text-amber-700 border border-amber-200/80',
};

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { href: '/portaria', label: 'Portaria', icon: DoorOpen, roles: ['admin', 'portaria'] },
  { href: '/cantina', label: 'Cantina', icon: UtensilsCrossed, roles: ['admin', 'cantina'] },
  { href: '/alunos', label: 'Alunos', icon: Users, roles: ['admin'] },
];

interface NavbarProps {
  role: string;
}

export function Navbar({ role }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    localStorage.removeItem('iema_role');
    localStorage.removeItem('iema_key');
    router.push('/login');
  }

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-40 h-16 border-b border-slate-200 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.06),0_4px_12px_-2px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div className="flex h-full items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="gradient-primary shadow-glow flex h-8 w-8 items-center justify-center rounded-lg">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="gradient-text font-bold">IEMA Digital</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-[#4F46E5] text-white shadow-sm shadow-indigo-950/10 hover:bg-[#4338CA]'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                  )}
                >
                  <span
                    className={cn(
                      'absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full transition-colors',
                      active ? 'bg-white/85' : 'bg-transparent'
                    )}
                  />
                  <Icon className={cn('h-4 w-4', active ? 'text-white' : 'text-indigo-600 group-hover:text-indigo-700')} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <span className={cn('hidden md:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', ROLE_COLORS[role])}>
              {ROLE_LABELS[role] || role}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Sair</span>
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-slate-950/40 pt-16 backdrop-blur-[2px] md:hidden">
          <nav className="mx-4 mt-3 space-y-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-premium-lg">
            <div className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mb-4', ROLE_COLORS[role])}>
              {ROLE_LABELS[role] || role}
            </div>
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors',
                    active ? 'bg-[#4F46E5] text-white shadow-sm shadow-indigo-950/10' : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <Icon className={cn('h-5 w-5', active ? 'text-white' : 'text-indigo-600')} />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="mt-4 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              Sair do Sistema
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
