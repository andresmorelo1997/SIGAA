import clsx from 'clsx';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  /** Accent color of the title icon. Defaults to UniSinú red. */
  color?: 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  /** Right-aligned action buttons/controls */
  actions?: React.ReactNode;
  /** Optional sub-row (breadcrumbs, chips, etc) below the title block */
  subRow?: React.ReactNode;
  className?: string;
}

const COLOR_MAP: Record<
  NonNullable<PageHeaderProps['color']>,
  { iconBg: string; ring: string }
> = {
  primary: { iconBg: 'bg-[#A6192E]', ring: 'ring-[#A6192E]/15' },
  neutral: { iconBg: 'bg-slate-700', ring: 'ring-slate-500/15' },
  success: { iconBg: 'bg-emerald-600', ring: 'ring-emerald-500/15' },
  warning: { iconBg: 'bg-amber-500', ring: 'ring-amber-500/15' },
  danger: { iconBg: 'bg-red-600', ring: 'ring-red-500/15' },
  info: { iconBg: 'bg-sky-700', ring: 'ring-sky-500/15' },
};

/**
 * Consistent page header used across the SIGAA — institutional look
 * (Universidad del Sinú red accent over neutral surfaces).
 */
function PageHeader({
  title,
  description,
  icon,
  color = 'primary',
  actions,
  subRow,
  className,
}: PageHeaderProps) {
  const c = COLOR_MAP[color];
  return (
    <header
      className={clsx(
        'mb-6 pb-5 border-b border-zinc-200',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {icon && (
            <div
              className={clsx(
                'shrink-0 flex items-center justify-center size-11 rounded-lg shadow-sm ring-4 text-white',
                c.iconBg,
                c.ring,
              )}
            >
              <div className="size-6">{icon}</div>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 leading-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-zinc-600">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
      {subRow && <div className="mt-4">{subRow}</div>}
    </header>
  );
}

export { PageHeader };
export type { PageHeaderProps };
