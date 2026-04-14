import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/reportes/pdf?tipo=...&campus=...&periodo=...&...
 *
 * Generates a PDF of a report by:
 *   1. Reusing GET /api/reportes to fetch (up to 10 000) rows with the same
 *      filters the user applied in the UI.
 *   2. Building a lightweight HTML table with a header card listing the
 *      active filters.
 *   3. Rendering the HTML with Playwright/Chromium and returning a PDF.
 */

const TIPO_TITULOS: Record<string, string> = {
  'actividad-academica': 'Actividad Académica',
  dedicacion: 'Dedicación',
  'nivel-formacion': 'Nivel de Formación',
  'profesores-asignaturas': 'Profesores por Asignatura',
  'planta-profesoral': 'Planta Profesoral',
  'horas-docentes': 'Horas Docente',
  'escala-salarial': 'Escala Salarial',
  'nuevas-plazas': 'Nuevas Plazas',
  reemplazos: 'Reemplazos',
  'no-continuan': 'No Continúan',
};

function escapeHtml(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(
  tipo: string,
  filters: Record<string, string>,
  rows: Record<string, unknown>[],
): string {
  const titulo = TIPO_TITULOS[tipo] ?? tipo;
  const fecha = new Date().toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Filter chips
  const filterChips = Object.entries(filters)
    .filter(([, v]) => v && v !== 'undefined')
    .map(
      ([k, v]) =>
        `<span class="chip"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</span>`,
    )
    .join('');

  // Table columns: take from the first row, fallback to empty table.
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  // Numeric totals row: sum columns that look numeric.
  const totals: Record<string, number | null> = {};
  for (const c of columns) {
    let sum = 0;
    let hasNum = false;
    for (const r of rows) {
      const v = r[c];
      if (typeof v === 'number' && isFinite(v)) {
        sum += v;
        hasNum = true;
      } else if (typeof v === 'string') {
        const n = parseFloat(v);
        if (!isNaN(n) && /^-?\d+(\.\d+)?$/.test(v.trim())) {
          sum += n;
          hasNum = true;
        }
      }
    }
    totals[c] = hasNum ? sum : null;
  }

  const headHtml = columns
    .map((c) => `<th>${escapeHtml(c)}</th>`)
    .join('');

  const bodyHtml = rows
    .map(
      (r) =>
        `<tr>${columns
          .map((c) => {
            const v = r[c];
            const isNum = typeof v === 'number';
            const formatted =
              v === null || v === undefined
                ? '-'
                : isNum
                ? Number(v).toLocaleString('es-CO')
                : escapeHtml(v);
            return `<td${isNum ? ' class="num"' : ''}>${formatted}</td>`;
          })
          .join('')}</tr>`,
    )
    .join('');

  const totalsHtml = columns.some((c) => totals[c] !== null)
    ? `<tr class="totals">${columns
        .map((c) => {
          if (c === columns[0]) return `<td><strong>Total</strong></td>`;
          const t = totals[c];
          return t === null
            ? '<td></td>'
            : `<td class="num"><strong>${t.toLocaleString('es-CO')}</strong></td>`;
        })
        .join('')}</tr>`
    : '';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(titulo)} — SIGAA</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    margin: 0;
    padding: 18px 24px;
    color: #18181b;
    font-size: 10pt;
  }
  header {
    border-bottom: 2px solid #1e3a5f;
    padding-bottom: 12px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
  }
  header .title-block h1 {
    margin: 0 0 2px;
    font-size: 18pt;
    color: #1e3a5f;
  }
  header .title-block p {
    margin: 0;
    color: #52525b;
    font-size: 10pt;
  }
  header .meta {
    text-align: right;
    font-size: 9pt;
    color: #52525b;
  }
  .filters {
    margin-bottom: 14px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    background: #e0f2fe;
    color: #075985;
    padding: 3px 10px;
    border-radius: 9999px;
    font-size: 9pt;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
  }
  thead th {
    background: #1e3a5f;
    color: white;
    padding: 6px 8px;
    text-align: left;
    font-weight: 600;
    border: 1px solid #1e3a5f;
  }
  tbody td {
    padding: 4px 8px;
    border: 1px solid #e4e4e7;
  }
  tbody tr:nth-child(even) td { background: #fafafa; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.totals td {
    background: #fef3c7 !important;
    border-top: 2px solid #f59e0b;
    border-bottom: 2px solid #f59e0b;
  }
  footer {
    margin-top: 16px;
    font-size: 8pt;
    color: #71717a;
    text-align: right;
  }
</style>
</head>
<body>
  <header>
    <div class="title-block">
      <h1>${escapeHtml(titulo)}</h1>
      <p>Universidad del Sinú — SIGAA</p>
    </div>
    <div class="meta">
      <div>Generado: ${escapeHtml(fecha)}</div>
      <div>${rows.length.toLocaleString('es-CO')} registros</div>
    </div>
  </header>

  ${filterChips ? `<div class="filters">${filterChips}</div>` : ''}

  ${
    rows.length === 0
      ? '<p style="text-align:center; color:#a1a1aa; padding: 48px 0;">Sin datos para los filtros aplicados.</p>'
      : `<table>
          <thead><tr>${headHtml}</tr></thead>
          <tbody>${bodyHtml}${totalsHtml}</tbody>
        </table>`
  }

  <footer>SIGAA · ${escapeHtml(fecha)}</footer>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const tipo = searchParams.get('tipo') || '';
  if (!tipo) {
    return NextResponse.json({ error: 'Falta parámetro tipo' }, { status: 400 });
  }

  // Require auth cookie to call /api/reportes internally.
  const token = req.cookies.get('sigaa-token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Fetch the dataset by calling our own reportes endpoint.
  const origin = new URL(req.url).origin;
  const innerParams = new URLSearchParams();
  for (const [k, v] of searchParams.entries()) {
    if (v) innerParams.set(k, v);
  }
  // Force large page so the PDF includes everything (still bounded).
  innerParams.set('page', '1');
  innerParams.set('limit', '5000');

  let rows: Record<string, unknown>[] = [];
  try {
    const res = await fetch(`${origin}/api/reportes?${innerParams.toString()}`, {
      headers: { cookie: `sigaa-token=${token}` },
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: j.error || `Error del reporte (${res.status})` },
        { status: 500 },
      );
    }
    const json = await res.json();
    rows = Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error obteniendo datos' },
      { status: 500 },
    );
  }

  // Build filter display map from known params.
  const displayable = ['periodo', 'campus', 'facultad', 'dedicacion', 'actividad', 'nivel', 'ciclo_anterior'];
  const filters: Record<string, string> = {};
  for (const k of displayable) {
    const v = searchParams.get(k);
    if (v) filters[k] = v;
  }

  const html = buildHtml(tipo, filters, rows);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' },
    });
    await browser.close();

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte_${tipo}_${Date.now()}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error generando PDF' },
      { status: 500 },
    );
  }
}
