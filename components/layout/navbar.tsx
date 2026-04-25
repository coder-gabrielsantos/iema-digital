'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/alunos', label: 'Painel', roles: ['admin'] },
  { href: '/portaria', label: 'Portaria', roles: ['admin', 'portaria'] },
  { href: '/cantina', label: 'Cantina', roles: ['admin', 'cantina'] },
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
      <header className="fixed left-0 right-0 top-0 z-40 h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center px-4 md:px-6">
          <Link href="/" className="flex shrink-0 items-center">
            <span className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">IEMA Digital</span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <nav className="hidden items-center gap-1 md:flex">
            {visibleItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group relative flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <span
                    className={cn(
                      'absolute -bottom-px left-3 right-3 h-0.5 rounded-full transition-opacity duration-200',
                      active ? 'bg-slate-900 opacity-100' : 'bg-slate-300 opacity-0 group-hover:opacity-100'
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
            </nav>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-900"
            >
              <span className="hidden md:inline">Sair</span>
              <LogOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-lg p-2 text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-slate-950/35 pt-16 backdrop-blur-[1px] md:hidden">
          <nav className="mx-4 mt-3 space-y-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm animate-in slide-in-from-top-1 fade-in duration-300">
            {visibleItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors duration-200',
                    active
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <span
                    className={cn(
                      'absolute bottom-0 left-4 right-4 h-0.5 rounded-full transition-all duration-300',
                      active ? 'bg-slate-900' : 'bg-transparent group-hover:bg-slate-200'
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-base font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-900"
            >
              Sair do Sistema
              <LogOut className="h-5 w-5" />
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
