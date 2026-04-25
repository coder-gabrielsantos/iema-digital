'use client';

import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { PlatformLogo } from '@/components/platform-logo';
import { cn } from '@/lib/utils';

export type AuthSplitShellProps = {
  mobileSlot: ReactNode;
  desktopSlot: ReactNode;
};

export default function AuthSplitShell({ mobileSlot, desktopSlot }: AuthSplitShellProps) {
  const glowRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const [glowLit, setGlowLit] = useState(true);

  const syncGlowFromClient = (clientX: number, clientY: number) => {
    const aside = asideRef.current;
    if (!aside) return;
    const rect = aside.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    glowRef.current?.style.setProperty('--mx', `${x}%`);
    glowRef.current?.style.setProperty('--my', `${y}%`);
  };

  const handleShellMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    syncGlowFromClient(e.clientX, e.clientY);
  };

  return (
    <main className="min-h-[100dvh] bg-white">
      <div
        className="grid min-h-[100dvh] lg:grid-cols-[1.65fr_0.95fr]"
        onMouseMove={handleShellMouseMove}
        onMouseEnter={() => setGlowLit(true)}
        onMouseLeave={() => setGlowLit(false)}
      >
        <aside ref={asideRef} className="relative hidden select-none overflow-hidden bg-[#03050a] lg:block">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#080b14] via-[#03050a] to-[#0a0e18]" />
          <div
            ref={glowRef}
            className={cn('pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out', glowLit ? 'opacity-100' : 'opacity-0')}
            style={
              {
                '--mx': '50%',
                '--my': '50%',
                background: `
                  radial-gradient(circle 100vmin at var(--mx) var(--my), rgba(99, 102, 241, 0.22), transparent 68%),
                  radial-gradient(circle 82vmin at var(--mx) var(--my), rgba(14, 165, 233, 0.14), transparent 64%),
                  radial-gradient(circle 120vmin at var(--mx) var(--my), rgba(255, 255, 255, 0.045), transparent 75%)
                `,
              } as CSSProperties
            }
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.45] mix-blend-soft-light"
            style={{
              backgroundImage: `repeating-linear-gradient(
                -28deg,
                rgba(255,255,255,0.04) 0px,
                rgba(255,255,255,0.04) 1px,
                transparent 1px,
                transparent 14px
              )`,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.25]"
            style={{
              backgroundImage: `repeating-linear-gradient(
                58deg,
                rgba(255,255,255,0.02) 0px,
                rgba(255,255,255,0.02) 1px,
                transparent 1px,
                transparent 22px
              )`,
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:52px_52px] opacity-[0.35]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_75%_at_50%_50%,transparent_0%,rgba(0,0,0,0.45)_100%)]" />

          <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6 p-10">
            <PlatformLogo variant="white" size={112} showIcon={false} />
          </div>
        </aside>

        <section className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#03050a] lg:hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#080b14] via-[#03050a] to-[#0a0e18]" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-soft-light"
            style={{
              backgroundImage: `repeating-linear-gradient(
                -28deg,
                rgba(255,255,255,0.04) 0px,
                rgba(255,255,255,0.04) 1px,
                transparent 1px,
                transparent 14px
              )`,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.2]"
            style={{
              backgroundImage: `repeating-linear-gradient(
                58deg,
                rgba(255,255,255,0.02) 0px,
                rgba(255,255,255,0.02) 1px,
                transparent 1px,
                transparent 22px
              )`,
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:44px_44px] opacity-25" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_50%,transparent_0%,rgba(0,0,0,0.5)_100%)]" />

          <div className="relative z-10 flex min-h-[100dvh] flex-col px-6 sm:px-8">
            <div className="flex flex-col items-center gap-3 pt-[max(2.5rem,env(safe-area-inset-top))] sm:pt-[max(3rem,env(safe-area-inset-top))]">
              <PlatformLogo variant="white" size={72} showIcon={false} />
            </div>
            <div className="mt-auto w-full max-w-xs self-center pb-[max(1.25rem,env(safe-area-inset-bottom))]">{mobileSlot}</div>
          </div>
        </section>

        <section className="hidden items-center justify-center bg-white px-6 py-10 sm:px-10 lg:flex">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)]">
            {desktopSlot}
          </div>
        </section>
      </div>
    </main>
  );
}
