import { NextRequest } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: List cortes by periodo and/or grado
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const periodo = searchParams.get('periodo');
    const grado = searchParams.get('grado');

    let sql = 'SELECT * FROM cortes_prenomina WHERE 1=1';
    const params: unknown[] = [];

    if (periodo) { sql += ' AND periodo = ?'; params.push(periodo); }
    if (grado) { sql += ' AND grado = ?'; params.push(grado); }

    sql += ' ORDER BY grado, num_corte';
    const data = db.prepare(sql).all(...params);

    // Also return grouped view
    const grouped: Record<string, typeof data> = {};
    for (const row of data as Array<{ grado: string }>) {
      if (!grouped[row.grado]) grouped[row.grado] = [];
      grouped[row.grado].push(row);
    }

    return Response.json({ data, grouped });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}

// POST: Create or update cortes for a grado+periodo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { periodo, grado, cortes } = body as {
      periodo: string;
      grado: string;
      cortes: Array<{ num_corte: number; fecha_inicio: string; fecha_fin: string; descripcion?: string }>;
    };

    if (!periodo || !grado || !cortes?.length) {
      return Response.json({ error: 'Faltan campos requeridos: periodo, grado, cortes' }, { status: 400 });
    }

    const upsert = db.prepare(`
      INSERT INTO cortes_prenomina (periodo, grado, num_corte, fecha_inicio, fecha_fin, descripcion)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(periodo, grado, num_corte) DO UPDATE SET
        fecha_inicio = excluded.fecha_inicio,
        fecha_fin = excluded.fecha_fin,
        descripcion = excluded.descripcion
    `);

    const saveAll = db.transaction(() => {
      for (const c of cortes) {
        upsert.run(periodo, grado, c.num_corte, c.fecha_inicio, c.fecha_fin, c.descripcion || `Corte ${c.num_corte} ${grado}`);
      }
    });

    saveAll();

    return Response.json({ success: true, count: cortes.length });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}

// DELETE: Delete all cortes for a grado+periodo
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const periodo = searchParams.get('periodo');
    const grado = searchParams.get('grado');

    if (!periodo || !grado) {
      return Response.json({ error: 'Faltan periodo y grado' }, { status: 400 });
    }

    const result = db.prepare('DELETE FROM cortes_prenomina WHERE periodo = ? AND grado = ?').run(periodo, grado);

    return Response.json({ success: true, deleted: result.changes });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
