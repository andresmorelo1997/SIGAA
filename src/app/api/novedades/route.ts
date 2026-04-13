import { NextRequest } from 'next/server';
import db from '@/lib/db';
import {
  asignarConsecutivoNovedad,
  registrarSeguimientoNovedad,
} from '@/lib/import-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tipo = searchParams.get('tipo') || '';
    const estado = searchParams.get('estado') || '';
    const periodo = searchParams.get('periodo') || '';
    const grado = searchParams.get('grado') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      conditions.push(
        '(asignatura LIKE ? OR instructor_sale LIKE ? OR instructor_entra LIKE ? OR catalogo LIKE ? OR motivo LIKE ? OR docente_sale LIKE ? OR docente_entra LIKE ? OR programa LIKE ?)'
      );
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term, term, term);
    }

    if (tipo) {
      conditions.push('tipo = ?');
      params.push(tipo);
    }

    if (estado) {
      conditions.push('estado = ?');
      params.push(estado);
    }

    if (periodo) {
      conditions.push('periodo = ?');
      params.push(periodo);
    }

    if (grado) {
      conditions.push('grado = ?');
      params.push(grado);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db
      .prepare(`SELECT COUNT(*) as total FROM novedades ${whereClause}`)
      .get(...params) as { total: number };

    const rows = db
      .prepare(
        `SELECT * FROM novedades ${whereClause} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    // Also include confirmed novedades_auto count
    const autoConfirmadas = (
      db
        .prepare(
          "SELECT COUNT(*) as total FROM novedades WHERE detectada_auto = 1"
        )
        .get() as { total: number }
    ).total;

    return Response.json({
      data: rows,
      autoConfirmadas,
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
    body.created_at = new Date().toISOString();

    const allowedColumns = [
      // Original fields
      'fecha_inicio', 'fecha_fin', 'num_clase', 'catalogo', 'asignatura',
      'instructor_sale', 'instructor_sale_id', 'instructor_entra',
      'instructor_entra_id', 'horas_afectadas', 'tipo', 'motivo',
      'periodo', 'grado', 'campus', 'estado', 'detectada_auto',
      'import_id', 'created_at',
      // Seguimiento
      'ciclo_lectivo', 'estado_seguimiento', 'fecha_aplicacion',
      'observaciones_seguimiento',
      // F-GC-002 format fields
      'tipo_programa', 'programa',
      'docente_sale', 'docente_sale_id', 'docente_sale_dedicacion',
      'fecha_inicio_sale', 'fecha_salida',
      'semestre', 'grupo', 'horas_teoricas', 'horas_practicas',
      'intensidad_semestral', 'horas_dictadas', 'horas_ausencia',
      'horas_restantes', 'aula', 'horario',
      'motivo_detalle',
      'docente_entra', 'docente_entra_id', 'docente_entra_dedicacion',
      'fecha_inicio_entra', 'fecha_salida_entra', 'total_horas_contratar',
      'observaciones', 'efecto_aplicado',
      'aprobado_jefe_programa', 'aprobado_decano',
      'aprobado_director_academico', 'aprobado_rector', 'updated_at',
    ];

    // Default: novedades entran directamente como 'Aprobada'
    if (!body.estado_seguimiento) body.estado_seguimiento = 'Aprobada';
    if (!body.estado) body.estado = 'pendiente';

    // Si no vienen `grado` o `ciclo_lectivo`, intentamos inferirlos desde
    // carga_academica (por num_clase). Son necesarios para que el
    // consecutivo se asigne al grupo correcto (PREG/POSG).
    if ((!body.grado || !body.ciclo_lectivo) && body.num_clase) {
      const ca = db
        .prepare(
          'SELECT grado, ciclo_lectivo FROM carga_academica WHERE num_clase = ? LIMIT 1',
        )
        .get(body.num_clase) as
        | { grado: string | null; ciclo_lectivo: string | null }
        | undefined;
      if (ca) {
        if (!body.grado && ca.grado) body.grado = ca.grado;
        if (!body.ciclo_lectivo && ca.ciclo_lectivo) body.ciclo_lectivo = ca.ciclo_lectivo;
      }
    }

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
        `INSERT INTO novedades (${columns.join(', ')}) VALUES (${placeholders})`
      )
      .run(...values);

    const novedadId = Number(result.lastInsertRowid);

    // Asignar consecutivo por ciclo lectivo + registrar estado inicial
    let consecutivo: string | null = null;
    try {
      consecutivo = asignarConsecutivoNovedad(novedadId);
    } catch (e) {
      console.error('asignarConsecutivoNovedad failed', e);
    }
    try {
      registrarSeguimientoNovedad(
        novedadId,
        body.estado_seguimiento as string,
        'Creación de novedad',
        'sistema',
      );
    } catch (e) {
      console.error('registrarSeguimientoNovedad failed', e);
    }

    return Response.json(
      {
        id: novedadId,
        consecutivo,
        message: 'Novedad creada exitosamente',
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

    const allowedColumns = [
      // Original fields
      'fecha_inicio', 'fecha_fin', 'num_clase', 'catalogo', 'asignatura',
      'instructor_sale', 'instructor_sale_id', 'instructor_entra',
      'instructor_entra_id', 'horas_afectadas', 'tipo', 'motivo',
      'periodo', 'grado', 'campus', 'estado',
      // F-GC-002 format fields
      'tipo_programa', 'programa',
      'docente_sale', 'docente_sale_id', 'docente_sale_dedicacion',
      'fecha_inicio_sale', 'fecha_salida',
      'semestre', 'grupo', 'horas_teoricas', 'horas_practicas',
      'intensidad_semestral', 'horas_dictadas', 'horas_ausencia',
      'horas_restantes', 'aula', 'horario',
      'motivo_detalle',
      'docente_entra', 'docente_entra_id', 'docente_entra_dedicacion',
      'fecha_inicio_entra', 'fecha_salida_entra', 'total_horas_contratar',
      'observaciones', 'efecto_aplicado',
      'aprobado_jefe_programa', 'aprobado_decano',
      'aprobado_director_academico', 'aprobado_rector', 'updated_at',
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
      .prepare(`UPDATE novedades SET ${setClause} WHERE id = ?`)
      .run(...values, id);

    if (result.changes === 0) {
      return Response.json(
        { error: 'Registro no encontrado' },
        { status: 404 }
      );
    }

    return Response.json({ message: 'Novedad actualizada exitosamente' });
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

    const result = db.prepare('DELETE FROM novedades WHERE id = ?').run(id);

    if (result.changes === 0) {
      return Response.json(
        { error: 'Registro no encontrado' },
        { status: 404 }
      );
    }

    return Response.json({ message: 'Novedad eliminada exitosamente' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
