'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { BaseProps } from '../tokens/design-tokens';

export interface CardProps extends BaseProps {
  variant?: 'clay' | 'glass' | 'outlined' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
  as?: 'div' | 'button' | 'article' | 'section';
}

const VARIANT_STYLES = {
  clay: 'bg-surface border border-border/50 shadow-[0_4px_12px_color-mix(in_srgb,#000,6%,transparent),0_8px_24px_color-mix(in_srgb,#000,4%,transparent),inset_0_-2px_4px_color-mix(in_srgb,#000,4%,transparent),inset_0_2px_4px_color-mix(in_srgb,#fff,60%,transparent)]',
  glass: 'bg-surface/75 backdrop-blur-md border border-border/40 shadow-lg',
  outlined: 'bg-transparent border-2 border-border',
  flat: 'bg-surface2 border-0',
};

const PADDING = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

export default function Card({
  variant = 'clay',
  padding = 'md',
  hover = false,
  onClick,
  as: Component = 'div',
  radius,
  className,
  children,
  ...props
}: CardProps & { children?: React.ReactNode }) {
  const radiusStyle = radius ? { borderRadius: radius === 'sm' ? 8 : radius === 'md' ? 12 : radius === 'lg' ? 16 : radius === 'xl' ? 20 : 9999 } : undefined;

  const base = cn(
    'rounded-xl transition-all duration-250',
    VARIANT_STYLES[variant],
    PADDING[padding],
    hover && !onClick && 'hover:shadow-[0_6px_16px_color-mix(in_srgb,#000,8%,transparent),0_12px_32px_color-mix(in_srgb,#000,5%,transparent),inset_0_-2px_4px_color-mix(in_srgb,#000,4%,transparent),inset_0_2px_4px_color-mix(in_srgb,#fff,60%,transparent)] hover:-translate-y-0.5',
    hover && onClick && 'cursor-pointer hover:shadow-[0_6px_16px_color-mix(in_srgb,#000,8%,transparent),0_12px_32px_color-mix(in_srgb,#000,5%,transparent),inset_0_-2px_4px_color-mix(in_srgb,#000,4%,transparent),inset_0_2px_4px_color-mix(in_srgb,#fff,60%,transparent)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_6px_color-mix(in_srgb,#000,6%,transparent)]',
    className,
  );

  if (Component === 'button') {
    return (
      <button className={base} style={radiusStyle} onClick={onClick} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
        {children}
      </button>
    );
  }

  return (
    <Component className={base} style={radiusStyle} onClick={onClick} {...props}>
      {children}
    </Component>
  );
}

// ─── Card Header / Body / Footer ──────────────────────────────────────────

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between gap-3 mb-3', className)} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex-1', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-end gap-2 mt-4 pt-3 border-t border-border/50', className)} {...props}>
      {children}
    </div>
  );
}
