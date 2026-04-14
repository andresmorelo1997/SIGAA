'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid';
import clsx from 'clsx';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

type ToastType = Toast['type'];

/* ------------------------------------------------------------------ */
/* useToast hook                                                      */
/* ------------------------------------------------------------------ */
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

/* ------------------------------------------------------------------ */
/* ToastContainer                                                     */
/* ------------------------------------------------------------------ */
interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const typeStyles: Record<ToastType, { bg: string; ring: string; icon: string; bar: string }> = {
  success: {
    bg: 'bg-white dark:bg-zinc-900',
    ring: 'ring-emerald-500/40',
    icon: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
  },
  error: {
    bg: 'bg-white dark:bg-zinc-900',
    ring: 'ring-red-500/40',
    icon: 'text-red-600 dark:text-red-400',
    bar: 'bg-red-500',
  },
  info: {
    bg: 'bg-white dark:bg-zinc-900',
    ring: 'ring-blue-500/40',
    icon: 'text-blue-600 dark:text-blue-400',
    bar: 'bg-blue-500',
  },
  warning: {
    bg: 'bg-white dark:bg-zinc-900',
    ring: 'ring-amber-500/40',
    icon: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
  },
};

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircleIcon className="size-5" />,
  error: <XCircleIcon className="size-5" />,
  info: <InformationCircleIcon className="size-5" />,
  warning: <ExclamationTriangleIcon className="size-5" />,
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => onRemove(toast.id), 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onRemove]);

  const style = typeStyles[toast.type];

  return (
    <div
      className={clsx(
        'relative flex items-start gap-3 rounded-lg ring-1 pl-5 pr-4 py-3 shadow-xl overflow-hidden',
        'animate-[slideIn_200ms_ease-out]',
        style.bg,
        style.ring,
      )}
      role="alert"
    >
      {/* Accent bar on the left */}
      <span
        className={clsx('absolute inset-y-0 left-0 w-1.5 rounded-l-lg', style.bar)}
        aria-hidden="true"
      />
      <div className={clsx('shrink-0 mt-0.5', style.icon)}>{icons[toast.type]}</div>
      <p className="flex-1 text-sm/6 font-medium text-zinc-950 dark:text-white">
        {toast.message}
      </p>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 rounded-lg p-0.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
        aria-label="Cerrar notificacion"
      >
        <XMarkIcon className="size-4" />
      </button>
    </div>
  );
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(1rem); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

export { useToast, ToastContainer };
export type { Toast, ToastContainerProps };
