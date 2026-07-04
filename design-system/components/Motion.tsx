'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useMotion, useHoverMotion, usePressMotion, useTilt, useStagger, type MotionPreset } from '../hooks/use-motion';

// ─── AnimateIn: Wrapper for entrance animations ─────────────────────────

export interface AnimateInProps {
  preset?: MotionPreset;
  delay?: number;
  className?: string;
  as?: 'div' | 'span' | 'section' | 'article' | 'li';
  children: React.ReactNode;
}

export function AnimateIn({ preset = 'fadeIn', delay = 0, className, as: Tag = 'div', children }: AnimateInProps) {
  const { ref: motionRef, style } = useMotion(preset, delay);

  return (
    <div ref={motionRef as React.Ref<HTMLDivElement>} className={cn(className)} style={style}>
      {children}
    </div>
  );
}

// ─── HoverLift: Hover micro-interaction ─────────────────────────────────

export interface HoverLiftProps {
  scale?: number;
  lift?: number;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export function HoverLift({ scale = 1.02, lift = 3, className, children, onClick }: HoverLiftProps) {
  const { isHovered: _isHovered, ...motionProps } = useHoverMotion(scale, lift);

  return (
    <div className={cn('cursor-pointer', className)} {...motionProps} onClick={onClick}>
      {children}
    </div>
  );
}

// ─── PressScale: Press feedback ─────────────────────────────────────────

export interface PressScaleProps {
  scale?: number;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export function PressScale({ scale = 0.97, className, children, onClick }: PressScaleProps) {
  const motion = usePressMotion(scale);

  return (
    <button className={cn('cursor-pointer bg-transparent border-none p-0', className)} {...motion} onClick={onClick}>
      {children}
    </button>
  );
}

// ─── TiltCard: 3D tilt on hover ────────────────────────────────────────

export interface TiltCardProps {
  maxTilt?: number;
  className?: string;
  children: React.ReactNode;
}

export function TiltCard({ maxTilt = 8, className, children }: TiltCardProps) {
  const { ref: tiltRef, style: tiltStyle, onMouseMove: tiltMouseMove, onMouseLeave: tiltMouseLeave } = useTilt(maxTilt);

  return (
    <div ref={tiltRef} className={cn(className)} style={tiltStyle} onMouseMove={tiltMouseMove} onMouseLeave={tiltMouseLeave}>
      {children}
    </div>
  );
}

// ─── StaggerGroup: Staggered children animation ─────────────────────────

export interface StaggerGroupProps {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}

export function StaggerGroup({ delay = 40, className, children }: StaggerGroupProps) {
  const count = React.Children.count(children);
  const styles = useStagger(count, delay);

  return (
    <div className={cn(className)}>
      {React.Children.map(children, (child, i) => (
        <div style={styles[i]}>{child}</div>
      ))}
    </div>
  );
}

// ─── Float: Continuous float animation ─────────────────────────────────

export interface FloatProps {
  amplitude?: number;
  duration?: number;
  className?: string;
  children: React.ReactNode;
}

export function Float({ amplitude = 8, duration = 4, className, children }: FloatProps) {
  const animName = amplitude <= 4 ? 'animate-float-4' : amplitude <= 6 ? 'animate-float-6' : 'animate-float-8';
  return (
    <div
      className={cn(animName, className)}
      style={{ animationDuration: `${duration}s` }}
    >
      {children}
    </div>
  );
}

// ─── GlowPulse: Pulsing glow effect ─────────────────────────────────────

export interface GlowPulseProps {
  color?: string;
  duration?: number;
  className?: string;
  children: React.ReactNode;
}

export function GlowPulse({ color: _color = 'var(--accent)', duration = 3, className, children }: GlowPulseProps) {
  return (
    <div
      className={cn('animate-soft-glow', className)}
      style={{ animationDuration: `${duration}s` }}
    >
      {children}
    </div>
  );
}
