'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { BaseProps, Size } from '../tokens/design-tokens';

export interface SelectProps extends BaseProps, Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  fullWidth?: boolean;
}

const SIZE_STYLES: Record<Size, string> = {
  xs: 'px-2 py-1 text-[9px] rounded-lg',
  sm: 'px-2.5 py-1.5 text-[10px] rounded-xl',
  md: 'px-3 py-2 text-xs rounded-xl',
  lg: 'px-4 py-2.5 text-sm rounded-[14px]',
  xl: 'px-5 py-3 text-base rounded-[16px]',
};

export default function Select({
  size = 'md',
  className,
  label,
  error,
  options,
  placeholder,
  fullWidth,
  disabled,
  ...props
}: SelectProps) {
  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
      {label && (
        <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">{label}</label>
      )}
      <div className="relative">
        <select
          className={cn(
            'w-full appearance-none bg-surface2 text-foreground border border-border transition-all duration-200',
            'shadow-[inset_0_2px_6px_color-mix(in_srgb,#000,6%,transparent),inset_0_-1px_2px_color-mix(in_srgb,#fff,40%,transparent)]',
            'focus:outline-none focus:border-accent focus:shadow-[inset_0_2px_6px_color-mix(in_srgb,#000,6%,transparent),0_0_0_3px_color-mix(in_srgb,var(--accent),15%,transparent)]',
            disabled && 'opacity-50 cursor-not-allowed',
            SIZE_STYLES[size],
            className,
          )}
          disabled={disabled}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface text-foreground">
              {opt.label}
            </option>
          ))}
        </select>
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
      {error && <span className="text-[9px] text-danger">{error}</span>}
    </div>
  );
}
