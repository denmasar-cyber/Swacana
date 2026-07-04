'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { BaseProps, Variant, Size, Radius } from '../tokens/design-tokens';
import { getFontSize, getRadius } from '../tokens/design-tokens';

export interface ButtonProps extends BaseProps, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: Variant;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLAY: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-accent to-accent2 text-white border-0 shadow-[0_4px_10px_color-mix(in_srgb,var(--accent),30%,transparent),inset_0_-2px_4px_color-mix(in_srgb,#000,15%,transparent),inset_0_2px_4px_color-mix(in_srgb,#fff,30%,transparent)] hover:shadow-[0_6px_14px_color-mix(in_srgb,var(--accent),35%,transparent),inset_0_-2px_4px_color-mix(in_srgb,#000,15%,transparent),inset_0_2px_4px_color-mix(in_srgb,#fff,30%,transparent)] active:shadow-[0_2px_6px_color-mix(in_srgb,var(--accent),25%,transparent),inset_0_-1px_2px_color-mix(in_srgb,#000,20%,transparent),inset_0_1px_2px_color-mix(in_srgb,#fff,20%,transparent)]',
  secondary:
    'bg-surface text-foreground border border-border shadow-[0_2px_6px_color-mix(in_srgb,#000,4%,transparent),inset_0_-1px_2px_color-mix(in_srgb,#000,3%,transparent),inset_0_1px_2px_color-mix(in_srgb,#fff,40%,transparent)] hover:bg-surface2 hover:border-muted active:bg-surface3',
  outline:
    'bg-transparent text-foreground border-2 border-accent/60 hover:bg-accent/8 active:bg-accent/12',
  ghost:
    'bg-transparent text-foreground border-0 hover:bg-surface2 active:bg-surface3',
  danger:
    'bg-gradient-to-br from-danger to-danger/80 text-white border-0 shadow-[0_4px_10px_color-mix(in_srgb,var(--danger),30%,transparent),inset_0_-2px_4px_color-mix(in_srgb,#000,15%,transparent),inset_0_2px_4px_color-mix(in_srgb,#fff,30%,transparent)] hover:brightness-110 active:brightness-90',
  success:
    'bg-gradient-to-br from-success to-success/80 text-white border-0 shadow-[0_4px_10px_color-mix(in_srgb,var(--success),30%,transparent),inset_0_-2px_4px_color-mix(in_srgb,#000,15%,transparent),inset_0_2px_4px_color-mix(in_srgb,#fff,30%,transparent)] hover:brightness-110 active:brightness-90',
  warning:
    'bg-gradient-to-br from-warning to-warning/80 text-white border-0 shadow-[0_4px_10px_color-mix(in_srgb,var(--warning),30%,transparent),inset_0_-2px_4px_color-mix(in_srgb,#000,15%,transparent),inset_0_2px_4px_color-mix(in_srgb,#fff,30%,transparent)] hover:brightness-110 active:brightness-90',
};

const SIZE_STYLES: Record<Size, string> = {
  xs: 'px-2.5 py-1 text-[9px] gap-1 rounded-lg',
  sm: 'px-3 py-1.5 text-[10px] gap-1.5 rounded-xl',
  md: 'px-4 py-2 text-xs gap-2 rounded-xl',
  lg: 'px-5 py-2.5 text-sm gap-2 rounded-[14px]',
  xl: 'px-6 py-3 text-base gap-2.5 rounded-[16px]',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  radius,
  className,
  disabled,
  loading,
  leftIcon,
  rightIcon,
  fullWidth,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-200 select-none',
        VARIANT_CLAY[variant],
        SIZE_STYLES[size],
        fullWidth && 'w-full',
        (disabled || loading) && 'opacity-50 cursor-not-allowed pointer-events-none',
        !disabled && !loading && 'hover:-translate-y-0.5 active:translate-y-0 cursor-pointer',
        className,
      )}
      style={radius ? { borderRadius: getRadius(radius) } : undefined}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin" width={getFontSize(size).replace('px', '')} height={getFontSize(size).replace('px', '')} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
