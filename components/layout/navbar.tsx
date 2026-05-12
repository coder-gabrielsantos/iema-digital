'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import logo from '@/app/util/logo.png';
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
  classCode: string;
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
            <Image
              src={logo}
              alt="IEMA Digital"
              priority
              className="h-9 w-auto md:h-10"
            />
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <nav className="hidden items-stretch gap-1 md:flex">
            {visibleItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex w-[5.5rem] shrink-0 items-center justify-center whitespace-nowrap px-2 py-1.5 text-center text-sm font-medium transition-colors duration-200',
                    active
                      ? 'border-b-2 border-slate-900 text-slate-900'
                      : 'border-b-2 border-transparent text-slate-600 hover:border-slate-400 hover:text-slate-900'
                  )}
                >
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
                className="hidden items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-wait disabled:opacity-55 md:flex"
              >
                <QrCode className="h-4 w-4" />
                {downloadingCards ? 'Gerando...' : 'QR-code'}
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                'order-2 flex items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors duration-200 md:order-none',
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
                'order-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors duration-200 md:order-none md:hidden',
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
        <div
          className="fixed inset-0 z-30 flex flex-col items-end bg-slate-900/25 pt-16 backdrop-blur-[3px] md:hidden"
          onClick={() => setMobileOpen(false)}
          role="presentation"
        >
          <nav
            className="mr-4 mt-3 flex w-[min(15rem,calc(100vw-2rem))] flex-col gap-1 rounded-xl border border-slate-200/90 bg-white/98 p-2.5 shadow-premium-lg animate-in slide-in-from-top-1 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
            aria-label="Menu principal"
          >
            {visibleItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center rounded-lg px-3.5 py-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60 focus-visible:ring-offset-2',
                    active
                      ? 'bg-slate-100 text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            {canDownloadCards ? (
              <>
                <div
                  className="my-1.5 h-px shrink-0 bg-gradient-to-r from-transparent via-slate-200 to-transparent"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => void handleDownloadCards()}
                  disabled={downloadingCards}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-3 text-left text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-55"
                >
                  <QrCode className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  <span className="min-w-0 flex-1">
                    {downloadingCards ? 'Gerando...' : 'QR-code'}
                  </span>
                </button>
              </>
            ) : null}
          </nav>
        </div>
      )}
      <div id="student-cards-print-root" aria-hidden="true">
        <div className="student-cards-print-grid">
          {cardStudents.map((student) => (
            <article key={student._id} className="student-card-print-item">
              <p className="student-card-print-name">{student.name}</p>
              <p className="student-card-print-class">Turma {student.classCode}</p>
              <div className="student-card-print-qr">
                <QRCodeSVG value={student._id} size={256} level="H" marginSize={1} />
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
          size: 100mm 150mm;
          margin: 4mm;
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
            width: 92mm;
            margin: 0;
            color: #111827;
          }

          .student-cards-print-grid {
            display: grid;
            grid-template-columns: repeat(2, 45mm);
            grid-auto-rows: 69mm;
            gap: 2mm;
            justify-content: center;
          }

          .student-card-print-item {
            display: flex;
            width: 45mm;
            height: 69mm;
            break-inside: avoid;
            page-break-inside: avoid;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 0.35mm solid #111827;
            border-radius: 1.2mm;
            padding: 2.5mm;
            background: #ffffff;
            box-sizing: border-box;
          }

          .student-card-print-name {
            display: -webkit-box;
            min-height: 7.5mm;
            max-height: 7.5mm;
            margin: 0 0 1.2mm;
            overflow: hidden;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            text-align: center;
            font-size: 6.8pt;
            font-weight: 700;
            line-height: 1.15;
          }

          .student-card-print-class {
            margin: 0 0 1.2mm;
            text-align: center;
            font-size: 6pt;
            font-weight: 600;
            line-height: 1.1;
            color: #475569;
          }

          .student-card-print-qr {
            display: flex;
            width: 40mm;
            height: 40mm;
            align-items: center;
            justify-content: center;
          }

          .student-card-print-qr svg {
            width: 40mm;
            height: 40mm;
          }
        }
      `}</style>
    </>
  );
}
