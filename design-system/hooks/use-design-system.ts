'use client';

import { useState, useEffect } from 'react';

export function useDesignSystem() {
  const [isDark, setIsDark] = useState(true);
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const saved = localStorage.getItem('swacana-theme');
    setIsDark(saved !== 'light');

    const checkViewport = () => {
      const w = window.innerWidth;
      if (w < 640) setViewport('mobile');
      else if (w < 1024) setViewport('tablet');
      else setViewport('desktop');
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('swacana-theme', next ? 'dark' : 'light');
  };

  const setTheme = (dark: boolean) => {
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('swacana-theme', dark ? 'dark' : 'light');
  };

  return { isDark, toggleTheme, setTheme, viewport };
}
