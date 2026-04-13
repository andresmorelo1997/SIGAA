'use client';

import { useState, useRef, useCallback } from 'react';
import { CloudArrowUpIcon, DocumentIcon, XMarkIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';

interface FileDropzoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  label?: string;
  description?: string;
  disabled?: boolean;
}

function FileDropzone({
  onFiles,
  accept,
  multiple = false,
  maxSize,
  label = 'Arrastra archivos aqui o haz clic para buscar',
  description,
  disabled = false,
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSet = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;
      setError(null);

      const valid: File[] = [];
      for (let i = 0; i < incoming.length; i++) {
        const file = incoming[i];
        if (maxSize && file.size > maxSize) {
          setError(
            `"${file.name}" excede el tamano maximo de ${(maxSize / 1024 / 1024).toFixed(1)} MB`,
          );
          continue;
        }
        valid.push(file);
      }

      const next = multiple ? [...files, ...valid] : valid.slice(0, 1);
      setFiles(next);
      onFiles(next);
    },
    [files, maxSize, multiple, onFiles],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!disabled) validateAndSet(e.dataTransfer.files);
  };

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndSet(e.target.files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    onFiles(next);
  };

  return (
    <div className="w-full">
      {/* Drop area */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick();
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={clsx(
          'relative flex flex-col items-center justify-center gap-2',
          'rounded-lg border-2 border-dashed p-8 cursor-pointer',
          disabled && 'opacity-50 cursor-not-allowed',
          isDragOver
            ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-500/10'
            : 'border-zinc-950/10 hover:border-zinc-950/20 bg-transparent dark:border-white/10 dark:hover:border-white/20',
        )}
      >
        <div
          className={clsx(
            'rounded-lg p-3',
            isDragOver
              ? 'bg-blue-500/10'
              : 'bg-zinc-950/5 dark:bg-white/5',
          )}
        >
          <CloudArrowUpIcon
            className={clsx(
              'size-6',
              isDragOver
                ? 'text-blue-500'
                : 'text-zinc-500 dark:text-zinc-400',
            )}
          />
        </div>

        <p className="text-sm/6 font-medium text-zinc-950 dark:text-white">{label}</p>
        {description && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
        {accept && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Formatos: {accept}
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Error */}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-500">{error}</p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className={clsx(
                'flex items-center justify-between rounded-lg',
                'ring-1 ring-zinc-950/5 dark:ring-white/10',
                'bg-zinc-950/[2.5%] dark:bg-white/[2.5%]',
                'px-3 py-2 text-sm/6',
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <DocumentIcon className="size-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                <span className="truncate text-zinc-950 dark:text-white">{file.name}</span>
                <span className="text-zinc-500 dark:text-zinc-400 text-xs shrink-0">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="ml-2 rounded-lg p-1 text-zinc-500 hover:text-red-600 hover:bg-red-500/10 dark:text-zinc-400 dark:hover:text-red-400 cursor-pointer"
                aria-label={`Eliminar ${file.name}`}
              >
                <XMarkIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { FileDropzone };
export type { FileDropzoneProps };
