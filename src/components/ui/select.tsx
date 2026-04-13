'use client';

import { forwardRef } from 'react';
import { ChevronDownIcon } from '@heroicons/react/16/solid';
import clsx from 'clsx';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  description?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, description, className, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2"
          >
            {label}
          </label>
        )}
        {description && (
          <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={clsx(
              'relative block w-full appearance-none rounded-lg border bg-transparent',
              'py-2.5 pl-3.5 pr-10 sm:py-1.5 sm:pl-3 sm:pr-9',
              'text-base/6 sm:text-sm/6 text-zinc-950 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-zinc-950/10 dark:border-white/10 dark:bg-white/5',
              className,
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${selectId}-error` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 dark:text-zinc-400">
            <ChevronDownIcon className="size-4" />
          </div>
        </div>
        {error && (
          <p id={`${selectId}-error`} className="mt-2 text-sm text-red-600 dark:text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';

export { Select };
export type { SelectProps };
