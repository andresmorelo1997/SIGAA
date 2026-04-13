import { NextRequest } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const docId = searchParams.get('doc_id') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (docId) {
      conditions.push('doc_id = ?');
      params.push(docId);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db
      .prepare(
        `SELECT COUNT(*) as total FROM docente_capacitaciones ${whereClause}`
      )
      .get(...params) as { total: number };

    const rows = db
      .prepare(
        `SELECT * FROM docente_capacitaciones ${whereClause} ORDER BY anio DESC, semestre DESC LIMIT ? OFFSET ?`
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
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const columns = Object.keys(body);
    if (columns.length === 0) {
      return Response.json(
        { error: 'No se proporcionaron datos' },
        { status: 400 }
      );
    }

    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((col) => body[col]);

    const result = db
      .prepare(
        `INSERT INTO docente_capacitaciones (${columns.join(', ')}) VALUES (${placeholders})`
      )
      .run(...values);

    return Response.json(
      {
        id: result.lastInsertRowid,
        message: 'Capacitacion creada exitosamente',
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return Response.json(
        { error: 'Se requiere el campo id' },
        { status: 400 }
      );
    }

    const columns = Object.keys(fields);
    if (columns.length === 0) {
      return Response.json(
        { error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }

    const setClause = columns.map((col) => `${col} = ?`).join(', ');
    const values = columns.map((col) => fields[col]);

    const result = db
      .prepare(
        `UPDATE docente_capacitaciones SET ${setClause} WHERE id = ?`
      )
      .run(...values, id);

    if (result.changes === 0) {
      return Response.json(
        { error: 'Registro no encontrado' },
        { status: 404 }
      );
    }

    return Response.json({
      message: 'Capacitacion actualizada exitosamente',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return Response.json(
        { error: 'Se requiere el parametro id' },
        { status: 400 }
      );
    }

    const result = db
      .prepare('DELETE FROM docente_capacitaciones WHERE id = ?')
      .run(id);

    if (result.changes === 0) {
      return Response.json(
        { error: 'Registro no encontrado' },
        { status: 404 }
      );
    }

    return Response.json({
      message: 'Capacitacion eliminada exitosamente',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
