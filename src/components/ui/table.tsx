'use client';

import { forwardRef } from 'react';
import clsx from 'clsx';

/* ------------------------------------------------------------------ */
/* Table                                                              */
/* ------------------------------------------------------------------ */
interface TableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Table = forwardRef<HTMLDivElement, TableProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('overflow-x-auto', className)}
      {...props}
    >
      <table className="w-full text-left text-sm/6">{children}</table>
    </div>
  ),
);
Table.displayName = 'Table';

/* ------------------------------------------------------------------ */
/* TableHeader                                                        */
/* ------------------------------------------------------------------ */
interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

const TableHeader = forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ children, className, ...props }, ref) => (
    <thead ref={ref} className={clsx(className)} {...props}>
      {children}
    </thead>
  ),
);
TableHeader.displayName = 'TableHeader';

/* ------------------------------------------------------------------ */
/* TableBody                                                          */
/* ------------------------------------------------------------------ */
interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ children, className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={clsx('divide-y divide-zinc-950/5 dark:divide-white/5', className)}
      {...props}
    >
      {children}
    </tbody>
  ),
);
TableBody.displayName = 'TableBody';

/* ------------------------------------------------------------------ */
/* TableRow                                                           */
/* ------------------------------------------------------------------ */
interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ children, className, ...props }, ref) => (
    <tr
      ref={ref}
      className={clsx(
        'hover:bg-zinc-950/[2.5%] dark:hover:bg-white/[2.5%]',
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  ),
);
TableRow.displayName = 'TableRow';

/* ------------------------------------------------------------------ */
/* TableCell                                                          */
/* ------------------------------------------------------------------ */
interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
  first?: boolean;
}

const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ children, first = false, className, ...props }, ref) => (
    <td
      ref={ref}
      className={clsx(
        'px-4 py-4',
        first
          ? 'text-zinc-950 dark:text-white font-medium'
          : 'text-zinc-500 dark:text-zinc-400',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  ),
);
TableCell.displayName = 'TableCell';

/* ------------------------------------------------------------------ */
/* TableHeaderCell                                                    */
/* ------------------------------------------------------------------ */
type SortDirection = 'asc' | 'desc' | null;

interface TableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
  sortable?: boolean;
  sortDirection?: SortDirection;
}

const TableHeaderCell = forwardRef<HTMLTableCellElement, TableHeaderCellProps>(
  ({ children, className, sortable, sortDirection, onClick, ...props }, ref) => (
    <th
      ref={ref}
      onClick={sortable ? onClick : undefined}
      className={clsx(
        'border-b border-zinc-950/10 px-4 py-2 font-medium text-zinc-500 dark:border-white/10 dark:text-zinc-400',
        sortable && 'cursor-pointer select-none hover:text-zinc-950 dark:hover:text-white',
        className,
      )}
      {...props}
    >
      <span className="inline-flex items-center gap-1.5">
        {children}
        {sortable && (
          <span className="inline-flex flex-col text-zinc-300 dark:text-zinc-600">
            <svg
              className={clsx(
                'h-3 w-3 -mb-0.5',
                sortDirection === 'asc' && 'text-zinc-950 dark:text-white',
              )}
              viewBox="0 0 12 12"
              fill="currentColor"
            >
              <path d="M6 2l4 5H2z" />
            </svg>
            <svg
              className={clsx(
                'h-3 w-3 -mt-0.5',
                sortDirection === 'desc' && 'text-zinc-950 dark:text-white',
              )}
              viewBox="0 0 12 12"
              fill="currentColor"
            >
              <path d="M6 10L2 5h8z" />
            </svg>
          </span>
        )}
      </span>
    </th>
  ),
);
TableHeaderCell.displayName = 'TableHeaderCell';

/* ------------------------------------------------------------------ */
/* Exports                                                            */
/* ------------------------------------------------------------------ */
export { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell };
export type {
  TableProps,
  TableHeaderProps,
  TableBodyProps,
  TableRowProps,
  TableCellProps,
  TableHeaderCellProps,
  SortDirection,
};
