'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Animation Presets ──────────────────────────────────────────────────

export type MotionPreset = 'fadeIn' | 'scaleIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'expand' | 'bounce' | 'spring' | 'rotate';

export interface MotionConfig {
  from: Record<string, string | number>;
  to: Record<string, string | number>;
  duration: number;
  easing: string;
}

export const MOTION_PRESETS: Record<MotionPreset, MotionConfig> = {
  fadeIn: {
    from: { opacity: 0, transform: 'translateY(8px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    duration: 350, easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
  scaleIn: {
    from: { opacity: 0, transform: 'scale(0.92)' },
    to: { opacity: 1, transform: 'scale(1)' },
    duration: 250, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  slideUp: {
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    duration: 400, easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
  slideDown: {
    from: { opacity: 0, transform: 'translateY(-12px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
  slideLeft: {
    from: { opacity: 0, transform: 'translateX(12px)' },
    to: { opacity: 1, transform: 'translateX(0)' },
    duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
  slideRight: {
    from: { opacity: 0, transform: 'translateX(-12px)' },
    to: { opacity: 1, transform: 'translateX(0)' },
    duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
  expand: {
    from: { opacity: 0, transform: 'scaleY(0.8)', maxHeight: '0px' },
    to: { opacity: 1, transform: 'scaleY(1)', maxHeight: '500px' },
    duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  bounce: {
    from: { opacity: 0, transform: 'scale(0.85)' },
    to: { opacity: 1, transform: 'scale(1)' },
    duration: 400, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  spring: {
    from: { opacity: 0, transform: 'translateY(10px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    duration: 500, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  rotate: {
    from: { opacity: 0, transform: 'rotate(-5deg) scale(0.95)' },
    to: { opacity: 1, transform: 'rotate(0deg) scale(1)' },
    duration: 350, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

// ─── useMotion: Element Animation ──────────────────────────────────────

export function useMotion(presetName: MotionPreset = 'fadeIn', delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  const presetCfg = MOTION_PRESETS[presetName];
  const transition = `all ${presetCfg.duration}ms ${presetCfg.easing}`;
  const style = isVisible
    ? { ...presetCfg.to, transition }
    : { ...presetCfg.from, transition };

  return { ref, style, isVisible };
}

// ─── useHoverMotion: Micro-interactions ─────────────────────────────────

export function useHoverMotion(scale = 1.02, lift = 2) {
  const [isHovered, setIsHovered] = useState(false);

  const style = {
    transform: isHovered ? `scale(${scale}) translateY(-${lift}px)` : 'scale(1) translateY(0)',
    transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  };

  return {
    style,
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
    isHovered,
  };
}

// ─── usePressMotion: Press/Click Feedback ──────────────────────────────

export function usePressMotion(scale = 0.97) {
  const [isPressed, setIsPressed] = useState(false);

  return {
    style: {
      transform: isPressed ? `scale(${scale})` : 'scale(1)',
      transition: 'transform 100ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
    onMouseDown: () => setIsPressed(true),
    onMouseUp: () => setIsPressed(false),
    onMouseLeave: () => setIsPressed(false),
    isPressed,
  };
}

// ─── useStagger: Staggered Children Animation ──────────────────────────

export function useStagger(count: number, baseDelay = 40) {
  return Array.from({ length: count }, (_, i) => ({
    animation: 'slideUp 400ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
    animationDelay: `${i * baseDelay}ms`,
    opacity: 0,
  }));
}

// ─── useTransition: Page/Route Transitions ─────────────────────────────

export function usePageTransition(duration = 400) {
  const [state, setState] = useState<'enter' | 'entered' | 'exit'>('enter');

  useEffect(() => {
    setState('enter');
    const enterTimer = setTimeout(() => setState('entered'), 50);
    return () => clearTimeout(enterTimer);
  }, []);

  const startExit = useCallback(() => {
    return new Promise<void>((resolve) => {
      setState('exit');
      setTimeout(resolve, duration);
    });
  }, [duration]);

  const currentTransform = state === 'exit'
    ? 'translateY(12px) scale(0.98)'
    : state === 'enter'
      ? 'translateY(12px) scale(0.98)'
      : 'translateY(0) scale(1)';

  const style = {
    opacity: state === 'exit' ? 0 : 1,
    transform: currentTransform,
    transition: `all ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  };

  return { style, state, startExit };
}

// ─── useTilt: 3D Tilt on Hover ─────────────────────────────────────────

export function useTilt(maxTilt = 8) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -maxTilt, y: x * maxTilt });
  }, [maxTilt]);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  return {
    ref,
    style: {
      transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
      transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
  };
}

// ─── useRipple: Material-like Ripple Effect ────────────────────────────

export function useRipple() {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const idRef = useRef(0);

  const addRipple = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = idRef.current++;
    setRipples((prev) => [...prev, { x, y, id }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  }, []);

  const rippleElements = ripples.map((r) => (
    <span
      key={r.id}
      className="absolute pointer-events-none rounded-full bg-white/20"
      style={{
        left: r.x,
        top: r.y,
        width: 20,
        height: 20,
        transform: 'translate(-50%, -50%) scale(0)',
        animation: 'ripple 600ms ease-out forwards',
      }}
    />
  ));

  return { addRipple, rippleElements };
}
