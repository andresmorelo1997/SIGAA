'use client';

import clsx from 'clsx';

interface TabsProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={clsx('border-b border-zinc-950/10 dark:border-white/10', className)}>
      <nav className="-mb-px flex gap-x-0.5 overflow-x-auto px-1 scrollbar-thin" aria-label="Tabs" style={{ scrollbarWidth: 'thin' }}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={clsx(
                'inline-flex items-center gap-2 whitespace-nowrap',
                'px-3 py-2 text-sm/6 font-medium border-b-2 cursor-pointer',
                isActive
                  ? 'border-zinc-950 text-zinc-950 dark:border-white dark:text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300',
              )}
              role="tab"
              aria-selected={isActive}
            >
              {tab.label}
              {tab.count != null && (
                <span
                  className={clsx(
                    'inline-flex items-center justify-center',
                    'min-w-[1.25rem] h-5 px-1.5 rounded-md text-xs font-medium',
                    isActive
                      ? 'bg-zinc-950/10 text-zinc-950 dark:bg-white/10 dark:text-white'
                      : 'bg-zinc-500/10 text-zinc-500 dark:bg-zinc-400/10 dark:text-zinc-400',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export { Tabs };
export type { TabsProps };
