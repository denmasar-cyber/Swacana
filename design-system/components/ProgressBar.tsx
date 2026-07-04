'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

const VARIANT_BAR = {
  primary: 'from-accent to-accent2',
  success: 'from-success to-success/70',
  warning: 'from-warning to-warning/70',
  danger: 'from-danger to-danger/70',
  gradient: 'from-accent via-accent2 to-success',
};

const SIZE_BAR = {
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2.5',
};

export default function ProgressBar({ value, max = 100, variant = 'primary', size = 'md', showLabel = false, label, animated = true, className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {(label || showLabel) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-[9px] text-muted">{label}</span>}
          {showLabel && <span className="text-[9px] text-muted font-mono">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-surface2 rounded-full overflow-hidden border border-border/30', SIZE_BAR[size])}>
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r',
            VARIANT_BAR[variant],
            animated && 'transition-all duration-500 ease-out',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
