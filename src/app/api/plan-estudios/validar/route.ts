import { NextRequest } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

interface PlanEntry {
  id: number;
  programa_academico: string;
  grado: string;
  modalidad: string;
  cohorte: string;
  semestre: string;
  clase: string;
  catalogo: string;
  asignatura: string;
  total_hrs_curso: number;
  hrs_semanal: number;
  hrs_semestre: number;
  atrib_curso: string;
}

interface CargaMatch {
  catalogo: string;
  nombre_instructor: string;
  hrs_semestre: number;
  num_clase: number;
}

interface DetalleItem {
  catalogo: string;
  asignatura_plan: string;
  creditos: number;
  hrs_plan: number;
  hrs_carga: number | null;
  docente: string | null;
  estado: 'ok' | 'sin_carga' | 'diferencia_horas';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const programa = searchParams.get('programa');
    const cicloLectivo = searchParams.get('ciclo_lectivo') || '';

    if (!programa) {
      return Response.json(
        { error: 'Se requiere el parametro "programa"' },
        { status: 400 },
      );
    }

    // Fetch plan entries for the given programa
    const planEntries = db
      .prepare(
        `SELECT id, programa_academico, grado, modalidad, cohorte, semestre,
                clase, catalogo, asignatura, total_hrs_curso, hrs_semanal,
                hrs_semestre, atrib_curso
         FROM plan_estudios
         WHERE programa_academico = ?
         ORDER BY semestre, catalogo`,
      )
      .all(programa) as PlanEntry[];

    if (planEntries.length === 0) {
      return Response.json({
        programa,
        plan_entries: [],
        resumen: {
          total_asignaturas: 0,
          con_carga: 0,
          sin_carga: 0,
          con_diferencia_horas: 0,
          docentes_asignados: 0,
        },
        detalle: [],
      });
    }

    // Build carga lookup: for each catalogo in the plan, find matching carga_academica rows
    // Optionally filter by ciclo_lectivo
    let cargaQuery = `
      SELECT catalogo, nombre_instructor, hrs_semestre, num_clase
      FROM carga_academica
      WHERE catalogo = ?
    `;
    if (cicloLectivo) {
      cargaQuery += ` AND ciclo_lectivo = ?`;
    }
    cargaQuery += ` LIMIT 1`;

    const cargaStmt = db.prepare(cargaQuery);

    const detalle: DetalleItem[] = [];
    const docenteSet = new Set<string>();
    let conCarga = 0;
    let sinCarga = 0;
    let conDiferenciaHoras = 0;

    for (const entry of planEntries) {
      const params: (string | number)[] = [entry.catalogo];
      if (cicloLectivo) params.push(cicloLectivo);

      const match = cargaStmt.get(...params) as CargaMatch | undefined;

      let estado: 'ok' | 'sin_carga' | 'diferencia_horas' = 'sin_carga';
      let hrsCarga: number | null = null;
      let docente: string | null = null;

      if (match) {
        hrsCarga = match.hrs_semestre ?? null;
        docente = match.nombre_instructor ?? null;
        if (docente) docenteSet.add(docente);

        // Compare hours
        const planHrs = parseFloat(String(entry.hrs_semestre ?? 0)) || 0;
        const cargaHrs = parseFloat(String(hrsCarga ?? 0)) || 0;

        if (Math.abs(planHrs - cargaHrs) > 0.5) {
          estado = 'diferencia_horas';
          conDiferenciaHoras++;
        } else {
          estado = 'ok';
        }
        conCarga++;
      } else {
        sinCarga++;
      }

      detalle.push({
        catalogo: entry.catalogo,
        asignatura_plan: entry.asignatura,
        creditos: entry.total_hrs_curso ?? 0,
        hrs_plan: entry.hrs_semestre ?? 0,
        hrs_carga: hrsCarga,
        docente,
        estado,
      });
    }

    return Response.json({
      programa,
      plan_entries: planEntries,
      resumen: {
        total_asignaturas: planEntries.length,
        con_carga: conCarga,
        sin_carga: sinCarga,
        con_diferencia_horas: conDiferenciaHoras,
        docentes_asignados: docenteSet.size,
      },
      detalle,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
