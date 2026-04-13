import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/16/solid';
import clsx from 'clsx';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'red';
}

const colorStyles: Record<string, { bg: string; icon: string }> = {
  blue: { bg: 'bg-blue-500/10', icon: 'text-blue-600 dark:text-blue-400' },
  green: { bg: 'bg-emerald-500/10', icon: 'text-emerald-600 dark:text-emerald-400' },
  purple: { bg: 'bg-purple-500/10', icon: 'text-purple-600 dark:text-purple-400' },
  amber: { bg: 'bg-amber-500/10', icon: 'text-amber-600 dark:text-amber-400' },
  red: { bg: 'bg-red-500/10', icon: 'text-red-600 dark:text-red-400' },
};

function StatCard({ label, value, icon, trend, color = 'blue' }: StatCardProps) {
  const { bg, icon: iconColor } = colorStyles[color];

  return (
    <div
      className={clsx(
        'rounded-lg bg-white shadow-sm ring-1 ring-zinc-950/5 p-6',
        'dark:bg-zinc-900 dark:ring-white/10',
      )}
    >
      <div className="flex items-start gap-4">
        {icon && (
          <div className={clsx('shrink-0 rounded-lg p-2.5', bg)}>
            <div className={iconColor}>{icon}</div>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm/6 font-medium text-zinc-500 dark:text-zinc-400 truncate">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">
            {value}
          </p>
          {trend && (
            <div className="mt-2 flex items-center gap-1 text-sm/6">
              {trend.value >= 0 ? (
                <ArrowUpIcon className="size-4 text-emerald-500" />
              ) : (
                <ArrowDownIcon className="size-4 text-red-500" />
              )}
              <span
                className={
                  trend.value >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }
              >
                {trend.value > 0 ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">{trend.label}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { StatCard };
export type { StatCardProps };
