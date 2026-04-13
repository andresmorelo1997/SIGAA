import clsx from 'clsx';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 rounded-lg bg-zinc-950/5 p-4 text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm/6 text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
