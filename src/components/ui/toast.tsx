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

const typeStyles: Record<ToastType, { bg: string; ring: string; icon: string }> = {
  success: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    ring: 'ring-emerald-500/20',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  error: {
    bg: 'bg-red-500/10 dark:bg-red-500/15',
    ring: 'ring-red-500/20',
    icon: 'text-red-600 dark:text-red-400',
  },
  info: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    ring: 'ring-blue-500/20',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  warning: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    ring: 'ring-amber-500/20',
    icon: 'text-amber-600 dark:text-amber-400',
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
        'flex items-start gap-3 rounded-lg ring-1 px-4 py-3 shadow-lg',
        'animate-[slideIn_200ms_ease-out]',
        style.bg,
        style.ring,
      )}
      role="alert"
    >
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
