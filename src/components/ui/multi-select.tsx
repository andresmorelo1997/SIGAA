'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  className?: string;
  /** Text shown as summary when nothing is selected. Defaults to placeholder. */
  emptyLabel?: string;
  /** Disable the whole control */
  disabled?: boolean;
}

/**
 * Multi-select dropdown with search, select-all, and pill summary.
 * Designed for filtering lists (campus, programas, grado, etc.).
 */
function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  label,
  className,
  emptyLabel,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const selected = useMemo(() => new Set(value), [value]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  const allVisibleSelected =
    filteredOptions.length > 0 &&
    filteredOptions.every((o) => selected.has(o.value));

  function toggle(v: string) {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(Array.from(next));
  }

  function toggleAllVisible() {
    const next = new Set(selected);
    if (allVisibleSelected) {
      for (const o of filteredOptions) next.delete(o.value);
    } else {
      for (const o of filteredOptions) next.add(o.value);
    }
    onChange(Array.from(next));
  }

  function clearAll() {
    onChange([]);
    setQuery('');
  }

  // Summary text when closed
  const summary = value.length === 0
    ? (emptyLabel ?? placeholder)
    : value.length === 1
    ? options.find((o) => o.value === value[0])?.label ?? value[0]
    : `${value.length} seleccionados`;

  return (
    <div ref={rootRef} className={clsx('relative w-full', className)}>
      {label && (
        <label className="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={clsx(
          'relative flex w-full items-center justify-between rounded-lg border bg-white dark:bg-zinc-900',
          'py-2.5 pl-3.5 pr-10 sm:py-1.5 sm:pl-3',
          'text-base/6 sm:text-sm/6 text-left',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'border-zinc-950/10 dark:border-white/10',
          value.length > 0 ? 'text-zinc-950 dark:text-white' : 'text-zinc-500',
        )}
      >
        <span className="truncate">{summary}</span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
          {value.length > 0 && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  clearAll();
                }
              }}
              className="p-0.5 text-zinc-400 hover:text-zinc-700 cursor-pointer rounded"
              aria-label="Limpiar selección"
            >
              <XMarkIcon className="size-4" />
            </span>
          )}
          <ChevronDownIcon className="size-4 text-zinc-500" />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl">
          {/* Search */}
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
            <input
              autoFocus
              type="text"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-2.5 py-1.5 text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Select all visible */}
          {filteredOptions.length > 0 && (
            <div className="px-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  className="size-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  {allVisibleSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </span>
                {query && (
                  <span className="ml-auto text-xs text-zinc-500">
                    ({filteredOptions.length})
                  </span>
                )}
              </label>
            </div>
          )}

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-zinc-500 text-center">
                Sin resultados
              </p>
            ) : (
              filteredOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 px-4 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(opt.value)}
                    onChange={() => toggle(opt.value)}
                    className="size-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-200 flex-1 truncate">
                    {opt.label}
                  </span>
                </label>
              ))
            )}
          </div>

          {/* Footer: selected count */}
          {value.length > 0 && (
            <div className="border-t border-zinc-100 dark:border-zinc-800 px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-zinc-600 dark:text-zinc-400">
                {value.length} seleccionado{value.length === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { MultiSelect };
export type { MultiSelectProps, MultiSelectOption };
