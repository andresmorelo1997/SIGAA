import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Returns all distinct ciclos and grados from imported data.
 * Used to populate dropdown selectors across the app.
 */
export async function GET() {
  try {
    const ciclos = db.prepare(`
      SELECT DISTINCT ciclo_lectivo FROM carga_academica
      WHERE ciclo_lectivo IS NOT NULL AND ciclo_lectivo != ''
      ORDER BY ciclo_lectivo DESC
    `).all() as { ciclo_lectivo: string }[];

    const grados = db.prepare(`
      SELECT DISTINCT grado FROM carga_academica
      WHERE grado IS NOT NULL AND grado != ''
      ORDER BY grado
    `).all() as { grado: string }[];

    const campus = db.prepare(`
      SELECT DISTINCT campus FROM carga_academica
      WHERE campus IS NOT NULL AND campus != ''
      ORDER BY campus
    `).all() as { campus: string }[];

    const dedicaciones = db.prepare(`
      SELECT DISTINCT d.dedicacion FROM docentes d
      WHERE d.dedicacion IS NOT NULL AND d.dedicacion != ''
      ORDER BY d.dedicacion
    `).all() as { dedicacion: string }[];

    const periodos = db.prepare(`
      SELECT DISTINCT periodo FROM cortes_prenomina
      WHERE periodo IS NOT NULL
      ORDER BY periodo DESC
    `).all() as { periodo: string }[];

    // Build ciclo-to-periodo mapping
    // 2661 = 2026-1, 2663 = 2026-2, 2561 = 2025-1, 2563 = 2025-2
    // 2591 = 2025-1 (med-quir), 2592 = 2025-2 (med-quir)
    const cicloMap: Record<string, string> = {};
    for (const c of ciclos) {
      const code = c.ciclo_lectivo;
      if (code && code.length === 4) {
        const yearPrefix = code.substring(0, 2);
        const year = 2000 + parseInt(yearPrefix);
        const rest = code.substring(2);
        let semester = '';
        if (rest === '61') semester = '1';
        else if (rest === '63') semester = '2';
        else if (rest === '91') semester = '1';
        else if (rest === '92') semester = '2';
        else semester = rest;
        cicloMap[code] = `${year}-${semester}`;
      }
    }

    // Classify each ciclo by tier (pregrado / posgrado).
    // Elysa convention: the third digit of the 4-digit code disambiguates:
    //   '9' → posgrado (2591, 2592, 2691, 2692…)
    //   '6' → pregrado (2561, 2563, 2661, 2663…)
    //   other → 'both' (shown in any context)
    function tierOf(code: string): 'pregrado' | 'posgrado' | 'both' {
      if (code && code.length === 4) {
        if (code[2] === '9') return 'posgrado';
        if (code[2] === '6') return 'pregrado';
      }
      return 'both';
    }

    return Response.json({
      ciclos: ciclos.map(c => ({
        value: c.ciclo_lectivo,
        label: `${c.ciclo_lectivo} (${cicloMap[c.ciclo_lectivo] || c.ciclo_lectivo})`,
        tier: tierOf(c.ciclo_lectivo),
      })),
      grados: grados.map(g => ({ value: g.grado, label: g.grado })),
      campus: campus.map(c => ({ value: c.campus, label: c.campus })),
      dedicaciones: dedicaciones.map(d => ({ value: d.dedicacion, label: d.dedicacion })),
      periodos: periodos.map(p => ({ value: p.periodo, label: p.periodo })),
      cicloMap,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
