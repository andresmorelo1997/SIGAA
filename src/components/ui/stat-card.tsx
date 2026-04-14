import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/16/solid';
import clsx from 'clsx';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  color?:
    | 'primary'
    | 'secondary'
    | 'neutral'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info';
  hint?: string;
}

const STYLES: Record<
  NonNullable<StatCardProps['color']>,
  { iconBg: string; iconColor: string; accent: string }
> = {
  primary:   { iconBg: 'bg-[#212121]',         iconColor: 'text-white', accent: 'bg-[#212121]' },
  secondary: { iconBg: 'bg-[#E54F38]',         iconColor: 'text-white', accent: 'bg-[#E54F38]' },
  neutral:   { iconBg: 'bg-zinc-700',          iconColor: 'text-white', accent: 'bg-zinc-700' },
  info:      { iconBg: 'bg-[hsl(204,70%,53%)]',iconColor: 'text-white', accent: 'bg-[hsl(204,70%,53%)]' },
  success:   { iconBg: 'bg-[hsl(148,71%,44%)]',iconColor: 'text-white', accent: 'bg-[hsl(148,71%,44%)]' },
  warning:   { iconBg: 'bg-[hsl(40,91%,60%)]', iconColor: 'text-[#212121]', accent: 'bg-[hsl(40,91%,60%)]' },
  danger:    { iconBg: 'bg-[hsl(1,64%,49%)]',  iconColor: 'text-white', accent: 'bg-[hsl(1,64%,49%)]' },
};

/**
 * Horilla-style dashboard card — flat, thin border, icon tile on the right
 * with a colored accent stripe at the bottom.
 */
function StatCard({ label, value, icon, trend, color = 'primary', hint }: StatCardProps) {
  const s = STYLES[color];
  return (
    <div className="relative bg-white border border-[hsl(213,22%,90%)] rounded-lg overflow-hidden transition-shadow hover:shadow-sm">
      <div className="p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 truncate">
            {label}
          </p>
          <p className="mt-1.5 text-[26px] font-bold leading-none text-[#212121] tabular-nums">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-zinc-500 truncate">{hint}</p>}
          {trend && (
            <div className="mt-1.5 flex items-center gap-1 text-xs">
              {trend.value >= 0 ? (
                <ArrowUpIcon className="size-3.5 text-[hsl(148,71%,44%)]" />
              ) : (
                <ArrowDownIcon className="size-3.5 text-[hsl(1,64%,49%)]" />
              )}
              <span
                className={clsx(
                  'font-semibold',
                  trend.value >= 0 ? 'text-[hsl(148,71%,30%)]' : 'text-[hsl(1,64%,40%)]',
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
          <div className={clsx('shrink-0 flex items-center justify-center size-11 rounded-md', s.iconBg)}>
            <div className={clsx('size-5', s.iconColor)}>{icon}</div>
          </div>
        )}
      </div>
      <div className={clsx('h-[3px]', s.accent)} />
    </div>
  );
}

export { StatCard };
export type { StatCardProps };
