import clsx from 'clsx';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Round avatar — shows initials on an institutional-palette background.
 * Uses UniSinú red + neutral slate/stone shades (no fluorescent colors)
 * so the look stays corporate. The specific shade is deterministic from
 * the name so the same docente always gets the same avatar.
 */
function Avatar({ name, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name);
  const color = getColor(name);

  const sizeClasses =
    size === 'sm'
      ? 'size-7 text-[10px]'
      : size === 'lg'
      ? 'size-12 text-base'
      : 'size-9 text-xs';

  return (
    <div
      className={clsx(
        'inline-flex items-center justify-center rounded-full font-bold text-white shrink-0 ring-2 ring-white shadow-sm',
        sizeClasses,
        color,
        className,
      )}
      aria-label={name}
      title={name}
    >
      {initials || '?'}
    </div>
  );
}

function getInitials(fullName: string): string {
  if (!fullName) return '';
  const clean = fullName.trim().replace(/\s+/g, ' ');
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Institutional palette: UniSinú red variants + neutrals. Produces avatars
 * that look like a coherent team directory rather than a color bomb.
 */
const PALETTE = [
  'bg-unisinu-600',
  'bg-unisinu-700',
  'bg-unisinu-800',
  'bg-slate-600',
  'bg-slate-700',
  'bg-slate-800',
  'bg-stone-600',
  'bg-stone-700',
  'bg-zinc-700',
  'bg-zinc-800',
];

function getColor(seed: string): string {
  if (!seed) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export { Avatar };
export type { AvatarProps };
