import { NextRequest } from 'next/server';
import db from '@/lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

interface QueryResult {
  rows: Record<string, unknown>[];
  total: number;
}

function buildWhereClause(
  conditions: string[],
  params: (string | number)[]
): string {
  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

function getPagination(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function exportToExcel(
  data: Record<string, unknown>[],
  tipo: string
): Response {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, tipo);
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new Response(buf, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${tipo}_${Date.now()}.xlsx"`,
    },
  });
}

// ========== REPORT: actividad-academica ==========
function reporteActividadAcademica(
  searchParams: URLSearchParams
): QueryResult {
  const actividad = searchParams.get('actividad') || '';
  const periodo = searchParams.get('periodo') || '';
  const campus = searchParams.get('campus') || '';
  const search = searchParams.get('search') || '';
  const { page, limit, offset } = getPagination(searchParams);

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (actividad) {
    conditions.push('actividad_academica LIKE ?');
    params.push(`%${actividad}%`);
  }
  if (periodo) {
    conditions.push('ciclo_lectivo = ?');
    params.push(periodo);
  }
  if (campus) {
    conditions.push('campus = ?');
    params.push(campus);
  }
  if (search) {
    conditions.push(
      '(primer_nombre || \' \' || primer_apellido LIKE ? OR doc_id LIKE ?)'
    );
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = buildWhereClause(conditions, params);

  const total = (
    db
      .prepare(`SELECT COUNT(*) as total FROM docentes ${where}`)
      .get(...params) as { total: number }
  ).total;

  const rows = db
    .prepare(
      `SELECT
        facultad, programa_adscripcion, dedicacion, doc_id,
        (COALESCE(primer_nombre, '') || ' ' || COALESCE(primer_apellido, '')) as nombre,
        actividad_academica, nivel_formacion_texto
      FROM docentes ${where}
      ORDER BY facultad, programa_adscripcion
      LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as Record<string, unknown>[];

  return { rows, total };
}

// ========== REPORT: dedicacion ==========
function reporteDedicacion(searchParams: URLSearchParams): QueryResult {
  const dedicacion = searchParams.get('dedicacion') || '';
  const campus = searchParams.get('campus') || '';
  const facultad = searchParams.get('facultad') || '';
  const periodo = searchParams.get('periodo') || '';
  const periodoAnterior = searchParams.get('periodo_anterior') || '';
  const search = searchParams.get('search') || '';

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (periodo) {
    conditions.push('ciclo_lectivo = ?');
    params.push(periodo);
  }
  if (dedicacion) {
    conditions.push('dedicacion = ?');
    params.push(dedicacion);
  }
  if (campus) {
    conditions.push('campus = ?');
    params.push(campus);
  }
  if (facultad) {
    conditions.push('facultad = ?');
    params.push(facultad);
  }
  if (search) {
    conditions.push(
      '(primer_nombre || \' \' || primer_apellido LIKE ? OR doc_id LIKE ?)'
    );
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = buildWhereClause(conditions, params);

  const rows = db
    .prepare(
      `SELECT
        COALESCE(dedicacion, 'Sin dedicacion') as dedicacion,
        COUNT(*) as total
      FROM docentes ${where}
      GROUP BY dedicacion
      ORDER BY total DESC`
    )
    .all(...params) as Record<string, unknown>[];

  const total = rows.reduce(
    (sum, r) => sum + (r.total as number),
    0
  );

  // If comparativo requested, also get previous period
  if (periodoAnterior) {
    const prevConditions: string[] = ['ciclo_lectivo = ?'];
    const prevParams: (string | number)[] = [periodoAnterior];
    if (dedicacion) {
      prevConditions.push('dedicacion = ?');
      prevParams.push(dedicacion);
    }
    if (campus) {
      prevConditions.push('campus = ?');
      prevParams.push(campus);
    }
    if (facultad) {
      prevConditions.push('facultad = ?');
      prevParams.push(facultad);
    }

    const prevWhere = buildWhereClause(prevConditions, prevParams);
    const prevRows = db
      .prepare(
        `SELECT
          COALESCE(dedicacion, 'Sin dedicacion') as dedicacion,
          COUNT(*) as total
        FROM docentes ${prevWhere}
        GROUP BY dedicacion
        ORDER BY total DESC`
      )
      .all(...prevParams) as Record<string, unknown>[];

    // Merge current and previous into comparativo
    const comparativo = rows.map((row) => {
      const prev = prevRows.find((p) => p.dedicacion === row.dedicacion);
      return {
        dedicacion: row.dedicacion,
        actual: row.total,
        anterior: prev ? prev.total : 0,
        diferencia:
          (row.total as number) - ((prev ? (prev.total as number) : 0)),
      };
    });

    return {
      rows: comparativo,
      total,
    };
  }

  return { rows, total };
}

// ========== REPORT: nivel-formacion ==========
function reporteNivelFormacion(searchParams: URLSearchParams): QueryResult {
  const nivel = searchParams.get('nivel') || '';
  const campus = searchParams.get('campus') || '';
  const periodo = searchParams.get('periodo') || '';
  const search = searchParams.get('search') || '';
  const { page, limit, offset } = getPagination(searchParams);

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (periodo) {
    conditions.push('ciclo_lectivo = ?');
    params.push(periodo);
  }
  if (nivel) {
    conditions.push('nivel_formacion_texto = ?');
    params.push(nivel);
  }
  if (campus) {
    conditions.push('campus = ?');
    params.push(campus);
  }
  if (search) {
    conditions.push(
      '(primer_nombre || \' \' || primer_apellido LIKE ? OR doc_id LIKE ?)'
    );
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = buildWhereClause(conditions, params);

  const grouped = db
    .prepare(
      `SELECT
        COALESCE(nivel_formacion_texto, 'Sin nivel') as nivel_formacion,
        COUNT(*) as total
      FROM docentes ${where}
      GROUP BY nivel_formacion_texto
      ORDER BY total DESC`
    )
    .all(...params) as Record<string, unknown>[];

  const total = (
    db
      .prepare(`SELECT COUNT(*) as total FROM docentes ${where}`)
      .get(...params) as { total: number }
  ).total;

  const detalle = db
    .prepare(
      `SELECT
        doc_id,
        (COALESCE(primer_nombre, '') || ' ' || COALESCE(primer_apellido, '')) as nombre,
        nivel_formacion_texto, facultad, programa_adscripcion, dedicacion
      FROM docentes ${where}
      ORDER BY nivel_formacion_texto
      LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as Record<string, unknown>[];

  return {
    rows: [{ resumen: grouped, detalle }] as unknown as Record<
      string,
      unknown
    >[],
    total,
  };
}

// ========== REPORT: profesores-asignaturas ==========
function reporteProfesoresAsignaturas(
  searchParams: URLSearchParams
): QueryResult {
  const cicloLectivo = searchParams.get('ciclo_lectivo') || '';
  const campus = searchParams.get('campus') || '';
  const programa = searchParams.get('programa') || '';
  const grado = searchParams.get('grado') || '';
  const search = searchParams.get('search') || '';
  const { page, limit, offset } = getPagination(searchParams);

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (cicloLectivo) {
    conditions.push('pa.ciclo_lectivo = ?');
    params.push(cicloLectivo);
  }
  if (campus) {
    conditions.push('pa.campus = ?');
    params.push(campus);
  }
  if (programa) {
    conditions.push('pa.programa_academico LIKE ?');
    params.push(`%${programa}%`);
  }
  if (grado) {
    conditions.push('pa.grado = ?');
    params.push(grado);
  }
  if (search) {
    conditions.push(
      '(pa.instructor LIKE ? OR pa.docente_id LIKE ? OR pa.asignatura LIKE ?)'
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = buildWhereClause(conditions, params);

  const total = (
    db
      .prepare(
        `SELECT COUNT(*) as total FROM profesores_asignatura pa
        LEFT JOIN docentes d ON pa.docente_id = d.instructor_id
        LEFT JOIN carga_academica ca ON CAST(pa.clase AS TEXT) = CAST(ca.num_clase AS TEXT) AND pa.catalogo = ca.catalogo
        ${where}`
      )
      .get(...params) as { total: number }
  ).total;

  // Hours come from carga_academica (calculated by the import macro from US_PROG_CLASES)
  // JOIN on num_clase + catalogo (most reliable match)
  const rows = db
    .prepare(
      `SELECT
        COALESCE(d.facultad, pa.org_acad_clase, ca.desc_org_academica) as facultad,
        COALESCE(d.dedicacion, pa.dedicacion, '') as dedicacion,
        pa.instructor,
        pa.docente_id,
        pa.clase,
        pa.catalogo,
        pa.asignatura,
        COALESCE(ca.hrs_semanal, pa.hrs_semanal) as hrs_semanal,
        COALESCE(ca.hrs_semestre, pa.hrs_semestre) as hrs_semestre,
        COALESCE(pa.fecha_inicial, ca.fecha_inicial) as fecha_inicial,
        COALESCE(pa.fecha_final, ca.fecha_final) as fecha_final,
        COALESCE(ca.componente, pa.componente) as componente,
        COALESCE(pa.campus, ca.campus) as campus
      FROM profesores_asignatura pa
      LEFT JOIN docentes d ON pa.docente_id = d.instructor_id
      LEFT JOIN carga_academica ca ON CAST(pa.clase AS TEXT) = CAST(ca.num_clase AS TEXT)
        AND pa.catalogo = ca.catalogo
      ${where}
      ORDER BY pa.instructor
      LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as Record<string, unknown>[];

  return { rows, total };
}

// ========== REPORT: planta-profesoral ==========
function reportePlantaProfesoral(
  searchParams: URLSearchParams
): QueryResult {
  const cicloLectivo = searchParams.get('ciclo_lectivo') || '';
  const campus = searchParams.get('campus') || '';
  const dedicacion = searchParams.get('dedicacion') || '';
  const actividad = searchParams.get('actividad') || '';
  const search = searchParams.get('search') || '';
  const { page, limit, offset } = getPagination(searchParams);

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (cicloLectivo) {
    conditions.push('ciclo_lectivo = ?');
    params.push(cicloLectivo);
  }
  if (campus) {
    conditions.push('campus = ?');
    params.push(campus);
  }
  if (dedicacion) {
    conditions.push('dedicacion = ?');
    params.push(dedicacion);
  }
  if (actividad) {
    conditions.push('actividad_academica LIKE ?');
    params.push(`%${actividad}%`);
  }
  if (search) {
    conditions.push(
      '(primer_nombre || \' \' || primer_apellido LIKE ? OR doc_id LIKE ?)'
    );
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = buildWhereClause(conditions, params);

  const total = (
    db
      .prepare(`SELECT COUNT(*) as total FROM docentes ${where}`)
      .get(...params) as { total: number }
  ).total;

  const rows = db
    .prepare(
      `SELECT
        facultad, programa_adscripcion, instructor_id,
        (COALESCE(primer_nombre, '') || ' ' || COALESCE(segundo_nombre, '') || ' ' || COALESCE(primer_apellido, '') || ' ' || COALESCE(segundo_apellido, '')) as nombre_completo,
        dedicacion, actividad_academica, fecha_inicio, fecha_final
      FROM docentes ${where}
      ORDER BY facultad, programa_adscripcion
      LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as Record<string, unknown>[];

  return { rows, total };
}

// ========== REPORT: horas-docentes ==========
function reporteHorasDocentes(searchParams: URLSearchParams): QueryResult {
  const cicloLectivo = searchParams.get('ciclo_lectivo') || '';
  const campus = searchParams.get('campus') || '';
  const search = searchParams.get('search') || '';
  const { page, limit, offset } = getPagination(searchParams);

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (cicloLectivo) {
    conditions.push('ciclo_lectivo = ?');
    params.push(cicloLectivo);
  }
  if (campus) {
    conditions.push('campus = ?');
    params.push(campus);
  }
  if (search) {
    conditions.push(
      '(nombre_instructor LIKE ? OR instructor_id LIKE ?)'
    );
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = buildWhereClause(conditions, params);

  const total = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT instructor_id || COALESCE(nombre_instructor, '')) as total
        FROM carga_academica ${where}`
      )
      .get(...params) as { total: number }
  ).total;

  const rows = db
    .prepare(
      `SELECT
        instructor_id,
        nombre_instructor,
        MIN(fecha_inicial) as fecha_inicial,
        MAX(fecha_final) as fecha_final,
        COALESCE(SUM(hrs_semanal), 0) as total_hrs_semanal,
        COALESCE(SUM(hrs_semestre), 0) as total_hrs_semestre
      FROM carga_academica ${where}
      GROUP BY instructor_id, nombre_instructor
      ORDER BY nombre_instructor
      LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as Record<string, unknown>[];

  return { rows, total };
}

// ========== REPORT: escala-salarial ==========
function reporteEscalaSalarial(searchParams: URLSearchParams): QueryResult {
  const tipoEscala = searchParams.get('tipo_escala') || '';
  const campus = searchParams.get('campus') || '';
  const search = searchParams.get('search') || '';
  const { page, limit, offset } = getPagination(searchParams);

  const conditions: string[] = ['tipo_escala IS NOT NULL'];
  const params: (string | number)[] = [];

  if (tipoEscala) {
    conditions.push('tipo_escala = ?');
    params.push(tipoEscala);
  }
  if (campus) {
    conditions.push('campus = ?');
    params.push(campus);
  }
  if (search) {
    conditions.push(
      '(primer_nombre || \' \' || primer_apellido LIKE ? OR doc_id LIKE ?)'
    );
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = buildWhereClause(conditions, params);

  const total = (
    db
      .prepare(`SELECT COUNT(*) as total FROM docentes ${where}`)
      .get(...params) as { total: number }
  ).total;

  const rows = db
    .prepare(
      `SELECT
        programa_adscripcion,
        (COALESCE(primer_nombre, '') || ' ' || COALESCE(primer_apellido, '')) as nombre,
        dedicacion, tipo_contrato_texto, tipo_escala, calificacion, categoria_escalafon
      FROM docentes ${where}
      ORDER BY tipo_escala, programa_adscripcion
      LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as Record<string, unknown>[];

  return { rows, total };
}

// ========== REPORT: nuevas-plazas ==========
function reporteNuevasPlazas(searchParams: URLSearchParams): QueryResult {
  const cicloActual = searchParams.get('ciclo_actual') || '';
  const cicloAnterior = searchParams.get('ciclo_anterior') || '';
  const search = searchParams.get('search') || '';
  const { page, limit, offset } = getPagination(searchParams);

  if (!cicloActual || !cicloAnterior) {
    return { rows: [], total: 0 };
  }

  const searchCondition = search
    ? `AND (d.primer_nombre || ' ' || d.primer_apellido LIKE ? OR d.doc_id LIKE ?)`
    : '';
  const searchParams2: (string | number)[] = search
    ? [`%${search}%`, `%${search}%`]
    : [];

  const total = (
    db
      .prepare(
        `SELECT COUNT(*) as total FROM docentes d
        WHERE d.ciclo_lectivo = ?
        AND d.doc_id NOT IN (SELECT doc_id FROM docentes WHERE ciclo_lectivo = ?)
        ${searchCondition}`
      )
      .get(cicloActual, cicloAnterior, ...searchParams2) as { total: number }
  ).total;

  const rows = db
    .prepare(
      `SELECT
        d.facultad, d.programa_adscripcion, d.doc_id, d.instructor_id,
        (COALESCE(d.primer_nombre, '') || ' ' || COALESCE(d.primer_apellido, '')) as nombre,
        d.dedicacion, d.actividad_academica, d.fecha_inicio, d.fecha_final
      FROM docentes d
      WHERE d.ciclo_lectivo = ?
      AND d.doc_id NOT IN (SELECT doc_id FROM docentes WHERE ciclo_lectivo = ?)
      ${searchCondition}
      ORDER BY d.facultad, d.programa_adscripcion
      LIMIT ? OFFSET ?`
    )
    .all(cicloActual, cicloAnterior, ...searchParams2, limit, offset) as Record<
      string,
      unknown
    >[];

  return { rows, total };
}

// ========== REPORT: reemplazos ==========
function reporteReemplazos(searchParams: URLSearchParams): QueryResult {
  const cicloLectivo = searchParams.get('ciclo_lectivo') || '';
  const campus = searchParams.get('campus') || '';
  const search = searchParams.get('search') || '';
  const { page, limit, offset } = getPagination(searchParams);

  const conditions: string[] = ["antiguedad = 'NUEVO'"];
  const params: (string | number)[] = [];

  if (cicloLectivo) {
    conditions.push('ciclo_lectivo = ?');
    params.push(cicloLectivo);
  }
  if (campus) {
    conditions.push('campus = ?');
    params.push(campus);
  }
  if (search) {
    conditions.push(
      '(primer_nombre || \' \' || primer_apellido LIKE ? OR doc_id LIKE ?)'
    );
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = buildWhereClause(conditions, params);

  const total = (
    db
      .prepare(`SELECT COUNT(*) as total FROM docentes ${where}`)
      .get(...params) as { total: number }
  ).total;

  const rows = db
    .prepare(
      `SELECT
        facultad, programa_adscripcion, doc_id, instructor_id,
        (COALESCE(primer_nombre, '') || ' ' || COALESCE(primer_apellido, '')) as nombre,
        dedicacion, actividad_academica, antiguedad, fecha_inicio, fecha_final
      FROM docentes ${where}
      ORDER BY facultad, programa_adscripcion
      LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as Record<string, unknown>[];

  return { rows, total };
}

// ========== REPORT: no-continuan ==========
function reporteNoContinuan(searchParams: URLSearchParams): QueryResult {
  const cicloActual = searchParams.get('ciclo_actual') || '';
  const cicloAnterior = searchParams.get('ciclo_anterior') || '';
  const actividad = searchParams.get('actividad_academica') || '';
  const search = searchParams.get('search') || '';
  const { page, limit, offset } = getPagination(searchParams);

  if (!cicloActual || !cicloAnterior) {
    return { rows: [], total: 0 };
  }

  const extraConditions: string[] = [];
  const extraParams: (string | number)[] = [];

  if (actividad) {
    extraConditions.push('AND d.actividad_academica LIKE ?');
    extraParams.push(`%${actividad}%`);
  }
  if (search) {
    extraConditions.push(
      "AND (d.primer_nombre || ' ' || d.primer_apellido LIKE ? OR d.doc_id LIKE ?)"
    );
    extraParams.push(`%${search}%`, `%${search}%`);
  }

  const extraWhere = extraConditions.join(' ');

  const total = (
    db
      .prepare(
        `SELECT COUNT(*) as total FROM docentes d
        WHERE d.ciclo_lectivo = ?
        AND d.doc_id NOT IN (SELECT doc_id FROM docentes WHERE ciclo_lectivo = ?)
        ${extraWhere}`
      )
      .get(cicloAnterior, cicloActual, ...extraParams) as { total: number }
  ).total;

  const rows = db
    .prepare(
      `SELECT
        d.facultad, d.programa_adscripcion, d.doc_id, d.instructor_id,
        (COALESCE(d.primer_nombre, '') || ' ' || COALESCE(d.primer_apellido, '')) as nombre,
        d.dedicacion, d.actividad_academica, d.fecha_inicio, d.fecha_final
      FROM docentes d
      WHERE d.ciclo_lectivo = ?
      AND d.doc_id NOT IN (SELECT doc_id FROM docentes WHERE ciclo_lectivo = ?)
      ${extraWhere}
      ORDER BY d.facultad, d.programa_adscripcion
      LIMIT ? OFFSET ?`
    )
    .all(cicloAnterior, cicloActual, ...extraParams, limit, offset) as Record<
      string,
      unknown
    >[];

  return { rows, total };
}

// ========== MAIN HANDLER ==========
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tipo = searchParams.get('tipo') || '';
    const exportExcel = searchParams.get('export') === 'true';

    if (!tipo) {
      return Response.json(
        {
          error: 'Se requiere el parametro tipo',
          tipos_disponibles: [
            'actividad-academica',
            'dedicacion',
            'nivel-formacion',
            'profesores-asignaturas',
            'planta-profesoral',
            'horas-docentes',
            'escala-salarial',
            'nuevas-plazas',
            'reemplazos',
            'no-continuan',
          ],
        },
        { status: 400 }
      );
    }

    let result: QueryResult;
    const { page, limit } = getPagination(searchParams);

    switch (tipo) {
      case 'actividad-academica':
        result = reporteActividadAcademica(searchParams);
        break;
      case 'dedicacion':
        result = reporteDedicacion(searchParams);
        break;
      case 'nivel-formacion':
        result = reporteNivelFormacion(searchParams);
        break;
      case 'profesores-asignaturas':
        result = reporteProfesoresAsignaturas(searchParams);
        break;
      case 'planta-profesoral':
        result = reportePlantaProfesoral(searchParams);
        break;
      case 'horas-docentes':
        result = reporteHorasDocentes(searchParams);
        break;
      case 'escala-salarial':
        result = reporteEscalaSalarial(searchParams);
        break;
      case 'nuevas-plazas':
        result = reporteNuevasPlazas(searchParams);
        break;
      case 'reemplazos':
        result = reporteReemplazos(searchParams);
        break;
      case 'no-continuan':
        result = reporteNoContinuan(searchParams);
        break;
      default:
        return Response.json(
          { error: `Tipo de reporte no reconocido: ${tipo}` },
          { status: 400 }
        );
    }

    // If export requested, return Excel file
    if (exportExcel) {
      // For nivel-formacion, flatten the data for export
      let exportData = result.rows;
      if (
        tipo === 'nivel-formacion' &&
        result.rows.length > 0 &&
        (result.rows[0] as Record<string, unknown>).detalle
      ) {
        exportData = (result.rows[0] as Record<string, unknown>)
          .detalle as Record<string, unknown>[];
      }
      return exportToExcel(exportData, tipo);
    }

    return Response.json({
      tipo,
      data: result.rows,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
