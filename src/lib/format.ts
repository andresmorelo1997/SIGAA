/**
 * Shared formatting helpers used across the UI.
 *
 * Colombia conventions:
 * - Dates: DD/MM/AAAA (optionally with HH:mm for timestamps)
 * - Instructor IDs: 10-digit left-padded with zeros
 */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Parse a date string or Date and return DD/MM/AAAA.
 * Accepts: ISO strings, "YYYY-MM-DD", "DD/MM/YYYY", "M/D/YY", Date, null/undefined.
 * Returns '' when the value is missing or unparseable.
 */
export function formatDate(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    return `${pad2(value.getDate())}/${pad2(value.getMonth() + 1)}/${value.getFullYear()}`;
  }
  if (typeof value !== 'string') return '';
  const s = value.trim();
  if (!s) return '';

  // Already DD/MM/YYYY? keep as-is.
  const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    return `${pad2(parseInt(ddmmyyyy[1], 10))}/${pad2(parseInt(ddmmyyyy[2], 10))}/${ddmmyyyy[3]}`;
  }

  // "YYYY-MM-DD" optionally followed by time
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }

  // "M/D/YY" (the Elysa exports use this) → expand year ≥50 → 19xx else 20xx
  const short = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (short) {
    const month = parseInt(short[1], 10);
    const day = parseInt(short[2], 10);
    const yy = parseInt(short[3], 10);
    const year = yy >= 50 ? 1900 + yy : 2000 + yy;
    return `${pad2(day)}/${pad2(month)}/${year}`;
  }

  // Fallback to Date parsing
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  }
  return s;
}

/**
 * Same as formatDate but with HH:mm appended. Only includes the time when
 * the input actually carries it.
 */
export function formatDateTime(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (isNaN(d.getTime())) return formatDate(value);
  const date = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  return `${date} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Left-pad an instructor_id / employee ID with zeros to 10 digits
 * (Colombian HR convention).
 *
 * Returns '' for null/undefined/empty strings so callers can render a dash.
 */
export function formatInstructorId(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value).trim();
  if (!s) return '';
  // Already 10+ digits? keep as-is (may be longer for special cases).
  if (s.length >= 10) return s;
  return s.padStart(10, '0');
}

/**
 * Classify a ciclo_lectivo code by grade tier.
 * Elysa convention:
 *   2XY1 / 2XY3 where Y=6 → pregrado
 *   2XY1 / 2XY2 where Y=9 → posgrado (medicina especializaciones usan 2XY1/2XY2 con Y=9)
 *
 * Returns 'posgrado', 'pregrado', or 'both' when we can't decide.
 */
export function cicloTier(ciclo: string): 'pregrado' | 'posgrado' | 'both' {
  if (!ciclo) return 'both';
  const s = ciclo.trim();
  if (s.length !== 4) return 'both';
  const middle = s[2];
  if (middle === '9') return 'posgrado';
  if (middle === '6') return 'pregrado';
  return 'both';
}
