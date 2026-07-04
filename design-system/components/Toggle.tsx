'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { BaseProps } from '../tokens/design-tokens';

export interface ToggleProps extends BaseProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export default function Toggle({ checked, onChange, label, disabled, className }: ToggleProps) {
  return (
    <label className={cn('flex items-center gap-2 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 rounded-full transition-all duration-200 border',
          checked
            ? 'bg-gradient-to-r from-accent to-accent2 border-accent/30 shadow-[inset_0_1px_2px_color-mix(in_srgb,#fff,30%,transparent)]'
            : 'bg-surface2 border-border shadow-[inset_0_1px_3px_color-mix(in_srgb,#000,8%,transparent)]',
        )}
      >
        <span
          className={cn(
            'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-md transform transition-transform duration-200',
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]',
          )}
        />
      </button>
      {label && <span className="text-xs text-foreground">{label}</span>}
    </label>
  );
}
