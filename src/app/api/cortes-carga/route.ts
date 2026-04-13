import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { createCorteCarga } from '@/lib/import-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cortes-carga
 *   ?tipo=auto_pre_import|manual|auto_post_import
 *   &ciclo=2661
 *   &desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 *   &as_of=YYYY-MM-DD   → devuelve el último corte <= fecha
 *   &page=1&limit=20
 *
 * Lista los cortes/snapshots de carga_academica. Con as_of devuelve el
 * corte más cercano anterior a una fecha (útil para "a 31 de marzo había esto").
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const tipo = sp.get('tipo') || '';
    const ciclo = sp.get('ciclo') || '';
    const desde = sp.get('desde') || '';
    const hasta = sp.get('hasta') || '';
    const asOf = sp.get('as_of') || '';
    const page = parseInt(sp.get('page') || '1', 10);
    const limit = Math.min(parseInt(sp.get('limit') || '20', 10), 200);
    const offset = (page - 1) * limit;

    // as_of: buscar el corte más reciente <= fecha dada
    if (asOf) {
      const ceil = `${asOf} 23:59:59`;
      const conds: string[] = ['fecha_corte <= ?'];
      const params: unknown[] = [ceil];
      if (ciclo) { conds.push('ciclo_lectivo = ?'); params.push(ciclo); }
      const latest = db
        .prepare(
          `SELECT * FROM cortes_carga
            WHERE ${conds.join(' AND ')}
            ORDER BY fecha_corte DESC, id DESC
            LIMIT 1`,
        )
        .get(...params) as Record<string, unknown> | undefined;
      return Response.json({ data: latest || null, asOf });
    }

    const conds: string[] = [];
    const params: unknown[] = [];
    if (tipo) { conds.push('tipo = ?'); params.push(tipo); }
    if (ciclo) { conds.push('ciclo_lectivo = ?'); params.push(ciclo); }
    if (desde) { conds.push('fecha_corte >= ?'); params.push(`${desde} 00:00:00`); }
    if (hasta) { conds.push('fecha_corte <= ?'); params.push(`${hasta} 23:59:59`); }

    const whereClause = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const countRow = db
      .prepare(`SELECT COUNT(*) AS total FROM cortes_carga ${whereClause}`)
      .get(...params) as { total: number };

    const rows = db
      .prepare(
        `SELECT * FROM cortes_carga ${whereClause}
          ORDER BY fecha_corte DESC, id DESC
          LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset);

    return Response.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: countRow.total,
        totalPages: Math.ceil(countRow.total / limit),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/cortes-carga
 * body: { tipo?: 'manual', nombre?: string, descripcion?: string, ciclo_lectivo?: string, created_by?: string }
 * Crea un corte manual.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const corteId = createCorteCarga({
      tipo: (body.tipo as 'manual' | 'auto_pre_import' | 'auto_post_import') || 'manual',
      nombre: (body.nombre as string) || `Corte manual ${new Date().toISOString().substring(0, 10)}`,
      descripcion: (body.descripcion as string) || undefined,
      cicloLectivo: (body.ciclo_lectivo as string) || undefined,
      createdBy: (body.created_by as string) || 'usuario',
    });
    const row = db
      .prepare('SELECT * FROM cortes_carga WHERE id = ?')
      .get(corteId) as Record<string, unknown>;
    return Response.json({ data: row }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/cortes-carga?id=123
 * Sólo elimina cortes manuales por seguridad.
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = parseInt(request.nextUrl.searchParams.get('id') || '0', 10);
    if (!id) {
      return Response.json({ error: 'Se requiere el parámetro id' }, { status: 400 });
    }
    const row = db
      .prepare('SELECT tipo FROM cortes_carga WHERE id = ?')
      .get(id) as { tipo: string } | undefined;
    if (!row) {
      return Response.json({ error: 'Corte no encontrado' }, { status: 404 });
    }
    if (row.tipo !== 'manual') {
      return Response.json(
        { error: 'Sólo se pueden eliminar cortes manuales' },
        { status: 400 },
      );
    }
    db.prepare('DELETE FROM cortes_carga WHERE id = ?').run(id);
    return Response.json({ message: 'Corte eliminado' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
