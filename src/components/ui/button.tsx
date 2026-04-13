'use client';

import { forwardRef } from 'react';
import clsx from 'clsx';

type ButtonVariant = 'dark' | 'blue' | 'red' | 'green' | 'amber' | 'outline' | 'plain'
  | 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

/** Map legacy variant names to Catalyst variants */
const variantAliases: Record<string, string> = {
  primary: 'dark',
  secondary: 'outline',
  danger: 'red',
  ghost: 'plain',
  success: 'green',
};

const variantStyles: Record<string, string> = {
  dark: 'border-transparent bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200',
  blue: 'border-transparent bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400',
  red: 'border-transparent bg-red-600 text-white hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-400',
  green: 'border-transparent bg-emerald-600 text-white hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400',
  amber: 'border-transparent bg-amber-500 text-white hover:bg-amber-400 dark:bg-amber-500 dark:hover:bg-amber-400',
  outline:
    'border-zinc-950/10 text-zinc-950 hover:bg-zinc-950/[2.5%] dark:border-white/10 dark:text-white dark:hover:bg-white/[2.5%]',
  plain:
    'border-transparent text-zinc-950 hover:bg-zinc-950/5 dark:text-white dark:hover:bg-white/5',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-2.5 py-1 text-sm/6 sm:text-xs/6',
  md: 'px-3.5 py-2.5 text-base/6 sm:px-3 sm:py-1.5 sm:text-sm/6',
  lg: 'px-4 py-3 text-base/6',
};

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={clsx('animate-spin size-4', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'dark',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const resolvedVariant = variantAliases[variant] ?? variant;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          'relative isolate inline-flex items-center justify-center gap-x-2 rounded-lg border font-semibold',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          'cursor-pointer',
          isDisabled && 'opacity-50 cursor-not-allowed',
          variantStyles[resolvedVariant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading && <Spinner />}
        {!loading && icon && iconPosition === 'left' && icon}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
