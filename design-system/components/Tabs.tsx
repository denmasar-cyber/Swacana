'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  badge?: string;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  onChange?: (id: string) => void;
  variant?: 'clay' | 'underline' | 'pills' | 'segmented';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const VARIANT_TABS = {
  clay: {
    container: 'bg-surface2/50 rounded-xl p-1 border border-border/50',
    tab: 'rounded-lg font-medium transition-all duration-200',
    active: 'bg-surface text-foreground shadow-[0_2px_6px_color-mix(in_srgb,#000,6%,transparent),inset_0_-1px_2px_color-mix(in_srgb,#000,3%,transparent),inset_0_1px_2px_color-mix(in_srgb,#fff,50%,transparent)] border border-border/60',
    inactive: 'text-muted hover:text-foreground',
  },
  underline: {
    container: 'border-b border-border',
    tab: 'font-medium transition-all duration-200 -mb-px',
    active: 'text-accent border-b-2 border-accent',
    inactive: 'text-muted hover:text-foreground border-b-2 border-transparent',
  },
  pills: {
    container: 'gap-1',
    tab: 'rounded-full font-medium transition-all duration-200',
    active: 'bg-accent text-white shadow-md',
    inactive: 'text-muted hover:text-foreground hover:bg-surface2',
  },
  segmented: {
    container: 'bg-surface2 rounded-xl p-0.5 border border-border',
    tab: 'rounded-lg font-medium transition-all duration-200',
    active: 'bg-surface text-foreground shadow-[0_2px_4px_color-mix(in_srgb,#000,8%,transparent)] border border-border/60',
    inactive: 'text-muted hover:text-foreground',
  },
};

const SIZE_TABS = {
  sm: 'px-2.5 py-1 text-[9px] gap-1',
  md: 'px-3 py-1.5 text-[10px] gap-1.5',
  lg: 'px-4 py-2 text-xs gap-2',
};

export default function Tabs({ tabs, activeTab: controlledActive, onChange, variant = 'clay', size = 'md', className }: TabsProps) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id);
  const isControlled = controlledActive !== undefined;
  const activeId = isControlled ? controlledActive : internalActive;

  const handleChange = (id: string) => {
    if (!isControlled) setInternalActive(id);
    onChange?.(id);
  };

  const styles = VARIANT_TABS[variant];

  return (
    <div className={cn('flex items-center', styles.container, className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleChange(tab.id)}
          className={cn(
            'flex items-center justify-center whitespace-nowrap',
            styles.tab,
            SIZE_TABS[size],
            activeId === tab.id ? styles.active : styles.inactive,
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'text-[8px] px-1 py-0.5 rounded-full',
              activeId === tab.id ? 'bg-accent/20 text-accent' : 'bg-surface2 text-muted',
            )}>
              {tab.count}
            </span>
          )}
          {tab.badge && (
            <span className="text-[7px] px-1 py-0.5 rounded-full bg-danger/20 text-danger">{tab.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}
