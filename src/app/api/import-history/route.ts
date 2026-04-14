import { NextRequest } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fileType = searchParams.get('file_type') || '';
    const status = searchParams.get('status') || '';
    const cicloLectivo = searchParams.get('ciclo_lectivo') || '';
    const grado = searchParams.get('grado') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (fileType) {
      conditions.push('file_type = ?');
      params.push(fileType);
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (cicloLectivo) {
      conditions.push('ciclo_lectivo = ?');
      params.push(cicloLectivo);
    }

    if (grado) {
      conditions.push('grado = ?');
      params.push(grado);
    }

    if (search) {
      conditions.push('filename LIKE ?');
      params.push(`%${search}%`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db
      .prepare(`SELECT COUNT(*) as total FROM import_history ${whereClause}`)
      .get(...params) as { total: number };

    const rows = db
      .prepare(
        `SELECT * FROM import_history ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    // Aggregate stats (not filtered — always global for the dashboard header)
    const statsRow = db
      .prepare(
        `SELECT
           COUNT(*) as total_imports,
           COALESCE(SUM(records_inserted), 0) + COALESCE(SUM(records_updated), 0) as total_records,
           MAX(created_at) as last_import,
           SUM(CASE WHEN status = 'failed' OR status = 'error' THEN 1 ELSE 0 END) as total_errors
         FROM import_history`
      )
      .get() as {
        total_imports: number;
        total_records: number;
        last_import: string | null;
        total_errors: number;
      };

    return Response.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: countRow.total,
        totalPages: Math.ceil(countRow.total / limit),
      },
      stats: {
        total_imports: statsRow.total_imports ?? 0,
        total_records: statsRow.total_records ?? 0,
        last_import: statsRow.last_import,
        total_errors: statsRow.total_errors ?? 0,
      },
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

    // Verify the import exists
    const existing = db
      .prepare('SELECT id FROM import_history WHERE id = ?')
      .get(id);

    if (!existing) {
      return Response.json(
        { error: 'Registro de importacion no encontrado' },
        { status: 404 }
      );
    }

    // Cascade delete in related tables
    const deletedCounts: Record<string, number> = {};

    const tables = [
      'carga_academica',
      'docentes',
      'profesores_asignatura',
      'plan_estudios',
      'docente_capacitaciones',
    ];

    const deleteTransaction = db.transaction(() => {
      for (const table of tables) {
        const result = db
          .prepare(`DELETE FROM ${table} WHERE import_id = ?`)
          .run(id);
        deletedCounts[table] = result.changes;
      }

      // Delete the import_history record itself
      db.prepare('DELETE FROM import_history WHERE id = ?').run(id);
    });

    deleteTransaction();

    return Response.json({
      message: 'Importacion y registros asociados eliminados exitosamente',
      deleted: deletedCounts,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
