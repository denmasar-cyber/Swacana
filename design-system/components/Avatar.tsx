'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { Size } from '../tokens/design-tokens';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: Size | number;
  className?: string;
}

const SIZE_MAP: Record<Size, { size: number; fontSize: string }> = {
  xs: { size: 24, fontSize: '8px' },
  sm: { size: 28, fontSize: '9px' },
  md: { size: 36, fontSize: '11px' },
  lg: { size: 44, fontSize: '14px' },
  xl: { size: 56, fontSize: '18px' },
};

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getColorFromName(name?: string): string {
  if (!name) return 'bg-surface3 text-muted';
  const colors = [
    'bg-accent/20 text-accent',
    'bg-danger/20 text-danger',
    'bg-success/20 text-success',
    'bg-warning/20 text-warning',
    'bg-accent2/20 text-accent2',
    'bg-info/20 text-info',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({ src, alt, name, size = 'md', className }: AvatarProps) {
  const dim = typeof size === 'number' ? { size, fontSize: `${Math.max(8, size * 0.35)}px` } : SIZE_MAP[size];

  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || 'Avatar'}
        className={cn('rounded-full object-cover border-2 border-border shrink-0', className)}
        style={{ width: dim.size, height: dim.size }}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold shrink-0 border-2 border-border/50',
        getColorFromName(name),
        className,
      )}
      style={{ width: dim.size, height: dim.size, fontSize: dim.fontSize }}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
