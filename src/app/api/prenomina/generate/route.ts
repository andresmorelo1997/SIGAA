import { NextRequest } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

interface Parametro {
  clave: string;
  valor: string;
}

interface CargaRecord {
  num_clase: number;
  catalogo: string;
  descripcion: string;
  componente: string;
  total_inscripciones: number;
  campus: string;
  nombre_instructor: string;
  instructor_id: string;
  grado: string;
  ciclo_lectivo: string;
  grupo_academico: string;
  desc_org_academica: string;
  hrs_semanal: number;
  hrs_semestre: number;
  fecha_inicial: string;
  fecha_final: string;
  fecha_ini_santa: string;
  fecha_final_santa: string;
  dedicacion: string | null;
  doc_id: string | null;
}

/**
 * Calculate working weeks between two dates, optionally excluding semana santa.
 */
function calcWeeks(
  startStr: string,
  endStr: string,
  santaStartStr?: string | null,
  santaEndStr?: string | null
): number {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  let totalDays = Math.max(
    0,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  // Subtract semana santa days if it overlaps
  if (santaStartStr && santaEndStr) {
    const santaStart = new Date(santaStartStr);
    const santaEnd = new Date(santaEndStr);
    if (!isNaN(santaStart.getTime()) && !isNaN(santaEnd.getTime())) {
      const overlapStart = new Date(
        Math.max(start.getTime(), santaStart.getTime())
      );
      const overlapEnd = new Date(
        Math.min(end.getTime(), santaEnd.getTime())
      );
      if (overlapStart <= overlapEnd) {
        const overlapDays =
          Math.ceil(
            (overlapEnd.getTime() - overlapStart.getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1;
        totalDays -= overlapDays;
      }
    }
  }

  return Math.max(0, Math.round(totalDays / 7));
}

/**
 * Calculate hours for a given corte period.
 */
function calcCorteHours(
  hrsPerWeek: number,
  corteStart: string | null,
  corteEnd: string | null,
  classStart: string,
  classEnd: string,
  santaStart: string | null,
  santaEnd: string | null
): number {
  if (!corteStart || !corteEnd || !classStart || !classEnd) return 0;

  // Find effective overlap between corte period and class period
  const cStart = new Date(corteStart);
  const cEnd = new Date(corteEnd);
  const clStart = new Date(classStart);
  const clEnd = new Date(classEnd);

  if (
    isNaN(cStart.getTime()) ||
    isNaN(cEnd.getTime()) ||
    isNaN(clStart.getTime()) ||
    isNaN(clEnd.getTime())
  )
    return 0;

  const effectiveStart = new Date(
    Math.max(cStart.getTime(), clStart.getTime())
  );
  const effectiveEnd = new Date(Math.min(cEnd.getTime(), clEnd.getTime()));

  if (effectiveStart > effectiveEnd) return 0;

  const weeks = calcWeeks(
    effectiveStart.toISOString().split('T')[0],
    effectiveEnd.toISOString().split('T')[0],
    santaStart,
    santaEnd
  );

  return Math.round(hrsPerWeek * weeks * 100) / 100;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { periodo, tipo, ciclo_lectivo } = body;

    if (!periodo || !tipo) {
      return Response.json(
        { error: 'Se requieren los campos periodo y tipo' },
        { status: 400 }
      );
    }

    if (tipo !== 'PREGRADO' && tipo !== 'POSGRADO') {
      return Response.json(
        { error: 'tipo debe ser PREGRADO o POSGRADO' },
        { status: 400 }
      );
    }

    // Get semana santa dates
    const santaStartParam = db.prepare("SELECT valor FROM parametros WHERE clave = 'semana_santa_inicio'").get() as { valor: string } | undefined;
    const santaEndParam = db.prepare("SELECT valor FROM parametros WHERE clave = 'semana_santa_fin'").get() as { valor: string } | undefined;
    const santaStart = santaStartParam?.valor || null;
    const santaEnd = santaEndParam?.valor || null;

    // Get cortes from cortes_prenomina table (configurable per grado)
    // Determine which grados to use based on tipo
    const gradosForTipo = tipo === 'PREGRADO'
      ? ['PREG', 'PRE2']
      : ['POSG', 'MSTR', 'DOCT', 'ESP'];

    // Load cortes for ALL relevant grados (we'll match per-record later)
    const cortesMap: Record<string, Array<{ num_corte: number; fecha_inicio: string; fecha_fin: string }>> = {};
    for (const g of gradosForTipo) {
      const cortesRows = db.prepare(
        'SELECT num_corte, fecha_inicio, fecha_fin FROM cortes_prenomina WHERE periodo = ? AND grado = ? ORDER BY num_corte'
      ).all(periodo, g) as Array<{ num_corte: number; fecha_inicio: string; fecha_fin: string }>;
      if (cortesRows.length > 0) {
        cortesMap[g] = cortesRows;
      }
    }

    // Check if we have cortes configured
    const hasCortes = Object.keys(cortesMap).length > 0;
    if (!hasCortes) {
      return Response.json({
        error: `No hay cortes configurados para periodo ${periodo} y grados ${gradosForTipo.join(', ')}. Configure los cortes en Parametros > Cortes Prenomina.`,
        count: 0,
      }, { status: 400 });
    }

    // Query carga_academica joined with docentes for dedicacion
    const cargaConditions: string[] = [];
    const cargaParams: (string | number)[] = [];

    if (ciclo_lectivo) {
      cargaConditions.push('ca.ciclo_lectivo = ?');
      cargaParams.push(ciclo_lectivo);
    }

    // Filter by grado based on tipo
    if (tipo === 'PREGRADO') {
      cargaConditions.push("ca.grado IN ('PREG', 'PRE2', 'PREGRADO', 'Pregrado')");
    } else {
      cargaConditions.push("ca.grado IN ('POSG', 'MSTR', 'DOCT', 'ESP', 'POSGRADO', 'Posgrado', 'MAESTRIA', 'Maestria', 'DOCTORADO', 'Doctorado')");
    }

    const cargaWhere =
      cargaConditions.length > 0
        ? `WHERE ${cargaConditions.join(' AND ')}`
        : '';

    const cargaRows = db
      .prepare(
        `SELECT
          ca.num_clase, ca.catalogo, ca.descripcion, ca.componente,
          ca.total_inscripciones, ca.campus, ca.nombre_instructor,
          ca.instructor_id, ca.grado, ca.ciclo_lectivo,
          ca.grupo_academico, ca.desc_org_academica,
          ca.hrs_semanal, ca.hrs_semestre,
          ca.fecha_inicial, ca.fecha_final,
          ca.fecha_ini_santa, ca.fecha_final_santa,
          d.dedicacion, d.doc_id
        FROM carga_academica ca
        LEFT JOIN docentes d ON ca.instructor_id = d.instructor_id AND ca.ciclo_lectivo = d.ciclo_lectivo
        ${cargaWhere}`
      )
      .all(...cargaParams) as CargaRecord[];

    if (cargaRows.length === 0) {
      return Response.json(
        {
          message: 'No se encontraron registros de carga academica para generar prenomina',
          count: 0,
        },
        { status: 200 }
      );
    }

    // Insert into prenomina within a transaction
    const now = new Date().toISOString();
    let count = 0;

    const insertStmt = db.prepare(
      `INSERT INTO prenomina (
        dedicacion, nombre_instructor, documento, instructor_id,
        campus, programa_academico, grado, ccl_lvo,
        cohorte, modalidad, semestre_cohorte,
        num_clase, catalogo, asignatura, componente, inscritos,
        observacion, hrs_semana, hrs_semestre,
        fecha_inicial, fecha_final,
        corte_1, corte_2, corte_3, corte_4, corte_5, corte_6,
        periodo, tipo, estado, created_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )`
    );

    const generateTransaction = db.transaction(() => {
      for (const row of cargaRows) {
        const hrsWeek = row.hrs_semanal || 0;
        const effSantaStart = row.fecha_ini_santa || santaStart;
        const effSantaEnd = row.fecha_final_santa || santaEnd;

        // Get cortes for this record's grado (normalized)
        const gradoNorm = (row.grado || '').toUpperCase();
        const gradoKey = gradoNorm.startsWith('PRE') ? (gradoNorm === 'PRE2' ? 'PRE2' : 'PREG')
          : gradoNorm.startsWith('MSTR') || gradoNorm.startsWith('MAEST') ? 'MSTR'
          : gradoNorm.startsWith('DOCT') ? 'DOCT'
          : gradoNorm.startsWith('ESP') ? 'ESP'
          : 'POSG';

        const cortesForGrado = cortesMap[gradoKey] || cortesMap[gradosForTipo[0]] || [];

        // Calculate hours per corte (up to 6)
        const corteHours: number[] = [];
        for (let i = 0; i < 6; i++) {
          const corte = cortesForGrado[i];
          const hours = corte
            ? calcCorteHours(hrsWeek, corte.fecha_inicio, corte.fecha_fin, row.fecha_inicial, row.fecha_final, effSantaStart, effSantaEnd)
            : 0;
          corteHours.push(hours);
        }

        insertStmt.run(
          row.dedicacion || null,
          row.nombre_instructor || null,
          row.doc_id || null,
          row.instructor_id || null,
          row.campus || null,
          row.desc_org_academica || row.grupo_academico || null,
          row.grado || null,
          row.ciclo_lectivo || null,
          null, // cohorte
          null, // modalidad
          null, // semestre_cohorte
          row.num_clase || null,
          row.catalogo || null,
          row.descripcion || null,
          row.componente || null,
          row.total_inscripciones || 0,
          null, // observacion
          hrsWeek,
          row.hrs_semestre || 0,
          row.fecha_inicial || null,
          row.fecha_final || null,
          corteHours[0],
          corteHours[1],
          corteHours[2],
          corteHours[3],
          corteHours[4],
          corteHours[5],
          periodo,
          tipo,
          'pendiente',
          now
        );

        count++;
      }
    });

    generateTransaction();

    return Response.json({
      message: 'Prenomina generada exitosamente',
      count,
      periodo,
      tipo,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
