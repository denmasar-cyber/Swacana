'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
}

export default function Skeleton({ width, height, radius, className, variant = 'text' }: SkeletonProps) {
  const base = 'bg-surface2/80 animate-shimmer rounded-lg';
  const v: Record<string, string> = {
    text: 'h-3 w-full',
    circular: 'rounded-full',
    rectangular: 'w-full h-24',
    card: 'w-full h-32 rounded-xl',
  };

  return (
    <div
      className={cn(base, v[variant], className)}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof radius === 'number' ? `${radius}px` : radius,
      }}
    />
  );
}

// ─── Skeleton Group ──────────────────────────────────────────────────────

export function SkeletonGroup({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton variant="circular" width={24} height={24} />
          <div className="flex-1 space-y-1">
            <Skeleton width={`${70 + Math.random() * 30}%`} height={10} />
            <Skeleton width={`${40 + Math.random() * 30}%`} height={8} />
          </div>
        </div>
      ))}
    </div>
  );
}
