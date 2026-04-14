import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/16/solid';
import clsx from 'clsx';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  /**
   * Visual accent of the card. 'primary' uses Universidad del Sinú red.
   * Other neutral accents are available for status/context but the app
   * should lean on 'primary' and 'neutral' by default.
   */
  color?: 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  /** Optional helper line shown under the value. */
  hint?: string;
}

const colorStyles: Record<
  NonNullable<StatCardProps['color']>,
  { iconBg: string; iconRing: string; accent: string; value: string }
> = {
  primary: {
    // UniSinú red
    iconBg: 'bg-[#A6192E]',
    iconRing: 'ring-[#A6192E]/15',
    accent: 'bg-[#A6192E]',
    value: 'text-zinc-900',
  },
  neutral: {
    iconBg: 'bg-slate-700',
    iconRing: 'ring-slate-500/15',
    accent: 'bg-slate-700',
    value: 'text-zinc-900',
  },
  success: {
    iconBg: 'bg-emerald-600',
    iconRing: 'ring-emerald-500/15',
    accent: 'bg-emerald-600',
    value: 'text-zinc-900',
  },
  warning: {
    iconBg: 'bg-amber-500',
    iconRing: 'ring-amber-500/15',
    accent: 'bg-amber-500',
    value: 'text-zinc-900',
  },
  danger: {
    iconBg: 'bg-red-600',
    iconRing: 'ring-red-500/15',
    accent: 'bg-red-600',
    value: 'text-zinc-900',
  },
  info: {
    iconBg: 'bg-sky-700',
    iconRing: 'ring-sky-500/15',
    accent: 'bg-sky-700',
    value: 'text-zinc-900',
  },
};

function StatCard({ label, value, icon, trend, color = 'primary', hint }: StatCardProps) {
  const s = colorStyles[color];

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm',
        'transition-all duration-150 hover:shadow-md hover:border-zinc-300',
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 truncate">
              {label}
            </p>
            <p className={clsx('mt-2 text-2xl font-bold leading-none', s.value)}>
              {value}
            </p>
            {hint && (
              <p className="mt-1.5 text-xs text-zinc-500 truncate">{hint}</p>
            )}
            {trend && (
              <div className="mt-2 flex items-center gap-1 text-xs">
                {trend.value >= 0 ? (
                  <ArrowUpIcon className="size-3.5 text-emerald-600" />
                ) : (
                  <ArrowDownIcon className="size-3.5 text-red-600" />
                )}
                <span
                  className={clsx(
                    'font-semibold',
                    trend.value >= 0 ? 'text-emerald-700' : 'text-red-700',
                  )}
                >
                  {trend.value > 0 ? '+' : ''}
                  {trend.value}%
                </span>
                <span className="text-zinc-500">{trend.label}</span>
              </div>
            )}
          </div>
          {icon && (
            <div
              className={clsx(
                'shrink-0 flex items-center justify-center size-10 rounded-lg ring-4 text-white',
                s.iconBg,
                s.iconRing,
              )}
            >
              <div className="size-5">{icon}</div>
            </div>
          )}
        </div>
      </div>
      {/* Thin accent stripe on top */}
      <div className={clsx('absolute inset-x-0 top-0 h-0.5', s.accent)} />
    </div>
  );
}

export { StatCard };
export type { StatCardProps };
