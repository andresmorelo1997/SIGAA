import { NextRequest } from 'next/server';
import db from '@/lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

/**
 * Horas Docente Report API
 *
 * Handles ROT (Clinical Rotation) component deduplication:
 * - LEC hours: summed normally per instructor
 * - ROT hours: MAX(hrs_semanal) per unique (instructor_id, catalogo) group,
 *   then summed across distinct rotation blocks. This prevents counting the
 *   same rotation block multiple times when it appears in several class entries.
 */

interface HorasDocenteRow {
  instructor_id: string;
  nombre_instructor: string;
  hrs_lec: number;
  hrs_rot: number;
  hrs_total: number;
  hrs_semestre: number;
  fecha_inicio: string;
  fecha_fin: string;
  dedicacion: string | null;
  estado: string;
}

function getPagination(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function exportToExcel(data: Record<string, unknown>[], nombre: string): Response {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, nombre);
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new Response(buf, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="horas_docente_${Date.now()}.xlsx"`,
    },
  });
}

/**
 * Determine expected weekly hours from dedicacion string.
 * MEDIO TIEMPO ~ 20 hrs/week, TIEMPO COMPLETO ~ 40 hrs/week.
 */
function getExpectedHours(dedicacion: string | null): number | null {
  if (!dedicacion) return null;
  const d = dedicacion.toUpperCase().trim();
  if (d.includes('MEDIO') || d === 'MT') return 20;
  if (d.includes('COMPLETO') || d === 'TC') return 40;
  if (d.includes('CATEDRA') || d === 'HC' || d.includes('CÁTEDRA')) return 0; // variable
  return null;
}

function getEstado(hrsTotal: number, dedicacion: string | null): string {
  const expected = getExpectedHours(dedicacion);
  if (expected === null || expected === 0) return '-';
  const diff = Math.abs(hrsTotal - expected);
  // Allow a 2-hour tolerance
  if (diff <= 2) return '\u2713';
  return '\u26A0';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cicloLectivo = searchParams.get('ciclo_lectivo') || '';
    const campus = searchParams.get('campus') || '';
    const dedicacion = searchParams.get('dedicacion') || '';
    const search = searchParams.get('search') || '';
    const exportExcel = searchParams.get('export') === 'true';
    const { page, limit, offset } = getPagination(searchParams);

    // Build WHERE conditions for the main carga_academica query
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (cicloLectivo) {
      conditions.push('ca.ciclo_lectivo = ?');
      params.push(cicloLectivo);
    }
    if (campus) {
      conditions.push('ca.campus = ?');
      params.push(campus);
    }
    if (search) {
      conditions.push(
        '(ca.nombre_instructor LIKE ? OR ca.instructor_id LIKE ?)'
      );
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : 'WHERE 1=1';

    // ---------------------------------------------------------------
    // Core query: ROT deduplication
    //
    // For LEC (and any non-ROT component): SUM hrs_semanal normally
    // For ROT: group by (instructor_id, catalogo), take MAX(hrs_semanal)
    //   per group, then SUM those maxes -> that's the ROT total
    // ---------------------------------------------------------------

    // Count distinct instructors (for pagination)
    const totalStmt = db.prepare(
      `SELECT COUNT(*) as total FROM (
        SELECT DISTINCT ca.instructor_id, ca.nombre_instructor
        FROM carga_academica ca
        ${where}
      )`
    );
    const total = (totalStmt.get(...params) as { total: number }).total;

    // Main aggregation query
    // We use two subqueries joined together:
    //   1. LEC hours: simple SUM where componente != 'ROT'
    //   2. ROT hours: SUM of MAX(hrs_semanal) grouped by catalogo
    const mainQuery = `
      SELECT
        base.instructor_id,
        base.nombre_instructor,
        COALESCE(lec.hrs_lec, 0) as hrs_lec,
        COALESCE(rot.hrs_rot, 0) as hrs_rot,
        COALESCE(lec.hrs_lec, 0) + COALESCE(rot.hrs_rot, 0) as hrs_total,
        COALESCE(lec.hrs_sem_lec, 0) + COALESCE(rot.hrs_sem_rot, 0) as hrs_semestre,
        base.fecha_inicio,
        base.fecha_fin
      FROM (
        SELECT
          ca.instructor_id,
          ca.nombre_instructor,
          MIN(ca.fecha_inicial) as fecha_inicio,
          MAX(ca.fecha_final) as fecha_fin
        FROM carga_academica ca
        ${where}
        GROUP BY ca.instructor_id, ca.nombre_instructor
      ) base
      LEFT JOIN (
        SELECT
          ca.instructor_id,
          SUM(ca.hrs_semanal) as hrs_lec,
          SUM(ca.hrs_semestre) as hrs_sem_lec
        FROM carga_academica ca
        ${where}
        AND (ca.componente IS NULL OR ca.componente != 'ROT')
        GROUP BY ca.instructor_id
      ) lec ON lec.instructor_id = base.instructor_id
      LEFT JOIN (
        SELECT
          sub.instructor_id,
          SUM(sub.max_hrs) as hrs_rot,
          SUM(sub.max_hrs_sem) as hrs_sem_rot
        FROM (
          SELECT
            ca.instructor_id,
            ca.catalogo,
            MAX(ca.hrs_semanal) as max_hrs,
            MAX(ca.hrs_semestre) as max_hrs_sem
          FROM carga_academica ca
          ${where}
          AND ca.componente = 'ROT'
          GROUP BY ca.instructor_id, ca.catalogo
        ) sub
        GROUP BY sub.instructor_id
      ) rot ON rot.instructor_id = base.instructor_id
      ORDER BY base.nombre_instructor
    `;

    // For pagination, we wrap the main query
    const paginatedQuery = `${mainQuery} LIMIT ? OFFSET ?`;

    // Count ? placeholders in mainQuery to determine exact param count needed
    const placeholderCount = (mainQuery.match(/\?/g) || []).length;
    // Each WHERE clause contributes params.length placeholders
    // Total WHERE appearances = placeholderCount / params.length (when params.length > 0)
    const repeatCount = params.length > 0 ? Math.round(placeholderCount / params.length) : 0;
    const allParams: (string | number)[] = [];
    for (let i = 0; i < repeatCount; i++) allParams.push(...params);
    const paginatedParams = [...allParams, limit, offset];

    const rawRows = (exportExcel
      ? db.prepare(mainQuery).all(...allParams)
      : db.prepare(paginatedQuery).all(...paginatedParams)
    ) as Array<{
      instructor_id: string;
      nombre_instructor: string;
      hrs_lec: number;
      hrs_rot: number;
      hrs_total: number;
      hrs_semestre: number;
      fecha_inicio: string;
      fecha_fin: string;
    }>;

    // Enrich with dedicacion from docentes table and compute estado
    const enrichedRows: HorasDocenteRow[] = rawRows.map((row) => {
      // Look up dedicacion from docentes table
      let docDedicacion: string | null = null;
      if (row.instructor_id) {
        const docenteConditions: string[] = ['d.instructor_id = ?'];
        const docenteParams: (string | number)[] = [row.instructor_id];
        if (cicloLectivo) {
          docenteConditions.push('d.ciclo_lectivo = ?');
          docenteParams.push(cicloLectivo);
        }
        const docente = db
          .prepare(
            `SELECT dedicacion FROM docentes d WHERE ${docenteConditions.join(' AND ')} LIMIT 1`
          )
          .get(...docenteParams) as { dedicacion: string | null } | undefined;
        docDedicacion = docente?.dedicacion || null;
      }

      // If a dedicacion filter was passed, skip rows that don't match
      const finalDedicacion = docDedicacion;

      return {
        instructor_id: row.instructor_id,
        nombre_instructor: row.nombre_instructor,
        hrs_lec: Math.round(row.hrs_lec * 100) / 100,
        hrs_rot: Math.round(row.hrs_rot * 100) / 100,
        hrs_total: Math.round(row.hrs_total * 100) / 100,
        hrs_semestre: Math.round(row.hrs_semestre * 100) / 100,
        fecha_inicio: row.fecha_inicio,
        fecha_fin: row.fecha_fin,
        dedicacion: finalDedicacion,
        estado: getEstado(row.hrs_total, finalDedicacion),
      };
    });

    // Apply dedicacion filter in-memory (since it comes from docentes table)
    const filteredRows = dedicacion
      ? enrichedRows.filter(
          (r) =>
            r.dedicacion &&
            r.dedicacion.toUpperCase().includes(dedicacion.toUpperCase())
        )
      : enrichedRows;

    // Excel export
    if (exportExcel) {
      const exportData = filteredRows.map((r) => ({
        'ID Instructor': r.instructor_id,
        Nombre: r.nombre_instructor,
        'Hrs LEC (semanal)': r.hrs_lec,
        'Hrs ROT (semanal)': r.hrs_rot,
        'Hrs Total (semanal)': r.hrs_total,
        'Hrs Semestre': r.hrs_semestre,
        'Fecha Inicio': r.fecha_inicio,
        'Fecha Fin': r.fecha_fin,
        'Dedicaci\u00f3n': r.dedicacion || 'N/A',
        Estado: r.estado,
      }));
      return exportToExcel(
        exportData as unknown as Record<string, unknown>[],
        'horas-docente'
      );
    }

    // Paginated response (re-apply pagination on filtered set if dedicacion filter was used)
    const finalTotal = dedicacion ? filteredRows.length : total;
    const finalRows = dedicacion
      ? filteredRows.slice(offset, offset + limit)
      : filteredRows;

    return Response.json({
      tipo: 'horas-docente',
      data: finalRows,
      pagination: {
        page,
        limit,
        total: finalTotal,
        totalPages: Math.ceil(finalTotal / limit),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
