import { NextRequest } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const estado = searchParams.get('estado') || '';
    const grado = searchParams.get('grado') || '';
    const cicloLectivo = searchParams.get('ciclo_lectivo') || '';
    const campusCsv = searchParams.get('campus') || '';
    const orgAcademica = searchParams.get('org_academica') || '';
    const asOf = searchParams.get('as_of') || '';
    const corteIdParam = searchParams.get('corte_id') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    // Consulta histórica: si se pasa `as_of` o `corte_id`, leemos de
    // cortes_carga_detalle en vez de carga_academica actual.
    if (asOf || corteIdParam) {
      let corteId: number | null = null;
      let corteHeader: Record<string, unknown> | null = null;

      if (corteIdParam) {
        corteId = parseInt(corteIdParam, 10) || null;
      } else if (asOf) {
        const ceil = `${asOf} 23:59:59`;
        const latest = db
          .prepare(
            `SELECT * FROM cortes_carga
              WHERE fecha_corte <= ?
              ORDER BY fecha_corte DESC, id DESC
              LIMIT 1`,
          )
          .get(ceil) as Record<string, unknown> | undefined;
        if (latest) {
          corteId = Number(latest.id);
          corteHeader = latest;
        }
      }

      if (!corteId) {
        return Response.json({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          corte: null,
          message: 'No hay cortes disponibles para la fecha solicitada',
        });
      }

      if (!corteHeader) {
        corteHeader = db
          .prepare('SELECT * FROM cortes_carga WHERE id = ?')
          .get(corteId) as Record<string, unknown>;
      }

      const hConds: string[] = ['corte_id = ?'];
      const hParams: unknown[] = [corteId];
      if (search) {
        hConds.push('(descripcion LIKE ? OR nombre_instructor LIKE ? OR catalogo LIKE ?)');
        const term = `%${search}%`;
        hParams.push(term, term, term);
      }
      if (estado) { hConds.push('estado_clase = ?'); hParams.push(estado); }
      if (grado) { hConds.push('grado = ?'); hParams.push(grado); }
      if (orgAcademica) { hConds.push('org_academica = ?'); hParams.push(orgAcademica); }

      const hWhere = `WHERE ${hConds.join(' AND ')}`;
      const hCount = db
        .prepare(`SELECT COUNT(*) as total FROM cortes_carga_detalle ${hWhere}`)
        .get(...hParams) as { total: number };
      const hRows = db
        .prepare(
          `SELECT * FROM cortes_carga_detalle ${hWhere}
            ORDER BY id LIMIT ? OFFSET ?`,
        )
        .all(...hParams, limit, offset);

      return Response.json({
        data: hRows,
        pagination: {
          page,
          limit,
          total: hCount.total,
          totalPages: Math.ceil(hCount.total / limit),
        },
        corte: corteHeader,
      });
    }

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      conditions.push(
        '(descripcion LIKE ? OR nombre_instructor LIKE ? OR catalogo LIKE ?)'
      );
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (estado) {
      conditions.push('estado_clase = ?');
      params.push(estado);
    }

    if (grado) {
      conditions.push('grado = ?');
      params.push(grado);
    }

    if (cicloLectivo) {
      conditions.push('ciclo_lectivo = ?');
      params.push(cicloLectivo);
    }

    if (campusCsv) {
      const campuses = campusCsv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (campuses.length === 1) {
        conditions.push('campus = ?');
        params.push(campuses[0]);
      } else if (campuses.length > 1) {
        const placeholders = campuses.map(() => '?').join(',');
        conditions.push(`campus IN (${placeholders})`);
        for (const c of campuses) params.push(c);
      }
    }

    if (orgAcademica) {
      conditions.push('org_academica = ?');
      params.push(orgAcademica);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db
      .prepare(`SELECT COUNT(*) as total FROM carga_academica ${whereClause}`)
      .get(...params) as { total: number };

    const rows = db
      .prepare(
        `SELECT * FROM carga_academica ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`
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
      .prepare(
        `INSERT INTO carga_academica (${columns.join(', ')}) VALUES (${placeholders})`
      )
      .run(...values);

    return Response.json(
      { id: result.lastInsertRowid, message: 'Registro creado exitosamente' },
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
      return Response.json(
        { error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }

    const setClause = columns.map((col) => `${col} = ?`).join(', ');
    const values = columns.map((col) => fields[col]);

    const result = db
      .prepare(`UPDATE carga_academica SET ${setClause} WHERE id = ?`)
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

    const result = db
      .prepare('DELETE FROM carga_academica WHERE id = ?')
      .run(id);

    if (result.changes === 0) {
      return Response.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    return Response.json({ message: 'Registro eliminado exitosamente' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
