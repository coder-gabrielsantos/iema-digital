import * as React from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface StudentPhotoProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  photoData?: string;
  photoMime?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
  xl: 'h-10 w-10',
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0]?.substring(0, 2).toUpperCase() ?? '??';
}

function stringToColor(str: string): string {
  const colors = [
    '#1d4ed8', '#0891b2', '#059669', '#7c3aed',
    '#db2777', '#ea580c', '#16a34a', '#9333ea',
    '#0284c7', '#dc2626',
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
  className,
  ...props
}: StudentPhotoProps) {
  const hasPhoto = Boolean(photoData && photoData.length > 10);
  const initials = getInitials(name);
  const color = stringToColor(name);

  return (
    <div
      className={cn(
        'relative flex flex-shrink-0 items-center justify-center rounded-full overflow-hidden',
        sizeClasses[size],
        !hasPhoto && 'font-bold text-white',
        className
      )}
      style={!hasPhoto ? { backgroundColor: color } : undefined}
      {...props}
    >
      {hasPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`data:${photoMime};base64,${photoData}`}
          alt={name}
          className="h-full w-full object-cover"
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
