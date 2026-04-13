import { NextRequest } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Direct lookup by clave (exact match)
    const clave = searchParams.get('clave') || '';
    if (clave) {
      const row = db.prepare('SELECT * FROM parametros WHERE clave = ?').get(clave) as Record<string, unknown> | undefined;
      if (!row) {
        return Response.json({ error: 'Parametro no encontrado' }, { status: 404 });
      }
      return Response.json(row);
    }

    const search = searchParams.get('search') || '';
    const categoria = searchParams.get('categoria') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      conditions.push('(clave LIKE ? OR valor LIKE ? OR descripcion LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (categoria) {
      conditions.push('categoria = ?');
      params.push(categoria);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db
      .prepare(`SELECT COUNT(*) as total FROM parametros ${whereClause}`)
      .get(...params) as { total: number };

    const rows = db
      .prepare(`SELECT * FROM parametros ${whereClause} ORDER BY categoria ASC, clave ASC LIMIT ? OFFSET ?`)
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const columns = Object.keys(body);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((col) => body[col]);

    const result = db
      .prepare(`INSERT INTO parametros (${columns.join(', ')}) VALUES (${placeholders})`)
      .run(...values);

    return Response.json(
      { id: result.lastInsertRowid, message: 'Parametro creado exitosamente' },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return Response.json({ error: 'Se requiere el campo id' }, { status: 400 });
    }

    const columns = Object.keys(fields);
    if (columns.length === 0) {
      return Response.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    const setClause = columns.map((col) => `${col} = ?`).join(', ');
    const values = columns.map((col) => fields[col]);

    const result = db
      .prepare(`UPDATE parametros SET ${setClause} WHERE id = ?`)
      .run(...values, id);

    if (result.changes === 0) {
      return Response.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    return Response.json({ message: 'Parametro actualizado exitosamente' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}

