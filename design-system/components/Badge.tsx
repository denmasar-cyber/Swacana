'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { Variant } from '../tokens/design-tokens';

export interface BadgeProps {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const VARIANT_BADGE: Record<Variant, string> = {
  primary: 'bg-accent/12 text-accent border-accent/20',
  secondary: 'bg-surface2 text-muted border-border/40',
  outline: 'bg-transparent text-foreground border-border',
  ghost: 'bg-transparent text-muted border-0',
  danger: 'bg-danger/12 text-danger border-danger/20',
  success: 'bg-success/12 text-success border-success/20',
  warning: 'bg-warning/12 text-warning border-warning/20',
};

const SIZE_BADGE = {
  sm: 'px-1.5 py-0.5 text-[8px] gap-0.5',
  md: 'px-2 py-0.5 text-[9px] gap-1',
  lg: 'px-2.5 py-1 text-[10px] gap-1.5',
};

export default function Badge({ variant = 'primary', size = 'sm', dot, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold border',
        VARIANT_BADGE[variant],
        SIZE_BADGE[size],
        className,
      )}
    >
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          variant === 'success' ? 'bg-success' : variant === 'danger' ? 'bg-danger' : variant === 'warning' ? 'bg-warning' : 'bg-accent',
        )} />
      )}
      {children}
    </span>
  );
}
