import clsx from 'clsx';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  actions?: React.ReactNode;
  subRow?: React.ReactNode;
  className?: string;
}

const COLOR_MAP: Record<NonNullable<PageHeaderProps['color']>, { iconBg: string; iconColor: string }> = {
  primary:   { iconBg: 'bg-[#212121]',          iconColor: 'text-white' },
  secondary: { iconBg: 'bg-[#E54F38]',          iconColor: 'text-white' },
  neutral:   { iconBg: 'bg-zinc-700',           iconColor: 'text-white' },
  info:      { iconBg: 'bg-[hsl(204,70%,53%)]', iconColor: 'text-white' },
  success:   { iconBg: 'bg-[hsl(148,71%,44%)]', iconColor: 'text-white' },
  warning:   { iconBg: 'bg-[hsl(40,91%,60%)]',  iconColor: 'text-[#212121]' },
  danger:    { iconBg: 'bg-[hsl(1,64%,49%)]',   iconColor: 'text-white' },
};

/**
 * Horilla-style page titlebar — bold title, subtle subtitle, right-aligned
 * actions, thin separator underneath.
 */
function PageHeader({
  title,
  description,
  icon,
  color = 'secondary',
  actions,
  subRow,
  className,
}: PageHeaderProps) {
  const c = COLOR_MAP[color];
  return (
    <header
      className={clsx(
        'mb-5 pb-4 border-b border-[hsl(213,22%,88%)]',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div
              className={clsx(
                'shrink-0 flex items-center justify-center size-10 rounded-md',
                c.iconBg,
              )}
            >
              <div className={clsx('size-5', c.iconColor)}>{icon}</div>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold tracking-tight text-[#212121] leading-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 text-[13px] text-zinc-500">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
      {subRow && <div className="mt-3">{subRow}</div>}
    </header>
  );
}

export { PageHeader };
export type { PageHeaderProps };
