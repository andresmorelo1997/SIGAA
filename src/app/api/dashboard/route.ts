import db from '@/lib/db';

export const dynamic = 'force-dynamic';

interface CountRow {
  total: number;
}

interface BreakdownRow {
  label: string;
  total: number;
}

export async function GET() {
  try {
    // Total clases
    const totalClases = (
      db.prepare('SELECT COUNT(*) as total FROM carga_academica').get() as CountRow
    ).total;

    // Total docentes
    const totalDocentes = (
      db.prepare('SELECT COUNT(*) as total FROM docentes').get() as CountRow
    ).total;

    // Total programas
    const totalProgramas = (
      db.prepare('SELECT COUNT(*) as total FROM programas').get() as CountRow
    ).total;

    // Total horas (sum of total_horas_curso from carga_academica)
    const totalHorasRow = db
      .prepare(
        'SELECT COALESCE(SUM(total_horas_curso), 0) as total FROM carga_academica'
      )
      .get() as CountRow;
    const totalHoras = totalHorasRow.total;

    // Breakdown by grado
    const porGrado = db
      .prepare(
        `SELECT COALESCE(grado, 'Sin grado') as label, COUNT(*) as total
         FROM carga_academica
         GROUP BY grado
         ORDER BY total DESC`
      )
      .all() as BreakdownRow[];

    // Breakdown by estado
    const porEstado = db
      .prepare(
        `SELECT COALESCE(estado_clase, 'Sin estado') as label, COUNT(*) as total
         FROM carga_academica
         GROUP BY estado_clase
         ORDER BY total DESC`
      )
      .all() as BreakdownRow[];

    // Recent imports (last 5)
    const recentImports = db
      .prepare(
        `SELECT id, filename, file_type, ciclo_lectivo, grado, records_inserted, records_updated, status, created_at
         FROM import_history
         ORDER BY created_at DESC
         LIMIT 5`
      )
      .all();

    // Novedades pendientes count
    const novedadesPendientes = (
      db
        .prepare(
          "SELECT COUNT(*) as total FROM novedades_auto WHERE estado = 'pendiente'"
        )
        .get() as CountRow
    ).total;

    return Response.json({
      total_clases: totalClases,
      total_docentes: totalDocentes,
      total_programas: totalProgramas,
      total_horas: totalHoras,
      por_grado: porGrado,
      por_estado: porEstado,
      recentImports,
      novedadesPendientes,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
