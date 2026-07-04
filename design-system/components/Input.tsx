'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { BaseProps, Size } from '../tokens/design-tokens';

export interface InputProps extends BaseProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const SIZE_STYLES: Record<Size, string> = {
  xs: 'px-2 py-1 text-[9px] rounded-lg',
  sm: 'px-2.5 py-1.5 text-[10px] rounded-xl',
  md: 'px-3 py-2 text-xs rounded-xl',
  lg: 'px-4 py-2.5 text-sm rounded-[14px]',
  xl: 'px-5 py-3 text-base rounded-[16px]',
};

export default function Input({
  size = 'md',
  radius,
  className,
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  fullWidth,
  disabled,
  ...props
}: InputProps) {
  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
      {label && (
        <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          className={cn(
            'w-full bg-surface2 text-foreground placeholder:text-muted/40 border transition-all duration-200',
            'shadow-[inset_0_2px_6px_color-mix(in_srgb,#000,6%,transparent),inset_0_-1px_2px_color-mix(in_srgb,#fff,40%,transparent)]',
            error
              ? 'border-danger focus:border-danger focus:shadow-[inset_0_2px_6px_color-mix(in_srgb,#000,6%,transparent),0_0_0_3px_color-mix(in_srgb,var(--danger),15%,transparent)]'
              : 'border-border focus:border-accent focus:shadow-[inset_0_2px_6px_color-mix(in_srgb,#000,6%,transparent),0_0_0_3px_color-mix(in_srgb,var(--accent),15%,transparent)]',
            'focus:outline-none',
            disabled && 'opacity-50 cursor-not-allowed',
            SIZE_STYLES[size],
            leftIcon && 'pl-8',
            rightIcon && 'pr-8',
            className,
          )}
          style={radius ? { borderRadius: radius === 'full' ? 9999 : (radius === 'sm' ? 6 : radius === 'md' ? 10 : radius === 'lg' ? 14 : 18) } : undefined}
          disabled={disabled}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <span className="text-[9px] text-danger">{error}</span>}
      {hint && !error && <span className="text-[9px] text-muted">{hint}</span>}
    </div>
  );
}
