import { NextRequest } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const categoria = searchParams.get('categoria') || '';
    const nivelFormacion = searchParams.get('nivel_formacion') || '';
    const sortBy = searchParams.get('sort_by') || 'id';
    const sortOrder = searchParams.get('sort_order') || 'DESC';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      conditions.push('(nombre LIKE ? OR cedula LIKE ? OR titulo LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (categoria) {
      conditions.push('categoria = ?');
      params.push(categoria);
    }

    if (nivelFormacion) {
      conditions.push('nivel_formacion = ?');
      params.push(nivelFormacion);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSortColumns = ['id', 'puntos', 'antiguedad', 'nombre', 'categoria'];
    const safeSort = allowedSortColumns.includes(sortBy) ? sortBy : 'id';
    const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countRow = db
      .prepare(`SELECT COUNT(*) as total FROM escalafon ${whereClause}`)
      .get(...params) as { total: number };

    const rows = db
      .prepare(`SELECT * FROM escalafon ${whereClause} ORDER BY ${safeSort} ${safeOrder} LIMIT ? OFFSET ?`)
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
      .prepare(`INSERT INTO escalafon (${columns.join(', ')}) VALUES (${placeholders})`)
      .run(...values);

    return Response.json(
      { id: result.lastInsertRowid, message: 'Registro de escalafon creado exitosamente' },
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
      .prepare(`UPDATE escalafon SET ${setClause} WHERE id = ?`)
      .run(...values, id);

    if (result.changes === 0) {
      return Response.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    return Response.json({ message: 'Registro actualizado exitosamente' });
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

    const result = db.prepare('DELETE FROM escalafon WHERE id = ?').run(id);

    if (result.changes === 0) {
      return Response.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    return Response.json({ message: 'Registro eliminado exitosamente' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
