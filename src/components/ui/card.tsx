import { forwardRef } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

const paddingStyles: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, padding = 'md', header, footer }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-lg bg-white shadow-sm ring-1 ring-zinc-950/5',
          'dark:bg-zinc-900 dark:ring-white/10',
          className,
        )}
      >
        {header && (
          <div className="border-b border-zinc-950/5 px-6 py-4 dark:border-white/5 font-semibold text-zinc-950 dark:text-white">
            {header}
          </div>
        )}
        <div className={paddingStyles[padding]}>{children}</div>
        {footer && (
          <div className="border-t border-zinc-950/5 px-6 py-4 dark:border-white/5">
            {footer}
          </div>
        )}
      </div>
    );
  },
);

Card.displayName = 'Card';

export { Card };
export type { CardProps };
