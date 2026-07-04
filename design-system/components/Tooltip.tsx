'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface TooltipProps {
  content: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
  children: React.ReactNode;
}

export default function Tooltip({ content, side = 'top', delay = 300, className, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(0);
  const ref = useRef<HTMLDivElement>(null);

  const show = () => {
    timeoutRef.current = window.setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    window.clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const SIDE_POSITIONS = {
    top: '-translate-x-1/2 left-1/2 bottom-full mb-2',
    bottom: '-translate-x-1/2 left-1/2 top-full mt-2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };

  return (
    <div ref={ref} className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div
          className={cn(
            'absolute z-[150] px-2 py-1 text-[10px] font-medium text-white bg-foreground/90 rounded-lg shadow-lg whitespace-nowrap animate-fade-in pointer-events-none',
            SIDE_POSITIONS[side],
            className,
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
