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

/**
 * Horilla-inspired button palette. Primary is black; brand accent is coral.
 * Legacy variant names (blue/red/green/amber) are mapped via variantAliases
 * so existing call sites keep working.
 */
const variantStyles: Record<string, string> = {
  // Horilla primary = black (#212121) — action buttons, confirm, save
  dark: 'border-transparent bg-[#212121] text-white hover:bg-[#0a0a0a] shadow-sm',
  // Brand coral — highlights, secure actions
  coral: 'border-transparent bg-[#E54F38] text-white hover:bg-[hsl(8,77%,46%)] shadow-sm',
  blue: 'border-transparent bg-[hsl(204,70%,53%)] text-white hover:bg-[hsl(204,62%,48%)]',
  red: 'border-transparent bg-[hsl(1,64%,49%)] text-white hover:bg-[hsl(1,64%,42%)]',
  green: 'border-transparent bg-[hsl(148,71%,44%)] text-white hover:bg-[hsl(148,71%,36%)]',
  amber: 'border-transparent bg-[hsl(40,91%,60%)] text-[#212121] hover:bg-[hsl(40,91%,52%)]',
  outline:
    'border-[hsl(213,22%,84%)] bg-white text-[#212121] hover:bg-[hsl(213,22%,97%)]',
  plain:
    'border-transparent text-zinc-700 hover:bg-[hsl(213,22%,95%)] hover:text-[#212121]',
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
