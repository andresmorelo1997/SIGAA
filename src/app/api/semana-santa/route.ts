import { NextRequest } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Get Semana Santa config + exceptions for a periodo
export async function GET(request: NextRequest) {
  try {
    const periodo = request.nextUrl.searchParams.get('periodo') || '2026-1';

    const config = db.prepare(
      'SELECT * FROM semana_santa_config WHERE periodo = ?'
    ).get(periodo) as { id: number; periodo: string; fecha_inicio: string; fecha_fin: string } | undefined;

    const excepciones = db.prepare(
      'SELECT * FROM semana_santa_excepciones WHERE periodo = ? ORDER BY programa'
    ).all(periodo) as Array<{ id: number; periodo: string; programa: string; catalogo_pattern: string; motivo: string }>;

    // Get all periodos that have config
    const periodos = db.prepare(
      'SELECT DISTINCT periodo FROM semana_santa_config ORDER BY periodo DESC'
    ).all() as { periodo: string }[];

    return Response.json({ config, excepciones, periodos: periodos.map(p => p.periodo) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}

// POST: Create/update Semana Santa config + exceptions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { periodo, fecha_inicio, fecha_fin, excepciones } = body as {
      periodo: string;
      fecha_inicio: string;
      fecha_fin: string;
      excepciones?: Array<{ programa: string; motivo?: string }>;
    };

    if (!periodo || !fecha_inicio || !fecha_fin) {
      return Response.json({ error: 'Faltan campos: periodo, fecha_inicio, fecha_fin' }, { status: 400 });
    }

    const saveAll = db.transaction(() => {
      // Upsert Semana Santa dates
      db.prepare(`
        INSERT INTO semana_santa_config (periodo, fecha_inicio, fecha_fin)
        VALUES (?, ?, ?)
        ON CONFLICT(periodo) DO UPDATE SET fecha_inicio = excluded.fecha_inicio, fecha_fin = excluded.fecha_fin
      `).run(periodo, fecha_inicio, fecha_fin);

      // Update exceptions if provided
      if (excepciones !== undefined) {
        db.prepare('DELETE FROM semana_santa_excepciones WHERE periodo = ?').run(periodo);
        const insertExc = db.prepare(
          'INSERT INTO semana_santa_excepciones (periodo, programa, motivo) VALUES (?, ?, ?)'
        );
        for (const exc of excepciones) {
          if (exc.programa) {
            insertExc.run(periodo, exc.programa, exc.motivo || '');
          }
        }
      }
    });

    saveAll();
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
