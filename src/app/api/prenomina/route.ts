import { NextRequest } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const periodo = searchParams.get('periodo') || '';
    const tipo = searchParams.get('tipo') || '';
    const campus = searchParams.get('campus') || '';
    const dedicacion = searchParams.get('dedicacion') || '';
    const grado = searchParams.get('grado') || '';
    const estado = searchParams.get('estado') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      conditions.push(
        '(nombre_instructor LIKE ? OR documento LIKE ? OR instructor_id LIKE ? OR asignatura LIKE ?)'
      );
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (periodo) {
      conditions.push('periodo = ?');
      params.push(periodo);
    }

    if (tipo) {
      // Frontend sends lowercase; DB stores uppercase (PREGRADO/POSGRADO).
      conditions.push('UPPER(tipo) = UPPER(?)');
      params.push(tipo);
    }

    if (campus) {
      conditions.push('campus = ?');
      params.push(campus);
    }

    if (dedicacion) {
      conditions.push('dedicacion = ?');
      params.push(dedicacion);
    }

    if (grado) {
      conditions.push('grado = ?');
      params.push(grado);
    }

    if (estado) {
      conditions.push('estado = ?');
      params.push(estado);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db
      .prepare(`SELECT COUNT(*) as total FROM prenomina ${whereClause}`)
      .get(...params) as { total: number };

    const rows = db
      .prepare(
        `SELECT * FROM prenomina ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    // Totals aggregation by docente (within same filters)
    const totales = db
      .prepare(
        `SELECT
          instructor_id,
          nombre_instructor,
          documento,
          dedicacion,
          COUNT(*) as num_asignaturas,
          COALESCE(SUM(hrs_semana), 0) as total_hrs_semana,
          COALESCE(SUM(hrs_semestre), 0) as total_hrs_semestre,
          COALESCE(SUM(corte_1), 0) as total_corte_1,
          COALESCE(SUM(corte_2), 0) as total_corte_2,
          COALESCE(SUM(corte_3), 0) as total_corte_3,
          COALESCE(SUM(corte_4), 0) as total_corte_4,
          COALESCE(SUM(corte_5), 0) as total_corte_5,
          COALESCE(SUM(corte_6), 0) as total_corte_6
        FROM prenomina ${whereClause}
        GROUP BY instructor_id, nombre_instructor, documento, dedicacion
        ORDER BY nombre_instructor`
      )
      .all(...params);

    return Response.json({
      data: rows,
      totales,
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

    if (!body.created_at) {
      body.created_at = new Date().toISOString();
    }

    const allowedColumns = [
      'dedicacion', 'nombre_instructor', 'documento', 'instructor_id',
      'campus', 'programa_academico', 'grado', 'ccl_lvo', 'cohorte',
      'modalidad', 'semestre_cohorte', 'num_clase', 'catalogo',
      'asignatura', 'componente', 'inscritos', 'observacion',
      'hrs_semana', 'hrs_semestre', 'fecha_inicial', 'fecha_final',
      'corte_1', 'corte_2', 'corte_3', 'corte_4', 'corte_5', 'corte_6',
      'periodo', 'tipo', 'estado', 'created_at',
    ];

    const columns = Object.keys(body).filter((col) =>
      allowedColumns.includes(col)
    );
    if (columns.length === 0) {
      return Response.json(
        { error: 'No se proporcionaron campos validos' },
        { status: 400 }
      );
    }

    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((col) => body[col]);

    const result = db
      .prepare(
        `INSERT INTO prenomina (${columns.join(', ')}) VALUES (${placeholders})`
      )
      .run(...values);

    return Response.json(
      { id: result.lastInsertRowid, message: 'Registro creado exitosamente' },
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

    const allowedColumns = [
      'dedicacion', 'nombre_instructor', 'documento', 'instructor_id',
      'campus', 'programa_academico', 'grado', 'ccl_lvo', 'cohorte',
      'modalidad', 'semestre_cohorte', 'num_clase', 'catalogo',
      'asignatura', 'componente', 'inscritos', 'observacion',
      'hrs_semana', 'hrs_semestre', 'fecha_inicial', 'fecha_final',
      'corte_1', 'corte_2', 'corte_3', 'corte_4', 'corte_5', 'corte_6',
      'periodo', 'tipo', 'estado',
    ];

    const columns = Object.keys(fields).filter((col) =>
      allowedColumns.includes(col)
    );
    if (columns.length === 0) {
      return Response.json(
        { error: 'No hay campos validos para actualizar' },
        { status: 400 }
      );
    }

    const setClause = columns.map((col) => `${col} = ?`).join(', ');
    const values = columns.map((col) => fields[col]);

    const result = db
      .prepare(`UPDATE prenomina SET ${setClause} WHERE id = ?`)
      .run(...values, id);

    if (result.changes === 0) {
      return Response.json(
        { error: 'Registro no encontrado' },
        { status: 404 }
      );
    }

    return Response.json({ message: 'Registro actualizado exitosamente' });
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

    const result = db.prepare('DELETE FROM prenomina WHERE id = ?').run(id);

    if (result.changes === 0) {
      return Response.json(
        { error: 'Registro no encontrado' },
        { status: 404 }
      );
    }

    return Response.json({ message: 'Registro eliminado exitosamente' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
