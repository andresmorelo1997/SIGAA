'use client';

import { forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  helperText?: string;
  description?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, helperText, description, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2"
          >
            {label}
          </label>
        )}
        {description && (
          <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 dark:text-zinc-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'relative block w-full appearance-none rounded-lg border bg-transparent',
              'px-3.5 py-2.5 sm:px-3 sm:py-1.5',
              'text-base/6 sm:text-sm/6 text-zinc-950 dark:text-white',
              'placeholder:text-zinc-500 dark:placeholder:text-zinc-400',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              icon && 'pl-10',
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-zinc-950/10 dark:border-white/10 dark:bg-white/5',
              className,
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-2 text-sm text-red-600 dark:text-red-500">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
