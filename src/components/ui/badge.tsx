import { forwardRef } from 'react';
import clsx from 'clsx';

type BadgeColor =
  | 'zinc'
  | 'blue'
  | 'red'
  | 'orange'
  | 'amber'
  | 'green'
  | 'emerald'
  | 'cyan'
  | 'purple'
  | 'pink';

/** Legacy variant names supported for backward compatibility */
type LegacyVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  /** Catalyst color name */
  color?: BadgeColor;
  /** Legacy variant prop (maps to color) */
  variant?: BadgeColor | LegacyVariant;
  /** Size -- kept for backward compat, visual difference is minimal */
  size?: 'sm' | 'md';
  /** Show a leading dot indicator */
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Map legacy variant names to Catalyst color tokens */
const variantToColor: Record<string, BadgeColor> = {
  success: 'emerald',
  warning: 'amber',
  danger: 'red',
  info: 'blue',
  neutral: 'zinc',
  primary: 'zinc',
};

const colorStyles: Record<BadgeColor, string> = {
  zinc: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300',
  blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  red: 'bg-red-500/15 text-red-700 dark:text-red-400',
  orange: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  green: 'bg-green-500/15 text-green-700 dark:text-green-400',
  emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  cyan: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
  purple: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  pink: 'bg-pink-500/15 text-pink-700 dark:text-pink-400',
};

const dotColorStyles: Record<BadgeColor, string> = {
  zinc: 'bg-zinc-500',
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
  emerald: 'bg-emerald-500',
  cyan: 'bg-cyan-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ color, variant, dot = false, children, className }, ref) => {
    // Resolve final color: explicit `color` wins, then resolve `variant` (with legacy map), fallback zinc
    let resolved: BadgeColor = 'zinc';
    if (color) {
      resolved = color;
    } else if (variant) {
      resolved = (variantToColor[variant] ?? variant) as BadgeColor;
    }

    return (
      <span
        ref={ref}
        className={clsx(
          'inline-flex items-center gap-x-1.5 rounded-md px-1.5 py-0.5 text-sm/5 font-medium sm:text-xs/5',
          colorStyles[resolved],
          className,
        )}
      >
        {dot && (
          <span
            className={clsx('inline-block size-1.5 rounded-full', dotColorStyles[resolved])}
          />
        )}
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';

export { Badge };
export type { BadgeProps, BadgeColor };
