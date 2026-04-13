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

interface ClaseDetail {
  num_clase: number;
  catalogo: string;
  asignatura: string;
  componente: string;
  inscritos: number;
  hrs_semana: number;
  hrs_semestre: number;
  fecha_inicial: string;
  fecha_final: string;
  cortes: number[];
  programa: string;
  campus: string;
}

interface ConsolidadoDocente {
  instructor_id: string;
  nombre: string;
  cedula: string;
  tipo_doc: string;
  dedicacion: string;
  campus: string;
  programa: string;
  hrs_semana: number;
  hrs_semestre: number;
  cortes: number[];
  cortes_congelados: boolean[];
  hrs_prenomina: number;
  saldo: number;
  fecha_inicio: string;
  fecha_final: string;
  clases: ClaseDetail[];
}

/* ------------------------------------------------------------------ */
/*  Date / week calculation helpers                                    */
/* ------------------------------------------------------------------ */

/** Count calendar weeks of overlap between two date ranges, minus Semana Santa if applicable. */
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

  // Subtract Semana Santa days if applicable and NOT an exception
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

/** Normalize grado string to canonical key (PREG, PRE2, POSG, MSTR, DOCT, ESP). */
function normalizeGrado(grado: string): string {
  const g = (grado || '').toUpperCase();
  if (g === 'PRE2') return 'PRE2';
  if (g.startsWith('PRE') || g === 'PREGRADO') return 'PREG';
  if (g.startsWith('MSTR') || g.startsWith('MAEST') || g === 'MAESTRIA') return 'MSTR';
  if (g.startsWith('DOCT') || g === 'DOCTORADO') return 'DOCT';
  if (g.startsWith('ESP')) return 'ESP';
  return 'POSG';
}

function minDateStr(dates: string[]): string {
  const valid = dates.filter(d => d && d !== '-');
  if (valid.length === 0) return '-';
  return valid.sort()[0];
}

function maxDateStr(dates: string[]): string {
  const valid = dates.filter(d => d && d !== '-');
  if (valid.length === 0) return '-';
  return valid.sort().reverse()[0];
}

