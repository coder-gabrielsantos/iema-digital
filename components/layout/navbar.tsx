'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut,
  Menu,
  QrCode,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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

interface StudentCard {
  _id: string;
  name: string;
}

interface NavbarProps {
  role: string;
}

export function Navbar({ role }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cardStudents, setCardStudents] = useState<StudentCard[]>([]);
  const [downloadingCards, setDownloadingCards] = useState(false);

  function handleLogout() {
    localStorage.removeItem('iema_role');
    localStorage.removeItem('iema_key');
    router.push('/login');
  }

  async function handleDownloadCards() {
    setDownloadingCards(true);

    try {
      const res = await fetch('/api/student-cards');
      if (!res.ok) {
        throw new Error(`Falha ao carregar cartões (HTTP ${res.status})`);
      }

      const data: { items: StudentCard[] } = await res.json();
      setCardStudents(data.items);
      setMobileOpen(false);

      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => resolve());
        });
      });

      const previousTitle = document.title;
      document.title = 'cartoes-alunos-iema';
      window.print();

      window.setTimeout(() => {
        document.title = previousTitle;
        setCardStudents([]);
      }, 500);
    } catch (error) {
      console.error(error);
      window.alert('Não foi possível baixar os cartões. Tente novamente.');
    } finally {
      setDownloadingCards(false);
    }
  }

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const canDownloadCards = role === 'admin';

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

            {canDownloadCards ? (
              <button
                type="button"
                onClick={() => void handleDownloadCards()}
                disabled={downloadingCards}
                className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-wait disabled:opacity-55 md:flex"
              >
                <QrCode className="h-4 w-4" />
                {downloadingCards ? 'Gerando...' : 'QR-code'}
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                'order-2 flex items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors duration-200 md:order-none',
                'h-10 w-10 shrink-0 border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 md:h-auto md:w-auto md:border-red-200 md:px-3 md:py-2'
              )}
            >
              <span className="hidden md:inline">Sair</span>
              <LogOut className="h-5 w-5 md:h-4 md:w-4" />
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileOpen}
              className={cn(
                'order-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200 md:order-none md:hidden',
                mobileOpen
                  ? 'border-slate-300 bg-slate-100 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/20 pt-16 md:hidden">
          <nav className="mx-4 mt-3 space-y-1.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm animate-in slide-in-from-top-1 fade-in duration-200">
            {visibleItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors duration-150',
                    active
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            {canDownloadCards ? (
              <button
                type="button"
                onClick={() => void handleDownloadCards()}
                disabled={downloadingCards}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-wait disabled:opacity-55"
              >
                {downloadingCards ? 'Gerando...' : 'QR-code'}
                <QrCode className="h-4 w-4" />
              </button>
            ) : null}
          </nav>
        </div>
      )}
      <div id="student-cards-print-root" aria-hidden="true">
        <div className="student-cards-print-grid">
          {cardStudents.map((student) => (
            <article key={student._id} className="student-card-print-item">
              <p className="student-card-print-name">{student.name}</p>
              <div className="student-card-print-qr">
                <QRCodeSVG value={student._id} size={160} level="H" marginSize={1} />
              </div>
            </article>
          ))}
        </div>
      </div>
      <style jsx global>{`
        #student-cards-print-root {
          display: none;
        }

        @page {
          size: A4;
          margin: 10mm;
        }

        @media print {
          html,
          body {
            background: #ffffff !important;
          }

          header,
          .app-shell-main {
            display: none !important;
          }

          #student-cards-print-root {
            display: block !important;
            width: 190mm;
            margin: 0 auto;
            color: #111827;
          }

          .student-cards-print-grid {
            display: grid;
            grid-template-columns: repeat(3, 58mm);
            gap: 4mm;
            justify-content: center;
          }

          .student-card-print-item {
            display: flex;
            width: 58mm;
            height: 65mm;
            break-inside: avoid;
            page-break-inside: avoid;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 0.35mm solid #111827;
            border-radius: 2mm;
            padding: 3mm;
            background: #ffffff;
          }

          .student-card-print-name {
            display: -webkit-box;
            min-height: 10mm;
            max-height: 10mm;
            margin: 0 0 2mm;
            overflow: hidden;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            text-align: center;
            font-size: 8.5pt;
            font-weight: 700;
            line-height: 1.15;
          }

          .student-card-print-qr {
            display: flex;
            width: 43mm;
            height: 43mm;
            align-items: center;
            justify-content: center;
          }

          .student-card-print-qr svg {
            width: 42mm;
            height: 42mm;
          }
        }
      `}</style>
    </>
  );
}
