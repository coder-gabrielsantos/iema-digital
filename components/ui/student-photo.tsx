import * as React from 'react';
import { cn } from '@/lib/utils';

interface StudentPhotoProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  photoData?: string;
  photoMime?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** When true (default), the image is only mounted near the viewport to avoid decoding many base64 photos at once. */
  lazy?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0]?.substring(0, 2).toUpperCase() ?? '??';
}

function stringToColor(str: string): string {
  const colors = [
    '#4338ca', '#0284c7', '#4f46e5', '#7c3aed',
    '#db2777', '#ea580c', '#16a34a', '#0f766e',
    '#0369a1', '#dc2626',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function StudentPhoto({
  name,
  photoData,
  photoMime = 'image/jpeg',
  size = 'md',
  lazy = true,
  className,
  ...props
}: StudentPhotoProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const hasPhoto = Boolean(photoData && photoData.length > 10);
  const [revealed, setRevealed] = React.useState(!lazy);
  const initials = getInitials(name);
  const color = stringToColor(name);

  React.useEffect(() => {
    if (!lazy) {
      setRevealed(true);
      return;
    }
    if (!hasPhoto) return;

    const node = containerRef.current;
    if (!node) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { root: null, rootMargin: '96px', threshold: 0 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [lazy, hasPhoto, photoData]);

  const showImage = hasPhoto && revealed;
  const showPlaceholder = hasPhoto && lazy && !revealed;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex flex-shrink-0 items-center justify-center rounded-full overflow-hidden',
        sizeClasses[size],
        !hasPhoto && 'font-bold text-white shadow-sm shadow-indigo-950/20',
        showPlaceholder && 'bg-slate-200',
        className
      )}
      style={!hasPhoto ? { backgroundColor: color } : undefined}
      {...props}
    >
      {showPlaceholder ? (
        <span className="absolute inset-0 animate-pulse bg-slate-300/50" aria-hidden />
      ) : null}
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`data:${photoMime};base64,${photoData}`}
          alt={name}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          className="relative z-[1] h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
          }}
        />
      ) : null}
      {!hasPhoto && (
        <span className="select-none">{initials}</span>
      )}
    </div>
  );
}
