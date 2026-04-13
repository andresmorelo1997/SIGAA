import { NextRequest } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cortes-carga/:id
 *   ?page=1&limit=100
 *   &ciclo=2661
 *   &catalogo=245MEDIC
 *   &instructor=1098765432
 *
 * Devuelve el encabezado del corte + filas del detalle (paginado).
 * Esto permite reconstruir "cómo estaba la carga académica a la fecha del corte".
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await context.params;
    const id = parseInt(idParam, 10);
    if (!id) {
      return Response.json({ error: 'id inválido' }, { status: 400 });
    }

    const sp = request.nextUrl.searchParams;
    const page = parseInt(sp.get('page') || '1', 10);
    const limit = Math.min(parseInt(sp.get('limit') || '100', 10), 1000);
    const offset = (page - 1) * limit;
    const ciclo = sp.get('ciclo') || '';
    const catalogo = sp.get('catalogo') || '';
    const instructor = sp.get('instructor') || '';

    const header = db
      .prepare('SELECT * FROM cortes_carga WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!header) {
      return Response.json({ error: 'Corte no encontrado' }, { status: 404 });
    }

    const conds: string[] = ['corte_id = ?'];
    const params: unknown[] = [id];
    if (ciclo) { conds.push('ciclo_lectivo = ?'); params.push(ciclo); }
    if (catalogo) { conds.push('catalogo = ?'); params.push(catalogo); }
    if (instructor) { conds.push('instructor_id = ?'); params.push(instructor); }
    const whereClause = `WHERE ${conds.join(' AND ')}`;

    const countRow = db
      .prepare(
        `SELECT COUNT(*) AS total FROM cortes_carga_detalle ${whereClause}`,
      )
      .get(...params) as { total: number };

    const rows = db
      .prepare(
        `SELECT * FROM cortes_carga_detalle ${whereClause}
          ORDER BY id
          LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset);

    return Response.json({
      header,
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
