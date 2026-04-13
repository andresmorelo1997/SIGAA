import { NextRequest } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const periodo = searchParams.get('periodo') || '';
    const tipo = searchParams.get('tipo') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      conditions.push('(evento LIKE ? OR descripcion LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term);
    }

    if (periodo) {
      conditions.push('periodo = ?');
      params.push(periodo);
    }

    if (tipo) {
      conditions.push('tipo = ?');
      params.push(tipo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db
      .prepare(`SELECT COUNT(*) as total FROM calendario ${whereClause}`)
      .get(...params) as { total: number };

    const rows = db
      .prepare(`SELECT * FROM calendario ${whereClause} ORDER BY fecha_inicio ASC LIMIT ? OFFSET ?`)
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
      .prepare(`INSERT INTO calendario (${columns.join(', ')}) VALUES (${placeholders})`)
      .run(...values);

    return Response.json(
      { id: result.lastInsertRowid, message: 'Evento creado exitosamente' },
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
      .prepare(`UPDATE calendario SET ${setClause} WHERE id = ?`)
      .run(...values, id);

    if (result.changes === 0) {
      return Response.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    return Response.json({ message: 'Evento actualizado exitosamente' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'Se requiere el parametro id' }, { status: 400 });
    }

    const result = db.prepare('DELETE FROM calendario WHERE id = ?').run(id);

    if (result.changes === 0) {
      return Response.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    return Response.json({ message: 'Evento eliminado exitosamente' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