/* ------------------------------------------------------------------ */
/*  GET handler                                                        */
/* ------------------------------------------------------------------ */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const periodo = sp.get('periodo') || '';
    const tipo = sp.get('tipo') || 'PREGRADO'; // PREGRADO | POSGRADO
    const ciclo_lectivo = sp.get('ciclo_lectivo') || '';
    const campusFilter = sp.get('campus') || '';
    const dedicacionFilter = sp.get('dedicacion') || '';
    const searchFilter = sp.get('search') || '';

    if (!periodo) {
      return Response.json({ error: 'Se requiere el par\u00e1metro periodo' }, { status: 400 });
    }

    // 1) Determine which grados belong to this tipo
    const gradosForTipo = tipo === 'PREGRADO'
      ? ['PREG', 'PRE2']
      : ['POSG', 'MSTR', 'DOCT', 'ESP'];

    const gradoSqlValues = tipo === 'PREGRADO'
      ? "('PREG','PRE2','PREGRADO','Pregrado')"
      : "('POSG','MSTR','DOCT','ESP','POSGRADO','Posgrado','MAESTRIA','Maestria','DOCTORADO','Doctorado','ESPECIALIZACION','Especializacion')";

    // 2) Load cortes configuration for all relevant grados
    const cortesMap: Record<string, CorteConfig[]> = {};
    for (const g of gradosForTipo) {
      const rows = db.prepare(
        'SELECT num_corte, fecha_inicio, fecha_fin FROM cortes_prenomina WHERE periodo = ? AND grado = ? ORDER BY num_corte'
      ).all(periodo, g) as CorteConfig[];
      if (rows.length > 0) cortesMap[g] = rows;
    }

    const hasCortes = Object.keys(cortesMap).length > 0;
    if (!hasCortes) {
      return Response.json({
        error: `No hay cortes configurados para periodo ${periodo} y tipo ${tipo}.`,
        consolidado: [],
        num_cortes: 0,
        cortes_info: [],
      }, { status: 400 });
    }

    // Use first available grado's cortes as the reference for num_cortes
    const referenceCortes = cortesMap[gradosForTipo.find(g => cortesMap[g]) || gradosForTipo[0]] || [];
    const numCortes = referenceCortes.length;

    // 3) Load Semana Santa config
    const ssConfig = db.prepare(
      'SELECT fecha_inicio, fecha_fin FROM semana_santa_config WHERE periodo = ?'
    ).get(periodo) as { fecha_inicio: string; fecha_fin: string } | undefined;
    const ssStart = ssConfig?.fecha_inicio || null;
    const ssEnd = ssConfig?.fecha_fin || null;

    // 4) Load Semana Santa exceptions (programs that work during SS)
    const ssExceptions = db.prepare(
      'SELECT programa FROM semana_santa_excepciones WHERE periodo = ?'
    ).all(periodo) as { programa: string }[];
    const ssExceptionSet = new Set(ssExceptions.map(e => e.programa.toUpperCase()));

    // 5) Load emitted cortes
    const emitidosRows = db.prepare(
      'SELECT grado, num_corte, emitido_at FROM cortes_emitidos WHERE periodo = ?'
    ).all(periodo) as { grado: string; num_corte: number; emitido_at: string }[];
    // Key: "GRADO:num_corte"
    const emitidosSet = new Set(emitidosRows.map(e => `${e.grado}:${e.num_corte}`));

    // Check which reference cortes are emitted (for the UI header)
    // A corte is considered emitted if ALL grados for this tipo have it emitted
    const cortesEmitidoFlags: boolean[] = [];
    for (let i = 0; i < numCortes; i++) {
      const corteNum = i + 1;
      const allEmitted = gradosForTipo.every(g => {
        if (!cortesMap[g]) return true; // no cortes for this grado, skip
        return emitidosSet.has(`${g}:${corteNum}`);
      });
      cortesEmitidoFlags.push(allEmitted);
    }

    // 6) Load frozen prenomina data for emitted cortes
    // Frozen data is stored in prenomina table with num_corte_emitido set
    const frozenMap = new Map<string, Map<number, number>>(); // instructor_id+num_clase -> corte_num -> value
    if (emitidosRows.length > 0) {
      const frozenRows = db.prepare(`
        SELECT instructor_id, num_clase, num_corte_emitido,
               corte_1, corte_2, corte_3, corte_4, corte_5, corte_6
        FROM prenomina
        WHERE periodo = ? AND tipo = ? AND num_corte_emitido IS NOT NULL
      `).all(periodo, tipo) as {
        instructor_id: string;
        num_clase: number;
        num_corte_emitido: number;
        corte_1: number; corte_2: number; corte_3: number;
        corte_4: number; corte_5: number; corte_6: number;
      }[];

      for (const fr of frozenRows) {
        const key = `${fr.instructor_id}:${fr.num_clase}`;
        if (!frozenMap.has(key)) frozenMap.set(key, new Map());
        // The frozen row stores the value for that specific corte in corte_N
        const corteValues = [fr.corte_1, fr.corte_2, fr.corte_3, fr.corte_4, fr.corte_5, fr.corte_6];
        const val = corteValues[fr.num_corte_emitido - 1] || 0;
        frozenMap.get(key)!.set(fr.num_corte_emitido, val);
      }
    }

    // 7) Query carga_academica joined with docentes
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (ciclo_lectivo) {
      conditions.push('ca.ciclo_lectivo = ?');
      params.push(ciclo_lectivo);
    }

    conditions.push(`ca.grado IN ${gradoSqlValues}`);

    if (campusFilter) {
      conditions.push('ca.campus = ?');
      params.push(campusFilter);
    }

    if (searchFilter) {
      conditions.push(
        "(ca.nombre_instructor LIKE ? OR COALESCE(d1.doc_id, d2.doc_id) LIKE ? OR ca.instructor_id LIKE ? OR ca.descripcion LIKE ?)"
      );
      const term = `%${searchFilter}%`;
      params.push(term, term, term, term);
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
        COALESCE(d1.dedicacion, d2.dedicacion) as dedicacion,
        COALESCE(d1.tipo_doc, d2.tipo_doc) as tipo_doc,
        COALESCE(d1.doc_id, d2.doc_id) as doc_id
      FROM carga_academica ca
      LEFT JOIN docentes d1 ON ca.instructor_id = d1.instructor_id AND ca.ciclo_lectivo = d1.ciclo_lectivo
      LEFT JOIN (
        SELECT instructor_id, dedicacion, tipo_doc, doc_id,
               ROW_NUMBER() OVER (PARTITION BY instructor_id ORDER BY ciclo_lectivo DESC) as rn
        FROM docentes
      ) d2 ON ca.instructor_id = d2.instructor_id AND d2.rn = 1 AND d1.instructor_id IS NULL
      ${whereClause}
      ORDER BY ca.nombre_instructor, ca.num_clase
    `).all(...params) as CargaRow[];

    // 8) Filter by dedicacion after the query (comes from JOIN)
    const filteredRows = dedicacionFilter
      ? cargaRows.filter(r => r.dedicacion === dedicacionFilter)
      : cargaRows;

    // 9) Calculate prenomina per class, then group by docente
    const docenteMap = new Map<string, {
      instructor_id: string;
      nombre: string;
      cedula: string;
      tipo_doc: string;
      dedicacion: string;
      campuses: Set<string>;
      programas: Set<string>;
      clases: ClaseDetail[];
      fechas_inicio: string[];
      fechas_final: string[];
    }>();

    for (const row of filteredRows) {
      const hrsWeek = Number(row.hrs_semanal) || 0;
      const gradoNorm = normalizeGrado(row.grado);
      const cortesForGrado = cortesMap[gradoNorm] || cortesMap[gradosForTipo[0]] || [];

      // Check if this program is a Semana Santa exception
      const programa = (row.desc_org_academica || row.grupo_academico || '').toUpperCase();
      const catalogoBase = (row.catalogo || '').replace(/[0-9]/g, '').toUpperCase();
      const isSsException = ssExceptionSet.has(programa) || ssExceptionSet.has(catalogoBase);

      // Calculate corte hours
      const corteHours: number[] = [];
      for (let i = 0; i < numCortes; i++) {
        const corte = cortesForGrado[i];
        if (!corte) {
          corteHours.push(0);
          continue;
        }

        const corteNum = i + 1;
        const frozenKey = `${row.instructor_id}:${row.num_clase}`;

        // Check if this specific corte is frozen for this grado
        const isCorteEmitted = emitidosSet.has(`${gradoNorm}:${corteNum}`);

        if (isCorteEmitted && frozenMap.has(frozenKey) && frozenMap.get(frozenKey)!.has(corteNum)) {
          // Use frozen value
          corteHours.push(frozenMap.get(frozenKey)!.get(corteNum)!);
        } else {
          // Calculate live
          const weeks = calcOverlapWeeks(
            corte.fecha_inicio, corte.fecha_fin,
            row.fecha_inicial, row.fecha_final,
            ssStart, ssEnd,
            isSsException,
          );
          corteHours.push(Math.round(hrsWeek * weeks * 100) / 100);
        }
      }

      const clase: ClaseDetail = {
        num_clase: row.num_clase,
        catalogo: row.catalogo,
        asignatura: row.descripcion || '',
        componente: row.componente || '',
        inscritos: row.total_inscripciones || 0,
        hrs_semana: hrsWeek,
        hrs_semestre: Number(row.hrs_semestre) || 0,
        fecha_inicial: row.fecha_inicial || '-',
        fecha_final: row.fecha_final || '-',
        cortes: corteHours,
        programa: row.desc_org_academica || row.grupo_academico || '',
        campus: row.campus || '',
      };

      const docenteKey = row.instructor_id || row.nombre_instructor || `unknown-${row.num_clase}`;
      if (!docenteMap.has(docenteKey)) {
        docenteMap.set(docenteKey, {
          instructor_id: row.instructor_id || '',
          nombre: row.nombre_instructor || '',
          cedula: row.doc_id || '',
          tipo_doc: row.tipo_doc || '',
          dedicacion: row.dedicacion || '',
          campuses: new Set(),
          programas: new Set(),
          clases: [],
          fechas_inicio: [],
          fechas_final: [],
        });
      }

      const d = docenteMap.get(docenteKey)!;
      d.clases.push(clase);
      if (row.campus) d.campuses.add(row.campus);
      if (row.desc_org_academica || row.grupo_academico) {
        d.programas.add(row.desc_org_academica || row.grupo_academico);
      }
      if (row.fecha_inicial) d.fechas_inicio.push(row.fecha_inicial);
      if (row.fecha_final) d.fechas_final.push(row.fecha_final);
    }

    // 10) Build consolidado
    const consolidado: ConsolidadoDocente[] = [];

    for (const [, d] of docenteMap) {
      const hrsSemana = d.clases.reduce((s, c) => s + c.hrs_semana, 0);
      const hrsSemestre = d.clases.reduce((s, c) => s + c.hrs_semestre, 0);

      const cortes: number[] = [];
      const cortesCongelados: boolean[] = [];

      for (let i = 0; i < numCortes; i++) {
        const corteTotal = d.clases.reduce((s, c) => s + (c.cortes[i] || 0), 0);
        cortes.push(Math.round(corteTotal * 100) / 100);
        cortesCongelados.push(cortesEmitidoFlags[i]);
      }

      const hrsPrenomina = cortes.reduce((s, v) => s + v, 0);
      const saldo = Math.round((hrsSemestre - hrsPrenomina) * 100) / 100;

      consolidado.push({
        instructor_id: d.instructor_id,
        nombre: d.nombre,
        cedula: d.cedula,
        tipo_doc: d.tipo_doc,
        dedicacion: d.dedicacion,
        campus: Array.from(d.campuses).join(', '),
        programa: Array.from(d.programas).join(', '),
        hrs_semana: Math.round(hrsSemana * 100) / 100,
        hrs_semestre: Math.round(hrsSemestre * 100) / 100,
        cortes,
        cortes_congelados: cortesCongelados,
        hrs_prenomina: Math.round(hrsPrenomina * 100) / 100,
        saldo,
        fecha_inicio: minDateStr(d.fechas_inicio),
        fecha_final: maxDateStr(d.fechas_final),
        clases: d.clases,
      });
    }

    // Sort by nombre
    consolidado.sort((a, b) => a.nombre.localeCompare(b.nombre));

    // 11) Build cortes_info for the header
    const cortesInfo = referenceCortes.map((c, i) => ({
      num: c.num_corte,
      fecha_inicio: c.fecha_inicio,
      fecha_fin: c.fecha_fin,
      emitido: cortesEmitidoFlags[i],
    }));

    return Response.json({
      consolidado,
      num_cortes: numCortes,
      cortes_info: cortesInfo,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
