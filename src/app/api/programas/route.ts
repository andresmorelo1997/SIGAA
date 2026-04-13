import { NextRequest } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const grado = searchParams.get('grado') || '';
    const modalidad = searchParams.get('modalidad') || '';
    const estado = searchParams.get('estado') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      conditions.push('(nombre LIKE ? OR codigo LIKE ? OR facultad LIKE ? OR snies LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (grado) {
      conditions.push('grado = ?');
      params.push(grado);
    }

    if (modalidad) {
      conditions.push('modalidad = ?');
      params.push(modalidad);
    }

    if (estado) {
      conditions.push('estado = ?');
      params.push(estado);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db
      .prepare(`SELECT COUNT(*) as total FROM programas ${whereClause}`)
      .get(...params) as { total: number };

    const rows = db
      .prepare(`SELECT * FROM programas ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset);

    // Stats
    const statsTotal = (db.prepare('SELECT COUNT(*) as c FROM programas').get() as { c: number }).c;
    const statsPregrado = (db.prepare("SELECT COUNT(*) as c FROM programas WHERE grado = 'Pregrado'").get() as { c: number }).c;
    const statsPosgrado = (db
      .prepare(
        "SELECT COUNT(*) as c FROM programas WHERE grado IN ('Posgrado', 'Especialización', 'Especializacion', 'Maestría', 'Maestria', 'Doctorado')",
      )
      .get() as { c: number }).c;
    const statsActivos = (db.prepare("SELECT COUNT(*) as c FROM programas WHERE estado = 'activo'").get() as { c: number }).c;

    return Response.json({
      data: rows,
      stats: {
        total: statsTotal,
        pregrado: statsPregrado,
        posgrado: statsPosgrado,
        activos: statsActivos,
      },
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
      .prepare(`INSERT INTO programas (${columns.join(', ')}) VALUES (${placeholders})`)
      .run(...values);

    return Response.json(
      { id: result.lastInsertRowid, message: 'Programa creado exitosamente' },
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
      .prepare(`UPDATE programas SET ${setClause} WHERE id = ?`)
      .run(...values, id);

    if (result.changes === 0) {
      return Response.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    return Response.json({ message: 'Programa actualizado exitosamente' });
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

    const result = db.prepare('DELETE FROM programas WHERE id = ?').run(id);

    if (result.changes === 0) {
      return Response.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    return Response.json({ message: 'Programa eliminado exitosamente' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
