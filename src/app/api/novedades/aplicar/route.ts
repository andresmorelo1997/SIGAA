import { NextRequest } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/novedades/aplicar
 * Applies the effect of a confirmed novedad based on its motivo
 *
 * Expected body: { id: number }
 *
 * Effects by motivo:
 * - RENUNCIA: Sets docente as inactive, marks classes as 'Inactivo'
 * - TERMINACION_CONTRATO: Same as RENUNCIA
 * - COMISION_ESTUDIO: Docente stays active, classes marked for replacement
 * - LICENCIA: Similar to comision but temporary
 * - REASIGNACION: Changes instructor on specific class to new instructor
 * - CAMBIO_HORARIO: Updates schedule in carga_academica
 * - CIERRE_CURSO: Sets class status to 'Cancelado'
 * - APERTURA_CURSO: Sets class status to 'Activo' or creates it
 * - CAMBIO_GRUPO: Updates group assignment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return Response.json(
        { error: 'Se requiere el ID de la novedad' },
        { status: 400 }
      );
    }

    // Fetch the novedad
    const novedad = db
      .prepare('SELECT * FROM novedades WHERE id = ?')
      .get(id) as any;

    if (!novedad) {
      return Response.json(
        { error: 'Novedad no encontrada' },
        { status: 404 }
      );
    }

    if (novedad.efecto_aplicado === 1) {
      return Response.json(
        { error: 'El efecto de esta novedad ya ha sido aplicado' },
        { status: 400 }
      );
    }

    if (novedad.estado !== 'aprobada') {
      return Response.json(
        { error: 'La novedad debe estar aprobada antes de aplicar el efecto' },
        { status: 400 }
      );
    }

    const motivo = novedad.motivo?.toUpperCase() || '';
    const changes: string[] = [];

    try {
      switch (motivo) {
        case 'RENUNCIA':
        case 'TERMINACION_CONTRATO':
          // Set docente as inactive in docentes table
          if (novedad.docente_sale_id || novedad.instructor_sale_id) {
            const docId = novedad.docente_sale_id || novedad.instructor_sale_id;
            db.prepare(
              'UPDATE docentes SET fecha_final = ? WHERE instructor_id = ? OR doc_id = ?'
            ).run(new Date().toISOString().split('T')[0], docId, docId);
            changes.push(`Docente ${novedad.docente_sale} marcado como inactivo`);
          }

          // Mark all their classes as 'Inactivo'
          if (novedad.num_clase) {
            db.prepare('UPDATE carga_academica SET estado_clase = ? WHERE num_clase = ?').run(
              'Inactivo',
              novedad.num_clase
            );
            changes.push(`Clase ${novedad.num_clase} marcada como Inactivo`);
          }
          break;

        case 'COMISION_ESTUDIO':
        case 'LICENCIA':
          // Docente stays active in docentes table (contract still valid)
          // Mark classes for replacement / reassignment
          if (novedad.num_clase) {
            // Add a note to the class indicating it needs replacement
            const currentDesc = db
              .prepare('SELECT descripcion FROM carga_academica WHERE num_clase = ?')
              .get(novedad.num_clase) as { descripcion: string } | undefined;

            const newDesc = currentDesc
              ? `${currentDesc.descripcion} [${motivo} - Requiere reemplazo]`
              : `[${motivo} - Requiere reemplazo]`;

            db.prepare('UPDATE carga_academica SET descripcion = ? WHERE num_clase = ?').run(
              newDesc,
              novedad.num_clase
            );
            changes.push(`Clase ${novedad.num_clase} marcada para reemplazo (${motivo})`);
          }
          break;

        case 'REASIGNACION':
          // Change instructor on the specific class to the new instructor
          if (novedad.num_clase && novedad.docente_entra && novedad.docente_entra_id) {
            db.prepare(
              'UPDATE carga_academica SET nombre_instructor = ?, instructor_id = ? WHERE num_clase = ?'
            ).run(novedad.docente_entra, novedad.docente_entra_id, novedad.num_clase);
            changes.push(
              `Clase ${novedad.num_clase} reasignada a ${novedad.docente_entra}`
            );
          }
          break;

        case 'CAMBIO_HORARIO':
          // Update schedule in carga_academica
          if (novedad.num_clase && novedad.horario) {
            // Parse horario string (expected format: "HH:MM - HH:MM")
            const [inicio, fin] = novedad.horario.split('-').map((s: string) => s.trim());
            if (inicio && fin) {
              db.prepare(
                'UPDATE carga_academica SET hora_inicio = ?, hora_fin = ? WHERE num_clase = ?'
              ).run(inicio, fin, novedad.num_clase);
              changes.push(`Horario de clase ${novedad.num_clase} actualizado a ${novedad.horario}`);
            }
          }
          break;

        case 'CIERRE_CURSO':
          // Set class status to 'Cancelado'
          if (novedad.num_clase) {
            db.prepare('UPDATE carga_academica SET estado_clase = ? WHERE num_clase = ?').run(
              'Cancelado',
              novedad.num_clase
            );
            changes.push(`Curso ${novedad.num_clase} cancelado`);
          }
          break;

        case 'APERTURA_CURSO':
          // Set class status to 'Activo'
          if (novedad.num_clase) {
            db.prepare('UPDATE carga_academica SET estado_clase = ? WHERE num_clase = ?').run(
              'Activo',
              novedad.num_clase
            );
            changes.push(`Curso ${novedad.num_clase} abierto`);
          }
          break;

        case 'CAMBIO_GRUPO':
          // Update group assignment
          if (novedad.num_clase && novedad.grupo) {
            db.prepare('UPDATE carga_academica SET grupo_academico = ? WHERE num_clase = ?').run(
              novedad.grupo,
              novedad.num_clase
            );
            changes.push(`Grupo de clase ${novedad.num_clase} actualizado a ${novedad.grupo}`);
          }
          break;

        default:
          return Response.json(
            { error: `Tipo de novedad desconocido: ${motivo}` },
            { status: 400 }
          );
      }

      // Mark novedad as efecto_aplicado and update timestamp
      db.prepare(
        'UPDATE novedades SET efecto_aplicado = 1, updated_at = ? WHERE id = ?'
      ).run(new Date().toISOString(), id);

      return Response.json({
        message: 'Efecto de novedad aplicado exitosamente',
        motivo,
        changes,
        novedad_id: id,
      });
    } catch (innerError) {
      const errorMsg =
        innerError instanceof Error ? innerError.message : 'Error al aplicar el efecto';
      return Response.json(
        {
          error: 'Error al aplicar el efecto de la novedad',
          details: errorMsg,
          motivo,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/novedades/aplicar?id=X
 * Returns details about what effect would be applied (dry-run info)
 */
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return Response.json(
        { error: 'Se requiere el parametro id' },
        { status: 400 }
      );
    }

    const novedad = db
      .prepare('SELECT * FROM novedades WHERE id = ?')
      .get(id) as any;

    if (!novedad) {
      return Response.json(
        { error: 'Novedad no encontrada' },
        { status: 404 }
      );
    }

    const motivo = novedad.motivo?.toUpperCase() || '';
    let efectoDescripcion = '';
    let requisitosPrevios = [];

    switch (motivo) {
      case 'RENUNCIA':
      case 'TERMINACION_CONTRATO':
        efectoDescripcion =
          'El docente será marcado como inactivo y todas sus clases serán marcadas como Inactivo';
        requisitosPrevios = [
          'La novedad debe estar aprobada',
          'El docente debe estar registrado',
        ];
        break;

      case 'COMISION_ESTUDIO':
      case 'LICENCIA':
        efectoDescripcion =
          'El docente se mantiene activo pero sus clases se marcan para reemplazo';
        requisitosPrevios = ['La novedad debe estar aprobada'];
        break;

      case 'REASIGNACION':
        efectoDescripcion = `La clase será reasignada de ${novedad.docente_sale} a ${novedad.docente_entra}`;
        requisitosPrevios = [
          'La novedad debe estar aprobada',
          'Debe haber un docente entrante registrado',
        ];
        break;

      case 'CAMBIO_HORARIO':
        efectoDescripcion = `El horario de la clase será actualizado a ${novedad.horario}`;
        requisitosPrevios = ['La novedad debe estar aprobada', 'El nuevo horario debe estar definido'];
        break;

      case 'CIERRE_CURSO':
        efectoDescripcion = `La clase ${novedad.num_clase} será cancelada`;
        requisitosPrevios = ['La novedad debe estar aprobada'];
        break;

      case 'APERTURA_CURSO':
        efectoDescripcion = `La clase ${novedad.num_clase} será marcada como Activo`;
        requisitosPrevios = ['La novedad debe estar aprobada'];
        break;

      case 'CAMBIO_GRUPO':
        efectoDescripcion = `El grupo será actualizado a ${novedad.grupo}`;
        requisitosPrevios = ['La novedad debe estar aprobada', 'El nuevo grupo debe estar definido'];
        break;

      default:
        return Response.json(
          { error: `Tipo de novedad desconocido: ${motivo}` },
          { status: 400 }
        );
    }

    return Response.json({
      novedad_id: id,
      motivo,
      estado: novedad.estado,
      efecto_aplicado: novedad.efecto_aplicado,
      efectoDescripcion,
      requisitosPrevios,
      docente_sale: novedad.docente_sale || novedad.instructor_sale,
      docente_entra: novedad.docente_entra || novedad.instructor_entra,
      num_clase: novedad.num_clase,
      asignatura: novedad.asignatura,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
