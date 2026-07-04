'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
  icon?: React.ReactNode;
}

const DIALOG_ICONS = {
  danger: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
};

const DIALOG_COLORS = {
  danger: 'text-danger',
  warning: 'text-warning',
  info: 'text-accent',
  success: 'text-success',
};

export default function Dialog({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Konfirmasi', cancelLabel = 'Batal',
  variant = 'info', loading, icon: iconProp,
}: DialogProps) {
  const IconComponent = DIALOG_ICONS[variant];
  const icon = iconProp || <IconComponent size={24} />;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="text-center">
        <div className={cn('w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-surface2', DIALOG_COLORS[variant])}>
          {typeof icon === 'object' ? icon : <IconComponent size={24} />}
        </div>
        <h3 className="text-sm font-bold text-foreground mb-1">{title}</h3>
        <p className="text-xs text-muted leading-relaxed">{message}</p>
      </div>
      <div className="flex items-center justify-center gap-2 mt-5">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          size="sm"
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

// ─── Hook for easy dialog usage ──────────────────────────────────────────

export function useDialog() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: DialogProps['variant'];
    resolve: ((value: boolean) => void) | null;
  }>({ open: false, title: '', message: '', variant: 'info', resolve: null });

  const confirm = useCallback((title: string, message: string, variant?: DialogProps['variant']): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, title, message, variant: variant || 'info', resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState({ open: false, title: '', message: '', variant: 'info', resolve: null });
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState({ open: false, title: '', message: '', variant: 'info', resolve: null });
  }, [state.resolve]);

  return { confirm, handleConfirm, handleCancel, ...state };
}
