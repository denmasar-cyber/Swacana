/**
 * Swacana Design Tokens
 * Inspired by Reflect UI's component architecture
 * Theme: Vintage Claymorphism
 */

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const RADIUS = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
} as const;

export const FONT_SIZE = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 24,
  '3xl': 32,
} as const;

export const SHADOWS = {
  clay: {
    default: `
      0 4px 12px color-mix(in srgb, #000 6%, transparent),
      0 8px 24px color-mix(in srgb, #000 4%, transparent),
      inset 0 -2px 4px color-mix(in srgb, #000 4%, transparent),
      inset 0 2px 4px color-mix(in srgb, #fff 60%, transparent)
    `,
    hover: `
      0 6px 16px color-mix(in srgb, #000 8%, transparent),
      0 12px 32px color-mix(in srgb, #000 5%, transparent),
      inset 0 -2px 4px color-mix(in srgb, #000 4%, transparent),
      inset 0 2px 4px color-mix(in srgb, #fff 60%, transparent)
    `,
    active: `
      0 2px 6px color-mix(in srgb, #000 6%, transparent),
      inset 0 -1px 2px color-mix(in srgb, #000 4%, transparent),
      inset 0 1px 2px color-mix(in srgb, #fff 60%, transparent)
    `,
    inset: `
      inset 0 2px 6px color-mix(in srgb, #000 6%, transparent),
      inset 0 -1px 2px color-mix(in srgb, #fff 40%, transparent)
    `,
  },
  glow: {
    sm: `0 0 12px color-mix(in srgb, var(--accent) 15%, transparent)`,
    md: `0 0 20px color-mix(in srgb, var(--accent) 20%, transparent)`,
    lg: `0 0 32px color-mix(in srgb, var(--accent) 25%, transparent)`,
  },
} as const;

export const ANIMATION = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
    xslow: 600,
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
} as const;

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
export type Radius = keyof typeof RADIUS;

export interface BaseProps {
  size?: Size;
  radius?: Radius;
  className?: string;
  disabled?: boolean;
}

export function getSizeValue(size: Size): number {
  const map: Record<Size, number> = { xs: 28, sm: 32, md: 40, lg: 48, xl: 56 };
  return map[size];
}

export function getFontSize(size: Size): string {
  const map: Record<Size, string> = { xs: '9px', sm: '10px', md: '12px', lg: '14px', xl: '16px' };
  return map[size];
}

export function getRadius(radius: Radius): number {
  return RADIUS[radius];
}
