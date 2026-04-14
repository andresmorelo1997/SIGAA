import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/prenomina/pdf?tipo=pregrado&periodo=...&campus=...&dedicacion=...&search=...
 *
 * Generates a landscape A4 PDF of the prenómina consolidated view with the
 * same filters the UI is showing. Uses a small HTML renderer + Playwright
 * Chromium so the output is reproducible.
 */
function escapeHtml(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tipo = (sp.get('tipo') || 'pregrado').toUpperCase();

  const token = req.cookies.get('sigaa-token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Fetch data from the real prenómina endpoint (authenticated).
  const origin = new URL(req.url).origin;
  const innerParams = new URLSearchParams();
  for (const [k, v] of sp.entries()) if (v) innerParams.set(k, v);
  innerParams.delete('format');

  let rows: Record<string, unknown>[] = [];
  let cortesInfo: Array<Record<string, unknown>> = [];
  try {
    const res = await fetch(`${origin}/api/prenomina?${innerParams.toString()}`, {
      headers: { cookie: `sigaa-token=${token}` },
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: j.error || `Error obteniendo datos (${res.status})` },
        { status: 500 },
      );
    }
    const json = await res.json();
    rows = Array.isArray(json.data)
      ? json.data
      : Array.isArray(json.consolidado)
        ? json.consolidado
        : [];
    cortesInfo = Array.isArray(json.cortesInfo) ? json.cortesInfo : [];
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 },
    );
  }

  const titulo = tipo === 'POSGRADO' ? 'Prenómina — Posgrado' : 'Prenómina — Pregrado';
  const periodo = sp.get('periodo') || '';
  const campus = sp.get('campus') || '';
  const dedicacion = sp.get('dedicacion') || '';
  const search = sp.get('search') || '';
  const fecha = new Date().toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const filterChips: string[] = [];
  if (periodo) filterChips.push(`Periodo: ${periodo}`);
  if (campus) filterChips.push(`Campus: ${campus}`);
  if (dedicacion) filterChips.push(`Dedicación: ${dedicacion}`);
  if (search) filterChips.push(`Búsqueda: "${search}"`);

  // Cortes headers (variable, from cortesInfo) — build table header dynamically
  const corteHeaders = cortesInfo.map((c, i) => {
    const num = (c as { num?: number }).num ?? i + 1;
    return `Corte ${num}`;
  });

  // Compute totals
  let totalHrsSemana = 0;
  let totalHrsSemestre = 0;
  let totalHrsPrenomina = 0;
  let totalSaldo = 0;
  const corteTotals: number[] = corteHeaders.map(() => 0);

  const rowsHtml = rows
    .map((r, idx) => {
      const hrsSem = Number((r as Record<string, unknown>).hrs_semana) || 0;
      const hrsSemestre = Number((r as Record<string, unknown>).hrs_semestre) || 0;
      const hrsPrenom = Number((r as Record<string, unknown>).hrs_prenomina) || 0;
      const saldo = Number((r as Record<string, unknown>).saldo) || 0;
      totalHrsSemana += hrsSem;
      totalHrsSemestre += hrsSemestre;
      totalHrsPrenomina += hrsPrenom;
      totalSaldo += saldo;

      const cortes = ((r as Record<string, unknown>).cortes as number[]) || [];
      const corteCells = corteHeaders
        .map((_h, i) => {
          const v = Number(cortes[i] ?? 0) || 0;
          corteTotals[i] += v;
          return `<td class="num">${v || '-'}</td>`;
        })
        .join('');

      return `<tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml((r as Record<string, unknown>).dedicacion ?? '')}</td>
        <td>${escapeHtml((r as Record<string, unknown>).campus ?? '')}</td>
        <td>${escapeHtml((r as Record<string, unknown>).programa ?? '')}</td>
        <td class="mono">${escapeHtml((r as Record<string, unknown>).instructor_id ?? '')}</td>
        <td class="mono">${escapeHtml((r as Record<string, unknown>).cedula ?? '')}</td>
        <td class="name">${escapeHtml((r as Record<string, unknown>).nombre ?? '')}</td>
        <td class="num">${hrsSem || '-'}</td>
        <td class="num">${hrsSemestre || '-'}</td>
        ${corteCells}
        <td class="num"><strong>${hrsPrenom || '-'}</strong></td>
        <td class="num ${saldo < 0 ? 'neg' : saldo > 0 ? 'warn' : 'ok'}">${saldo}</td>
      </tr>`;
    })
    .join('');

  const totalsHtml = rows.length > 0
    ? `<tr class="totals">
         <td colspan="7"><strong>Total (${rows.length})</strong></td>
         <td class="num"><strong>${totalHrsSemana.toLocaleString('es-CO')}</strong></td>
         <td class="num"><strong>${totalHrsSemestre.toLocaleString('es-CO')}</strong></td>
         ${corteTotals.map((t) => `<td class="num"><strong>${t.toLocaleString('es-CO')}</strong></td>`).join('')}
         <td class="num"><strong>${totalHrsPrenomina.toLocaleString('es-CO')}</strong></td>
         <td class="num"><strong>${totalSaldo.toLocaleString('es-CO')}</strong></td>
       </tr>`
    : '';

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(titulo)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;margin:0;padding:18px 24px;color:#18181b;font-size:9pt;}
  header{border-bottom:2px solid #A6192E;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-end;gap:16px}
  header h1{margin:0 0 2px;font-size:16pt;color:#18181b}
  header p{margin:0;color:#52525b;font-size:9pt}
  header .meta{text-align:right;font-size:8pt;color:#52525b}
  .filters{margin-bottom:12px;display:flex;flex-wrap:wrap;gap:6px}
  .chip{background:#f4f4f5;color:#3f3f46;padding:3px 10px;border-radius:9999px;font-size:8pt}
  table{width:100%;border-collapse:collapse;font-size:8pt}
  thead th{background:#18181b;color:#fff;padding:5px 6px;text-align:left;font-weight:600;border:1px solid #18181b}
  tbody td{padding:3px 6px;border:1px solid #e4e4e7;white-space:nowrap}
  tbody tr:nth-child(even) td{background:#fafafa}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  td.mono{font-family:'SF Mono',Consolas,monospace}
  td.name{font-weight:500;color:#18181b;max-width:200px;overflow:hidden;text-overflow:ellipsis}
  td.neg{color:#dc2626;font-weight:600}
  td.warn{color:#d97706;font-weight:600}
  td.ok{color:#16a34a}
  tr.totals td{background:#fef3c7 !important;border-top:2px solid #f59e0b}
  footer{margin-top:12px;font-size:7pt;color:#71717a;text-align:right}
</style>
</head>
<body>
<header>
  <div>
    <h1>${escapeHtml(titulo)}</h1>
    <p>Universidad del Sinú — SIGAA</p>
  </div>
  <div class="meta">
    <div>Generado: ${escapeHtml(fecha)}</div>
    <div>${rows.length.toLocaleString('es-CO')} docentes</div>
  </div>
</header>
${filterChips.length ? `<div class="filters">${filterChips.map((c) => `<span class="chip">${escapeHtml(c)}</span>`).join('')}</div>` : ''}
${
  rows.length === 0
    ? '<p style="text-align:center;color:#a1a1aa;padding:48px 0">Sin datos para los filtros aplicados.</p>'
    : `<table>
        <thead><tr>
          <th>#</th><th>Dedicación</th><th>Campus</th><th>Programa</th>
          <th>Instructor ID</th><th>Cédula</th><th>Nombre</th>
          <th class="num">Hrs Sem</th><th class="num">Hrs Sem.re</th>
          ${corteHeaders.map((h) => `<th class="num">${escapeHtml(h)}</th>`).join('')}
          <th class="num">Hrs Prenom.</th><th class="num">Saldo</th>
        </tr></thead>
        <tbody>${rowsHtml}${totalsHtml}</tbody>
      </table>`
}
<footer>SIGAA · ${escapeHtml(fecha)}</footer>
</body>
</html>`;

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
      margin: { top: '6mm', bottom: '6mm', left: '6mm', right: '6mm' },
    });
    await browser.close();

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="prenomina_${tipo.toLowerCase()}_${Date.now()}.pdf"`,
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
