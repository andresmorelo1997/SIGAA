import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/import-history/[id]/download
 *
 * Returns the original Excel blob stored when the file was imported.
 * Gives users a reliable audit trail / bitácora.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const row = db
    .prepare(
      'SELECT filename, file_blob FROM import_history WHERE id = ?',
    )
    .get(numId) as { filename: string; file_blob: Buffer | null } | undefined;

  if (!row) {
    return NextResponse.json({ error: 'Importación no encontrada' }, { status: 404 });
  }
  if (!row.file_blob) {
    return NextResponse.json(
      { error: 'Este registro no tiene archivo guardado (importación anterior al soporte de archivos).' },
      { status: 404 },
    );
  }

  const filename = row.filename || `import_${numId}.xlsx`;
  const isXlsm = filename.toLowerCase().endsWith('.xlsm');
  const contentType = isXlsm
    ? 'application/vnd.ms-excel.sheet.macroEnabled.12'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  return new NextResponse(new Uint8Array(row.file_blob), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
