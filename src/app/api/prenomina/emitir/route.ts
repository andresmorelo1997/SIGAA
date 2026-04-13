import { NextRequest } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface CargaRow {
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
  dedicacion: string | null;
  tipo_doc: string | null;
  doc_id: string | null;
}

interface CorteConfig {
  num_corte: number;
  fecha_inicio: string;
  fecha_fin: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers (same logic as calcular)                                   */
/* ------------------------------------------------------------------ */
function calcOverlapWeeks(
  rangeAStart: string,
  rangeAEnd: string,
  rangeBStart: string,
  rangeBEnd: string,
  ssStart: string | null,
  ssEnd: string | null,
  isSsException: boolean,
): number {
  const aS = new Date(rangeAStart);
  const aE = new Date(rangeAEnd);
  const bS = new Date(rangeBStart);
  const bE = new Date(rangeBEnd);

  if (isNaN(aS.getTime()) || isNaN(aE.getTime()) || isNaN(bS.getTime()) || isNaN(bE.getTime())) return 0;

  const overlapStart = new Date(Math.max(aS.getTime(), bS.getTime()));
  const overlapEnd = new Date(Math.min(aE.getTime(), bE.getTime()));

  if (overlapStart > overlapEnd) return 0;

  let totalDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (ssStart && ssEnd && !isSsException) {
    const ssS = new Date(ssStart);
    const ssE = new Date(ssEnd);
    if (!isNaN(ssS.getTime()) && !isNaN(ssE.getTime())) {
      const ssOverlapStart = new Date(Math.max(overlapStart.getTime(), ssS.getTime()));
      const ssOverlapEnd = new Date(Math.min(overlapEnd.getTime(), ssE.getTime()));
      if (ssOverlapStart <= ssOverlapEnd) {
        const ssDays = Math.ceil((ssOverlapEnd.getTime() - ssOverlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        totalDays -= ssDays;
      }
    }
  }

  return Math.max(0, Math.round(totalDays / 7));
}

function normalizeGrado(grado: string): string {
  const g = (grado || '').toUpperCase();
  if (g === 'PRE2') return 'PRE2';
  if (g.startsWith('PRE') || g === 'PREGRADO') return 'PREG';
  if (g.startsWith('MSTR') || g.startsWith('MAEST') || g === 'MAESTRIA') return 'MSTR';
  if (g.startsWith('DOCT') || g === 'DOCTORADO') return 'DOCT';
  if (g.startsWith('ESP')) return 'ESP';
  return 'POSG';
}

/* ------------------------------------------------------------------ */
/*  POST handler - freeze a corte                                      */
/* ------------------------------------------------------------------ */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { periodo, tipo, num_corte, ciclo_lectivo } = body;

    if (!periodo || !tipo || !num_corte) {
      return Response.json(
        { error: 'Se requieren los campos periodo, tipo y num_corte' },
        { status: 400 },
      );
    }

    if (tipo !== 'PREGRADO' && tipo !== 'POSGRADO') {
      return Response.json({ error: 'tipo debe ser PREGRADO o POSGRADO' }, { status: 400 });
    }

    const corteNum = Number(num_corte);
    if (isNaN(corteNum) || corteNum < 1) {
      return Response.json({ error: 'num_corte debe ser un n\u00famero positivo' }, { status: 400 });
    }

    const gradosForTipo = tipo === 'PREGRADO'
      ? ['PREG', 'PRE2']
      : ['POSG', 'MSTR', 'DOCT', 'ESP'];

    const gradoSqlValues = tipo === 'PREGRADO'
      ? "('PREG','PRE2','PREGRADO','Pregrado')"
      : "('POSG','MSTR','DOCT','ESP','POSGRADO','Posgrado','MAESTRIA','Maestria','DOCTORADO','Doctorado','ESPECIALIZACION','Especializacion')";

    // Check if already emitted
    for (const g of gradosForTipo) {
      const existing = db.prepare(
        'SELECT id FROM cortes_emitidos WHERE periodo = ? AND grado = ? AND num_corte = ?'
      ).get(periodo, g, corteNum);
      if (existing) {
        return Response.json(
          { error: `El corte ${corteNum} para grado ${g} ya fue emitido.` },
          { status: 409 },
        );
      }
    }

    // Load cortes configuration
    const cortesMap: Record<string, CorteConfig[]> = {};
    for (const g of gradosForTipo) {
      const rows = db.prepare(
        'SELECT num_corte, fecha_inicio, fecha_fin FROM cortes_prenomina WHERE periodo = ? AND grado = ? ORDER BY num_corte'
      ).all(periodo, g) as CorteConfig[];
      if (rows.length > 0) cortesMap[g] = rows;
    }

    if (Object.keys(cortesMap).length === 0) {
      return Response.json(
        { error: `No hay cortes configurados para periodo ${periodo} y tipo ${tipo}` },
        { status: 400 },
      );
    }

    // Load Semana Santa config
    const ssConfig = db.prepare(
      'SELECT fecha_inicio, fecha_fin FROM semana_santa_config WHERE periodo = ?'
    ).get(periodo) as { fecha_inicio: string; fecha_fin: string } | undefined;
    const ssStart = ssConfig?.fecha_inicio || null;
    const ssEnd = ssConfig?.fecha_fin || null;

    // Load SS exceptions
    const ssExceptions = db.prepare(
      'SELECT programa FROM semana_santa_excepciones WHERE periodo = ?'
    ).all(periodo) as { programa: string }[];
    const ssExceptionSet = new Set(ssExceptions.map(e => e.programa.toUpperCase()));

    // Query carga_academica
    const conditions: string[] = [`ca.grado IN ${gradoSqlValues}`];
    const params: (string | number)[] = [];

    if (ciclo_lectivo) {
      conditions.push('ca.ciclo_lectivo = ?');
      params.push(ciclo_lectivo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const cargaRows = db.prepare(`
      SELECT
        ca.num_clase, ca.catalogo, ca.descripcion, ca.componente,
        ca.total_inscripciones, ca.campus, ca.nombre_instructor,
        ca.instructor_id, ca.grado, ca.ciclo_lectivo,
        ca.grupo_academico, ca.desc_org_academica,
        ca.hrs_semanal, ca.hrs_semestre,
        ca.fecha_inicial, ca.fecha_final,
        d.dedicacion, d.tipo_doc, d.doc_id
      FROM carga_academica ca
      LEFT JOIN docentes d ON ca.instructor_id = d.instructor_id AND ca.ciclo_lectivo = d.ciclo_lectivo
      ${whereClause}
    `).all(...params) as CargaRow[];

    if (cargaRows.length === 0) {
      return Response.json(
        { error: 'No se encontraron registros de carga acad\u00e9mica para este periodo' },
        { status: 404 },
      );
    }

    // Calculate and freeze within a transaction
    const now = new Date().toISOString();
    let frozenCount = 0;

    const insertFrozen = db.prepare(`
      INSERT INTO prenomina (
        dedicacion, nombre_instructor, documento, instructor_id,
        campus, programa_academico, grado, ccl_lvo,
        num_clase, catalogo, asignatura, componente, inscritos,
        hrs_semana, hrs_semestre, fecha_inicial, fecha_final,
        corte_1, corte_2, corte_3, corte_4, corte_5, corte_6,
        periodo, tipo, estado, num_corte_emitido, created_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    const insertEmitido = db.prepare(
      'INSERT OR IGNORE INTO cortes_emitidos (periodo, grado, num_corte, emitido_at) VALUES (?, ?, ?, ?)'
    );

    const emitTransaction = db.transaction(() => {
      // Mark all relevant grados as emitted for this corte
      for (const g of gradosForTipo) {
        if (cortesMap[g]) {
          insertEmitido.run(periodo, g, corteNum, now);
        }
      }

      // Calculate and store each row's corte value
      for (const row of cargaRows) {
        const hrsWeek = Number(row.hrs_semanal) || 0;
        const gradoNorm = normalizeGrado(row.grado);
        const cortesForGrado = cortesMap[gradoNorm] || cortesMap[gradosForTipo[0]] || [];
        const corteConfig = cortesForGrado.find(c => c.num_corte === corteNum);

        if (!corteConfig) continue;

        // Check SS exception
        const programa = (row.desc_org_academica || row.grupo_academico || '').toUpperCase();
        const catalogoBase = (row.catalogo || '').replace(/[0-9]/g, '').toUpperCase();
        const isSsException = ssExceptionSet.has(programa) || ssExceptionSet.has(catalogoBase);

        // Calculate hours for this specific corte
        const weeks = calcOverlapWeeks(
          corteConfig.fecha_inicio, corteConfig.fecha_fin,
          row.fecha_inicial, row.fecha_final,
          ssStart, ssEnd,
          isSsException,
        );
        const hours = Math.round(hrsWeek * weeks * 100) / 100;

        // Store the frozen value: put the value in the matching corte_N column
        const corteValues = [0, 0, 0, 0, 0, 0];
        corteValues[corteNum - 1] = hours;

        insertFrozen.run(
          row.dedicacion || null,
          row.nombre_instructor || null,
          row.doc_id || null,
          row.instructor_id || null,
          row.campus || null,
          row.desc_org_academica || row.grupo_academico || null,
          row.grado || null,
          row.ciclo_lectivo || null,
          row.num_clase || null,
          row.catalogo || null,
          row.descripcion || null,
          row.componente || null,
          row.total_inscripciones || 0,
          hrsWeek,
          Number(row.hrs_semestre) || 0,
          row.fecha_inicial || null,
          row.fecha_final || null,
          corteValues[0], corteValues[1], corteValues[2],
          corteValues[3], corteValues[4], corteValues[5],
          periodo,
          tipo,
          'emitido',
          corteNum,
          now,
        );

        frozenCount++;
      }
    });

    emitTransaction();

    return Response.json({
      message: `Corte ${corteNum} emitido exitosamente. ${frozenCount} registros congelados.`,
      num_corte: corteNum,
      frozen_count: frozenCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
