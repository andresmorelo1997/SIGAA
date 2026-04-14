import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { detectFileType, findHeaderRow } from '@/lib/import-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/carga-academica/preview
 *
 * Returns summary of an uploaded Excel file WITHOUT writing anything to the
 * database. Used to let the user confirm what will be imported and pick which
 * campus(es) to include.
 *
 * Returns: { fileType, totalRows, campus: [...], grados: [...], cicloLectivo }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return Response.json({ error: 'No se recibió archivo' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
      type: 'array',
      cellDates: false,
    });

    const filename = file.name;
    const fileType = detectFileType(filename, workbook);

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      return Response.json({
        fileType,
        totalRows: 0,
        campus: [],
        grados: [],
        cicloLectivo: '',
        filename,
      });
    }

    const sheetJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      header: 1,
      defval: null,
    }) as unknown[][];

    // Find header row; fallback to 0.
    let headerRow = 0;
    try {
      const h = findHeaderRow(sheet);
      headerRow = typeof h === 'number' ? h : 0;
    } catch {
      headerRow = 0;
    }

    const headers = (sheetJson[headerRow] ?? []) as string[];
    const findCol = (...names: string[]): number => {
      for (let i = 0; i < headers.length; i++) {
        const h = String(headers[i] ?? '').trim().toLowerCase();
        for (const target of names) {
          if (h === target.toLowerCase()) return i;
        }
      }
      return -1;
    };

    const campusCol = findCol('Campus', 'CAMPUS', 'Sede');
    const gradoCol = findCol('Grado', 'Grado Académico', 'Nivel');
    const cicloCol = findCol('Ciclo Lectivo', 'Ciclo', 'Periodo');

    const campusSet = new Set<string>();
    const gradoSet = new Set<string>();
    let cicloLectivo = '';
    let totalRows = 0;

    for (let i = headerRow + 1; i < sheetJson.length; i++) {
      const row = sheetJson[i];
      if (!row || row.every((v) => v == null || String(v).trim() === '')) continue;
      totalRows++;
      if (campusCol >= 0) {
        const v = row[campusCol];
        if (v != null && String(v).trim()) campusSet.add(String(v).trim());
      }
      if (gradoCol >= 0) {
        const v = row[gradoCol];
        if (v != null && String(v).trim()) gradoSet.add(String(v).trim());
      }
      if (!cicloLectivo && cicloCol >= 0) {
        const v = row[cicloCol];
        if (v != null && String(v).trim()) cicloLectivo = String(v).trim();
      }
    }

    return Response.json({
      fileType,
      totalRows,
      campus: Array.from(campusSet).sort(),
      grados: Array.from(gradoSet).sort(),
      cicloLectivo,
      filename,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
