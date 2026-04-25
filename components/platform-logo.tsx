'use client';

import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type PlatformLogoProps = {
  className?: string;
  variant?: 'default' | 'white';
  size?: number;
  showIcon?: boolean;
};

export function PlatformLogo({ className, variant = 'default', size = 48, showIcon = true }: PlatformLogoProps) {
  const isWhite = variant === 'white';

  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      {showIcon ? (
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl shadow-glow',
            isWhite ? 'gradient-primary' : 'gradient-primary'
          )}
          style={{ width: size, height: size }}
        >
          <ShieldCheck className={cn(isWhite ? 'text-white' : 'text-white')} size={Math.round(size * 0.55)} />
        </div>
      ) : null}
      <div className="flex flex-col items-center justify-center text-center leading-tight">
        <p className={cn('text-sm font-medium uppercase tracking-[0.2em]', isWhite ? 'text-slate-300' : 'text-slate-500')}>
          Plataforma
        </p>
        <h2 className={cn('text-3xl font-bold tracking-tight', isWhite ? 'text-white' : 'gradient-text')}>IEMA Digital</h2>
      </div>
    </div>
  );
}
