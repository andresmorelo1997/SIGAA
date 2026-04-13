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
    const entidad = searchParams.get('entidad') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (tipo) {
      conditions.push('tipo = ?');
      params.push(tipo);
    }

    if (estado) {
      conditions.push('estado = ?');
      params.push(estado);
    }

    if (entidad) {
      conditions.push('entidad = ?');
      params.push(entidad);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db
      .prepare(`SELECT COUNT(*) as total FROM novedades_auto ${whereClause}`)
      .get(...params) as { total: number };

    const rows = db
      .prepare(
        `SELECT * FROM novedades_auto ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, estado } = body;

    if (!id) {
      return Response.json(
        { error: 'Se requiere el campo id' },
        { status: 400 }
      );
    }

    if (!estado) {
      return Response.json(
        { error: 'Se requiere el campo estado' },
        { status: 400 }
      );
    }

    // Get the current novedad_auto record
    const novedad = db
      .prepare('SELECT * FROM novedades_auto WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;

    if (!novedad) {
      return Response.json(
        { error: 'Novedad automatica no encontrada' },
        { status: 404 }
      );
    }

    let nuevaNovedadId: number | null = null;

    const updateTransaction = db.transaction(() => {
      // Update the status
      db.prepare('UPDATE novedades_auto SET estado = ? WHERE id = ?').run(
        estado,
        id
      );

      // If confirmed, create a corresponding record in novedades (as Aprobada)
      if (estado === 'confirmada') {
        const now = new Date().toISOString();

        // Parse datos_nuevo for additional context if available
        let datosNuevo: Record<string, unknown> = {};
        if (novedad.datos_nuevo && typeof novedad.datos_nuevo === 'string') {
          try {
            datosNuevo = JSON.parse(novedad.datos_nuevo);
          } catch {
            // datos_nuevo might not be valid JSON
          }
        }

        // Inferir ciclo_lectivo y grado: intenta desde datos_nuevo, si no
        // busca en carga_academica por num_clase
        let cicloLectivo: string | null =
          (datosNuevo.ciclo_lectivo as string) || null;
        let gradoInferido: string | null =
          (datosNuevo.grado as string) || null;
        if ((!cicloLectivo || !gradoInferido) && datosNuevo.num_clase) {
          const ca = db
            .prepare(
              'SELECT ciclo_lectivo, grado FROM carga_academica WHERE num_clase = ? LIMIT 1',
            )
            .get(datosNuevo.num_clase) as
            | { ciclo_lectivo: string | null; grado: string | null }
            | undefined;
          if (!cicloLectivo) cicloLectivo = ca?.ciclo_lectivo || null;
          if (!gradoInferido) gradoInferido = ca?.grado || null;
        }

        const insertResult = db.prepare(
          `INSERT INTO novedades (
            tipo, motivo, estado, estado_seguimiento, detectada_auto, created_at,
            num_clase, catalogo, asignatura,
            instructor_sale, instructor_sale_id,
            instructor_entra, instructor_entra_id,
            campus, periodo, grado, ciclo_lectivo
          ) VALUES (?, ?, ?, 'Aprobada', 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          novedad.tipo as string || 'cambio',
          novedad.descripcion as string || '',
          'pendiente',
          now,
          (datosNuevo.num_clase as string) || null,
          (datosNuevo.catalogo as string) || null,
          (datosNuevo.asignatura as string) || null,
          (datosNuevo.instructor_sale as string) || null,
          (datosNuevo.instructor_sale_id as string) || null,
          (datosNuevo.instructor_entra as string) || null,
          (datosNuevo.instructor_entra_id as string) || null,
          (datosNuevo.campus as string) || null,
          (datosNuevo.periodo as string) || null,
          gradoInferido,
          cicloLectivo,
        );
        nuevaNovedadId = Number(insertResult.lastInsertRowid);
      }
    });

    updateTransaction();

    // Post-transacción: asignar consecutivo y registrar estado inicial
    let consecutivo: string | null = null;
    if (nuevaNovedadId) {
      try {
        consecutivo = asignarConsecutivoNovedad(nuevaNovedadId);
      } catch (e) {
        console.error('asignarConsecutivoNovedad failed', e);
      }
      try {
        registrarSeguimientoNovedad(
          nuevaNovedadId,
          'Aprobada',
          'Confirmada desde novedad automática',
          'sistema',
        );
      } catch (e) {
        console.error('registrarSeguimientoNovedad failed', e);
      }
    }

    return Response.json({
      message:
        estado === 'confirmada'
          ? 'Novedad confirmada y creada en novedades'
          : 'Estado actualizado exitosamente',
      novedadId: nuevaNovedadId,
      consecutivo,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
