'use client';

import { useEffect, useCallback, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const sizeStyles: Record<string, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
  '3xl': 'max-w-7xl',
};

function Modal({ open, onClose, title, size = 'md', children, footer }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={clsx(
        'fixed inset-0 z-50',
        'flex items-center justify-center p-4',
        'bg-zinc-950/25 dark:bg-zinc-950/50',
        'animate-[fadeIn_150ms_ease-out]',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={clsx(
          'w-full',
          sizeStyles[size],
          'relative rounded-lg bg-white shadow-lg ring-1 ring-zinc-950/10',
          'dark:bg-zinc-900 dark:ring-white/10',
          'animate-[scaleIn_150ms_ease-out]',
          'max-h-[90vh] flex flex-col',
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-zinc-950/10 px-6 py-4 dark:border-white/10">
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-950/5 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 cursor-pointer"
              aria-label="Cerrar"
            >
              <XMarkIcon className="size-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-zinc-950/10 px-6 py-4 dark:border-white/10 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export { Modal };
export type { ModalProps };
