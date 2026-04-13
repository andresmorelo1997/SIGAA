'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/16/solid';
import clsx from 'clsx';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  limit?: number;
  onLimitChange?: (limit: number) => void;
  total?: number;
  limitOptions?: number[];
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];

  if (current > 3) pages.push('ellipsis');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push('ellipsis');

  pages.push(total);

  return pages;
}

function Pagination({
  page,
  totalPages,
  onPageChange,
  limit,
  onLimitChange,
  total,
  limitOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const pages = getPageNumbers(page, totalPages);

  const rangeStart = total != null && limit != null ? (page - 1) * limit + 1 : null;
  const rangeEnd =
    total != null && limit != null ? Math.min(page * limit, total) : null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm/6">
      {/* Info and rows-per-page */}
      <div className="flex items-center gap-4">
        {total != null && rangeStart != null && rangeEnd != null && (
          <span className="text-zinc-500 dark:text-zinc-400">
            Mostrando {rangeStart}-{rangeEnd} de {total}
          </span>
        )}
        {limit != null && onLimitChange && (
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 dark:text-zinc-400">Filas:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className={clsx(
                'rounded-lg border border-zinc-950/10 bg-transparent px-2 py-1 text-sm/6',
                'text-zinc-950 dark:text-white dark:border-white/10 dark:bg-white/5',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
              )}
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page buttons */}
      {totalPages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Paginacion">
          {/* Previous */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className={clsx(
              'inline-flex items-center justify-center rounded-lg border border-transparent p-1.5',
              'text-zinc-500 hover:bg-zinc-950/5 dark:text-zinc-400 dark:hover:bg-white/5',
              'disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer',
            )}
            aria-label="Pagina anterior"
          >
            <ChevronLeftIcon className="size-4" />
          </button>

          {pages.map((p, i) =>
            p === 'ellipsis' ? (
              <span
                key={`e-${i}`}
                className="px-2 text-zinc-400 dark:text-zinc-500 select-none"
              >
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={clsx(
                  'inline-flex items-center justify-center min-w-[2rem] h-8 rounded-lg text-sm/6 font-medium cursor-pointer',
                  p === page
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                    : 'border border-zinc-950/10 text-zinc-950 hover:bg-zinc-950/[2.5%] dark:border-white/10 dark:text-white dark:hover:bg-white/[2.5%]',
                )}
              >
                {p}
              </button>
            ),
          )}

          {/* Next */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className={clsx(
              'inline-flex items-center justify-center rounded-lg border border-transparent p-1.5',
              'text-zinc-500 hover:bg-zinc-950/5 dark:text-zinc-400 dark:hover:bg-white/5',
              'disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer',
            )}
            aria-label="Pagina siguiente"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </nav>
      )}
    </div>
  );
}

export { Pagination };
export type { PaginationProps };
